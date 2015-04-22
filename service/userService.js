/** 用户服务类
 * Created by Alan.wu on 2015/3/4.
 */
var http = require('http');//引入http
var member = require('../models/member');//引入member数据模型
var chatGroup = require('../models/chatGroup');//引入chatGroup数据模型
var constant = require('../constant/constant');//引入constant
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
    removeOnlineUser:function(socketId){
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
        if(content.type!='text'){
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
                    if(type=='keyword_filter'){//过滤关键字
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
     * 新增用户信息
     * @param userInfo
     * @param callback
     */
    createUser:function(userInfo){
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
                        createIp:userInfo.createIp,//新增记录的Ip
                        createDate:new Date()//创建日期
                    };
                    member.create(memberModel,function(err,count){
                        if(!err && count){
                            userService.createChatUserGroupInfo(userInfo);
                            console.log('create member success!');
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
        console.log("createChatUserGroupInfo->userInfo:"+JSON.stringify(userInfo));
        member.findOneAndUpdate({'mobilePhone':userInfo.mobilePhone,'loginPlatform.chatUserGroup._id':{$ne:userInfo.groupId}},{'$push':{'loginPlatform.chatUserGroup':jsonStr}},function(err,row){
                if(!err && row){
                    console.log('create ChatUserGroupInfo!');
                }
        });
    },

    /**
     * 更新会员信息
     */
    saveChatUserGroupInfo:function(userInfo,callback){
        var jsonStr={_id:userInfo.groupId,onlineStatus:userInfo.onlineStatus,onlineDate:userInfo.onlineDate,avatar:userInfo.avatar,nickname:userInfo.nickname};
        member.findOneAndUpdate({'_id':userInfo.userId,'loginPlatform.chatUserGroup._id':{$ne:userInfo.groupId}},{'$push':{'loginPlatform.chatUserGroup':jsonStr}},function(err,row){
            if(!err && !row){
                member.findOneAndUpdate({'_id':userInfo.userId,'loginPlatform.chatUserGroup._id':userInfo.groupId},
                    {'$set':{'loginPlatform.chatUserGroup.$.onlineDate':userInfo.onlineDate,'loginPlatform.chatUserGroup.$.onlineStatus':userInfo.onlineStatus}},function(err){
                        callback(err);
                    });
            }else{
                callback(err);
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
     * 通过userId及组别检测用户是否已经登录过
     * @param userId
     * @param groupId
     */
    checkUserLogin:function(userId,groupId,callback){
        member.find().where('loginPlatform.chatUserGroup.userId').equals(userId).where('loginPlatform.chatUserGroup._id').equals(groupId).count(function (err, count){
            callback((!err && count!=0));
        });
    },


    /**
     * 通过账号与手机号检查用户客户
     * @param userInfo
     */
    checkClient:function(userInfo,callback){
        //如果是微信，则验证客户是否A客户
        if(constant.weChatGroupId==userInfo.groupId){
            userService.checkAClient(userInfo,function(result){
                callback(result);
            });
        }else {
            //其他组别如需要验证，可按需求加入相关方法，该版本默认不做验证，直接记录登录信息
            userService.createUser(userInfo);
        }
    },

    /**
     * 通过账号与手机号检查用户是否A客户
     * 备注：目前只是微信组聊天室客户发言时需检测
     * @param userInfo
     */
    checkAClient:function(userInfo,callback){
        var flagResult={flag:0};//客户记录标志:0（记录不存在）、1（未绑定微信）、2（未入金激活）、3（绑定微信并且已经入金激活）
        var postData = querystring.stringify({
            'loginname' :userInfo.accountNo
        });
        var options = {
            hostname: constant.goldApiHostname,
            port: constant.goldApiPort,
            path: constant.getCustomerInfoUrl,
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
                        if (result.mobilePhone.indexOf(userInfo.mobilePhone)==-1) {
                            flagResult.flag = 0;//没有对应记录
                        } else if (common.isBlank(result.weichatAccountNo)) {
                            flagResult.flag = 1;//未绑定微信
                        } else if (result.accountStatus != 'A') {
                            flagResult.flag = 2;//未入金激活
                        } else {
                            flagResult.flag = 3;//绑定微信并且已经入金激活
                            //验证通过，成为聊天室会员，记录信息
                            userService.createUser(userInfo);
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

