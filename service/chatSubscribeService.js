var chatSubscribe = require('../models/chatSubscribe');//引入chatSubscribe数据模型
var logger=require('../resources/logConf').getLogger('chatSubscribeService');//引入log4js
var constant = require('../constant/constant');//引入constant
var common = require('../util/common');//引入common类
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
        var searchObj = {groupType:params.groupType,userId:params.userId,valid:1,status:1};
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
            var pointsParam = {groupType: params.groupType,userId: params.userId,item: 'prerogative_subscribe',val: -params.point,isGlobal: false,remark: params.pointsRemark,opUser: params.userName,opIp: params.Ip};
            chatPointsService.add(pointsParam, function (err, result) {
                if (!err && result) {
                    insertModel.pointsId = result._id;
                    new chatSubscribe(insertModel).save(function (err) {
                        if (err) {
                            logger.error("保存订阅数据失败! >>saveSubscribe:", err);
                            callback({isOK: false, msg: '订阅失败'});
                        } else {
                            callback({isOK: true, msg: ''});
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
                    callback({isOK: true, msg: ''});
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
                if(params.point>0 && row.point<params.point){
                    var pointsParam = {groupType:params.groupType, userId:params.userId, item:'prerogative_subscribe', val:-(params.point-row.point), isGlobal:false, remark:params.pointsRemark, opUser:params.userName, opIp:params.Ip};
                    chatPointsService.add(pointsParam,function(err, result) {
                        if (!err && result) {
                            setObj.pointsId = result._id;
                            chatSubscribe.findOneAndUpdate(searchObj, setObj, function (err1, row1) {
                                if (err1) {
                                    logger.error('modifySubscribe=>fail!' + err1);
                                    callback({isOK: false, msg: '修改订阅失败'});
                                } else {
                                    callback({isOK: true, msg: ''});
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
                            callback({isOK: true, msg: ''});
                        }
                    });
                }
            }
        });
    }
};
//导出服务类
module.exports = chatSubscribeService;