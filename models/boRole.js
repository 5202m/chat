/** 角色数据模型
 * Created by Administrator on 2015/3/4.
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,roleSchema = new Schema({//角色Schema
        _id:String,
        roleNo : {type:String,index:true},
        valid: {type:Number, default:1}, //是否删除：0 、删除；1、正常
        chatGroupList : [{
            _id :String
        }]
   });
module.exports = mongoose.model('boRole',roleSchema,"boRole");