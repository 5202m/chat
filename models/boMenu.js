/** 菜单数据模型
 * Created by Administrator on 2015/3/4.
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,menuSchema = new Schema({//菜单Schema
        _id:String,
        parentMenuId : String,
        code : {type:String,index:true},
        valid: {type:Number, default:1}, //是否删除：0 、删除；1、正常
        type: {type:Number, default:0},//默认0(0菜单,1功能)
        roleList : [{
            _id :String
        }]
   });
module.exports = mongoose.model('boMenu',menuSchema,"boMenu");