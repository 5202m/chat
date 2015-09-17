/**
 * 聊天组别规则实体类
 * author：alan.wu
 * date:2015/4/3
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema;
/**
 * 模型定义
 * @type {Schema}
 */
var chatGroupRuleSchema=new Schema(
    {
      _id:{type:String},
      name:{type:String},//名称
      type:{type:String}, //规则类别，数据字典中配置
      beforeRuleVal:{type:String},//使用规则前的值
      afterRuleVal:{type:String}, //使用规则后的值
      valid:{type:Number, default:1} //是否删除：0 、删除 ；1、正常
    }
);
module.exports =mongoose.model('chatGroupRule',chatGroupRuleSchema,'chatGroupRule');