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
    var token=req.param("token");
    chatOnlineUser.userId=req.param("userId");
    chatOnlineUser.groupId=req.param("groupId");
    chatOnlineUser.nickname=req.param("nickname");
    chatOnlineUser.avatar=req.param("avatar");
    chatOnlineUser.userType=req.param("userType");
    if(common.isBlank(token)||common.isBlank(chatOnlineUser.userId)||common.isBlank(chatOnlineUser.groupId)){
        res.render('chat/error',{error: '输入参数有误，必须传入token,userId，groupId'});
    }else{
        chatService.destroyHomeToken(token,function(isTrue){
            if(isTrue) {
                res.render('chat/index', {title: '聊天室', userInfo: JSON.stringify(chatOnlineUser)});
            }else{
                res.render('chat/error',{error: 'token验证失效！'});
            }
        });
    }
});

module.exports = router;
