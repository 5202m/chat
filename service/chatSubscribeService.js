var Request = require('request');
var chatSubscribe = require('../models/chatSubscribe');//引入chatSubscribe数据模型
var Member = require('../models/member');
var logger=require('../resources/logConf').getLogger('chatSubscribeService');//引入log4js
var constant = require('../constant/constant');//引入constant
var common = require('../util/common');//引入common类
var Config = require('../resources/config');
var chatPointsService = require('../service/chatPointsService');//引入chatPointsService

/**
 * 订阅服务类
 *
 */
var chatSubscribeService = {
    /**
     * 获取订阅数据
     * @param params
     * @param callback
     */
    getSubscribeList: function(params, callback){
        var searchObj = {groupType:params.groupType,userId:params.userId,valid:1,status:1,$or:[{analyst:{$ne:''},noticeType:{$ne:''}}]};
        chatSubscribe.find(searchObj,"type analyst noticeType startDate endDate point",function(err, result){
            if(err){
                logger.error("查询数据失败! >>getSubscribeTypeList:", err);
                callback(null);
            }else{
                callback(result);
            }
        });
    },
    /**
     * 保存订阅
     * @param params
     * @param callback
     */
    saveSubscribe: function(params, callback){
        var insertModel = {
            _id : null,
            groupType : params.groupType, //聊天室组别
            type:params.type,//订阅服务类型
            userId:params.userId,//用户ID
            analyst:params.analyst,//分析师
            noticeType:params.noticeType,//订阅方式
            startDate:params.startDate,//开始时间
            endDate:params.endDate,//结束时间
            //pointsId:params.pointsId,//消费积分ID
            point:params.point,//消费积分
            valid : 1, //是否删除 1-有效 0-无效
            updateDate : new Date(),
            createUser: params.userName,
            createIp: params.Ip,
            createDate: new Date(),
            status: 1 //状态：0 无效， 1 有效
        };
        if(params.point>0) {
            var pointsParam = {clientGroup:params.clientGroup,groupType: params.groupType,userId: params.userId,item: 'prerogative_subscribe',val: -params.point,isGlobal: false,remark: params.pointsRemark,opUser: params.userName,opIp: params.Ip};
            chatPointsService.add(pointsParam, function (err, result) {
                if (!err) {
                    insertModel.pointsId = common.isBlank(result)?'':result._id;
                    new chatSubscribe(insertModel).save(function (err) {
                        if (err) {
                            logger.error("保存订阅数据失败! >>saveSubscribe:", err);
                            callback({isOK: false, msg: '订阅失败'});
                        } else {
                            chatSubscribeService.saveSubscribe4UTM(params.groupType, params.userId, params.type, !!params.analyst, callback);
                        }
                    });
                } else {
                    callback({isOK: false, msg: err.errmsg});
                }
            });
        } else {
            new chatSubscribe(insertModel).save(function (err) {
                if (err) {
                    logger.error("保存订阅数据失败! >>saveSubscribe:", err);
                    callback({isOK: false, msg: '订阅失败'});
                } else {
                    chatSubscribeService.saveSubscribe4UTM(params.groupType, params.userId, params.type, !!params.analyst, callback);
                }
            });
        }
    },
    /**
     * 更新订阅
     * @param params
     * @param callback
     */
    modifySubscribe: function(params, callback){
        var searchObj = {_id:params.id};
        chatSubscribe.findOne(searchObj, function(err, row){
            if(err){
                logger.error("查询数据失败! >>modifySubscribe:", err);
                callback({isOK:false, msg:'修改订阅失败'});
            }else{
                if(params.noticeCycle=='week') {
                    params.endDate = common.DateAdd('w', 1, new Date(row.startDate));//结束时间，1周
                }else if(params.noticeCycle=='month'){
                    params.endDate = common.DateAdd('M', 1, new Date(row.startDate));//极速时间，1月
                }
                var setObj = { '$set': {'analyst': params.analyst,'noticeType':params.noticeType,/*startDate:params.startDate,*/endDate:params.endDate,point:params.point, updateDate : new Date()}};
                if(common.isBlank(params.analyst) || common.isBlank(params.noticeType)){
                    setObj = { '$set': {'analyst': params.analyst,'noticeType':params.noticeType,/*startDate:params.startDate,*/endDate:params.endDate,point:params.point,valid:0, updateDate : new Date()}};
                }
                if(params.point>0 && row.point<params.point){
                    var pointsParam = {clientGroup:params.clientGroup,groupType:params.groupType, userId:params.userId, item:'prerogative_subscribe', val:-(params.point-row.point), isGlobal:false, remark:params.pointsRemark, opUser:params.userName, opIp:params.Ip};
                    chatPointsService.add(pointsParam,function(err, result) {
                        if (!err) {
                            setObj.pointsId = common.isBlank(result)?'':result._id;
                            chatSubscribe.findOneAndUpdate(searchObj, setObj, function (err1, row1) {
                                if (err1) {
                                    logger.error('modifySubscribe=>fail!' + err1);
                                    callback({isOK: false, msg: '修改订阅失败'});
                                } else {
                                    chatSubscribeService.saveSubscribe4UTM(params.groupType, params.userId, row.type, !!params.analyst, callback);
                                }
                            });
                        } else {
                            callback({isOK:false, msg: err.errmsg});
                        }
                    });
                }else {
                    chatSubscribe.findOneAndUpdate(searchObj, setObj, function (err1, row1) {
                        if (err1) {
                            logger.error('modifySubscribe=>fail!' + err1);
                            callback({isOK: false, msg: '修改订阅失败'});
                        } else {
                            chatSubscribeService.saveSubscribe4UTM(params.groupType, params.userId, row.type, !!params.analyst, callback);
                        }
                    });
                }
            }
        });
    },

    /**
     * 保存客户分组到UTM
     * @param groupType
     * @param userId
     * @param subscribeType
     * @param isAdd
     * @param callback ({{isOK : boolean, msg : String}})
     */
    saveSubscribe4UTM : function(groupType, userId, subscribeType, isAdd, callback){
        var groupCodes = {
            "daily_quotation" : "daily_quotation",
            "big_quotation" : "big_quotation",
            "daily_review" : "daily_review",
            "week_review" : "week_review"
        };
        if(!groupCodes.hasOwnProperty(subscribeType)){
            callback({isOK : true, msg : ""});
            return;
        }
        if(!groupType || !Config.utm.hasOwnProperty(groupType) || !userId){
            callback({isOK : false, msg : "参数错误！"});
            return ;
        }
        Member.findOne({
            "mobilePhone" : userId,
            "valid": 1,
            "status": 1,
            "loginPlatform.chatUserGroup._id" : groupType
        }, "loginPlatform.chatUserGroup.$.email", function(err, row){
            if(err){
                logger.error("<<saveSubscribe4UTM:提取用户邮箱失败，[errMessage:%s]", err);
                callback({isOK : false, msg : "提取用户邮箱失败！"});
                return;
            }
            var config = Config.utm[groupType];
            var params = {
                timestamp : common.formatDate(new Date(), "yyyyMMddHHmmss"),
                accountSid: config.sid,
                sign: "",
                groupCode : groupCodes[subscribeType],
                type : isAdd ? "add" : "remove",
                phones : userId,
                emails : null
            };
            var email = row.loginPlatform.chatUserGroup[0].email;
            if(email){
                params.emails = email;
            }
            params.sign = common.getMD5(params.accountSid + config.token + params.timestamp);
            Request.post(Config.utm.cstGroupUrl, function (error, response, data) {
                if (error || response.statusCode != 200 || !data) {
                    logger.error("<<saveSubscribe4UTM:保存客户分组异常，errMessage:", error);
                    callback({isOK : false, msg : "保存客户分组失败！"});
                } else{
                    try{
                        data = JSON.parse(data);
                        if(data.respCode != "Success"){
                            logger.error("<<saveSubscribe4UTM:保存客户分组失败，[errMessage:%s]", data.respMsg);
                            callback({isOK : false, msg : "保存客户分组失败:" + data.respMsg + "！"});
                        }else{
                            callback({isOK : true, msg : ""});
                        }
                    }catch(e){
                        logger.error("<<saveSubscribe4UTM:发送通知邮件出错，[response:%s]", data);
                        callback({isOK : false, msg : "保存客户分组失败！"});
                    }
                }
            }).form(params);
        });
    }
};
//导出服务类
module.exports = chatSubscribeService;