/**
 * 内容数据实体类
 * author：alan.wu
 * date:2015/4/3
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId
    ,chatMessageSchema=new Schema(
    {
      _id:String,
      userId:String,//用户id
      nickname:String,//用户昵称
      avatar:String,//用户头像
      userType:{type:Number, default:0},//区分系统用户还是会员，0表示会员，1表示系统用户
      groupId:String,//组别Id
      content:String, //内容
      msgType:String, //信息类型
      status:{type:Number, default:1}, //内容状态：0 、禁用 ；1、启动
      publishTime:{type:Number, default:0}, //发布日期
      createUser:{type:String,default:'admin'}, //新增记录的用户，默认admin
      createIp:String,//新增记录的Ip
      createDate:Date //创建日期
    });
module.exports =mongoose.model('chatMessage',chatMessageSchema,"chatMessage");