/**
 * Created by Administrator on 2015/3/4.
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,userSchema = new Schema({//会员Schema
        _id:String,
        userNo : String,
        userName : String,
        telephone: String ,
        position: String ,
        avatar:String,
        introductionImg:String,//简介图片
        introduction:String,//简介
        remark:String ,
        valid: {type:Number, default:1}, //是否删除：0 、删除；1、正常
        status: {type:Number, default:0},
        role : {
            _id :String,
            roleNo : String,
            roleName :String
        }
   });
module.exports = mongoose.model('boUser',userSchema,"boUser");