/**
 * 页面请求控制类
 * Created by Alan.wu on 2015/3/4.
 */
var express = require('express');
var router = express.Router();
var config = require('../../resources/config');//引入config
var common = require('../../util/common');//引入common
var errorMessage = require('../../util/errorMessage');
var chatOnlineUser = require('../../models/chatOnlineUser');//引入chatOnlineUser对象
var userService = require('../../service/userService');//引入userService
var messageService = require('../../service/messageService');//引入messageService
var chatService = require('../../service/chatService');//引入chatService
var logger=require('../../resources/logConf').getLogger('index');//引入log4js
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
    if(common.isBlank(token)||common.isBlank(chatOnlineUser.groupId)||(common.isBlank(chatOnlineUser.userId))){
        logger.warn('chat->非法访问,ip:'+ common.getClientIp(req));
        res.render('chat/error',{error: '输入参数有误，必须传入token，groupId,userId'});
    }else{
        if(common.isBlank(chatOnlineUser.userType)){
            chatOnlineUser.userType=0;
        }
        if(common.isBlank(chatOnlineUser.nickname)){
            chatOnlineUser.nickname=chatOnlineUser.userId;
        }
        chatService.destroyHomeToken(token,function(isTrue){
            if(isTrue) {
                res.render('chat/index', {socketUrl:config.socketServerUrl,userInfo: JSON.stringify(chatOnlineUser)});
            }else{
                res.render('chat/error',{error: 'token验证失效！'});
            }
        });
    }
});

/**
 * 检查客户是否激活
 */
router.post('/checkClient', function(req, res) {
    var verifyCode=req.param("verifyCode"),
         userInfo={groupId:req.param("groupId"),userId:req.param("userId"),nickname:req.param("nickname"),accountNo:req.param("accountNo"),mobilePhone:req.param("mobilePhone")};
    console.log("checkClient->userInfo:"+JSON.stringify(userInfo));
    if(common.isBlank(userInfo.accountNo)||common.isBlank(userInfo.mobilePhone)||common.isBlank(verifyCode)){
        res.json(errorMessage.code_1001);
    }else if(!(/(^[0-9]{11})$|(^86(-){0,3}[0-9]{11})$/.test(userInfo.mobilePhone))){
        res.json(errorMessage.code_1003);
    }else{
        if(common.isBlank(req.session.verifyCode) || (common.isValid(req.session.verifyCode) && verifyCode.toLowerCase()!=req.session.verifyCode)){
            res.json(errorMessage.code_1002);
        }else{
            userInfo.ip=common.getClientIp();
            userService.checkClient(userInfo,function(result){
                console.log("result.flag:"+result.flag);
                res.json(result);
            });
        }
    }
});

/**
 * 提取验证码
 */
router.post('/getVerifyCode', function(req, res) {
    var charCode=["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s",
        "t","u","v","w","x","y","z","0","1","2","3","4","5","6","7","8","9"];
    var result=[];
    for(var i=0;i<4;i++){
        var nd=Math.floor(Math.random()*charCode.length);
        result.push(charCode[nd]);
    }
    var code=result.join("");
    req.session.verifyCode=code;
    res.json({code:code});
});

/**
 * 加载大图数据
 */
router.post('/getBigImg', function(req, res) {
    var publishTime=req.param("publishTime");
    if(common.isBlank(publishTime)){
        res.json({});
    }else {
        messageService.loadBigImg(publishTime, function (bigImgData) {
            res.json({value: bigImgData});
        });
    }
});


module.exports = router;
