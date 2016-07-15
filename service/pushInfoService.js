/** 信息推送服务类
 * Created by Alan.wu on 2016/3/31.
 */
var chatPushInfo = require('../models/chatPushInfo');//引入chatPushInfo数据模型
var common = require('../util/common');//引入common类
var logger=require('../resources/logConf').getLogger('pushInfoService');//引入log4js
/**
 * 定义信息推送服务类
 * @type {{}}
 */
var pushInfoService = {
    /**
     * 提取信息推送列表
     */
     getPushInfo:function(groupType,roomId,clientGroup,position,callback){
        var rIds=[];
        rIds.push(roomId);
        var searchObj={position:position,valid:1,status:1,groupType:groupType,roomIds:{$in:rIds}};
        if(common.isValid(clientGroup)){
            var cgArr=[];
            cgArr.push(clientGroup);
            searchObj.clientGroup= {$in:cgArr};
        }
        chatPushInfo.findOne(searchObj).sort({'createDate':'desc'}).exec(function (err,row) {
            if(err){
                logger.error("getPushInfo fail:"+err);
            }
            callback(row);
        });
     },
    /**
     * 检查推送是否符合条件
     * @param groupType
     * @param roomId
     * @param clientGroup
     * @param position
     * @param filterTime
     * @param callback
     */
    checkPushInfo:function(groupType,roomId,clientGroup,position,filterTime,callback){
        var rIds=[];
        rIds.push(roomId);
        var searchObj={position:position,valid:1,status:1,groupType:groupType,roomIds:{$in:rIds}};
        if(common.isValid(clientGroup)){
            var cgArr=[];
            cgArr.push(clientGroup);
            searchObj.clientGroup= {$in:cgArr};
        }
        chatPushInfo.find(searchObj).sort({'createDate':'desc'}).exec(function (err,rowList) {
            if(err){
                logger.warn("getPushInfo fail:"+err);
                callback([]);
            }else{
                var result=[];
                if(filterTime){
                    var row=null;
                    if(rowList){
                        for(var i in rowList){
                            row=rowList[i];
                            if(common.dateTimeWeekCheck(row.pushDate, true)){
                                result.push(row);
                            }
                        }
                    }
                }
                else{
                    result = rowList || [];
                }
                callback(result);
            }
        });
    }
};

//导出服务类
module.exports =pushInfoService;

