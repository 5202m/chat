/**
 * 聊天组别实体类
 * author：alan.wu
 * date:2015/4/3
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , chatRulesSchema=new Schema( //聊天规则
        {
            type:{type:String},
            beforeRuleVal:{type:String},//使用规则前的值
            afterRuleVal:{type:String},//使用规则后的值
            periodStartDate:{type:Date}, //时间段（开始时间）
            periodEndDate:{type:Date}, //时间段（结束时间）
            afterRuleTips:{type:String} //执行规则后的提示语
        })
    ,chatGroupSchema=new Schema(
        {
          _id:{type:String},
          name:{type:String},//名称
          status:{type:Number, default:1}, //状态：0 、禁用 ；1、启动
          valid:{type:Number, default:1}, //是否删除：0 、删除 ；1、正常
          chatRules:[chatRulesSchema]
        });
module.exports =mongoose.model('chatGroup',chatGroupSchema,'chatGroup');