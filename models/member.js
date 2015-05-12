/**
 * Created by Administrator on 2015/3/4.
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,memberSchema = new Schema({//会员Schema
        _id:String,
        mobilePhone: {type:String,index:true} ,
        valid: {type:Number, default:1}, //是否删除：0 、删除；1、正常
        status: {type:Number, default:1}, //用户状态(0:禁用 1：启用)
        createUser:{type:String,default:'admin'}, //新增记录的用户，默认admin
        createIp:String,//新增记录的Ip
        createDate:{type:Date,default:Date.now()},//创建日期
        updateIp:String,
        updateDate:{type:Date,default:Date.now()},//创建日期
        loginPlatform:{
            chatUserGroup:[{  _id:String,//组id，与聊天室组对应
                userId:{type:String,index:true},//第三方用户id，对于微信，userId为微信的openId;
                onlineStatus: {type:Number, default:1}, //在线状态：0 、下线 ；1、在线
                onlineDate: Date,//上线时间
                avatar:String,//头像
                nickname:String,//昵称
                gagStartDate:Date,//禁言-开始时间
                gagEndDate:Date,//禁言-结束时间
                gagTips:String,//禁言提示语
                accountNo:{type:String,index:true}, //账号
                isBindWechat:Boolean, //是否绑定微信
                userType:{type:Number, default:0},//区分系统用户还是会员，0表示会员，1表示管理员，2、分析师
                intoChatTimes:{type:Number, default:0}//进入聊天室次数
                }]
        }
   });
module.exports = mongoose.model('member',memberSchema,"member");