/** 访问者服务类
 * Created by Alan.wu on 2015/12/22.
 */
var common = require('../util/common');
var logger=require('../resources/logConf').getLogger('visitorService');//引入log4js
var cacheClient=require('../cache/cacheClient');
var async = require('async');//引入async
/**
 * 定义访问者服务类
 */
var visitorService = {
    /**
     * 提取访客key
     * @param groupType
     * @param userId
     * @returns {string}
     */
    getVRKey:function(groupType){
        return 'vrk'+'_'+groupType;
    },
    /**
     * 创建访问记录
     * @param model
     */
    createVisitorRecord:function(model,index,callback) {
        var insertModel={
           clientStoreId:model.clientStoreId,//客服端id
           groupType:model.groupType,//房间组别
           roomId:model.roomId,//所在房间id
           userId:model.userId,//用户id
           ip:model.ip,//访问者ip
           visitTimes:model.visitTimes||1,//累计访问次数
           loginTimes:model.loginTimes||0,//累计登陆次数
           onlineStatus:model.onlineStatus||0,//在线状态
           loginStatus:model.loginStatus||0,//登陆状态
           onlineDate:model.onlineDate,//最近上线时间
           onlinePreDate:model.onlinePreDate,//前一次上线时间
           loginDate:model.loginDate,//登录时间
           loginPreDate:model.loginPreDate,//上次登录时间
           mobile:model.mobile,//手机号
           accountNo:model.accountNo,//账号
           userAgent:model.userAgent//用户客户端信息
        };
        var key=visitorService.getVRKey(model.groupType);
        if(index){
            cacheClient.zadd(key,index,JSON.stringify(insertModel),function (err) {
                if (err){
                    callback({isOK:false,error:'insert fail!'});
                }else{
                    callback({isOK:true});
                }
            });
        }else{
            cacheClient.zcard(key,function (err,count) {
                if (err){
                    callback(null);
                }else{
                    cacheClient.zadd(key,count+1,JSON.stringify(insertModel),function (err) {
                        if (err){
                            callback({isOK:false,error:'insert fail!'});
                        }else{
                            callback({isOK:true});
                        }
                    });
                }
            });
        }
    },
    /**
     * 删除访问记录
     * @param groupType
     * @param ids
     */
    deleteVisitorRecord:function(groupType,ids,callback){
        try{
            var key=visitorService.getVRKey(groupType);
            if(ids.indexOf('{')!=-1){
                cacheClient.zrem(key,ids,function(err,count){
                    if (err){
                        logger.error('delete fail:['+ids+']',err);
                        callback(false);
                    }else{
                        callback(count>0);
                    }
                });
            }else{
                var ids=ids.split(",");
                async.eachSeries(ids, function (item, callbackTmp) {
                    cacheClient.zscan([key,0,'match','*clientStoreId":*'+item+'*'],function (err, data) {
                        if (data && data[1].length>0){
                            cacheClient.zrem(key,data[1][0],function(err,count){
                                if (err){
                                    logger.error('delete fail:[clientStoreId='+item+']',err);
                                }
                                callbackTmp(null);
                            });
                        }else{
                            callbackTmp(null);
                        }
                    });
                }, function (err) {
                    callback(!err);
                });
            }
        }catch(e){
            logger.error('delete fail',e);
            callback(false);
        }
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
            cacheClient.zscan([this.getVRKey(model.groupType),0,'match','*clientStoreId":*'+model.clientStoreId+'*'],function (err, data) {
                if (err){
                    logger.error('update fail',err);
                }else{
                    if(data && data[1]){
                        if(data[1].length==0){
                            if(type=='online'){
                                visitorService.modifyDataByType(type,model);//按类型调整要保存的数据结构
                                visitorService.createVisitorRecord(model,null,function(isOK){});
                            }
                        }else{
                            visitorService.deleteVisitorRecord(model.groupType,data[1][0],function(isOK){
                                if(isOK){
                                    var srcModel=JSON.parse(data[1][0]);
                                    common.copyObject(srcModel,model,true);//数据复制
                                    visitorService.modifyDataByType(type,srcModel);//按类型调整要保存的数据结构
                                    visitorService.createVisitorRecord(srcModel,data[1][1],function(isOK){});
                                }
                            });
                        }
                    }else{
                        logger.error('update fail',err);
                    }
                }
            });
        }catch(e){
            logger.error('save fail',e);
        }
    },
    /**
     * 通过输入类型修改数据
     * @param type
     * @param data
     */
    modifyDataByType:function(type,data){
       var currTime = new Date().getTime();
        switch (type)
        {
            case 'online':{
                if(data.initVisit){//首次进入页面，访问次数加1，否则访问次数不变
                    data.visitTimes+=1;
                }
                data.onlineStatus=1;
                data.onlinePreDate=data.onlineDate;
                data.onlineDate=currTime;
                if(data.userId.indexOf("visitor_")==-1){
                    data.loginStatus=1;
                }
                break;
            }
            case 'offline':{
                data.onlineStatus=0;
                data.loginStatus=0;
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
     * 查询访问记录
     * @param model
     * @param callback
     */
    getChatVisitorList:function(pageModel,callback){
        logger.info("getChatVisitorList->pageModel:"+JSON.stringify(pageModel));
        try{
            var pageNo=parseInt(pageModel.pageNo|| 1),pageSize=parseInt(pageModel.pageSize||15);
            var searchArr=[],key=this.getVRKey(pageModel.groupType);
            searchArr.push(key);
            var conditionArr=[];
            if(common.isValid(pageModel.mobile)){
                conditionArr.push('*mobile":*'+pageModel.mobile+'*');
            }else if(common.isValid(pageModel.loginStatus)){
                conditionArr.push('*loginStatus":'+pageModel.loginStatus+'*');
            }else if(common.isValid(pageModel.onlineStatus)){
                conditionArr.push('*onlineStatus":'+pageModel.onlineStatus+'*');
            }else if(common.isValid(pageModel.roomId)){
                conditionArr.push('*roomId":*'+pageModel.roomId+'*');
            }
            if(conditionArr.length>0){
                searchArr.push(0);
                searchArr.push('match');
                for(var i in conditionArr){
                    searchArr.push(conditionArr[i]);
                }
                searchArr.push('count');
                searchArr.push(pageSize);
                cacheClient.zscan(searchArr,function (err, data) {
                    if (err){
                        logger.error('getChatVisitorList fail',err);
                        callback(null);
                    }else{
                        var dataArr=visitorService.formatToJson(data),newDataArr=[];
                        for(var i in dataArr){
                            if(dataArr[i].hasOwnProperty("clientStoreId")){
                                newDataArr.push(dataArr[i]);
                            }
                        }
                        callback({totalRecord:newDataArr.length,list:newDataArr});
                    }
                });
            }else{
                cacheClient.zcount(key,'-inf','+inf',function (err, count) {
                    if (err){
                        callback(null);
                    }else{
                        var rStartNo=(pageNo-1)*pageSize;
                        searchArr.push("by");
                        searchArr.push("store");
                        searchArr.push('limit');
                        searchArr.push(rStartNo);
                        searchArr.push(pageSize);
                        cacheClient.sort(searchArr,function (err, data) {
                            if (err){
                                callback(null);
                            }else{
                                callback({totalRecord:count,list:visitorService.formatToJson(data,true)});
                            }
                        });
                    }
                });
            }
        }catch(e){
            logger.error('getChatVisitorList fail',e);
            callback({totalRecord:0,list:null});
        }
    },
    /**
     * 转换到json数据
     * @param data
     */
    formatToJson:function(data,isRange){
        if(!data ||common.isBlank(data)) {
            return null;
        }
        if(isRange){
            if(data.length>0){
                return JSON.parse("["+data+"]");
            }else{
                return JSON.parse(data);
            }
        }else{
            return JSON.parse('['+data[1]+']');
        }
    }
};

//导出服务类
module.exports =visitorService;

