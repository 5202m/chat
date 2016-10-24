var chatSubscribeType = require('../models/chatSubscribeType');//引入chatSubscribeType数据模型
var logger=require('../resources/logConf').getLogger('chatSubscribeTypeService');//引入log4js
var constant = require('../constant/constant');//引入constant
var common = require('../util/common');//引入common类

/**
 * 可订阅服务类型服务类
 *
 */
var chatSubscribeTypeService = {
    /**
     * 获取有效订阅服务类型数据
     * @param params
     * @param callback
     */
    getSubscribeTypeList: function(params, callback){
        var searchObj = {groupType:params.groupType,valid:1,status:1,startDate:{$lte:new Date()},endDate:{$gte:new Date()}};
        chatSubscribeType.find(searchObj).select({name:1, groupType:1, code:1, analysts:1, noticeTypes:1, noticeCycle:1}).sort({'sequence':'asc'}).exec(function(err, result){
            if(err){
                logger.error("查询数据失败! >>getSubscribeTypeList:", err);
                callback(null);
            }else{
                callback(result);
            }
        });
    }
};
//导出服务类
module.exports = chatSubscribeTypeService;