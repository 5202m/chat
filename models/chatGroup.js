/**
 * 聊天组别实体类
 * author：alan.wu
 * date:2015/4/3
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,chatGroupSchema=new Schema(
        {
          _id:{type:String},
          groupType:{type:String},//组类别
          name:{type:String},//名称
          status:{type:Number, default:1}, //状态：0 、禁用 ；1、启动
          valid:{type:Number, default:1}, //是否删除：0 、删除 ；1、正常
          sequence:{type:Number, default:0},//排序序列
          level:{type:Number, default:0},//级别
          talkStyle:String,//聊天方式,多个逗号分隔
          openDate:String,//开放时间
          maxCount: {type:Number, default:0},//最大人数
          authUsers : [String],//授权用户
          defaultAnalyst:{//默认分析师
              _id:String,
              userNo:String,
              userName:String,
              position:String, //职位
              avatar:String //头像
          },
          chatRules:[{
              type:{type:String},
              beforeRuleVal:{type:String},//使用规则前的值
              afterRuleVal:{type:String},//使用规则后的值
              periodDate:{type:String}, //时间段（开始时间）
              afterRuleTips:{type:String} //执行规则后的提示语
          }],
          chatStudio:{
              clientGroup:String,//客户组（对应数据字典的客户组,多个逗号分隔）
              yyChannel:{type:String,default:''},//YY频道号
              minChannel:{type:String,default:''},//小频道号
              studioDate:String,//直播时间
              externalStudio:String,//外接直播
              remark:{type:String,default:''} //备注
           }
        });
module.exports =mongoose.model('chatGroup',chatGroupSchema,'chatGroup');