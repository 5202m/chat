/**
 * 积分配置信息<BR>
 * ------------------------------------------<BR>
 * <BR>
 * Copyright© : 2016 by Dick<BR>
 * Author : Dick <BR>
 * Date : 2016年9月13日 <BR>
 * Description :<BR>
 * <p>
 *     积分配置信息
 * </p>
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var chatPointsConfigSchema = new Schema({
    "_id" : ObjectId,
    "groupType" : {type:String, index : true},  //房间组别
    "type" : String,                            //类别
    "item" : {type:String, index : true},       //项目
    "val" : Number,                             //积分值
    "tips" : String,                            //提示信息
    "limitUnit" : String,                       //积分上限类别
    "limitVal" : Number,                        //积分上限值
    "limitArg" : String,                        //积分上限参数
    "remark" : String,                          //备注
    "status" : Number,                          //状态
    "isDeleted" : Number,                       //是否删除
    "createUser" : String,
    "createIp" : String,
    "createDate" : Date,
    "updateUser" : String,
    "updateIp" : String,
    "updateDate" : Date
});
module.exports = mongoose.model('chatPointsConfig',chatPointsConfigSchema,"chatPointsConfig");