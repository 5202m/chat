/**
 * 聊天客户组别实体类
 * author：alan.wu
 * date:2015/4/3
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,chatClientGroupSchema=new Schema(
        {
          _id:{type:String},
          groupType:{type:String,index:true},//类别
          clientGroupId:{type:String,index:true},//客户组id
          name:{type:String,index:true},//名称
          valid:{type:Number, default:1}, //是否删除：0 、删除 ；1、正常
          sequence:{type:Number, default:0},//排序序列
          defChatGroupId:{type:String,index:true}, //默认房间组id
          remark:String,//备注
          authorityDes:String //说明
        });
module.exports =mongoose.model('chatClientGroup',chatClientGroupSchema,'chatClientGroup');