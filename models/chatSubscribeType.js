/**
 * 订阅服务类型<BR>
 * ------------------------------------------<BR>
 * <BR>
 * Copyright© : 2016 by Jade<BR>
 * Author : Jade <BR>
 * Date : 2016年09月21日 <BR>
 * Description :<BR>
 * <p>
 *     订阅服务类型
 * </p>
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var chatSubscribeTypeSchema = new Schema({
    _id : ObjectId,
    name:String,//订阅服务名称
    groupType:{type:String,index:true},//直播间
    groupId:{type:String, index:true},//房间ID，预留
    code : {type:String,index:true}, //订阅服务名称代码
    analysts: String,//可订阅老师
    noticeTypes:String,//提供的订阅方式
    noticeCycle:String,//提供的订阅周期
    remark:String,//内容，预留
    startDate:Date,//开始时间
    endDate:Date,//结束时间
    valid : Number, //是否删除 1-有效 0-无效
    updateDate : Date,
    createUser: String,
    createIp: String,
    createDate: Date,
    status: Number //状态：0 待审核， 1 审核通过， -1 审核不通过
});
module.exports = mongoose.model('chatSubscribeType',chatSubscribeTypeSchema,"chatSubscribeType");