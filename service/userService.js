/** 用户服务类
 * Created by Alan.wu on 2015/3/4.
 */
var http = require('http');//引入http
var member = require('../models/member');//引入member数据模型
var boUser = require('../models/boUser');//引入boUser数据模型
var chatGroup = require('../models/chatGroup');//引入chatGroup数据模型
var config = require('../resources/config');//引入配置
var common = require('../util/common');//引入common类
var querystring = require('querystring');

/**
 * 定义用户服务类
 * @type {{getMemberList: Function, updateMemberInfo: Function}}
 */
var userService = {
    cacheUserArr:[],//按组别分类保存用户信息的二维数组
    groupList:{},//组别类型(从数据库中提取，更新到该缓存中）
    /**
     * 根据平台初始化用户缓存集合
     */
    initCacheUserArr:function(groupId){
        if(userService.cacheUserArr.length==0){//不存在数据，则初始化
            for(var index in this.groupList){
                userService.cacheUserArr[this.groupList[index]._id]=[];
            }
        }else{//存在数据，则不同更新cacheUserArr数据
            var row=null;
            var newCacheUserArr=[];
            var gId=null;
            for(var gIndex in this.groupList){
                gId=this.groupList[index]._id;
                row=userService.cacheUserArr[gId];
                if(row!=null && row!=undefined && row.length>0){
                    newCacheUserArr[gId]=row;
                }else{
                    newCacheUserArr[gId]=[];
                }
            }
            if(newCacheUserArr.length>0){
                userService.cacheUserArr=newCacheUserArr;
            }
        }
    },
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
     * 更新组别数据（如后台有改动会同步组别数据）
     */
    synchGroupInfo:function(){
        chatGroup.find({valid:1},function (err,row) {
            userService.groupList=row;
            userService.initCacheUserArr();//初始化数组
        });
    },

    /**
     * 验证规则
     * @param groupId
     * @param content
     * @param callback
     */
    verifyRule:function(groupId,content,callback){
        var contentVal=content.value;
        if(content.msgType!='text'){
            callback(null);
            return;
        }
        chatGroup.findById(groupId,function (err,row) {
            var ruleArr=row.chatRules,resultTip=[],beforeVal='',type='';
            var periodStartDate= 0,periodEndDate= 0,currentTime= 0;
            //先检查禁止发言的规则
            for(var i in ruleArr){
                beforeVal=ruleArr[i].beforeRuleVal;
                type=ruleArr[i].type;
                periodStartDate=ruleArr[i].periodStartDate;
                periodEndDate=ruleArr[i].periodEndDate;
                currentTime=new Date().getTime();
                var isNullPeriod=(periodStartDate==null && periodEndDate==null);
                var isPeriod=periodStartDate!=null && currentTime>=periodStartDate.getTime() && periodEndDate!=null && currentTime<=periodEndDate.getTime();
                if(isPeriod && type=='speak_not_allowed'){
                    resultTip=[];
                    resultTip.push(ruleArr[i].afterRuleTips);
                    break;
                }
                if((isNullPeriod || isPeriod) && type!='speak_not_allowed' && common.isValid(beforeVal)){
                    beforeVal=beforeVal.replace(/(,|，)$/,'');//去掉结尾的逗号
                    beforeVal=beforeVal.replace(/,|，/g,'|');//逗号替换成|，便于统一使用正则表达式
                    if(type=='keyword_filter'||type=='url_filter'){//过滤关键字或过滤链接
                        if(eval('/'+beforeVal+'/').test(contentVal)){
                            resultTip.push(ruleArr[i].afterRuleTips);
                            break;
                        }
                    }
                    if(type=='keyword_replace'){//替换关键字
                        if(eval('/'+beforeVal+'/').test(contentVal)){
                            content.value=contentVal.replace(eval('/'+beforeVal+'/g'),ruleArr[i].afterRuleVal);
                            resultTip.push(ruleArr[i].afterRuleTips);
                        }
                    }
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
        var result={userType:0,isOk:false,isSys:true,nickName:''};
        var newUserInfo=null;
        if(config.fromPlatform.pm_mis==userInfo.fromPlatform){
            newUserInfo={accountNo:userInfo.userId,userId:''};
        }
        boUser.findOne({'userNo':userInfo.accountNo,'telephone':userInfo.mobilePhone},function(err,row) {
            if(!err && row){
                newUserInfo.mobilePhone=userInfo.mobilePhone=row.telephone;
                newUserInfo.nickname=userInfo.nickname=row.userName;
                newUserInfo.userType=newUserInfo.userType=config.roleUserType[row.role.roleNo];
                result.isOk=true;
                result.nickName=row.userName+"("+row.roleName+")";
                if(common.isBlank(result.userType)){
                    console.error("checkBackUserInfo->userType has error,please the config.roleUserType");
                }
                userService.createUser(newUserInfo, function (isOk) {});
            }
            callback(result);
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
                                isBindWechat:userInfo.isBindWechat,//是否绑定微信
                                intoChatTimes:1
                            }]
                        }
                    };
                    member.create(memberModel,function(err,count){
                        if(!err && count){
                            console.log('create member success!');
                            if(callback){
                                callback(true);
                            }
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
     * @param userId
     * @param groupId
     */
    checkUserLogin:function(userId,groupId,callback){
        member.findOne().select("loginPlatform.chatUserGroup.$").where('loginPlatform.chatUserGroup.userId').equals(userId).where('loginPlatform.chatUserGroup._id').equals(groupId).exec(function (err, row){
            if(!err && row){
                callback(row);
           }else{
                callback(null);
            }
        });
    },


    /**
     * 通过账号与手机号检查用户客户
     * @param userInfo
     */
    checkClient:function(userInfo,callback){
        //如果是微信，则验证客户是否A客户
        if(config.weChatGroupId==userInfo.groupId){
            //系统用户，检查是否已经存在
            if(eval("/^"+config.systemUserPrefix+'/').test(userInfo.userId)){
                userService.checkSystemUserInfo(userInfo,function(result){
                    callback(result);
                });
            }else{
                userService.checkAClient(userInfo,false,function(result){
                    callback(result);
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
                    if (allData.code == 'SUCCESS') {
                        var result = allData.result;
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

