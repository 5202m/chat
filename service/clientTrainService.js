var chatGroup = require('../models/chatGroup');//引入chatSubscribeType数据模型
var logger=require('../resources/logConf').getLogger('chatTeacherService');//引入log4js
var constant = require('../constant/constant');//引入constant
var common = require('../util/common');//引入common类
var errorMessage = require('../util/errorMessage');//引入errorMessage类
var signin = require('../models/signin');//引入signin数据模型
var chatPointsService = require('../service/chatPointsService');//引入chatPointsService
var async=require('async');
/**
 * 客户学员服务类型服务类
 *
 */
var clientTrainService = {
    /**
     * 保存培训班
     * @param groupId
     * @param userId
     * @param nickname
     */
    saveTrain:function(groupId,userId,nickname,callback){
        var setObj = {$push:{"traninClient":{"clientId":userId,"nickname":nickname}}};
        chatGroup.findOneAndUpdate({_id:groupId}, setObj, function (err,row) {
            if (err) {
                logger.error("保存培训报名数据失败! >>saveTrain:", err);
                callback({isOK:false, msg:'培训报名失败'});
            }else{
                callback({isOK:true, msg: '恭喜您！报名成功。'});
            }
        });
    },
    /**
     * 客户学员报名
     * @param params
     * @param callback
     */
    addClientTrain: function(params,userInfo, callback){
        chatGroup.findOne({_id:params.groupId,valid:1,status:{$in:[1,2]}},"openDate clientGroup traninClient",function(err,row) {
            if(err){
                logger.error("查询培训报名数据失败! >>addClientTrain:", err);
                callback({isOK:false, msg:'查询培训报名数据失败！'});
            }else{
                var retInfo={};
                if(row){
                    var openDate = JSON.parse(row.openDate);
                    var currDate = common.formatterDate(new Date(),'-'), currTime = common.getHHMMSS(new Date());
                    var isAuthTime = openDate.beginDate==currDate && openDate.weekTime[0].beginTime>currTime;
                    var isTraining = openDate.beginDate<=currDate && openDate.endDate >= currDate;
                    var weekArr = [6,0,1,2,3,4,5];
                    var week = new Date().getDay();
                    var isOpening = openDate.weekTime[weekArr[week]].beginTime<currTime && openDate.weekTime[weekArr[week]].endTime > currTime;
                    if(!common.containSplitStr(row.clientGroup,userInfo.clientGroup)){
                        retInfo=errorMessage.code_3005;
                    }else if(row.traninClient){
                        var trRow=null,isOpen=false,isEntered = false;
                        for(var i=0;i<row.traninClient.length;i++){
                            trRow=row.traninClient[i];
                            if(trRow.clientId==userInfo.userId){
                                isEntered = true;
                                if(isAuthTime){
                                    retInfo = errorMessage.code_3009;
                                } else {
                                    isOpen = common.dateTimeWeekCheck(row.openDate, false);
                                    if (trRow.isAuth == 1) {
                                        if(isTraining && !isOpening){
                                            errorMessage.code_3011.errmsg = errorMessage.code_3011.errmsg.replace("{time}", openDate.weekTime[weekArr[week]].beginTime+"到"+openDate.weekTime[weekArr[week]].endTime);
                                            retInfo = errorMessage.code_3011;
                                        } else {
                                            retInfo = isOpen ? {awInto: true} : errorMessage.code_3006;
                                        }
                                    } else {
                                        if(isTraining){
                                            retInfo = errorMessage.code_3007;
                                        } else {
                                            retInfo = isOpen ? errorMessage.code_3007 : errorMessage.code_3003;
                                        }
                                    }
                                }
                                break;
                            }
                        }
                        if(isAuthTime && !isEntered || isTraining && !isEntered){
                            retInfo = errorMessage.code_3010;
                        }
                        if(retInfo.errcode||retInfo.awInto){
                            callback(retInfo);
                        }else{
                            isOpen=common.dateTimeWeekCheck(row.openDate, false);
                            if(isOpen){
                                retInfo=errorMessage.code_3008;
                                callback(retInfo);
                            }else{
                                clientTrainService.saveTrain(params.groupId,userInfo.userId,params.nickname,function(saveRet){
                                    callback(saveRet);
                                });
                            }
                        }
                    }else{
                        clientTrainService.saveTrain(params.groupId,userInfo.userId,params.nickname,function(saveRet){
                            callback(saveRet);
                        });
                    }
             }else{
                callback({isOK:false, msg:'查询培训报名数据失败！'});
             }
            }
        });
    },
    /**
     * 提取培训班数及人数
     * @param groupType
     * @param teachId
     * @param dataCallback
     */
    getTrainAndClientNum:function(groupType,teachId,dataCallback){
        async.parallel({
                trainNum: function (callback) {
                    chatGroup.find({"groupType":groupType,roomType:'train',"defaultAnalyst.userNo":teachId,status:0}).count(function(err,num){
                        callback(null,num);
                    });
                },
                clientNum: function (callback) {
                    chatGroup.find({"groupType":groupType,roomType:'train',"defaultAnalyst.userNo":teachId},function(err,rooms){
                        var num=0;
                        if(rooms && rooms.length>0){
                            rooms.forEach(function(item){
                                num+=item.traninClient?item.traninClient.length:0;
                            });
                        }
                        callback(null,num);
                    });
                }
            },
            function (error, result) {
                dataCallback(result);
            }
        );
    },
    /**
     * 提取培训班列表
     * @param groupType
     * @param teachId
     * @param isAll
     * @param callback
     */
    getTrainList:function(groupType,teachId,isAll,callback){
        var searchObj={"groupType":groupType,roomType:'train'};
        var limit=50,searchFields="_id status defaultAnalyst point openDate clientGroup name traninClient";
        if(!isAll){
            searchObj.status={$in:[1,2]};
        }
        if(teachId){
            searchObj["defaultAnalyst.userNo"]=teachId;
            limit=2;
            searchFields+=" traninClient";
        }
        chatGroup.find(searchObj).select(searchFields).limit(limit).sort({'createDate':'desc'}).exec(function(err,rooms){
            if(err){
                logger.error("获取房间列表失败! >>getChatGroupList:", err);
                callback(null);
            }else{
                var tmList=[];
                var row=null,currDate = common.formatterDate(new Date(),'-');
                if(rooms && rooms.length>0){
                    for(var i=0;i<rooms.length;i++){
                        row=rooms[i];
                        var openDate = JSON.parse(row.openDate)||{};
                        var isEnd = (openDate.endDate<currDate)||false;
                        tmList.push({"_id":row._id,name:row.name,clientSize:(row.traninClient?row.traninClient.length:0),allowInto:common.dateTimeWeekCheck(row.openDate, false,true),clientGroup:row.clientGroup,defaultAnalyst:row.defaultAnalyst,status:row.status,isEnd:isEnd});
                    }
                }
                callback(tmList);
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
                   var signinTime = common.formatterDate(row.signinTime);//签到时间
                   var currentDate = common.formatterDate(new Date());    //当前时间
                   var dateDiff = common.getDateDiff(currentDate,signinTime);
                   var setObj = {};
                   if(signinTime == currentDate){//当天已经签到了
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
                               userId:userInfo.mobilePhone,
                               groupType:userInfo.groupType,
                               clientGroup:userInfo.clientGroup,
                               type:'daily',
                               item : 'daily_sign',
                               tag : 'sign',
                               isGlobal:false,
                               opUser:userInfo.userId,
                               opIp:clientip,
                               remark:"每日签到"
                           };
                           chatPointsService.add(everySignParam, function(error,result){});
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
                                           type:'daily',
                                           item : 'daily_sign',
                                           tag : 'sign',
                                           isGlobal:false,
                                           opUser:userInfo.userId,
                                           opIp:clientip,
                                           remark:"每日签到"
                           };
                           chatPointsService.add(param, function(error,result){});
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
                signinUser: function (callback) {//当天最近10条签到用户
                     var currDate = common.formatDate(new Date(),"yyyy-MM-dd");
                     var tomorrow = common.addDate(new Date(),1);
                    signin.find({"userId":{$ne:userInfo.mobilePhone},signinTime:{'$gte':new Date(currDate),'$lt':new Date(tomorrow)}}).sort({"signinTime": -1}).limit(10).exec("find", function (err, data) {
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