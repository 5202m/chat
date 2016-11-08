/**
 * 签到实体类
 * author：darren.qiu
 * date:2016/09/28
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,signinSchema=new Schema(
        {
          userId:{type:String, index : true},//用户Id
          avatar:String,//头像
          groupType:{type:String, index : true},//组类别
          signinTime : Date,//签到时间
          historySignTime : [Date],//历史签到时间
          signinDays:{type:Number, default:0}, //签到天数：0
          serialSigDays:{type:Number, default:0} //连续签到天数：0
        });
module.exports =mongoose.model('signin',signinSchema,'signin');