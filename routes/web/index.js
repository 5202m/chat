/**
 * 页面请求控制类
 * Created by Alan.wu on 2015/3/4.
 */
var express = require('express');
var router = express.Router();
var chatOnlineUser = require('../../models/chatOnlineUser');//引入chatOnlineUser对象
var chatService = require('../../service/chatService');//引入chat的socket.io server
var common = require('../../util/common');//引入chat的socket.io server
chatService.init();//启动socket

/**
 * 聊天室页面入口
 */
router.get('/chat', function(req, res) {
    chatOnlineUser.userId=req.param("userId");
    chatOnlineUser.groupId=req.param("groupId");
    chatOnlineUser.userNickname=req.param("nickname");
    chatOnlineUser.userAvatar=req.param("avatar");
    if(/^U(\d{6})[A-Z](\d{6})/g.test(chatOnlineUser.userId)){//系统用户，则提取对应权限，以开放聊天室的对应权限
        chatOnlineUser.userType=1;
    }
    if(common.isBlank(chatOnlineUser.userId)||common.isBlank(chatOnlineUser.groupId)){
        res.render('chat/error',{error: '输入参数有误，必须传入userId，groupId'});
    }else{
        res.render('chat/index',{title: '聊天室',userInfo:JSON.stringify(chatOnlineUser)});
    }
});

module.exports = router;
