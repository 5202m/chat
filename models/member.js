/**
 * Created by Administrator on 2015/3/4.
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId
    ,chatUserGroupSchema = new Schema({//聊天室用户组别Schema
            _id:String,//组id，与聊天室组对应
            userId:String,//第三方用户id，对于微信，userId为微信的openId;
            onlineStatus: {type:Number, default:1}, //在线状态：0 、下线 ；1、在线
            onlineDate: Date,//上线时间
            avatar:String,//头像
            nickname:String,//昵称
            accountNo:String //账号
     })
    ,loginPlatformSchema = new Schema({//登录平台Schema
         chatUserGroup : [chatUserGroupSchema]
    })
    ,loginPlatformModel=mongoose.model('loginPlatform',loginPlatformSchema,"loginPlatform")
    ,memberSchema = new Schema({//会员Schema
        _id:String,
        mobilePhone: String ,
        valid: {type:Number, default:1}, //是否删除：0 、删除；1、正常
        status: {type:Number, default:1}, //用户状态(0:禁用 1：启用)
        createUser:{type:String,default:'admin'}, //新增记录的用户，默认admin
        createIp:String,//新增记录的Ip
        createDate:{type:Date,default:Date.now()},//创建日期
        updateIp:String,
        updateDate:{type:Date,default:Date.now()},//创建日期
        loginPlatform:{
            chatUserGroup:[{  _id:String,//组id，与聊天室组对应
                userId:String,//第三方用户id，对于微信，userId为微信的openId;
                onlineStatus: {type:Number, default:1}, //在线状态：0 、下线 ；1、在线
                onlineDate: Date,//上线时间
                avatar:String,//头像
                nickname:String,//昵称
                accountNo:String //账号
                }]
        }
   });
module.exports = mongoose.model('member',memberSchema,"member");