var chatMessage = require('../models/chatMessage');//引入chatMessage数据模型
/**
 * 聊天室服务类
 * 备注：处理聊天室接受发送的所有信息及其管理
 * author Alan.wu
 */
var messageService ={
    /**
     * 从数据库中加载已有的聊天记录
     */
    loadMsg:function(groupId,callback){
        chatMessage.find().where('groupId').equals(groupId).where('status').equals(1).limit(100).sort({'publishTime':'desc'}).exec(function (err,data) {
            if(!err){
                callback(data);
            }
        });
    },
    /**
     * 保存内容到数据库中
     */
    saveMsg:function(data){
        var userInfo=data.fromUser;
        var chatMessageModel = new chatMessage({
            _id:null,
            userId:userInfo.userId,
            nickname:userInfo.nickname||'',
            avatar:userInfo.avatar||'',
            userType:userInfo.userType||0,
            groupId:userInfo.groupId,
            msgType:data.content.type,
            content:data.content.value,
            status:1, //内容状态：0 、禁用 ；1、启动
            publishTime:userInfo.publishTime, //发布日期
            createUser:userInfo.userId,
            createIp:userInfo.createIp,//新增记录的Ip
            createDate:new Date()//创建日期
        });
        chatMessageModel.save(function(){
            console.log('save chatMessage success!');
        });
    }
};
//导出服务类
module.exports =messageService;

