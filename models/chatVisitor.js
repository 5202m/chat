/**
 * 聊天室访客记录<BR>
 * ------------------------------------------<BR>
 * <BR>
 * Copyright© : 2015 by Dick<BR>
 * Author : Dick <BR>
 * Date : 2016年01月07日 <BR>
 * Description :<BR>
 * <p>
 *     访客记录
 * </p>
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var chatVisitorSchema = new Schema({
    _id: ObjectId,
    clientStoreId: {type: String, index: true},//客服端id
    groupType: {type: String, index: true},//房间组别
    roomId: {type: String, index: true},//所在房间id
    userId: String,//用户id
    visitorId:String,//访客id
    nickname:{type: String, index: true},//用户昵称
    ip: String,//访问者ip
    visitTimes: Number,//累计访问次数
    loginTimes: Number,//累计登陆次数
    onlineMSDate : Date, //累积在线毫秒数数据日期
    onlineMS : Number, //累积在线毫秒数
    onlineStatus: Number,//在线状态 1-在线 0-下线
    loginStatus: Number,//登陆状态 1-登入 0-登出
    onlineDate: Date,//最近上线时间
    offlineDate: Date,//最近下线时间
    onlinePreDate: Date,//前一次上线时间
    loginDate: Date,//登录时间
    loginPreDate: Date,//上次登录时间
    mobile: String,//手机号
    accountNo: String,//账号
    clientGroup: String,//客户组，详请见constant.clientGroup
    platform: String,//来源平台
    userAgent: String,//用户客户端信息
    updateDate: Date,//更新时间
    valid: {type:Number, default:1} //是否删除：0 、删除；1、正常
});
module.exports = mongoose.model('chatVisitor',chatVisitorSchema,"chatVisitor");