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
    groupId: {type:String,index:true}, //房间
    boUser : {
        _id : String,   //userId
        userNo : {type:String,index:true},//userNo
        avatar : String,//头像
        userName : String,//分析师姓名
        telephone : String,//手机号
        wechatCode : String,//分析师微信号
        wechatCodeImg : String,//分析师微信二维码
        winRate : String//分析师胜率
    },
    showDate : Date, //晒单时间
    tradeImg : String, //晒单图片
    profit : String, //盈利
    remark: String,//心得
    valid : Number, //是否删除 1-有效 0-无效
    updateDate : Date,
    createUser: String,
    createIp: String,
    createDate: Date,
    title: String,//标题
    tradeType: Number,//类别：1 分析师晒单，2 客户晒单
    status: Number, //状态：0 待审核， 1 审核通过， -1 审核不通过
    praise: Number //点赞数
});
module.exports = mongoose.model('chatShowTrade',chatShowTradeSchema,"chatShowTrade");