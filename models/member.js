/**
 * Created by Administrator on 2015/3/4.
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId
    ,chatUserGroupSchema = new Schema({//聊天室用户组别Schema
            _id:String,
            onlineStatus: {type:Number, default:1}, //在线状态：0 、下线 ；1、在线
            onlineDate: Date,//上线时间
            avatar:String,//头像
            nickname:String,//昵称
            accountNo:String //账号
     })
    ,loginPlatformSchema = new Schema({//登录平台Schema
         _id:String,
         chatUserGroup : [chatUserGroupSchema]
    })
    ,memberSchema = new Schema({//会员Schema
    _id:String,
    mobilePhone: String ,
    loginPlatform:[loginPlatformSchema]
   });
module.exports = mongoose.model('member',memberSchema,"member");