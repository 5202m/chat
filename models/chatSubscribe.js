/**
 * 订阅<BR>
 * ------------------------------------------<BR>
 * <BR>
 * Copyright© : 2016 by Jade<BR>
 * Author : Jade <BR>
 * Date : 2016年09月21日 <BR>
 * Description :<BR>
 * <p>
 *     订阅
 * </p>
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var chatSubscribeSchema = new Schema({
    _id : ObjectId,
    groupType : {type:String,index:true}, //聊天室组别
    groupId: {type:String,index:true},//房间ID，预留
    type:String,//订阅服务类型
    userId:{type:String,index:true},//用户ID
    analyst:String,//分析师
    noticeType:String,//订阅方式
    remark:String,//内容，预留
    startDate:Date,//开始时间
    endDate:Date,//结束时间
    pointsId:String,//消费积分ID
    point:Number,//消费积分
    valid : Number, //是否删除 1-有效 0-无效
    updateDate : Date,
    createUser: String,
    createIp: String,
    createDate: Date,
    status: Number //状态：0 待审核， 1 审核通过， -1 审核不通过
});
module.exports = mongoose.model('chatSubscribe',chatSubscribeSchema,"chatSubscribe");