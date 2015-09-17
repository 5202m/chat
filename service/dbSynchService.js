var common = require('../util/common'); //引入公共的js
var memberBack = require('../models/memberBack');//引入memberBack数据模型
var member = require('../models/member');//引入member数据模型
var logger = require('../resources/logConf').getLogger('dbSynchService');
/**
 * 数据同步服务
 * @type {{}}
 * create by alan.wu
 */
var dbSynchService = {

    /**
     * 同步用户数据
     */
    synchMember:function(){
        memberBack.find({},function(err,rows){
            if(err){
                logger.error("find member fail....");
            }else{
                for(var i in rows){
                    dbSynchService.saveMember(rows[i]);
                }
            }
        })
    },
    /**
     * 保存数据
     * @param row
     */
    saveMember:function(row,callback){
        var ugRow=row.loginPlatform.chatUserGroup[0];
        var memberModel = {
            _id:row._id,
            mobilePhone:row.mobilePhone,
            status:row.status, //内容状态：0 、禁用 ；1、启动
            valid:row.valid,//有效
            createUser:row.createUser,
            createIp:row.createIp,//新增记录的Ip
            updateIp:row.updateIp,//新增记录的Ip
            createDate:row.createDate,//创建日期
            updateDate:row.updateDate,
            loginPlatform:{
                chatUserGroup:[
                    {  _id:'wechat',//组id，与聊天室组对应
                        userId:ugRow.userId,//第三方用户id，对于微信，userId为微信的openId;
                        avatar:ugRow.avatar,//头像
                        nickname:ugRow.nickname,//昵称
                        accountNo:ugRow.accountNo, //账号
                        roleNo:ugRow.roleNo,
                        userType:ugRow.userType,
                        vipUser:false,
                        createDate:row.createDate,
                        rooms:[{
                            _id:'wechat_1',
                            onlineStatus:ugRow.onlineStatus , //在线状态：0 、下线 ；1、在线
                            onlineDate:ugRow.onlineDate,
                            sendMsgCount:ugRow.sendMsgCount
                        }]
                    }]
            }
        };
        member.create(memberModel,function(err,count){
            if(!err && count){
                console.log('create member success!');
                if(callback){
                    callback(true);
                }
            }
        });
    }
};
//导出服务类
module.exports =dbSynchService;

