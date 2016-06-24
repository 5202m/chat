var chatShowTrade = require('../models/chatShowTrade');//引入chatShowTrade数据模型
var logger=require('../resources/logConf').getLogger('showTradeService');//引入log4js
var chatPraiseService = require('../service/chatPraiseService');//引入chatPraiseService
var constant = require('../constant/constant');//引入constant
/**
 * 晒单服务类
 * 备注：查询各分析师的晒单数据
 * author Dick.guo
 */
var showTradeService = {

    /**
     * 查询分析师晒单数据
     * @param groupType
     * @param userNo 如果有多个分析师，只取第一个
     * @param callback
     */
    getShowTrade : function(groupType, userNo, callback){
        userNo = userNo.replace(/,.*$/g, "");
        chatShowTrade.find({
            "boUser.userNo" : userNo,
            "groupType" : groupType,
            "valid" : 1
        }).sort({"showDate":-1}).exec("find", function(err, data){
            if(err){
                logger.error("查询晒单数据失败!", err);
                callback(null);
                return;
            }
            var result = null;
            if(data && data.length > 0){
                result = {
                    analyst : data[0].toObject().boUser,
                    tradeList : []
                };
                var tradeInfo = null;
                for(var i = 0,lenI = data.length; i < lenI;i++){
                    tradeInfo = data[i].toObject();
                    delete tradeInfo["boUser"];
                    result.tradeList.push(tradeInfo);
                }
                if(result.analyst){
                    result.analyst.praiseNum = 0;
                    chatPraiseService.getPraiseNum(result.analyst.userNo,constant.chatPraiseType.user,groupType,function(rows){
                        if(rows && rows.length > 0){
                            result.analyst.praiseNum = rows[0].praiseNum;
                        }
                        callback(result);
                    });
                    return;
                }
            }
            callback(result);
        });
    }
};
//导出服务类
module.exports =showTradeService;

