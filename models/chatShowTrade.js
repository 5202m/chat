/**
 * 晒单<BR>
 * ------------------------------------------<BR>
 * <BR>
 * Copyright© : 2016 by Dick<BR>
 * Author : Dick <BR>
 * Date : 2016年06月22日 <BR>
 * Description :<BR>
 * <p>
 *     晒单
 * </p>
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var chatShowTradeSchema = new Schema({
    _id : ObjectId,
    groupType : {type:String,index:true}, //聊天室组别
    boUser : {
        _id : String,   //userId
        userNo : String,//userNo
        avatar : String,//头像
        userName : String,//分析师姓名
        wechatCode : String,//分析师微信号
        wechatCodeImg : String,//分析师微信二维码
        winRate : String//分析师胜率
    },
    showDate : Date, //晒单时间
    tradeImg : String, //晒单图片
    profit : String, //盈利
    valid : Number, //是否删除 1-有效 0-无效
    updateDate : Date
});
module.exports = mongoose.model('chatShowTrade',chatShowTradeSchema,"chatShowTrade");