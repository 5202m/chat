/** 用户服务类
 * Created by Alan.wu on 2015/3/4.
 */
var http = require('http');//引入http
var member = require('../models/member');//引入member数据模型
var boUser = require('../models/boUser');//引入boUser数据模型
var boMenu = require('../models/boMenu');//引入boMenu数据模型
var boRole= require('../models/boRole');//引入boRole数据模型
var chatGroup = require('../models/chatGroup');//引入chatGroup数据模型
var config = require('../resources/config');//引入配置
var constant = require('../constant/constant');//引入constant
var common = require('../util/common');//引入common类
var request = require('request');
var visitorService=require('../service/visitorService');
var logger=require('../resources/logConf').getLogger('userService');//引入log4js
/**
 * 定义用户服务类
 * @type {{getMemberList: Function, updateMemberInfo: Function}}
 */
var userService = {
    /**
     * 提取gw或fx接口的签名
     * @param data
     */
    getApiSignature:function(data){
        var invokerVal='';
        if(data["_principal_"]){
            var pl=data["_principal_"];
            if(typeof pl!="object"){
                pl=JSON.parse(pl);
            }
            if(!pl.invoker || !constant.goldOrfxApiInvoker.hasOwnProperty(pl.invoker)){
                return null;
            }
            invokerVal=constant.goldOrfxApiInvoker[pl.invoker].value;
        }
        var names = [];
        for(var name in data){
            if(name == '_signature_'){
                continue;
            }else{
                names.push(name);
            }
        }
        names.sort();
        var str = '',value='';
        for(var i = 0; i < names.length; i++){
            value = data[names[i]];
            value = (value == null)? "" :(typeof value=="object"?JSON.stringify(value):value);
            str += value + '&';
        }
        str+=invokerVal;
        return common.getMD5(str);
    },
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
     * @param nickname
     * @param isWh 是否私聊
     * @param groupId
     * @param content
     * @param callback
     */
    verifyRule:function(nickname, isWh,userType,groupId,content,callback){
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
            var ruleArr=row.chatRules,resultTip=[],beforeVal='',type='',tip='';
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
                        callback({isOK:false,tip:tip});
                        return;
                    }
                    if(!isImg && isPass && type!='speak_not_allowed' && common.isValid(beforeVal)){
                        beforeVal=beforeVal.replace(/(,|，)$/,'');//去掉结尾的逗号
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
        var result={userType:0,isOK:false,isSys:true,nickname:''};
        var newUserInfo={groupType:userInfo.groupType,groupId:userInfo.groupId,accountNo:userInfo.accountNo,userId:userInfo.userId,mobilePhone:userInfo.mobilePhone};
        if(constant.fromPlatform.pm_mis==userInfo.fromPlatform){
            newUserInfo.accountNo=userInfo.userId;
            newUserInfo.userId='';//不需要填值
            newUserInfo.isFromBack=true;//来自后台
        }
        logger.info("checkSystemUserInfo=>newUserInfo:"+JSON.stringify(newUserInfo));
        boUser.findOne({'userNo':newUserInfo.accountNo,'telephone':newUserInfo.mobilePhone},function(err,row) {
            if(!err && row){
                result.isOK=true;
                result.position=row.position;
                result.introduction=row.introduction;
                result.avatar=row.avatar;
                var userTypeTmp=null;
                for(var p in constant.roleUserType){
                    if(common.hasPrefix(p,row.role.roleNo)){
                        userTypeTmp=constant.roleUserType[p];
                        result.roleNo=newUserInfo.roleNo=row.role.roleNo;
                        result.roleName=row.role.roleName;
                        break;
                    }
                }
                if(common.isBlank(userTypeTmp)){
                    callback(result);
                    return false;
                }
                result.userType=newUserInfo.userType=userInfo.userType=userTypeTmp;
                result.nickname=userInfo.nickname=newUserInfo.nickname=row.userName;
                if(common.isBlank(result.userType)){
                    logger.error("checkBackUserInfo->userType has error,please the constant.roleUserType");
                }
                if(userTypeTmp==constant.roleUserType.navy){//判断是否是后台水军用户，是则直接返回
                    result.isOK=true;
                    callback(result);
                    return false;
                }
                userService.createUser(newUserInfo, function (isOk) {
                    if(!newUserInfo.isFromBack){
                        member.findOne({valid:1,'mobilePhone':userInfo.mobilePhone,'loginPlatform.chatUserGroup':{$elemMatch:{_id:userInfo.groupType,accountNo:userInfo.accountNo,"rooms._id":userInfo.groupId}}},
                            function(err,row){
                                if(err){
                                    logger.error("updateUserGroupByAccountNo->update fail!"+err);
                                }else{
                                    var group=row.loginPlatform.chatUserGroup.id(userInfo.groupType),room=group.rooms.id(userInfo.groupId);
                                    group.userId=userInfo.userId;
                                    room.onlineDate=new Date();
                                    room.onlineStatus=1;
                                    row.save(function(err){
                                        logger.info("updateUserGroupByAccountNo->update info!");
                                    });
                                }
                            });
                    }
                    result.isOK=true;
                    callback(result);
                });
            }else{
                callback(result);
            }
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
                        if(common.isValid(userInfo.avatar)){
                            group.avatar=userInfo.avatar;
                        }
                        if(userInfo.fromPlatform == constant.fromPlatform.pm_mis){//后台用户更新用户类型
                            group.userType = userInfo.userType;
                            group.nickname=userInfo.nickname;
                        }
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
     * 通过账号与手机号检查用户客户
     * @param userInfo
     */
    checkClient:function(isfx,userInfo,callback){
        //系统用户，检查是否已经存在
        if(eval("/^"+constant.systemUserPrefix+'/').test(userInfo.accountNo)){
            userInfo.accountNo=userInfo.accountNo.replace(constant.systemUserPrefix,"");
            userService.checkSystemUserInfo(userInfo,function(result){
                callback(result);
            });
        }else{
            var accountNoTemp=userInfo.accountNo.substring(1,userInfo.accountNo.length);
            var searchObj = { "$or" : [{ 'mobilePhone':userInfo.mobilePhone,'loginPlatform.chatUserGroup':{$elemMatch:{_id:userInfo.groupType,accountNo:eval('/.+'+accountNoTemp+'$/')}}}
                ,{ 'mobilePhone':userInfo.mobilePhone,'loginPlatform.chatUserGroup':{$elemMatch:{_id:userInfo.groupType,userId:{ '$nin':['',null]}}}}]};
            member.find(searchObj).count(function (err,count){
                if(!err && count>0){
                    callback({flag:4});//账号已被绑定
                }else{
                    userInfo.userType=0;//默认为0
                    userService.checkAClient(isfx,userInfo.mobilePhone,userInfo.accountNo,userInfo.ip,false,function(result){
                        if(result.flag==1||result.flag==3){
                            //验证通过，成为聊天室会员，记录信息
                            userService.createUser(userInfo,function(isOk){
                                callback(result);
                            });
                        }else{
                            callback(result);
                        }
                    });
                }
            });
        }
    },
    /**
     * 通过账号与手机号检查用户是否A客户
     * @param isfx 是否外汇
     * @param mobile
     * @param accountNo
     * @param ip
     * @param isCheckByMobile 是否通过手机号检查
     * @param callback
     */
    checkAClient:function(isfx,mobile,accountNo,ip,isCheckByMobile,callback){
       if(isfx){//外汇
           this.checkFxAClient(mobile,accountNo,ip,isCheckByMobile,function(flagResult){
               callback(flagResult);
           });
       }else{//黄金
           this.checkGoldAClient(mobile,accountNo,function(flagResult){
               callback(flagResult);
           });
       }
    },

    /**
     * 黄金接口
     * 通过账号与手机号检查用户是否A客户
     * 备注：目前只是微信组聊天室客户发言时需检测，只针对goldApi
     * @param mobile
     * @param accountNo
     * @param callback
     */
    checkGoldAClient:function(mobile,accountNo,callback){
        var flagResult={flag:0};//客户记录标志:0（记录不存在）、1（未绑定微信）、2（未入金激活）、3（绑定微信并且已经入金激活）
        if(common.isBlank(accountNo)){
            request.post({url:(config.goldApiUrl+'/account/getCustomerInfoByMobileNo'), form: {mobileNo: '86-' + mobile}}, function(error,response,tmpData){
                //logger.info("checkContactInfo->error:"+error+";tmpData:"+tmpData);
                if(error){
                    logger.error("getCustomerInfoByMobileNo->error" + error);
                }
                if(!error && common.isValid(tmpData)) {
                    try{
                        var allData = JSON.parse(tmpData);
                        var result = allData.result;
                        if (allData.code == 'SUCCESS' && result && result.length > 0) {
                            flagResult.flag = 2;//未入金激活
                            var acc = null;
                            for(var i = 0, lenI = result ? result.length : 0; i < lenI; i++){
                                acc = result[i];
                                flagResult.accountNo = acc.accountNo;
                                if(acc.accountStatus == "A"){
                                    flagResult.flag = 3;
                                    break;
                                }
                            }
                        }
                    }catch(e){
                        logger.error("getCustomerInfoByMobileNo->error" + error);
                        flagResult.flag = 0;//没有对应记录
                    }
                }
                callback(flagResult);
            });
        }else{
            request.post({url:(config.goldApiUrl+'/account/getCustomerInfo'), form: {loginname:accountNo}}, function(error,response,tmpData){
                if(!error && common.isValid(tmpData)) {
                    try{
                        var allData = JSON.parse(tmpData);
                        var result = allData.result;
                        if (allData.code == 'SUCCESS'&& result!=null) {
                            if (result.mobilePhone.indexOf(mobile)==-1) {
                                flagResult.flag = 0;//没有对应记录
                            }  else if (result.accountStatus != 'A') {
                                flagResult.flag = 2;//未入金激活
                            } else if (result.isBindWeichat!=1) {
                                flagResult.flag = 1;//未绑定微信
                            }else {
                                flagResult.flag = 3;//绑定微信并且已经入金激活
                            }
                        } else {
                            flagResult.flag = 0;//没有对应记录
                        }
                    }catch(e){
                        logger.error("getCustomerInfo->error" + error);
                        flagResult.flag = 0;//没有对应记录
                    }
                }
                callback(flagResult);
            });
        }
    },

    /**外汇接口
     * 通过账号与手机号检查用户是否A客户
     * 备注：目前只是微信组聊天室客户发言时需检测，只针对fxApi(外汇)
     * @param mobile
     * @param accountNo
     * @param ip
     * @param callback
     * @returns
     */
    checkFxAClient:function(mobile,accountNo,ip,isCheckByMobile,callback){
        var flagResult={flag:0};
        if((!isCheckByMobile && common.isBlank(accountNo))||common.isBlank(mobile)){//检查输入参数是否为空
            callback(flagResult);
            return;
        }
        mobile=common.trim(mobile);
        if(isCheckByMobile){//通过手机号码传入检查数据(GTS2)
            var submitInfo={
                prefix:86,
                mobileNo:mobile,
                args:'[]',
                _principal_:{loginName:mobile, remoteIpAddress:ip, invoker:constant.goldOrfxApiInvoker.fx_website.key, companyId:2}
            };
            var sg=this.getApiSignature(submitInfo);
            if(!sg){
                callback(flagResult);
                return;
            }
            submitInfo["_signature_"]=sg;
            submitInfo['_principal_']=JSON.stringify(submitInfo['_principal_']);
            request.post({url:(config.gwfxGTS2ApiUrl+'/account/getCustomerByMobileNo'), form: submitInfo}, function(error,response,tmpData){
                /*logger.info("tmpDataGTS2:"+tmpData);*/
                if(!error && common.isValid(tmpData)) {
                    try{
                        var allData = JSON.parse(tmpData);
                        var result = allData.result;
                        if (allData.code == 'SUCCESS' && result && result.length > 0) {
                            flagResult.flag = 2;//未入金激活
                            var accList = null,acc=null;
                            for(var i = 0, lenI = result.length; i < lenI; i++){
                                accList = result[i].accountInfoList;
                                if(accList && accList.length>0){
                                    for(var k in accList){
                                        acc=accList[k];
                                        flagResult.accountNo = acc.accountNo;
                                        if(acc.activateTime){
                                            flagResult.flag = 3;
                                            break;
                                        }
                                    }
                                    if(flagResult.flag ==3){
                                        break;
                                    }
                                }
                            }
                        }
                    }catch(e){
                        logger.error("checkFxAClient by GTS2Api["+mobile+"]->error:"+e);
                        flagResult.flag=0;
                    }
                }else{
                    logger.error("checkFxAClient by GTS2Api["+mobile+"]->error:"+error);
                }
                if(flagResult.flag==0){ //如果没有GTS2账号，则检查MT4，通过手机号码传入检查数据(MT4)
                    request.post({url:(config.gwfxMT4ApiUrl+'/ForexCustomerManager/findCustomerInfoByPhone'), form: {mobilephone:'86--'+mobile}}, function(error,response,mt4TmpData){
                        /*logger.info("tmpDataMT4:"+mt4TmpData);*/
                        if(!error && common.isValid(mt4TmpData)) {
                            try{
                                var mt4Data = JSON.parse(mt4TmpData);
                                var mt4Result = mt4Data.result;
                                if (mt4Data.code == 'SUCCESS' && mt4Result && mt4Result.length > 0) {
                                    flagResult.flag = 2;//未入金激活
                                    var acc=null;
                                    for(var i = 0, lenI = mt4Result.length; i < lenI; i++){
                                        acc = mt4Result[i];
                                        flagResult.accountNo = acc.mt4Ploginname;
                                        if(acc.isActive=="1"){
                                            flagResult.flag = 3;
                                            break;
                                        }
                                    }
                                }
                            }catch(e){
                                logger.error("checkFxAClient by MT4Api["+mobile+"]->error:"+e);
                            }
                        }else{
                            logger.error("checkFxAClient by MT4Api["+mobile+"]->error:"+error);
                        }
                        callback(flagResult);
                    });
                }else{
                    callback(flagResult);
                }
            });
        }else{//通过账号传入检查数据
            accountNo=common.trim(accountNo);
            if(/^8[0-9]+$/g.test(accountNo)){//GTS2接口
                var submitInfo={
                    customerNumber:accountNo,
                    args:'[]',
                    _principal_:{loginName:accountNo, remoteIpAddress:ip, invoker:constant.goldOrfxApiInvoker.fx_website.key, companyId:2}
                };
                var sg=this.getApiSignature(submitInfo);
                if(!sg){
                    callback(flagResult);
                    return;
                }
                submitInfo["_signature_"]=sg;
                submitInfo['_principal_']=JSON.stringify(submitInfo['_principal_']);
                request.post({url:(config.gwfxGTS2ApiUrl+'/account/getCustomerByCustomerNumber'), form: submitInfo}, function(error,response,tmpData){
                    /* logger.info("tmpData:"+tmpData);*/
                    if(!error && common.isValid(tmpData)) {
                        var allData = null;
                        try{
                            allData = JSON.parse(tmpData);
                        }catch(e){
                            logger.error("checkFxAClient by GTS2Api["+mobile+"]->error:"+e);
                            callback(flagResult);
                            return;
                        }
                        var result = allData.result,row=null;
                        if (allData && allData.code == 'SUCCESS'&& result!=null && result.code=='OK' && (row=result.result)!=null) {
                            if (row.mobilePhone && (row.mobilePhone.indexOf(mobile)!=-1||mobile.indexOf(common.rmMobilePrefix(row.mobilePhone))!=-1)) {
                                flagResult.flag = 1;//存在记录
                            }else {
                                flagResult.flag =0;//没有对应记录
                            }
                        } else {
                            flagResult.flag = 0;//没有对应记录
                        }
                    }else{
                        logger.error("checkFxAClient by GTS2Api["+mobile+","+accountNo+"]->error:"+error);
                    }
                    callback(flagResult);
                });
            }else if(/^(90|92|95)[0-9]+$/g.test(accountNo)){//MT4接口 NZ：92/95开头 UK：90开头
                request.post({url:(config.gwfxMT4ApiUrl+'/ForexCustomerManager/findCustomerInfoByLoginname'), form: {loginname:accountNo}}, function(error,response,tmpData){
                    try{
                        if(!error && common.isValid(tmpData)) {
                            var allData = null;
                            try{
                                allData = JSON.parse(tmpData);
                            }catch(e){
                                logger.error("checkFxAClient by MT4Api["+mobile+"]->error:"+error);
                                callback(flagResult);
                                return;
                            }
                            if (allData && allData.code == 'SUCCESS'&& allData.result!=null) {
                                var dbPhone=allData.result.mobilePhone;
                                if (dbPhone &&(dbPhone.indexOf(mobile)!=-1||mobile.indexOf(common.rmMobilePrefix(dbPhone))!=-1)) {
                                    flagResult.flag = 1;//存在记录
                                }else {
                                    flagResult.flag = 0;//没有对应记录
                                }
                            } else {
                                flagResult.flag = 0;//没有对应记录
                            }
                        }else{
                            logger.error("checkFxAClient by MT4Api["+mobile+","+accountNo+"]->error:"+error);
                        }
                        callback(flagResult);
                    }catch(e){
                        logger.info("MT4Api->tmpData:"+tmpData);
                        logger.error("checkFxAClient by MT4Api["+mobile+","+accountNo+"]->e:"+e);
                        flagResult.flag=0;
                        callback(flagResult);
                    }
                });
            }else{
                callback(flagResult);
            }
        }
    },
    /**
     * 通过手机号检查模拟账户
     * @param isfx 是否外汇
     * @param mobilePhone
     * @param callback
     */
    checkSimulateClient:function(isfx,mobilePhone,callback){
        var isTrue=false;
        if(isfx){
            var submitInfo={
                countryCode:86,
                mobilePhone:mobilePhone,
                args:'[]',
                _principal_:{loginName:mobilePhone, remoteIpAddress:'', invoker:constant.goldOrfxApiInvoker.fx_website.key, companyId:2}
            };
            var sg=this.getApiSignature(submitInfo);
            if(!sg){
                callback(isTrue);
                return;
            }
            submitInfo["_signature_"]=sg;
            submitInfo['_principal_']=JSON.stringify(submitInfo['_principal_']);
            request.post({url:(config.gwfxGTS2SmApiUrl+'/checkDemoContainActivateMobilePhone'), form: submitInfo}, function(error,response,tmpData) {
                /*logger.info("tmpDataGTS2:" + tmpData);*/
                try{
                    if (!error && common.isValid(tmpData)) {
                        var allData = JSON.parse(tmpData);
                        isTrue=(allData.code == 'SUCCESS'&& allData.result);
                    } else {
                        logger.warn("checkSimulateClient by GTS2Api[" + mobilePhone + "]->error:" + error);
                    }
                }catch(e){
                    isTrue = false;
                    logger.error("checkSimulateClient by GTS2Api[" + mobilePhone + "]->error:" + e);
                }
                if (!isTrue) { //如果没有GTS2账号，则检查MT4，通过手机号码传入检查数据(MT4)
                    request.post({url: (config.gwfxMT4SmApiUrl + '/ForexCustomerManager/isPhoneExistDemoAcc'),form: {mobilephone: '86--' + mobilePhone}}, function (error, response, mt4TmpData) {
                        /*logger.info("tmpDataMT4:" + mt4TmpData);*/
                        try{
                            if (!error && common.isValid(mt4TmpData)) {
                                var mt4Data = JSON.parse(mt4TmpData);
                                isTrue=(mt4Data.code == 'SUCCESS'&& mt4Data.result);
                            } else {
                                logger.warn("checkSimulateClient by MT4Api[" + mobilePhone + "]->error:" + error);
                            }
                        }catch(e){
                            isTrue = false;
                            logger.error("checkSimulateClient by MT4Api[" + mobilePhone + "]->error:" + e);
                        }
                        callback(isTrue);
                    });
                } else {
                    callback(isTrue);
                }
            });
        }else{
            request.post({url:(config.simulateApiUrl+'/account/demo/checkEmailMobile'), form: {args:'["","86-'+mobilePhone+'"]'}}, function(error,response,data){
                logger.info("checkEmailMobile["+mobilePhone+"]->error:"+error+";tmpData:"+data);
                if(!error && common.isValid(data)) {
                    try{
                        var allData = JSON.parse(data),result = allData.result;
                        isTrue=(allData.code == 'SUCCESS'&& result!=null && result.code=='1044');
                    }catch(e){
                        isTrue = false;
                        logger.error("checkSimulateClient by GTSApi[" + mobilePhone + "]->error:" + e);
                    }
                }
                callback(isTrue);
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
    modifyAvatar:function(mobilePhone,groupType,avatar,callback){
        member.update({valid:1,'mobilePhone':mobilePhone,'loginPlatform.chatUserGroup._id':groupType},{$set:{ "loginPlatform.chatUserGroup.$.avatar": avatar}},function(err,row){
            if(err){
                logger.error("modifyAvatar->update fail!"+err);
                callback({isOK:false,msg:"修改失败，请联系客服！"});
            }else{
                callback({isOK:true});
            }
        });
    }
};
//导出服务类
module.exports =userService;

