/**
 * 内容数据实体类
 * author：alan.wu
 * date:2015/4/3
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;
/**
 * 圆形定义
 * @type {Schema}
 */
var chatContentSchema=new Schema(
    {
      _id:{type:String},
      userId:{type:String},//用户id
      nickname:{type:String},//用户昵称
      avatar:{type:String},//用户头像
      userType:{type:Number, default:0},//区分系统用户还是会员，0表示会员，1表示系统用户
      groupId:{type:String},//组别Id
      content:{type:String}, //内容
      status:{type:Number, default:1}, //内容状态：0 、禁用 ；1、启动
      publishDate:{type:Date}, //发布日期
      createUser:{type:String,default:'admin'}, //新增记录的用户，默认admin
      createIp:{type:String},//新增记录的Ip
      createDate:{type:Date} //创建日期
    }
);
module.exports =mongoose.model('chatContent',chatContentSchema,"chatContent");