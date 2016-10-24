/**
 * 积分信息<BR>
 * ------------------------------------------<BR>
 * <BR>
 * Copyright© : 2016 by Dick<BR>
 * Author : Dick <BR>
 * Date : 2016年9月13日 <BR>
 * Description :<BR>
 * <p>
 *     积分信息
 * </p>
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var chatPointsSchema = new Schema({
    "_id" : ObjectId,
    "groupType" : {type:String, index : true},  //房间组别
    "userId" : {type:String, index:true},       //用户编号（手机）
    "pointsGlobal" : Number,                    //总积分
    "points" : Number,                          //有效积分
    "remark" : String,                          //备注
    "status" : Number,                          //状态
    "isDeleted" : Number,                       //是否删除
    "journal" : [{                               //积分流水
        "_id" : ObjectId,
        "item" : String,          //项目
        "tag" : String,           //标签
        "before" : Number,        //积分前值
        "change" : Number,        //积分变化
        "after" : Number,         //积分后值
        "opUser" : String,        //操作用户
        "date" : Date,            //操作时间
        "remark" : String,        //备注
        "isDeleted" : 0           //是否删除
    }],
    "createUser" : String,
    "createIp" : String,
    "createDate" : Date,
    "updateUser" : String,
    "updateIp" : String,
    "updateDate" : Date
});
module.exports = mongoose.model('chatPoints',chatPointsSchema,"chatPoints");