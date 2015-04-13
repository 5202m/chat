/**
 * 聊天组别实体类
 * author：alan.wu
 * date:2015/4/3
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;
/**
 * 模型定义
 * @type {Schema}
 */
var chatGroupSchema=new Schema(
    {
      _id:{type:String},
      name:{type:String},//名称
      status:{type:Number, default:1}, //状态：0 、禁用 ；1、启动
      homeUrlRuleId:{type:String},//跳转到主页的规则id
      contentRuleIds:{type:String}, //内容规则ids,多个逗号分隔
      valid:{type:Number, default:1} //是否删除：0 、删除 ；1、正常
    }
);
module.exports =mongoose.model('chatGroup',chatGroupSchema,'chatGroup');