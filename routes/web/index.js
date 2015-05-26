/**
 * 页面请求控制类
 * Created by Alan.wu on 2015/3/4.
 */
var router =  require('express').Router();
var async = require('async');//引入async
var constant = require('../../constant/constant');//引入constant
var config = require('../../resources/config');//引入config
var common = require('../../util/common');//引入common
var errorMessage = require('../../util/errorMessage');
var chatOnlineUser = require('../../models/chatOnlineUser');//引入chatOnlineUser对象
var userService = require('../../service/userService');//引入userService
var messageService = require('../../service/messageService');//引入messageService
var chatService = require('../../service/chatService');//引入chatService
var pmApiService = require('../../service/pmApiService');//引入pmApiService
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
    chatOnlineUser.mobilePhone=req.param("mobilePhone");
    chatOnlineUser.fromPlatform=req.param("fromPlatform");//是否后台进入
    if(common.isBlank(token)||common.isBlank(chatOnlineUser.groupId)||(common.isBlank(chatOnlineUser.userId))){
        logger.warn('chat->非法访问,ip:'+ common.getClientIp(req));
        res.render('chat/error',{error: '输入参数有误，请检查链接的输入参数！'});
    }else{
        if(common.isBlank(chatOnlineUser.userType)){
            chatOnlineUser.userType=0;
        }
        if(common.isBlank(chatOnlineUser.nickname)){
            chatOnlineUser.nickname=chatOnlineUser.userId;
        }
        chatService.destroyHomeToken(token,function(isTrue){
            if(isTrue) {
                async.parallel({
                        checkResult: function(callback){
                            if(common.isValid(chatOnlineUser.fromPlatform)&&constant.fromPlatform.pm_mis==chatOnlineUser.fromPlatform){//检查系统用户
                                userService.checkSystemUserInfo(chatOnlineUser,function(result){
                                    callback(null,result);
                                });
                            }else{
                                callback(null,null);
                            }
                        },
                        returnObj: function(callback){
                            var obj={};//输出参数
                            if(chatOnlineUser.groupId==constant.weChatGroupId){
                                var isFromWeChat=true,error='';
                                var deviceAgent = req.headers["user-agent"].toLowerCase();
                                if(!config.isAllowCopyHomeUrl && deviceAgent.indexOf('micromessenger') == -1 && constant.fromPlatform.pm_mis!=chatOnlineUser.fromPlatform){
                                    isFromWeChat=false;
                                    error='请在微信客户端打开链接!';
                                }
                                obj={web24kPriceUrl:(config.pmApiUrl+'/common/get24kPrice'),isFromWeChat:isFromWeChat,error:error};
                            }
                            callback(null,obj);
                        }
                    },
                    function(err, results) {
                        if(results.checkResult!=null && !results.checkResult.isOk){
                            res.render('chat/error',{error: '您缺少访问权限，请联系管理员！'});
                        }else{
                            var obj=results.returnObj;
                            if(results.checkResult!=null){
                                chatOnlineUser.userType=results.checkResult.userType;
                                chatOnlineUser.nickname=results.checkResult.nickname;
                                chatOnlineUser.accountNo= chatOnlineUser.userId;//后台进入的用户，账户与userId保持一致，保存到member表时，userId不保存
                            }
                            obj.socketUrl=config.socketServerUrl;
                            obj.userInfo=JSON.stringify(chatOnlineUser);
                            res.render(constant.chatIndexUrl[chatOnlineUser.groupId],obj);
                        }
                    });
            }else{
                res.render('chat/error',{error: '链接已过期，请重新访问！'});
            }
        });
    }
});

/**
 * 上传数据
 */
router.post('/uploadData', function(req, res) {
    var data = req.body;
    if(data!=null && process.platform.indexOf("win")==-1){
        var imgUtil=require('../../util/imgUtil');//引入imgUtil
        var val=data.content.value,needMax=data.content.needMax;
        if(data.content.msgType=="img" && common.isValid(val)){
            imgUtil.zipImg(val,100,60,function(minResult){
                data.content.value=minResult.data;
                if(needMax==1){
                    imgUtil.zipImg(val,0,60,function(maxResult){
                        data.content.maxValue=maxResult.data;
                        chatService.acceptMsg(data,null);
                        res.json({success:true});
                    });
                }else{
                    chatService.acceptMsg(data,null);
                    res.json({success:true});
                }
            });
        }else{
            res.json({success:false});
        }
    }else{
        res.json({success:false});
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
        var code=req.session.verifyCode;
        console.log("checkClient->code:"+code);
        if(common.isBlank(code) || (common.isValid(code) && code!=verifyCode.toLowerCase())){
            res.json(errorMessage.code_1002);
        }else{
            userInfo.ip=common.getClientIp(req);
            userService.checkClient(userInfo,function(result){
                console.log("result:"+JSON.stringify(result));
                res.json(result);
            });
        }
    }
});

/**
 * 提取验证码
 */
router.get('/getVerifyCode', function(req, res) {
    if(process.platform.indexOf("win")!=-1){
        res.end("");
    }else{
        var verifyCodeObj = require("../../util/verifyCode").Generate(50,25);
        req.session.verifyCode= verifyCodeObj.code;
        console.log("req.session.verifyCode:"+req.session.verifyCode);
        res.end(new Buffer(verifyCodeObj.dataURL.replace(/^data:image.*base64,/,""),'base64'));
    }
});

/**
 * 检查发送权限
 */
router.post('/checkSendAuthority', function(req, res) {
    var userId=req.param("userId"),groupId=req.param("groupId"),fromPlatform=req.param("fromPlatform"),accountNo=req.param("accountNo"),result={isVisitor:true};
    if(common.isBlank(userId)||common.isBlank(groupId)){
        res.json(result);
    }else {
        userService.checkUserLogin({userId:userId,groupId:groupId,fromPlatform:fromPlatform,accountNo:accountNo},function(row) {
            if (row) {
                result.isVisitor=false;
            }
            res.json(result);
        });
    }
});

/**
 * 加载大图数据
 */
router.get('/getBigImg', function(req, res) {
    var publishTime=req.param("publishTime"),userId=req.param("userId");
    if(common.isBlank(publishTime)){
        res.end("");
    }else {
        messageService.loadBigImg(userId,publishTime, function (bigImgData) {
            if(common.isBlank(bigImgData)){
                res.end("");
            }else{
                res.writeHead(200, {"Content-Type": "image/jpeg"});
                res.end(new Buffer(bigImgData.replace(/^data:image.*base64,/,""),'base64'));
            }
        });
    }
});

/**
 * 提取公告信息
 */
router.get('/getBulletinList', function(req, res) {
    pmApiService.getBulletinList('zh',1,20,function(data){
        res.json(data?JSON.parse(data):null);
    });
});

/**
 * 提取广告信息
 */
router.get('/getAdvertisement', function(req, res) {
    pmApiService.getAdvertisement(function(data){
        res.json(data?JSON.parse(data):null);
    });
});

module.exports = router;
