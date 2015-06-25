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
    var chatUser={};
    chatUser.userId=req.param("userId");
    chatUser.groupId=req.param("groupId");
    chatUser.nickname=req.param("nickname");
    chatUser.avatar=req.param("avatar");
    chatUser.mobilePhone=req.param("mobilePhone");
    chatUser.fromPlatform=req.param("fromPlatform");//是否后台进入
    logger.info("chat->param:token["+token+"],otherParam:"+JSON.stringify(chatUser));
    if(common.isBlank(token)||common.isBlank(chatUser.groupId)||(common.isBlank(chatUser.userId))){
        logger.warn('chat->非法访问,ip:'+ common.getClientIp(req));
        res.render('chat/error',{error: '输入参数有误，请检查链接的输入参数！'});
    }else{
        var viewDataObj={};//输出参数
        if(chatUser.groupId.indexOf(constant.weChatGroupId)!=-1){
            var deviceAgent = req.headers["user-agent"].toLowerCase();
            if(!config.isAllowCopyHomeUrl && deviceAgent.indexOf('micromessenger') == -1 && constant.fromPlatform.pm_mis!=chatUser.fromPlatform){
                res.render('chat/error',{error: '请在微信客户端打开链接!'});
                return;
            }
            viewDataObj={web24kPriceUrl:(config.pmApiUrl+'/common/get24kPrice')};
        }
        if(common.isBlank(chatUser.userType)){
            chatUser.userType=0;
        }
        if(common.isBlank(chatUser.nickname)){
            chatUser.nickname=chatUser.userId;
        }
        chatService.destroyHomeToken(token,function(isTrue){
            if(isTrue) {
                req.session.token=token;
                async.parallel({
                        checkResult: function(callback){
                            if(common.isValid(chatUser.fromPlatform)&&constant.fromPlatform.pm_mis==chatUser.fromPlatform){//检查系统用户
                                userService.checkSystemUserInfo(chatUser,function(result){
                                    callback(null,result);
                                });
                            }else{
                                callback(null,null);
                            }
                        },
                        returnObj: function(callback){ callback(null,null);}
                    },
                    function(err, results) {
                        if(results.checkResult!=null && !results.checkResult.isOk){
                            res.render('chat/error',{error: '您缺少访问权限，请联系管理员！'});
                        }else{
                            if(results.checkResult!=null){
                                chatUser.userType=results.checkResult.userType;
                                chatUser.roleNo=results.checkResult.roleNo;
                                chatUser.nickname=results.checkResult.nickname;
                                chatUser.accountNo= chatUser.userId;//后台进入的用户，账户与userId保持一致，保存到member表时，userId不保存
                            }
                            var mainKey=chatUser.groupId.replace(/_+.*/g,"");//去掉后缀
                            viewDataObj.socketUrl=config.socketServerUrl+"/"+mainKey+constant.socketSpaceSuffix;
                            viewDataObj.userInfo=JSON.stringify(chatUser);
                            if(constant.fromPlatform.pm_mis==chatUser.fromPlatform){//后台用户从后台进入则直接进入后台模板
                                res.render("chat/adminChat",viewDataObj);
                            }else{
                                res.render(constant.chatIndexUrl[mainKey],viewDataObj);
                            }
                        }
                    });
            }else{
                if(!req.session.token||(req.session.token && req.session.token!=token)){
                    res.render('chat/error',{error: '链接已过期，请重新访问！'});
                }else{
                    res.render('chat/error',{error: '非常抱歉，请求出现异常，请重新访问！'});
                }
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
        console.log("warn:please upload img by linux server!");
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
        res.writeHead(200, {"Content-Type": "image/jpeg"});
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
