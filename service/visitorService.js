/** 访问者服务类
 * Created by Alan.wu on 2015/12/22.
 */
var common = require('../util/common');
var logger=require('../resources/logConf').getLogger('visitorService');//引入log4js
var chatVisitor = require('../models/chatVisitor');//引入chatVisitor数据模型
var ObjectId = require('mongoose').Types.ObjectId;
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
            _id: new ObjectId(),
            clientStoreId: model.clientStoreId,//客服端id
            groupType: model.groupType,//房间组别
            roomId: model.roomId,//所在房间id
            userId: model.userId,//用户id
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
            accountNo: model.accountNo,//账号
            userAgent: model.userAgent,//用户客户端信息
            updateDate: model.updateDate,//更新时间
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
            chatVisitor.findOne({
                groupType : model.groupType,
                clientStoreId : model.clientStoreId,
                valid : 1
            }, function(err, data){
                if (err){
                    logger.error('saveVisitorRecord-query fail',err);
                    return;
                }
                if(!data){
                    if(type=='online'){
                        visitorService.modifyDataByType(type,model,true);//按类型调整要保存的数据结构
                        visitorService.createVisitorRecord(model,null,function(createResult){
                            if(!createResult.isOK){
                                logger.error('saveVisitorRecord-create fail');
                            }
                        });
                    }
                }
                else{
                    common.copyObject(data,model,true);//数据复
                    visitorService.modifyDataByType(type,data,false);//按类型调整要保存的数据结构
                    data.save(function (err) {
                        if(err){
                            logger.error('saveVisitorRecord-update fail', err);
                        }
                    });
                }
            });
        }catch(e){
            logger.error('saveVisitorRecord fail',e);
        }
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
                if((data.initVisit||isFirst) || (data.updateDate instanceof Date && currTime.getTime() - data.updateDate.getTime()>=1000*60)){//首次进入页面或大于等于60秒，访问次数加1，否则访问次数不变
                    data.visitTimes+=1;
                    data.onlinePreDate=data.onlineDate;
                    data.onlineDate=currTime;
                }
                if(data.userId.indexOf("visitor_")==-1){
                    data.loginStatus=1;
                    if(!data.loginTimes||data.loginTimes==0){
                        data.loginDate=currTime;
                        data.loginTimes=1;
                    }
                }
                data.onlineStatus=1;
                data.updateDate=currTime;
                break;
            }
            case 'offline':{
                data.onlineStatus=0;
                data.loginStatus=0;
                data.offlineDate=currTime;
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
    }
};
//导出服务类
module.exports =visitorService;

