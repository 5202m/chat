/** 直播服务类
 * Created by Alan.wu on 2015/7/8.
 */
var http = require('http');//引入http
var async = require('async');//引入async
var constant = require('../constant/constant');//引入constant
var chatGroup = require('../models/chatGroup');//引入chatGroup数据模型
var member = require('../models/member');//引入member数据模型
var chatClientGroup = require('../models/chatClientGroup');//引入chatClientGroup数据模型
var common = require('../util/common');//引入common类
var errorMessage = require('../util/errorMessage');//引入errorMessage类
var pmApiService = require('../service/pmApiService');//引入pmApiService
var logger=require('../resources/logConf').getLogger('studioService');//引入log4js
var userService = require('../service/userService');//引入userService
var syllabusService = require('../service/syllabusService');//引入syllabusService
/**
 * 定义直播服务类
 * @type {{}}
 */
var studioService = {
    /**
     * 提取主页需要加载的数据
     * @param groupId
     * @param isGetRoomList 是否加载房间
     * @param isGetSyllabus 是否加载课程表数据
     * @param dataCallback
     */
    getIndexLoadData:function(groupId,isGetRoomList,isGetSyllabus,dataCallback){
        async.parallel({
                studioList: function(callback){
                    if(isGetRoomList){
                        studioService.getStudioList(function(rows){
                            callback(null,rows);
                        });
                    }else{
                        callback(null,null);
                    }
                },
                syllabusResult: function(callback){
                    if(isGetSyllabus){
                        syllabusService.getSyllabus("studio", groupId, function(data){
                            callback(null,data);
                        });
                    }else{
                        callback(null,null);
                    }
                }
            },
            function(err, results) {
                dataCallback(results);
            });
    },
    /**
     * 提取直播间列表
     */
     getStudioList:function(callback){
        chatGroup.find({valid:1,status:1,groupType:constant.fromPlatform.studio}).select({clientGroup:1,remark:1,name:1,level:1,groupType:1,talkStyle:1,whisperRoles:1,chatRules:1,openDate:1}).sort({'sequence':'asc'}).exec(function (err,rows) {
            if(err){
                logger.error("getStudioList fail:"+err);
            }
            callback(rows);
        });
     },
    /**
     * 提取客户组列表
     * @param callback
     */
    getClientGroupList:function(callback){
        chatClientGroup.find({valid:1}).sort({'sequence':'asc'}).exec(function (err,rows) {
            if(err){
                logger.error("getClientGroupList fail:"+err);
            }
            callback(rows);
        });
    },
    /**
     * 重置密码
     */
    resetPwd:function(mobilePhone,newPwd,oldPwd,callback){
        var searchObj=null;
        if(common.isValid(oldPwd)){
            searchObj={valid:1,'mobilePhone':mobilePhone,'loginPlatform.chatUserGroup':{$elemMatch:{_id:constant.fromPlatform.studio,pwd:common.getMD5(constant.pwdKey+oldPwd)}}};
        }else{
            searchObj={valid:1,'mobilePhone':mobilePhone,'loginPlatform.chatUserGroup._id':constant.fromPlatform.studio};
        }
        member.findOneAndUpdate(searchObj,{'$set':{'loginPlatform.chatUserGroup.$.pwd':common.getMD5(constant.pwdKey+newPwd)}},function(err,row){
            if(err || !row){
                logger.error("resetPwd fail:"+err);
                callback({isOK:false,error:errorMessage.code_1008});
            }else{
                callback({isOK:true,error:null});
            }
        });
    },

    /**
     * 提取直播间
     */
    getStudioByGroupId:function(groupId,callback){
        chatGroup.findById(groupId).select({clientGroup:1,name:1,talkStyle:1,whisperRoles:1}).exec(function (err,row) {
            if(err){
                logger.error("getStudioList fail:"+err);
            }
            callback(row);
        });
    },
    /**
     * 检查用户组权限
     */
    checkGroupAuth:function(groupId,clientGroup,callback){
        chatGroup.find({'_id':groupId,valid:1,'clientGroup':common.getSplitMatchReg(clientGroup)}).count(function (err,rowNum) {
            if(err){
                logger.warn("checkGroupAuth->not auth:"+err);
            }
            callback(rowNum>0);
        });
    },

    /**
     * 通过客户组提取默认房间
     * @param clientGroup
     */
     getDefaultRoom:function(clientGroup,callback){
        chatClientGroup.findById(clientGroup,function(err,row){
            callback(row?row.defChatGroupId:'');
        });
     },
    /**
     * 直播间注册
     * @param callback
     */
     studioRegister:function(userInfo,clientGroup,callback){
        var result={isOK:false,error:errorMessage.code_10};
        if(userInfo.nickname){
            //判断昵称唯一
            studioService.checkNickName(userInfo, function(err, isValid){
                if(err){
                    callback(result);
                }else if(isValid){
                    studioService.studioRegisterSave(userInfo, clientGroup, callback);
                }else{ //重复
                    result.error=errorMessage.code_1012;
                    callback(result);
                }
            });
        }else{
            studioService.studioRegisterSave(userInfo, clientGroup, callback);
        }
    },
    /**
     * 直播间注册保存
     */
    studioRegisterSave : function(userInfo, clientGroup, callback){
        var result={isOK:false,error:errorMessage.code_10};
        member.findOne({mobilePhone:userInfo.mobilePhone,valid:1},"loginPlatform.chatUserGroup",function (err,row) {
            if(err){
                logger.error("studioRegister fail:"+err);
                callback(result);
                return;
            }
            if(row){
                if(row.loginPlatform && common.checkArrExist(row.loginPlatform.chatUserGroup)){
                    var userGroup=row.loginPlatform.chatUserGroup;
                    for(var i in userGroup){
                        if(userGroup[i]._id==userInfo.groupType){
                            result.error=errorMessage.code_1004;
                            callback(result);
                            return;
                        }
                    }
                }
            }
            if(common.isBlank(clientGroup)){//如果检测的clientGroup为空则再次检查
                studioService.checkClientGroup(userInfo.mobilePhone,null,function(val){
                    userInfo.clientGroup=val;
                    studioService.setClientInfo(row,userInfo,function(resultTmp){
                        callback(resultTmp);
                    });
                })
            }else{
                userInfo.clientGroup=clientGroup;
                studioService.setClientInfo(row,userInfo,function(resultTmp){
                    callback(resultTmp);
                });
            }
        });
    },
    /**
     * 判断昵称唯一
     * @param userInfo {{mobilePhone:String, groupType:String, nickname:String}}
     * @param callback (err, boolean)，true-唯一，false-不唯一
     */
    checkNickName : function(userInfo, callback){
        member.findOne({
            mobilePhone: {$ne : userInfo.mobilePhone},
            valid: 1,
            "loginPlatform.chatUserGroup" : {$elemMatch : {
                _id : userInfo.groupType,
                nickname : userInfo.nickname,
                userType : 0
            }}
        }, "loginPlatform.chatUserGroup", function(err, sameNicknameRow){
            if(err){
                logger.error("studioRegister fail:"+err);
                callback(err, false);
                return;
            }
            //存在记录，昵称重复
            if(sameNicknameRow){
                callback(null, false);
            }else{
                callback(null, true);
            }
        });
    },
    /**
     * 通过手机号码提取用户id
     * @param mobilePhone
     */
    formatMobileToUserId:function(mobilePhone){
        var str=[];
        str[0]='p',str[1]='x',str[2]='i',str[3]='u',str[4]='d',str[5]='c',str[6]='v',str[7]='s',str[8]='n',str[9]='f';
        var userId='';
        for(var i=0;i<mobilePhone.length;i++){
            userId+=str[parseInt(mobilePhone.charAt(i))];
        }
        var index1=Math.floor(Math.random() * 10),index2=Math.floor(Math.random() * 10);
        return str[index1]+userId+str[index2];
    },
    /**
     * 设置客户信息
     * @param memberRow 是否存在客户记录
     * @param userInfo
     */
    setClientInfo:function(memberRow,userInfo,callback){
        var result={isOK:false,error:errorMessage.code_10,defGroupId:''};
        studioService.getDefaultRoom(userInfo.clientGroup,function(defId){
            if(common.isBlank(defId)){
                callback(result);
            }else{
                userInfo.groupId=defId;//提取默认房间
                userInfo.userId=studioService.formatMobileToUserId(userInfo.mobilePhone);
                result.userId=userInfo.userId;
                result.defGroupId=defId;
                userInfo.pwd=common.getMD5(constant.pwdKey+userInfo.pwd);
                if(memberRow){//插入记录
                    var hasRoomsRow=common.checkArrExist(memberRow.loginPlatform.chatUserGroup) && memberRow.loginPlatform.chatUserGroup.id(userInfo.groupType);
                    userService.createChatUserGroupInfo(userInfo,hasRoomsRow,function(isSuccess){
                        result.isOK=isSuccess;
                        callback(result);
                    });
                }else{
                    userService.saveMember(userInfo,function(isSuccess){
                        result.isOK=isSuccess;
                        callback(result);
                    });
                }
            }
        });
    },

    /**
     * 加入新的房间组
     * @param groupType
     * @param mobilePhone
     * @param userId
     * @param newGroupId
     * @param isLogin
     * @param callback
     */
    joinNewGroup:function(groupType, mobilePhone,userId,newGroupId,isLogin,callback){
        var result={isOK:false,error:null};
        if(!isLogin){
            result.isOK=true;
            callback(result);
            return;
        }
        userService.joinNewRoom({groupType:groupType,userId:userId,groupId:newGroupId, mobilePhone : mobilePhone},function(){
            result.isOK=true;
            callback(result);
        });
    },
    /**
     * 通过手机号码检测客户组
     * @param mobilePhone
     */
    checkClientGroup:function(mobilePhone,accountNo,callback){
        var clientGroup=constant.clientGroup.register;
        userService.checkAClient(false,mobilePhone,accountNo,'',function(result){
            console.log("checkAClient->flagResult:"+JSON.stringify(result));
            if(result.flag==2){
                clientGroup=constant.clientGroup.notActive;
                callback(clientGroup, result.accountNo);
            }else if(result.flag==3){
                clientGroup=constant.clientGroup.active;
                callback(clientGroup, result.accountNo);
            }else{
                //检查用户是否模拟用户
                userService.checkSimulateClient(mobilePhone,function(hasRow){
                    if(hasRow){
                        clientGroup=constant.clientGroup.simulate;
                    }
                    callback(clientGroup);
                });
            }
        });
    },
    /**
     * 客户登陆
     * @param userInfo
     * @param type
     *          1-手机登录,匹配手机号
     *          2-自动登录,匹配userId
     * @param callback
     */
    login:function(userInfo,type,callback){
        var result={isOK:false,error:''},searchObj=null;
        switch(type){
            case 1: //手机号登录
                searchObj={
                    mobilePhone : userInfo.mobilePhone,
                    valid : 1,
                    'loginPlatform.chatUserGroup._id':userInfo.groupType
                };
                break;
            case 2: //userId登录
                searchObj={
                    valid : 1,
                    "loginPlatform.chatUserGroup" : {$elemMatch : {
                        "_id" : userInfo.groupType,
                        "userId" : userInfo.userId
                    }}
                };
                break;
            default :
                result.error=errorMessage.code_1000;
                callback(result);
                return;
        }
        member.findOne(searchObj,'mobilePhone loginPlatform.chatUserGroup.$',function(err,row){
            if(row && common.checkArrExist(row.loginPlatform.chatUserGroup)){
                result.isOK=true;
                var info=row.loginPlatform.chatUserGroup[0];
                result.userInfo={mobilePhone:row.mobilePhone,userId:info.userId,nickname:info.nickname};
                result.userInfo.clientGroup=info.vipUser?constant.clientGroup.vip:info.clientGroup;
                callback(result);
            }else{
                result.error=errorMessage.code_1008;
                callback(result);
            }
        });
    },
    /**
     * 通过手机号码检测客户组
     * @param mobilePhone
     * @param clientGroup
     * @param callback
     */
    upgradeClientGroup:function(mobilePhone,clientGroup,callback){
        if(clientGroup === constant.clientGroup.active || clientGroup === constant.clientGroup.notActive ) {
            //升级到真实
            userService.checkAClient(false,mobilePhone,null,'', function (result) {
                console.log("checkAClient->flagResult:" + JSON.stringify(result));
                if(result.flag == 2 || result.flag == 3){
                    var clientGroupTmp = result.flag == 2 ? constant.clientGroup.notActive : constant.clientGroup.active;
                    studioService.updateClientGroup(mobilePhone, clientGroupTmp, function (isOk) {
                        if (isOk) {
                            callback(true, clientGroupTmp);
                        }else{
                            callback(false, null);
                        }
                    });
                }else{
                    callback(false, null);
                }
            });
        }else if(clientGroup === constant.clientGroup.simulate){
            //升级到模拟
            userService.checkSimulateClient(mobilePhone,function(hasRow){
                if(hasRow){
                    studioService.updateClientGroup(mobilePhone, constant.clientGroup.simulate, function(isOk){
                        if(isOk){
                            callback(true, constant.clientGroup.simulate);
                        }else{
                            callback(false, null);
                        }
                    });
                }else{
                    callback(false, null);
                }
            });
        }else{
            callback(false, null);
        }
    },
    /**
     * 更新客户组别
     * @param mobilePhone
     * @param newClientGroup
     * @param accountNo
     * @param callback
     */
    updateClientGroup : function(mobilePhone, newClientGroup, accountNo, callback){
        member.findOneAndUpdate(
            {
                mobilePhone : mobilePhone,
                "loginPlatform.chatUserGroup._id" : "studio",
                valid : 1,
                status : 1
            },
            {
                $set : {
                    "loginPlatform.chatUserGroup.$.clientGroup" : newClientGroup,
                    "loginPlatform.chatUserGroup.$.accountNo" : accountNo
                }
            },
            {'new' : true}, function(err){
                if(err){
                    logger.error("updateClientGroup fail:" + err);
                    callback(false);
                }
                callback(true);
            });
    }
};

//导出服务类
module.exports =studioService;

