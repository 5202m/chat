/** 访问者服务类
 * Created by Alan.wu on 2015/12/22.
 */
var common = require('../util/common');
var logger=require('../resources/logConf').getLogger('visitorService');//引入log4js
var chatVisitor = require('../models/chatVisitor');//引入chatVisitor数据模型
var async = require('async');//引入async

/**
 * 定义访问者服务类
 */
var visitorService = {
    /**
     * 创建访问记录
     * @param model
     * @param callback
     */
    createVisitorRecord:function(model,callback) {
        var insertModel = {
            _id: null,
            clientStoreId: model.clientStoreId,//客服端id
            groupType: model.groupType,//房间组别
            roomId: model.roomId,//所在房间id
            userId: model.userId,//用户id
            visitorId: model.visitorId,//访客id
            nickname: model.nickname,//用户昵称
            ip: model.ip,//访问者ip
            visitTimes: model.visitTimes || 1,//累计访问次数
            loginTimes: model.loginTimes || 0,//累计登陆次数
            onlineStatus: model.onlineStatus || 0,//在线状态
            loginStatus: model.loginStatus || 0,//登陆状态
            onlineDate: model.onlineDate,//最近上线时间
            onlinePreDate: model.onlinePreDate,//前一次上线时间
            loginDate: model.loginDate,//登录时间
            loginPreDate: model.loginPreDate,//上次登录时间
            mobile: model.mobile,//手机号
            clientGroup: model.clientGroup,//客户组
            accountNo: model.accountNo,//账号
            userAgent: model.userAgent,//用户客户端信息
            updateDate: new Date(),//更新时间
            valid: 1
        };
        //保存
        new chatVisitor(insertModel).save(function(err){
            if (err) {
                callback({isOK:false,error:'createVisitorRecord fail!'});
            }else{
                callback({isOK:true});
            }
        });
    },

    /**
     * 更新访问记录
     * @param type
     * @param model
     */
    saveVisitorRecord:function(type,model){
        try{
            if(!model|| common.isBlank(model.clientStoreId)){
                return;
            }
            if(common.isValid(model.ip)){
                model.ip=model.ip.replace(/[^\.\d]/g,'');
            }
            var searchObj={
                groupType : model.groupType,
                clientStoreId : model.clientStoreId,
                valid : 1
            };
            if(model.roomId){
                searchObj.roomId=model.roomId;
            }
            chatVisitor.findOne(searchObj).sort({'onlineDate':'desc'}).exec(function(err, data){
                if (err){
                    logger.error('saveVisitorRecord-query fail',err);
                }else{
                    if(!data){
                        if(type=='online'||type=='login'){
                            visitorService.modifyDataByType(type,model,true);//按类型调整要保存的数据结构
                            visitorService.createVisitorRecord(model,function(createResult){
                                if(!createResult.isOK){
                                    logger.error('saveVisitorRecord-create fail');
                                }
                            });
                        }
                    }else{
                        if(model.visitorId && data.loginTimes>0){//已经登录过,防止数据覆盖
                            model.nickname=data.nickname;
                            model.clientGroup=data.clientGroup;
                        }
                        common.copyObject(data,model,true);//数据复制
                        visitorService.modifyDataByType(type,data,false);//按类型调整要保存的数据结构
                        data.save(function (err) {
                            if(err){
                                logger.error('saveVisitorRecord-update fail', err);
                            }
                        });
                    }
                }
            });
        }catch(e){
            logger.error('saveVisitorRecord fail',e);
        }
    },

    /**
     * 批量更新状态
     * @param roomId
     */
    batchUpdateStatus:function(roomId){
        chatVisitor.find({'roomId':roomId,onlineStatus:1}).exec('find', function(err, datas){
            //不处理异常错误
            if(!err && datas){
                async.each(datas, function(data, callbackTmp){
                    visitorService.modifyDataByType("offline",data,false);//按类型调整要保存的数据结构
                    data.save(function (err) {
                        //不处理异常错误
                        callbackTmp(null);
                    });
                }, function(err){});
            }
        });
    },
    /**
     * 通过输入类型修改数据
     * @param type
     * @param data
     * @param isFirst 是否首次插入
     */
    modifyDataByType:function(type,data,isFirst){
       var currTime = new Date();
        switch (type)
        {
            case 'online':{
                //if((data.initVisit||isFirst) || (data.updateDate instanceof Date && currTime.getTime() - data.updateDate.getTime()>=1000*60)){//首次进入页面或大于等于60秒，访问次数加1，否则访问次数不变
                    data.visitTimes+=1;
                    data.onlinePreDate=data.onlineDate;
                    data.onlineDate=currTime;
                //}
                if(data.loginStatus==1){
                    if(!data.loginTimes||data.loginTimes==0){
                        data.loginDate=currTime;
                        data.loginTimes=1;
                    }
                }
                data.onlineStatus=1;
                break;
            }
            case 'offline':{
                data.onlineStatus=0;
                data.loginStatus=0;
                data.offlineDate=currTime;
                //计算累计当日累积在线时长
                var loc_startTime = new Date(currTime.getFullYear(), currTime.getMonth(), currTime.getDate());
                if(data.onlineMSDate instanceof Date == false || data.onlineMSDate.getTime() !== loc_startTime.getTime()){
                    data.onlineMS = 0;
                    data.onlineMSDate = loc_startTime;
                }
                if(data.onlineDate instanceof Date){
                    if(data.onlineDate > loc_startTime){
                        loc_startTime = data.onlineDate;
                    }
                    data.onlineMS = (data.onlineMS || 0) + currTime.getTime() - loc_startTime.getTime();
                }
                break;
            }
            case 'login':{
                data.loginTimes+=1;
                data.loginStatus=1;
                data.loginPreDate=data.loginDate;
                data.loginDate=currTime;
                break;
            }
            case 'logout':{
                data.loginStatus=0;
                break;
            }
        }
    },
    /**
     * 通过昵称查询访客名，访客userId
     * @param nickname
     */
    getVistiorByName:function(groupType,roomId,nickname,callback){
        chatVisitor.find({groupType:groupType,roomId:roomId,valid : 1,nickname:eval('/.*?'+nickname+'.*/g')}).select("nickname userId visitorId clientStoreId onlineStatus").sort({'onlineStatus':'desc'}).exec(function(err, data){
            if (err){
                logger.error('getVistiorByName fail',err);
                callback(null);
            }else{
                callback(data);
            }
        });
    },
    /**
     * 通过clientStoreId
     * @param groupType
     * @param groupId
     * @param clientStoreId
     */
    getByClientStoreId:function(groupType,groupId,clientStoreId,callback){
        chatVisitor.findOne({groupType:groupType,roomId:groupId,valid : 1,clientStoreId:clientStoreId}).select("nickname visitorId clientStoreId offlineDate").exec(function(err, data){
            if (err||!data){
                logger.error('getByClientStoreId fail',err);
                callback(null);
            }else{
                callback(data.offlineDate);
            }
        });
    },
    /**
     * 通过userId或visitorId
     * @param groupType
     * @param groupId
     * @param userId
     */
    getUserArrByUserId:function(groupType,groupId,userId,callback){
        chatVisitor.findOne({groupType:groupType,roomId:groupId,valid : 1,$or:[{userId:userId},{visitorId:userId}]}).select("userId nickname visitorId clientStoreId offlineDate").sort({'updateDate':'desc'}).exec(function(err, data){
            var userArr=[];
            userArr.push(userId);
            if (err||!data){
                logger.error('getByClientUserId fail',err);
                callback(userArr);
            }else{
                if(common.isValid(data.userId) && userId!=data.userId){
                    userArr.push(data.userId);
                }
                if(common.isValid(data.visitorId) && userId!=data.visitorId){
                    userArr.push(data.visitorId);
                }
                callback(userArr);
            }
        });
    }
};
//导出服务类
module.exports =visitorService;

