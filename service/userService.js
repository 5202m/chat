/** 用户服务类
 * Created by Alan.wu on 2015/3/4.
 */
var http = require('http');//引入http
var member = require('../models/member');//引入member数据模型
var boUser = require('../models/boUser');//引入boUser数据模型
var chatGroup = require('../models/chatGroup');//引入chatGroup数据模型
var config = require('../resources/config');//引入配置
var constant = require('../constant/constant');//引入constant
var common = require('../util/common');//引入common类
var querystring = require('querystring');

/**
 * 定义用户服务类
 * @type {{getMemberList: Function, updateMemberInfo: Function}}
 */
var userService = {
    cacheUserArr:[],//按组别分类保存用户信息的二维数组
    /**
     * 移除在线用户
     * @param socketId
     */
    removeOnlineUser:function(socketId,callback){
        //从缓存中移除
        var groupArr=userService.cacheUserArr;
        var subArr=null,obj=null;
        var userInfo=null;
        for(var i in groupArr){
            subArr=groupArr[i];
            for(var k=0;k<subArr.length;k++){
                obj=subArr[k];
                if(obj.socket.id==socketId){
                    subArr.splice(k,1);
                    userInfo=obj.userInfo;
                    break;
                }
            }
            if(userInfo){
                break;
            }
        }
        //更新用户记录表的在线状态(下线设置为0）
        if(userInfo!=null) {
            userService.updateChatUserGroupStatus(userInfo, '0', function (err) {
                if(!err){
                    console.log("update member status success!");
                }
            });
            callback(userInfo.groupId);
        }else{
            callback(null);
        }
    },
    /**
     * 检查用户禁言
     */
    checkUserGag:function(row){
        var subRow = row.loginPlatform.chatUserGroup[0],currentDate=new Date();
        if(subRow.gagStartDate && subRow.gagEndDate && subRow.gagStartDate<=currentDate && subRow.gagEndDate>=currentDate){
            return subRow.gagTips;
        }else{
            return null;
        }
    },
    /**
     * 验证规则
     * @param groupId
     * @param content
     * @param callback
     */
    verifyRule:function(groupId,content,callback){
        if(content.msgType!='text'){
            callback(null);
            return;
        }
		var contentVal=content.value.replace(/&lt;label class=\\"dt-send-name\\" tid=\\".+\\"&gt;@.*&lt;\/label&gt;/g,'');//排除@它html
        if(/&lt;[^(&gt;)].*?&gt;/g.test(contentVal)){ //过滤特殊字符
            callback(" 有特殊字符，已被拒绝！");
            return;
        }
        chatGroup.findById(groupId,function (err,row) {
            if(err||!row){
                callback(null);
                return;
            }
            var ruleArr=row.chatRules,resultTip=[],beforeVal='',type='',tip='';
            var periodStartDate= 0,periodEndDate= 0,currentTime= 0;
            var urlArr=[],urlTipArr=[],ruleRow=null;
            //先检查禁止发言的规则
            for(var i in ruleArr){
                ruleRow=ruleArr[i];
                beforeVal=ruleRow.beforeRuleVal;
                type=ruleRow.type;
                tip=ruleRow.afterRuleTips;
                periodStartDate=ruleRow.periodStartDate;
                periodEndDate=ruleRow.periodEndDate;
                currentTime=new Date().getTime();
                var isNullPeriod=(periodStartDate==null && periodEndDate==null);
                var isPeriod=periodStartDate!=null && currentTime>=periodStartDate.getTime() && periodEndDate!=null && currentTime<=periodEndDate.getTime();
                if(isPeriod && type=='speak_not_allowed'){
                    resultTip=[];
                    resultTip.push(tip);
                    callback(resultTip.join(";"));
                    return;
                }
                if((isNullPeriod || isPeriod) && type!='speak_not_allowed' && common.isValid(beforeVal)){
                    beforeVal=beforeVal.replace(/(,|，)$/,'');//去掉结尾的逗号
                    beforeVal=beforeVal.replace(/,|，/g,'|');//逗号替换成|，便于统一使用正则表达式
                    if(type=='keyword_filter'){//过滤关键字或过滤链接
                        if(eval('/'+beforeVal+'/').test(contentVal)){
                            resultTip=[];
                            resultTip.push(tip);
                            callback(resultTip.join(";"));
                            return;
                        }
                    }
                    if(type=='url_not_allowed' && common.urlReg().test(contentVal)){//禁止链接
                        resultTip=[];
                        resultTip.push(tip);
                        callback(resultTip.join(";"));
                        return;
                    }
                    if(type=='url_allowed'){//除该连接外其他连接会禁止
                        urlArr.push(beforeVal);
                        urlTipArr.push(tip);
                    }
                    if(type=='keyword_replace'){//替换关键字
                        if(eval('/'+beforeVal+'/').test(contentVal)){
                            content.value=contentVal.replace(eval('/'+beforeVal+'/g'),ruleArr[i].afterRuleVal);
                            resultTip.push(tip);
                        }
                    }
                }
            }
            if(urlArr.length>0 && common.urlReg().test(contentVal)){
                var val=urlArr.join("|").replace(/\//g,'\\\/').replace(/\./g,'\\\.');
                if(!eval('/'+val+'/').test(contentVal)){
                    resultTip=[];
                    resultTip.push(urlTipArr.join(";"));
                }
            }
            callback(resultTip.join(";"));
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
     * 检查后台进入聊天室的用户，是则直接登录聊天室
     */
    checkSystemUserInfo:function(userInfo,callback){
        var result={userType:0,isOk:false,isSys:true,nickname:''};
        var newUserInfo={groupId:userInfo.groupId,accountNo:userInfo.accountNo,userId:userInfo.userId,mobilePhone:userInfo.mobilePhone};
        if(constant.fromPlatform.pm_mis==userInfo.fromPlatform){
            newUserInfo.accountNo=userInfo.userId;
            newUserInfo.userId='';
        }
        console.log("newUserInfo:"+JSON.stringify(newUserInfo));
        boUser.findOne({'userNo':newUserInfo.accountNo,'telephone':newUserInfo.mobilePhone},function(err,row) {
            if(!err && row){
                console.log("boUser->row:"+JSON.stringify(row));
                result.isOk=true;
                result.userType=newUserInfo.userType=userInfo.userType=constant.roleUserType[row.role.roleNo];
                result.nickname=userInfo.nickname=newUserInfo.nickname=row.userName+"("+row.role.roleName+")";
                if(common.isBlank(result.userType)){
                    console.error("checkBackUserInfo->userType has error,please the constant.roleUserType");
                }
                userService.createUser(newUserInfo, function (isOk) {
                    if(!isOk){
                        userService.updateUserGroupByAccountNo(newUserInfo,function(isOk){
                            callback(result);
                        });
                    }else{
                        callback(result);
                    }
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
        member.findOne({'mobilePhone':userInfo.mobilePhone},function(err,row){
                if(!err && row ){
                    userService.createChatUserGroupInfo(userInfo);
                    if(callback) {
                        callback(false);
                    }
                }else{
                    var memberModel = {
                        _id:null,
                        mobilePhone:userInfo.mobilePhone,
                        status:1, //内容状态：0 、禁用 ；1、启动
                        valid:1,//有效
                        createUser:userInfo.userId,
                        createIp:userInfo.ip,//新增记录的Ip
                        updateIp:userInfo.ip,//新增记录的Ip
                        createDate:new Date(),//创建日期
                        loginPlatform:{
                            chatUserGroup:[
                             {  _id:userInfo.groupId,//组id，与聊天室组对应
                                userId:userInfo.userId,//第三方用户id，对于微信，userId为微信的openId;
                                onlineStatus: 1, //在线状态：0 、下线 ；1、在线
                                onlineDate: new Date(),//上线时间
                                avatar:userInfo.avatar,//头像
                                nickname:userInfo.nickname,//昵称
                                accountNo:userInfo.accountNo, //账号
                                userType:userInfo.userType, //用户类型
                                isBindWechat:userInfo.isBindWechat,//是否绑定微信
                                intoChatTimes:1
                            }]
                        }
                    };
                    member.create(memberModel,function(err,count){
                        console.log('create member success!');
                        if(callback){
                            callback(!err && count);
                        }
                    });
                }
        });
    },

    /**
     * 新增会员登录聊天室的用户组信息
     * @param userInfo
     * @param callback
     */
    createChatUserGroupInfo:function(userInfo,callback){
        var jsonStr={_id:userInfo.groupId,userId:userInfo.userId,onlineStatus:1,onlineDate:new Date(),avatar:userInfo.avatar,nickname:userInfo.nickname};
        member.findOneAndUpdate({'mobilePhone':userInfo.mobilePhone,'loginPlatform.chatUserGroup._id':{$ne:userInfo.groupId}},{'$push':{'loginPlatform.chatUserGroup':jsonStr}},function(err,row){
                if(!err && row){
                    console.log('create ChatUserGroupInfo!');
                }
        });
    },
    /**
     * 更新会员信息
     * 备注：判断是否存在登录信息，不存在则新增，存在则更新
     * @param userInfo
     * @param callback
     */
    updateMemberInfo:function(userInfo){
        //存在则更新上线状态及上线时间
        member.findOneAndUpdate({'loginPlatform.chatUserGroup.userId':userInfo.userId,'loginPlatform.chatUserGroup._id':userInfo.groupId},
            {'$set':{'loginPlatform.chatUserGroup.$.onlineDate':userInfo.onlineDate,'loginPlatform.chatUserGroup.$.onlineStatus':userInfo.onlineStatus}},function(err,row){
                if(!err && row){
                    console.log("updateMemberInfo->update member success!");
                }
            });
    },

    /**
     * 根据accountNo更新会员用户组
     * 备注：判断是否存在登录信息，存在则更新
     * @param userInfo
     * @param callback
     */
    updateUserGroupByAccountNo:function(userInfo,callback){
        //存在则更新上线状态及上线时间
        member.findOneAndUpdate({'mobilePhone':userInfo.mobilePhone,'loginPlatform.chatUserGroup.accountNo':userInfo.accountNo,'loginPlatform.chatUserGroup._id':userInfo.groupId},
            {'$set':{'loginPlatform.chatUserGroup.$.onlineDate':new Date(),
                      'loginPlatform.chatUserGroup.$.onlineStatus':1,
                      'loginPlatform.chatUserGroup.$.userId':userInfo.userId
            }},function(err,row){
                callback(!err && row);
                console.log("updateUserGroupByAccountNo->update info!");
            });
    },

    /**
     *下线更新会员状态
     */
    updateChatUserGroupStatus:function(userInfo,chatStatus,callback){
        member.findOneAndUpdate({'loginPlatform.chatUserGroup.userId':userInfo.userId,'loginPlatform.chatUserGroup._id':userInfo.groupId},
            {'$set':{'loginPlatform.chatUserGroup.$.onlineStatus':chatStatus}},function(err,row){
            callback(err);
        });
    },

    /**
     * 更新微信用户组绑定微信的信息
     * @param groupId
     * @param userId
     * @param isBindWechat
     * @param callback
     */
    updateChatUserGroupWechat:function(groupId,userId,isBindWechat,intoChatTimes){
        member.findOneAndUpdate({'loginPlatform.chatUserGroup.userId':userId,'loginPlatform.chatUserGroup._id':groupId},
            {'$set':{'loginPlatform.chatUserGroup.$.isBindWechat':isBindWechat,'loginPlatform.chatUserGroup.$.intoChatTimes':intoChatTimes}},function(err,row){
                if(!err && row){
                    console.log("updateChatUserGroupWechat->update success!");
                }
            });
    },
    /**
     * 通过userId及组别检测用户是否已经登录过
     * @param userInfo
     */
    checkUserLogin:function(userInfo,callback){
        if(constant.fromPlatform.pm_mis==userInfo.fromPlatform){
            member.findOne().select("loginPlatform.chatUserGroup.$").where('loginPlatform.chatUserGroup.accountNo').equals(userInfo.accountNo).where('loginPlatform.chatUserGroup._id').equals(userInfo.groupId).exec(function (err, row){
                if(!err && row){
                    callback(row);
                }else{
                    callback(null);
                }
            });
        }else{
            member.findOne().select("loginPlatform.chatUserGroup.$").where('loginPlatform.chatUserGroup.userId').equals(userInfo.userId).where('loginPlatform.chatUserGroup._id').equals(userInfo.groupId).exec(function (err, row){
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
    checkClient:function(userInfo,callback){
        //如果是微信，则验证客户是否A客户
        if(constant.weChatGroupId==userInfo.groupId){
            //系统用户，检查是否已经存在
            if(eval("/^"+constant.systemUserPrefix+'/').test(userInfo.accountNo)){
                userInfo.accountNo=userInfo.accountNo.replace(constant.systemUserPrefix,"");
                userService.checkSystemUserInfo(userInfo,function(result){
                    callback(result);
                });
            }else{
                var accountNoTemp=userInfo.accountNo.substring(1,userInfo.accountNo.length);
                console.log("checkClient->accountNoTemp:"+accountNoTemp);
                member.find({ 'loginPlatform.chatUserGroup.accountNo': eval('/.+'+accountNoTemp+'$/')}).where('loginPlatform.chatUserGroup._id').equals(userInfo.groupId).count(function (err,count){
                    if(!err && count>0){
                        callback({flag:4});//账号已被绑定
                    }else{
                        userService.checkAClient(userInfo,false,function(result){
                            callback(result);
                        });
                    }
                });
            }
        }else {
            //其他组别如需要验证，可按需求加入相关方法，该版本默认不做验证，直接记录登录信息
            userService.createUser(userInfo,function(isOk){
                callback({flag:0});
            });
        }
    },

    /**
     * 通过账号与手机号检查用户是否A客户
     * 备注：目前只是微信组聊天室客户发言时需检测
     * @param userInfo
     */
    checkAClient:function(userInfo,isCheckBindWechat,callback){
        var flagResult={flag:0};//客户记录标志:0（记录不存在）、1（未绑定微信）、2（未入金激活）、3（绑定微信并且已经入金激活）
        var postData = querystring.stringify({
            'loginname' :userInfo.accountNo
        });
        var options = {
            hostname: config.goldApiHostname,
            port: config.goldApiPort,
            path: config.getCustomerInfoUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length
            }
        };
        var req=http.request(options, function(res) {
            res.setEncoding('utf8');
            var tmpData="";
            res.on('data', function (data) {//异步分包接收数据（如数据量大）
                tmpData+=data;
            });
            res.on('end', function () {
                if(common.isValid(tmpData)) {
                    var allData = JSON.parse(tmpData);
                    var result = allData.result;
                    if (allData.code == 'SUCCESS'&& result!=null) {
                        if(!isCheckBindWechat){
                            if (result.mobilePhone.indexOf(userInfo.mobilePhone)==-1) {
                                flagResult.flag = 0;//没有对应记录
                            }  else if (result.accountStatus != 'A') {
                                flagResult.flag = 2;//未入金激活
                            } else if (result.isBindWeichat!=1) {
                                flagResult.flag = 1;//未绑定微信
                                //验证通过，成为聊天室会员，记录信息
                                userInfo.isBindWechat=false;
                                userService.createUser(userInfo);
                            }else {
                                flagResult.flag = 3;//绑定微信并且已经入金激活
                                //验证通过，成为聊天室会员，记录信息
                                userInfo.isBindWechat=true;
                                userService.createUser(userInfo);
                            }
                        }else if (result.isBindWeichat==1){
                            flagResult.flag = 5;//绑定微信
                        }
                    } else {
                        flagResult.flag = 0;//没有对应记录
                    }
                }
                callback(flagResult);
            });
        }).on('error', function(e) {
            console.log("Get Customer Info Error: " + e.message);
        });
      req.write(postData);
      req.end();
    }
};

//导出服务类
module.exports =userService;

