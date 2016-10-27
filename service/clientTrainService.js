var chatGroup = require('../models/chatGroup');//引入chatSubscribeType数据模型
var logger=require('../resources/logConf').getLogger('chatTeacherService');//引入log4js
var constant = require('../constant/constant');//引入constant
var common = require('../util/common');//引入common类
var errorMessage = require('../util/errorMessage');//引入errorMessage类
var signin = require('../models/signin');//引入signin数据模型
var async = require('async');//引入async
var chatPointsService = require('../service/chatPointsService');//引入chatPointsService

/**
 * 客户学员服务类型服务类
 *
 */
var clientTrainService = {
    /**
     * 客户学员报名
     * @param params
     * @param callback
     */
    addClientTrain: function(params,userInfo, callback){
        chatGroup.findOne({'defaultAnalyst.userNo':params.userNo,groupType:userInfo.groupType,"traninClient.clientId":userInfo.userId},"",function(err,row) {
            if(err){
                logger.error("查询培训报名数据失败! >>addClientTrain:", err);
                callback({isOK:false, msg:'查询培训报名数据失败！'});
            }else{
                if(row!= null){
                    callback(errorMessage.code_3003, null);
                }else{
                    var searchObj={'defaultAnalyst.userNo':params.userNo,groupType:userInfo.groupType};
                    var setObj = {$push:{"traninClient":{"clientId":userInfo.userId,"nickname":params.nickname}}};
                    chatGroup.findOneAndUpdate(searchObj, setObj, function (err,row) {
                        if (err) {
                            logger.error("保存培训报名数据失败! >>addClientTrain:", err);
                            callback({isOK:false, msg:'培训报名失败'});
                        }else{
                            if(params.updateTrain){
                                chatGroup.find({"groupType":userInfo.groupType,"defaultAnalyst":{$ne:[null],$exists:true},"defaultAnalyst._id":{$ne:""}},"",function(err,rooms){
                                    if(err){
                                        logger.error("获取房间列表失败!", err);
                                    }else{
                                        callback({isOK:true, msg: '培训报名成功',chatGroup:rooms});
                                    }
                                });
                            }else{
                                callback({isOK:true, msg: '培训报名成功'});
                            }
                        }
                    });
                }
            }
        });
    },

    /**
     * 获取房间列表
     * @param userId
     * @param callback
     */
    getChatGroupList:function(userInfo,callback){
        chatGroup.find({"groupType":userInfo.groupType,"defaultAnalyst":{$ne:[null],$exists:true},"defaultAnalyst._id":{$ne:""}},"",function(err,rooms){
            if(err){
                logger.error("获取房间列表失败! >>getChatGroupList:", err);
            }else{
                callback(rooms);
            }
        });
    },
    
    /**
     * 添加签到
     * @param params
     */
    addSignin : function(userInfo,clientip, callback){
        var searchObj={userId:userInfo.mobilePhone,groupType:userInfo.groupType};
        signin.findOne(searchObj,function(err,row) {
            if(err){
                logger.error("查询签到数据失败!:", err);
                callback(err,null);
            }else{
               if(null != row){
                   var signinTime = row.signinTime;//签到时间
                   var currentDate = new Date();    //当前时间
                   var dateDiff = common.getDateDiff(currentDate,signinTime);
                   var setObj = {};
                   if(dateDiff == 0){//当天已经签到了
                       callback(errorMessage.code_3002, null);
                       return;
                   }
                   if(dateDiff==1){//连续签到
                       setObj = {$set:{"signinTime":new Date()},$inc:{"signinDays":1,"serialSigDays":1},$push:{"historySignTime":new Date()}};
                   }
                   if(dateDiff >1){//不连续签到
                       setObj = {$set:{"signinTime":new Date(),"serialSigDays":1},$inc:{"signinDays":1},$push:{"historySignTime":new Date()}};
                   }
                   signin.update(searchObj,setObj,function(err,row){
                       if (err) {
                           logger.error("客户签到数据失败! >>addSignin:", err);
                           callback({isOK:false, msg:'客户签到失败'});
                       }else{
                           var  everySignParam =  {
                               groupType:userInfo.groupType,
                               clientGroup:userInfo.clientGroup,
                               userId:userInfo.mobilePhone,
                               item:'daily_sign',
                               val:null,
                               isGlobal:false,
                               remark:"每日签到",
                               opUser:userInfo.userName,
                               opIp:clientip
                           };
                           chatPointsService.add(everySignParam, function(result){});
                           var  serialSignParam =  {
                               groupType:userInfo.groupType,
                               clientGroup:userInfo.clientGroup,
                               userId:userInfo.mobilePhone,
                               item:'daily_sign',
                               val:null,
                               isGlobal:false,
                               remark:"连续签到",
                               opUser:userInfo.userName,
                               opIp:clientip
                           };
                           chatPointsService.add(serialSignParam, function(result){});
                           callback({isOK:true, msg:'客户签到成功'});
                       }
                   });
               }else{
                   var setObj = {
                       userId:userInfo.mobilePhone,
                       groupType:userInfo.groupType,
                       avatar:userInfo.avatar,
                       signinTime:new Date(),
                       historySignTime:[new Date()],
                       signinDays:1,
                       serialSigDays:1
                   };
                   new signin(setObj).save(function(err){
                       if (err) {
                           logger.error("客户签到数据失败! >>addSignin:", err);
                           callback({isOK:false, msg:'客户签到失败'});
                       }else{
                           var  param =  {
                                           userId:userInfo.mobilePhone,
                                           clientGroup:userInfo.clientGroup,
                                           groupType:userInfo.groupType,
                                           item:'daily_sign',
                                           val:null,
                                           isGlobal:false,
                                           remark:"每日签到",
                                           opUser:userInfo.userName,
                                           opIp:clientip
                                        };
                           chatPointsService.add(param, function(result){});
                           callback({isOK:true, msg:'客户签到成功'});
                       }
                   });
               }
            }
        });
    },

    /**
     * 查询签到
     * @param params
     */
    getSignin : function(userInfo, dataCallback){
        async.parallel({
                signinInfo: function (callback) {
                    signin.findOne({
                            userId:userInfo.mobilePhone,
                            groupType:userInfo.groupType
                        }, function(err, row){
                        if (err) {
                            logger.error("查询客户签到数据失败!:", err);
                            callback(err,null);
                        }else{
                            callback(err,row);
                        }
                    });
                },
                signinList: function (callback) {
                    signin.find({"userId":{$ne:userInfo.mobilePhone}}).sort({"signinTime": -1}).exec("find", function (err, data) {
                        if (err) {
                            logger.error("查询最近签到客户数据失败!:", err);
                            callback(err,null);
                        }else{
                            callback(err,data);
                        }
                    });
                }
            },
            function (error, result) {
                dataCallback(result);
            })
    }
};
//导出服务类
module.exports = clientTrainService;