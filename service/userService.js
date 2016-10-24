/** 用户服务类
 * Created by Alan.wu on 2015/3/4.
 */
var member = require('../models/member');//引入member数据模型
var boUser = require('../models/boUser');//引入boUser数据模型
var boMenu = require('../models/boMenu');//引入boMenu数据模型
var boRole= require('../models/boRole');//引入boRole数据模型
var chatGroup = require('../models/chatGroup');//引入chatGroup数据模型
var constant = require('../constant/constant');//引入constant
var common = require('../util/common');//引入common类
var request = require('request');
var visitorService=require('../service/visitorService');
var logger=require('../resources/logConf').getLogger('userService');//引入log4js
var chatPointsService=require('../service/chatPointsService');
/**
 * 定义用户服务类
 * @type {{getMemberList: Function, updateMemberInfo: Function}}
 */
var userService = {
    /**
     * 通过用户id提取信息
     * @param id
     */
    getUserInfo:function(id,callback){
        boUser.findById(id,"userNo userName position avatar introduction introductionImg",function(err,row) {
            callback(row);
        });
    },
    /**
     * 通过用户id提取信息
     * @param ids
     */
    getUserList:function(ids,callback){
        boUser.find({userNo:{$in:ids.split(",")}},"userNo userName position avatar",function(err,rows) {
            callback(rows);
        });
    },
    /**
     * 批量下线房间用户在线状态
     * @param roomId
     */
    batchOfflineStatus:function(roomId){
        var groupType=common.getRoomType(roomId);
        member.find({valid:1,'loginPlatform.chatUserGroup':{$elemMatch:{_id:groupType,"rooms":{$elemMatch:{'_id':roomId,onlineStatus:1}}}}},function(err,rowList){
            if(err || !rowList){
              logger.warn('batchOfflineStatus->fail or no offlineStatus row',err);
            }else{
                var room=null,mRow=null,group=null,currDate=new Date();
                for(var k in rowList){
                    mRow=rowList[k];
                    group=mRow.loginPlatform.chatUserGroup.id(groupType);
                    if(group){
                        room=group.rooms.id(roomId);
                        if(room && room.onlineStatus==1){
                            room.onlineStatus=0;
                            room.offlineDate=currDate;
                            mRow.save(function(err){
                                if(err){
                                    logger.error("batchOfflineStatus->update fail!",err);
                                }
                            });
                        }
                    }
                }
                logger.info("batchOfflineStatus->update rows["+roomId+"]:",rowList.length);
            }
        });
    },
    /**
     * 移除在线用户
     * @param userInfo
     * @param isUpdate 是否需要更新数据
     * @param callback
     */
    removeOnlineUser:function(userInfo,isUpdate,callback){
        if(common.hasPrefix(constant.clientGroup.visitor,userInfo.userId) || !isUpdate){
            callback(true);
            return;
        }
        //更新用户记录表的在线状态(下线设置为0）
        if(common.isValid(userInfo.userId) && common.isValid(userInfo.groupId) && common.isValid(userInfo.groupType)) {
            userService.updateChatUserGroupStatus(userInfo, 0,userInfo.sendMsgCount, function (err) {});
            callback(true);
        }else{
            callback(false);
        }
    },
    /**
     * 检查用户禁言
     * @param row member信息
     * @param groupId 房间号
     * @returns {*}
     */
    checkUserGag:function(row, groupId){
        var subRow = row.loginPlatform.chatUserGroup[0];
        if(common.isBlank(subRow.gagDate)){
            var currRoom = !subRow.rooms ? null : subRow.rooms.id(groupId);
            if(currRoom){
                if(common.dateTimeWeekCheck(currRoom.gagDate, false)){
                    return {isOK:false,tip:currRoom.gagTips};
                }else{
                    return {isOK:true};
                }
            }else{
                //房间信息不存在？？
                return {isOK:true};
            }
        }else{
            if(common.dateTimeWeekCheck(subRow.gagDate, false)){
                return {isOK:false,tip:subRow.gagTips};
            }else{
                return {isOK:true};
            }
        }
    },
    /**
     * 验证规则
     * @param clientGroup
     * @param nickname
     * @param isWh 是否私聊
     * @param groupId
     * @param content
     * @param callback
     */
    verifyRule:function(clientGroup,nickname, isWh,userType,groupId,content,callback){
        var isImg=content.msgType!='text',contentVal=content.value;
        if(common.isBlank(contentVal)){
            callback({isOK:false,tip:"发送的内容有误，已被拒绝!"});
            return;
        }
        contentVal = contentVal.replace(/(<(label|label) class="dt-send-name" tid="[^>"]+">@.*<\/label>)|(<(img|IMG)\s+src="[^>"]+face\/[^>"]+"\s*>)|(<a href="[^>"]+" target="_blank">.*<\/a>)/g,'');
        if(!isImg){//如果是文字，替换成链接
            if(/<[^>]*>/g.test(contentVal)){ //过滤特殊字符
                callback({isOK:false,tip:"有特殊字符，已被拒绝!"});
                return;
            }
        }
        contentVal = common.encodeHtml(contentVal);
        //预定义规则
        chatGroup.findById(groupId,function (err,row) {
            if(err||!row){
                callback({isOK:false,tip:'系统异常，房间不存在！',leaveRoom:true});
                return;
            }
            if(constant.roleUserType.member<parseInt(userType)){//后台用户无需使用规则
                callback({isOK:true,tip:'',talkStyle:row.talkStyle,whisperRoles:row.whisperRoles});
                return;
            }
            if(!common.dateTimeWeekCheck(row.openDate, true) || row.status!=1|| row.valid!=1){
                callback({isOK:false,tip:'房间开放时间结束！',leaveRoom:true});
                return;
            }
            var ruleArr=row.chatRules,resultTip=[],beforeVal='',type='',tip='',clientGroupVal='';
            var urlArr=[],urlTipArr=[],ruleRow=null,needApproval=false,needApprovalTip=null,isPass=false;
            //先检查禁止发言的规则
            var isVisitor = (constant.roleUserType.visitor == userType);
            var visitorSpeak = {allowed : false, tip : "请登录后发言"};
            for(var i in ruleArr){
                ruleRow=ruleArr[i];
                beforeVal=ruleRow.beforeRuleVal;
                type=ruleRow.type;
                tip=ruleRow.afterRuleTips;
                isPass=common.dateTimeWeekCheck(ruleRow.periodDate, true);
                clientGroupVal = ruleRow.clientGroup;
                if(isWh){
                    if(type=='whisper_allowed'){
                        if(!isPass){
                            callback({isOK:false,tip:tip});
                        }else{
                            callback({isOK:true,tip:'',talkStyle:row.talkStyle,whisperRoles:row.whisperRoles});
                        }
                        return;
                    }
                }else{
                    if(isPass && type=='speak_not_allowed'){//禁言
                        callback({isOK:false,tip:tip});
                        return;
                    }else if(!isPass && type=='speak_allowed'){//允许发言
                        callback({isOK:false,tip:tip});
                        return;
                    }else if(!visitorSpeak.allowed && isVisitor && type=='visitor_filter'){//允许游客发言（默认游客不允许发言）
                        visitorSpeak.allowed = isPass;
                        visitorSpeak.tip = tip;
                    }
                    if(isImg && isPass && type=='img_not_allowed'){//禁止发送图片
                        if(common.isBlank(clientGroupVal) || (common.isValid(clientGroupVal) && common.containSplitStr(clientGroupVal, clientGroup))) {
                            callback({isOK: false, tip: tip});
                            return;
                        }
                    }
                    if(!isImg && isPass && type!='speak_not_allowed' && common.isValid(beforeVal)){
                        beforeVal=beforeVal.replace(/(^[,，])|([,|，]$)/g,'');//去掉结尾的逗号
                        beforeVal=beforeVal.replace(/,|，/g,'|');//逗号替换成|，便于统一使用正则表达式
                        if(type=='visitor_filter'){
                            if(visitorSpeak.allowed && isVisitor && eval('/'+beforeVal+'/').test(nickname)){
                                callback({isOK:false,tip:tip});
                                return;
                            }
                        }
                        if(type=='keyword_filter'){//过滤关键字或过滤链接
                            if(eval('/'+beforeVal+'/').test(contentVal)){
                                callback({isOK:false,tip:tip});
                                return;
                            }
                        }
                        if(type=='url_not_allowed'){//禁止链接
                            var val=beforeVal.replace(/\//g,'\\/').replace(/\./g,'\\.');
                            if(eval('/'+val+'/').test(contentVal)){
                                callback({isOK:false,tip:tip});
                                return;
                            }
                        }
                        if(type=='url_allowed'){//除该连接外其他连接会禁止
                            urlArr.push(beforeVal);
                            urlTipArr.push(tip);
                        }
                        if(type=='keyword_replace'){//替换关键字
                            if(eval('/'+beforeVal+'/').test(contentVal)){
                                content.value=common.encodeHtml(content.value).replace(eval('/'+beforeVal+'/g'),ruleArr[i].afterRuleVal);
                                resultTip.push(tip);
                            }
                        }
                    }
                    if(isPass && type=='need_approval'){//需要审批
                        needApproval=true;
                        needApprovalTip=tip;
                    }
                }
            }
            if(isWh){ //私聊不校验规则
                callback({isOK:true,tip:resultTip.join(";"),talkStyle:row.talkStyle,whisperRoles:row.whisperRoles});
                return;
            }
            if(isVisitor && !visitorSpeak.allowed){
                callback({isOK:false,tip:visitorSpeak.tip});
                return;
            }
            if(!isImg && urlArr.length>0 && common.urlReg().test(contentVal)){
                var val=urlArr.join("|").replace(/\//g,'\\\/').replace(/\./g,'\\.');
                if(!eval('/'+val+'/').test(contentVal)){
                    callback({isOK:false,tip:urlTipArr.join(";")});
                    return;
                }
            }
            if(needApproval){//需要审批
                callback({isOK:false,needApproval:true,tip:needApprovalTip});//需要审批，设置为true
                return;
            }
            callback({isOK:true,tip:resultTip.join(";"),talkStyle:row.talkStyle,whisperRoles:row.whisperRoles});
        });
    },
    /**
     * 提取会员信息
     */
    getMemberList:function(id,callback){
        member.findById(id,function (err,members) {
            if(err!=null){
                callback(null);
            }
            callback(members);
        });
    },
    /**
     * 检查角色是否有审批权限
     */
    getAuthUsersByGroupId:function(groupId,callback){
        chatGroup.findById(groupId,"authUsers",function(err,row){
            if(err || !row){
                callback(null);
            }else{
                callback(row.authUsers);
            }
        });
    },
    /**
     * 检查后台进入聊天室的用户，是则直接登录聊天室
     */
    checkSystemUserInfo:function(userInfo,callback){
        var result={isOK:false};
        var newUserInfo={groupType:userInfo.groupType,groupId:userInfo.groupId,accountNo:userInfo.accountNo,userId:userInfo.userId,mobilePhone:userInfo.mobilePhone};
        if(constant.fromPlatform.pm_mis==userInfo.fromPlatform){
            newUserInfo.accountNo=userInfo.userId;
            newUserInfo.userId='';//不需要填值
        }
        logger.info("checkSystemUserInfo=>newUserInfo:"+JSON.stringify(newUserInfo));
        userService.createUser(newUserInfo, function (isOk) {
            result.isOK=true;
            callback(result);
        });
    },
    /**
     * 新增用户信息
     * @param userInfo
     * @param callback
     */
    createUser:function(userInfo,callback){
        member.findOne({'mobilePhone':userInfo.mobilePhone,valid:1},"loginPlatform.chatUserGroup",function(err,row){
                if(!err && row ){
                    var hasRow=false;
                    if(row.loginPlatform){
                        if(common.checkArrExist(row.loginPlatform.chatUserGroup)){
                            hasRow=row.loginPlatform.chatUserGroup.id(userInfo.groupType)?true:false;
                        }
                    }
                    console.log("createUser->userInfo:"+JSON.stringify(userInfo));
                    userService.createChatUserGroupInfo(userInfo,hasRow,function(isOK){
                        callback(isOK);
                    });
                }else{
                    userService.saveMember(userInfo,function(isOK){
                        callback(isOK);
                    });
                }
        });
    },

    /**
     * 保存用户信息
     * @param userInfo
     * @param callback
     */
    saveMember:function(userInfo,callback){
        var memberModel = {
            _id:null,
            mobilePhone:userInfo.mobilePhone,
            status:1, //内容状态：0 、禁用 ；1、启动
            valid:1,//有效
            createUser:userInfo.userId||userInfo.accountNo,
            createIp:userInfo.ip,//新增记录的Ip
            updateIp:userInfo.ip,//新增记录的Ip
            createDate:new Date(),//创建日期
            loginPlatform:{
                chatUserGroup:[{
                        _id:userInfo.groupType,//组的大类别，区分是微信组、直播间
                        userId:userInfo.userId,//第三方用户id，对于微信，userId为微信的openId;
                        thirdId : userInfo.thirdId,
                        avatar:userInfo.avatar,//头像
                        nickname:userInfo.nickname,//昵称
                        accountNo:userInfo.accountNo, //账号
                        userType:(userInfo.userType||constant.roleUserType.member), //用户类型
                        roleNo:userInfo.roleNo, //角色编号
                        pwd:userInfo.pwd,//用户密码，直播间需要，微解盘不需要
                        clientGroup:userInfo.clientGroup,//客户类别
                        createDate:new Date(),//创建日期
                        rooms:[{
                            _id:userInfo.groupId,//组id，与聊天室组对应
                            onlineStatus: userInfo.onlineStatus||1, //在线状态：0 、下线 ；1、在线
                            onlineDate: new Date(),//上线时间
                            sendMsgCount:0
                        }]
                    }]
            }
        };
        member.create(memberModel,function(err,rowTmp){
            if(err){
                logger.error('createUser=>create member fail,'+err);
            }
            if(callback){
                callback(!err && rowTmp);
            }
        });
    },
    /**
     * 加入新的房间组
     * @param userInfo
     * @param callback
     */
    joinNewRoom:function(userInfo,callback){
        var searchObj={'mobilePhone':userInfo.mobilePhone,valid:1,'loginPlatform.chatUserGroup':{$elemMatch:{_id:userInfo.groupType,userId:userInfo.userId,"rooms._id":{$ne:userInfo.groupId}}}};
        var setValObj={'$push':{'loginPlatform.chatUserGroup.$.rooms':{
            _id:userInfo.groupId,
            onlineStatus:1,
            onlineDate:new Date()
        }}};
        if(common.isBlank(userInfo.mobilePhone)){//如果不存在手机号码，先提取手机号码
            member.findOne({valid:1,'loginPlatform.chatUserGroup':{$elemMatch:{_id:userInfo.groupType,userId:userInfo.userId}}},function(err,row){
                if(row){
                    searchObj.mobilePhone=row.mobilePhone;
                    var mainRow=row.loginPlatform.chatUserGroup.id(userInfo.groupType);
                    if(!mainRow.rooms.id(userInfo.groupId)){//不存在对应房间则新增房间信息
                        member.findOneAndUpdate(searchObj,setValObj,function(err,row){
                            if(err){
                                logger.error('joinNewGroup=>fail!'+err);
                            }
                        });
                    }
                    callback(true,{mobilePhone:row.mobilePhone,accountNo:mainRow.accountNo});
                }else{
                    callback(false);
                }
            });
        }else{
            member.findOneAndUpdate(searchObj,setValObj,function(err,row){
                if(err){
                    logger.error('joinNewGroup=>fail!'+err);
                }
                callback(true);
            });
        }
    },
    /**
     * 新增会员登录聊天室的用户组信息
     * @param userInfo
     * @param hasRooms
     * @param callback
     */
    createChatUserGroupInfo:function(userInfo,hasRooms,callback){
        if(hasRooms){//存在房间对应的用户记录，直接加入新的房间
            this.joinNewRoom(userInfo,function(){
                callback(true);
            });
        }else{
            var jsonStr={
                _id:userInfo.groupType,userId:userInfo.userId,avatar:userInfo.avatar,nickname:userInfo.nickname,pwd:userInfo.pwd,
                thirdId : userInfo.thirdId,
                clientGroup:userInfo.clientGroup,accountNo:userInfo.accountNo,userType:(userInfo.userType||constant.roleUserType.member), roleNo:userInfo.roleNo,
                createDate:new Date(),
                rooms:[{
                    _id:userInfo.groupId,
                    onlineStatus:(userInfo.onlineStatus||1),
                    onlineDate:new Date()
                }]
            };
            member.findOneAndUpdate({valid:1,'mobilePhone':userInfo.mobilePhone,'loginPlatform.chatUserGroup._id':{$ne:userInfo.groupType}},{'$push':{'loginPlatform.chatUserGroup':jsonStr}},function(err,row){
                var isSuccess=!err && row;
                if(isSuccess){
                    logger.info('createChatUserGroupInfo=>create ChatUserGroupInfo success!');
                }
                callback(isSuccess);
            });
        }
    },
    /**
     * 提取用户房间通用条件
     */
    getMemberRoomSearch:function(userInfo){
        var searchObj=null;
        if(constant.fromPlatform.pm_mis == userInfo.fromPlatform){
            searchObj = {valid:1,'loginPlatform.chatUserGroup':{$elemMatch:{_id:userInfo.groupType,accountNo:userInfo.userId,"rooms._id":userInfo.groupId}}};
        }else{
            searchObj = {valid:1,'loginPlatform.chatUserGroup':{$elemMatch:{_id:userInfo.groupType,userId:userInfo.userId,"rooms._id":userInfo.groupId}}};
        }
        return searchObj;
    },
    /**
     * 更新会员信息
     * 备注：判断是否存在登录信息，不存在则新增，存在则更新
     * @param userInfo
     * @param callback
     */
    updateMemberInfo:function(userInfo,callback){
        if(common.hasPrefix(constant.clientGroup.visitor,userInfo.userId)){//游客则提取离线日期
            visitorService.getByClientStoreId(userInfo.groupType,userInfo.groupId,userInfo.clientStoreId,function(offlineDate){
                callback(0,null,offlineDate);
            });
        }else{
            //存在则更新上线状态及上线时间
            member.findOne(this.getMemberRoomSearch(userInfo),function(err,row){
                if(!err && row && common.checkArrExist(row.loginPlatform.chatUserGroup)){
                    var group=row.loginPlatform.chatUserGroup.id(userInfo.groupType);
                    if(group){
                        var room=group.rooms.id(userInfo.groupId);
                        room.onlineDate=userInfo.onlineDate;
                        room.onlineStatus=userInfo.onlineStatus;
                        userInfo.hasRegister=true;
                        row.save(function(err,rowTmp){
                            if(err){
                                logger.error("updateMemberInfo->update member fail!:"+err);
                            }
                            callback(room.sendMsgCount,row.mobilePhone,room.offlineDate);
                        });
                    }else{
                        callback(0);
                    }
                }else{
                    callback(0);
                }
            });
        }
    },
    /**
     *下线更新会员状态及发送记录条数
     */
    updateChatUserGroupStatus:function(userInfo,chatStatus,sendMsgCount,callback){
        member.findOne(this.getMemberRoomSearch(userInfo),function(err,row){
            if(row && common.checkArrExist(row.loginPlatform.chatUserGroup)) {
                var group = row.loginPlatform.chatUserGroup.id(userInfo.groupType);
                if(group){
                    var room = group.rooms.id(userInfo.groupId);
                    room.sendMsgCount = sendMsgCount;
                    room.onlineStatus = chatStatus;
                    room.offlineDate=new Date();
                    row.save(function (err, rowTmp) {
                        if (err) {
                            logger.error("updateChatUserGroupStatus->fail!:" + err);
                        }
                        callback(err);
                    });
                }else{
                    callback(null);
                }
            }else{
                callback(null);
            }
        });
    },
    /**
     * 通过userId及组别检测用户是否已经登录过
     * @param userInfo
     * @param isAllowPass 是否允许通过
     */
    checkUserLogin:function(userInfo,isAllowPass,callback){
        if(isAllowPass){
            callback(true);
        }else{
            var searchObj={};
            if(constant.fromPlatform.pm_mis==userInfo.fromPlatform){
                searchObj={_id:userInfo.groupType,accountNo:(common.isBlank(userInfo.accountNo)?userInfo.userId:userInfo.accountNo)};
            }else{
                searchObj={_id:userInfo.groupType,userId:userInfo.userId};
            }
            member.findOne({'loginPlatform.chatUserGroup':{$elemMatch:searchObj}},"mobilePhone loginPlatform.chatUserGroup.$",function (err, row){
                if(!err && row){
                    callback(row);
                }else{
                    callback(null);
                }
            });
        }
    },
    /**
     * 通过手机号查找对应信息
     * @param mobilePhone
     * @param callback
     */
    getMemberByTel:function(mobilePhone,selectField,callback){
        member.findOne({'mobilePhone':mobilePhone},selectField,function(err,row){
            callback(row);
        });
    },
    /**
     * 提取cs客服信息
     * @param roomId
     */
    getRoomCsUser:function(roomId,callback){
        this.getRoomCsUserList(roomId,function(rowList){
            callback(rowList?rowList[0]:null);
        });
    },
    /**
     * 提取cs客服信息
     * @param roomId
     */
    getRoomCsUserList:function(roomId,callback){
        chatGroup.findById(roomId,"authUsers",function(err,row){
            if(!row || err){
                callback(null);
            }else{
                boUser.find({userNo:{"$in":row.authUsers},"role.roleNo":common.getPrefixReg("cs")},"userNo userName avatar position",function(err,rowList){
                    if(!rowList || err){
                        callback(null);
                    }else{
                        callback(rowList);
                    }
                });
            }
        });
    },
    /**
     * 检查房间是否在开放时间内，或可用
     * @param groupId
     * @returns {boolean}
     */
    checkRoomStatus:function(groupId,currCount,callback){
        chatGroup.findById(groupId,"status openDate maxCount valid",function(err,row){
            if(!row || err){
                callback(false);
                return;
            }
            if(row.status!=1|| row.valid!=1){
                callback(false);
                return;
            }
            if(currCount>=row.maxCount){
                callback(false);
                return;
            }
            callback(common.dateTimeWeekCheck(row.openDate, true));
        });
    },
    /**
     * 修改昵称
     * @param mobilePhone
     * @param groupType
     * @param callback
     */
    modifyNickname:function(mobilePhone,groupType,nickname,callback){
        member.find({mobilePhone: {$ne : mobilePhone},valid: 1,"loginPlatform.chatUserGroup" : {$elemMatch : {_id :groupType,nickname :nickname,userType : 0}}}).count(function (err,count){
           if(count>0){
               callback({isOK:false,msg:"该昵称已被占用，请使用其他昵称！"});
           }else{
               member.update({valid:1,'mobilePhone':mobilePhone,'loginPlatform.chatUserGroup._id':groupType},{$set:{ "loginPlatform.chatUserGroup.$.nickname": nickname}},function(err,row){
                   if(err){
                       logger.error("modifyNickname->update fail!"+err);
                       callback({isOK:false,msg:"修改失败，请联系客服！"});
                   }else{
                       callback({isOK:true});
                   }
               });
           }
        });
    },
    /**
     * 修改头像
     * @param mobilePhone
     * @param groupType
     * @param callback
     */
    modifyAvatar:function(params,callback){
        member.update({valid:1,'mobilePhone':params.mobilePhone,'loginPlatform.chatUserGroup._id':params.groupType},{$set:{ "loginPlatform.chatUserGroup.$.avatar": params.avatar}},function(err,row){
            if(err){
                logger.error("modifyAvatar->update fail!"+err);
                callback({isOK:false,msg:"修改失败，请联系客服！"});
            }else{
                callback({isOK:true});
                if(common.isValid(params.item)) {
                    var pointsParams = {change: 'avatar',groupType: params.groupType,userId: params.mobilePhone, item: params.item, val: 0,isGlobal: false,remark: '',opUser: params.userId,opIp: params.ip};
                    userService.pointsChange(pointsParams,function(result){

                    });
                }
            }
        });
    },
    /**
     * 获取分析师
     * @param params
     * @param callback
     */
    getTeacherList:function(params, callback){
        this.getAuthUsersByGroupId(params.groupId,function(result){
            if(result){
                var searchObj = {valid:1,status:0,'role.roleNo':{$regex:/analyst.*/i},userNo:{$in:result}};
                if(params.hasQRCode) {
                    searchObj.wechatCodeImg = {$nin: [null, '']};
                }
                boUser.find(searchObj, "userNo userName wechatCodeImg",function(err, row){
                    if(err){
                        logger.error("getTeacherList->get fail!"+err);
                        callback(null);
                    }else{
                        callback(row);
                    }
                });
            }
        });
    },
    /**
     * 根据userid获取分析师二维码等信息
     * @param params
     * @param callback
     */
    getTeacherByUserId:function(params, callback){
        var searchObj = {valid:1,status:0,userNo:params.userId};
        boUser.findOne(searchObj, "userNo userName wechatCodeImg introductionImg introductionImgLink", function(err, row){
            if(err){
                logger.error("getTeacherByUserId->get fail!"+err);
                callback(null);
            }else{
                callback(row);
            }
        });
    },
    /**
     * 修改用户名
     * @param mobilePhone
     * @param groupType
     * @param callback
     */
    modifyUserName:function(userInfo,params,callback){
        member.find({mobilePhone: {$ne : userInfo.mobilePhone},valid: 1,"loginPlatform.chatUserGroup" : {$elemMatch : {_id :userInfo.groupType,userName :params.userName,userType : 0}}}).count(function (err,count){
            if(count>0){
                callback({isOK:false,msg:"该用户名已被占用，请使用其他用户名！"});
            }else{
                member.update({valid:1,'mobilePhone':userInfo.mobilePhone,'loginPlatform.chatUserGroup._id':userInfo.groupType},{$set:{ "loginPlatform.chatUserGroup.$.userName": params.userName}},function(err,row){
                    if(err){
                        logger.error("modifyUserName->update fail!"+err);
                        callback({isOK:false,msg:"修改失败，请联系客服！"});
                    }else{
                        callback({isOK:true});
                        if(common.isValid(params.item)) {
                            var pointsParams = {change: 'username',groupType: userInfo.groupType,userId: userInfo.mobilePhone, item: params.item, val: 0,isGlobal: false,remark: '',opUser: userInfo.userId,opIp: params.ip};
                            userService.pointsChange(pointsParams,function(result){

                            });
                        }
                    }
                });
            }
        });
    },
    /**
     * 修改邮箱
     * @param mobilePhone
     * @param groupType
     * @param callback
     */
    modifyEmail:function(params,callback){
        member.find({valid: 1,"loginPlatform.chatUserGroup" : {$elemMatch : {_id :params.groupType,email :params.email,userType : 0}}}).count(function (err,count){
            if(count>0){
                callback({isOK:false,msg:"该邮箱地址已存在，请使用其他邮箱！"});
            }else{
                member.findOne({valid: 1,"loginPlatform.chatUserGroup" : {$elemMatch : {_id :params.groupType, userId :params.userId, userType : 0}}},'mobilePhone loginPlatform.chatUserGroup.$',function(err, row){
                    if(err){
                        logger.error("modifyEmail->update fail!"+err);
                        callback({isOK:false,msg:"修改失败，请联系客服！"});
                    }else{
                        member.update({valid:1,'mobilePhone':row.mobilePhone,'loginPlatform.chatUserGroup._id':params.groupType},{$set:{ "loginPlatform.chatUserGroup.$.email": params.email}},function(err,row1){
                            if(err){
                                logger.error("modifyEmail->update fail!"+err);
                                callback({isOK:false,msg:"修改失败，请联系客服！"});
                            }else{
                                callback({isOK:true});
                                if(common.isValid(params.item)) {
                                    var pointsParams = {change: 'email',groupType: params.groupType,userId: row.mobilePhone, item: params.item, val: 0,isGlobal: false,remark: '',opUser: params.userId,opIp: params.ip};
                                    userService.pointsChange(pointsParams,function(result){

                                    });
                                }
                            }
                        });
                    }
                });
            }
        });
    },
    /**
     * 修改密码
     * @param mobilePhone
     * @param groupType
     * @param callback
     */
    modifyPwd:function(userInfo,params,callback){
        member.findOne({valid:1,'mobilePhone':userInfo.mobilePhone,'loginPlatform.chatUserGroup._id':userInfo.groupType}, function(err, row){
            if(err && !row){
                logger.error("modifyPwd->update fail!"+err);
                callback({isOK:false,msg:"修改失败，请联系客服！"});
            } else if(row && common.checkArrExist(row.loginPlatform.chatUserGroup)) {
                var chatUserGroup = row.loginPlatform.chatUserGroup.id(userInfo.groupType);
                var pwd = common.getMD5(constant.pwdKey + params.password);
                if (common.isValid(chatUserGroup.pwd) && chatUserGroup.pwd != pwd) {
                    callback({isOK: false, msg: "输入的原始密码错误！"});
                } else {
                    chatUserGroup.pwd = common.getMD5(constant.pwdKey + params.newPwd);
                    row.save(function(err1, rowTmp){
                        if (err1) {
                            logger.error("modifyPwd->update fail!" + err1);
                            callback({isOK: false, msg: "修改失败，请联系客服！"});
                        } else {
                            callback({isOK: true});
                            if (common.isValid(params.item)) {
                                var pointsParams = {
                                    change: 'pwd',
                                    groupType: userInfo.groupType,
                                    userId: userInfo.mobilePhone,
                                    item: params.item,
                                    val: 0,
                                    isGlobal: false,
                                    remark: '',
                                    opUser: userInfo.userId,
                                    opIp: params.ip
                                };
                                userService.pointsChange(pointsParams, function (result) {

                                });
                            }
                        }
                    });
                }
            } else {
                callback({isOK: false, msg: "修改失败，请联系客服！"});
            }
        });
    },
    /**
     * 完善资料积分变化
     * @param mobilePhone
     * @param groupType
     * @param callback
     */
    pointsChange:function(params, callback){
        var isChange = false;
        member.findOne({mobilePhone: {$ne : params.mobilePhone},valid: 1,"loginPlatform.chatUserGroup" : {$elemMatch : {_id :params.groupType}}}, "loginPlatform.chatUserGroup.$", function(err, result){
            if(!err && result){
                if(params.change=='username' && common.isBlank(result.userName)){
                    isChange = true;
                }else if(params.change=='email' && common.isBlank(result.email)){
                    isChange = true;
                }else if(params.change=='pwd' && common.isBlank(result.pwd)){
                    isChange = true;
                }else if(params.change=='avatar' && common.isBlank(result.avatar)){
                    isChange = true;
                }
                if(isChange){
                    var pointsParam = {groupType:params.groupType, userId:params.userId, item:params.item, val:params.val, isGlobal:false, remark:params.remark, opUser:params.opUser, opIp:params.ip};
                    chatPointsService.add(pointsParam, function(err, res){
                        callback(res);
                    });
                }
            }
        });
    }
};
//导出服务类
module.exports =userService;

