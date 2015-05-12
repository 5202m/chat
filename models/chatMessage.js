/**
 * 内容数据实体类
 * author：alan.wu
 * date:2015/4/3
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,chatMessageSchema=new Schema(
    {
      _id:String,
      userId:{type:String,index:true},//用户id
      nickname:String,//用户昵称
      avatar:String,//用户头像
      userType:{type:Number, default:0},//区分系统用户还是会员，0表示会员，1表示系统用户
      groupId:{type:String,index:true},//组别Id
      content:{//内容
          msgType:String, //信息类型 txt,img缩略图的值。
          value:String,//默认值，
          maxValue:String, //如img大图值
          needMax:{type:Number, default:0} //是否需要最大值(0 表示不需要，1 表示需要）
      },
      fromPlatform:String,//平台来源
      status:{type:Number, default:1}, //内容状态：0 、禁用 ；1、启动
      publishTime:{type:String,index:true}, //发布日期
      createUser:{type:String,default:'admin'}, //新增记录的用户，默认admin
      createIp:String,//新增记录的Ip
      createDate:Date //创建日期
    });
module.exports =mongoose.model('chatMessage',chatMessageSchema,"chatMessage");