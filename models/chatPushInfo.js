/**
 * 信息推送实体类
 * author：alan.wu
 * date:2016/3/31
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,chatPushInfoSchema=new Schema(
        {
            _id: String,
            content:String,
            pushType:Number,
            position:Number,//推送位置：0 任务栏 、1 私聊框、2、页面提示
            groupType: {type: String, index: true},//房间组别,
            clientGroup:[],
            roomIds:[],
            pushTimes: {type:Number, default:1},//推送次数
            replyRepeat: {type:Number, default:1},//是否延续推送
            onlineMin:{type:Number, default:0},//在线分钟数
            pushDate: String,
            status: {type:Number, default:1}, //状态：0 、禁用 ；1、启动
            isExce:{type:Number, default:0},//是否执行，0否，1是
            valid: {type:Number, default:1} //是否删除：0 、删除 ；1、正常
        });
module.exports =mongoose.model('chatPushInfo',chatPushInfoSchema,'chatPushInfo');