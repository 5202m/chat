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
          groupType:{type:String,index:true},//组类别
          name:{type:String},//名称
          status:{type:Number, default:1,index:true}, //状态：0 、禁用 ；1、启动; 2、授权访问
          valid:{type:Number, default:1,index:true}, //是否删除：0 、删除 ；1、正常
          sequence:{type:Number, default:0},//排序序列
          level:{type:Number, default:0},//级别
          talkStyle:String,//聊天方式,多个逗号分隔
          whisperRoles:String,//私聊角色类型,多个逗号分隔
          openDate:String,//开放时间
          maxCount: {type:Number, default:0},//最大人数
          authUsers : [String],//授权用户
          defaultAnalyst:{//默认分析师
              _id:String,
              userNo:{type:String,index:true},
              userName:String,
              position:String, //职位
              avatar:String, //头像
              introduction:String //简介
          },
          chatRules:[{
              type:{type:String},
              beforeRuleVal:{type:String},//使用规则前的值
              afterRuleVal:{type:String},//使用规则后的值
              periodDate:{type:String}, //时间段（开始时间）
              afterRuleTips:{type:String}, //执行规则后的提示语
              clientGroup:{type:String}//客户组别
          }],
          clientGroup:String,//客户组（对应数据字典的客户组,多个逗号分隔）
          remark:String, //备注
          defTemplate:String, //默认主题皮肤
          traninClient:[{ clientId:{type:String,index:true}, nickname:{type:String},isAuth:{type:Number, default:0}}],//培训报名学员 isAuth : 0 、禁用授权 ；1、授权
          roomType:String, // 房间类别（普通：normal，VIP：vip，培训班：train）
          point:Number, //房间积分
          label:String //房间标签
        });
module.exports =mongoose.model('chatGroup',chatGroupSchema,'chatGroup');