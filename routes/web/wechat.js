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
var wechatService = require('../../service/wechatService');//引入studioService
var chatPraiseService = require('../../service/chatPraiseService');//引入chatPraiseService
var logger=require('../../resources/logConf').getLogger('index');//引入log4js
/**
 * 数据同步
 */
/*router.get('/dbSynch',function(req, res){
    var dbSynchService = require('../../service/dbSynchService');//引入studioService
    //dbSynchService.synchMember();
    res.end("the data synch finish!")
});*/
/**
 * 聊天室页面入口
 */
router.get('/', function(req, res) {
    var token=req.query["token"],roomName=req.query["roomName"];
    var chatUser={};
    chatUser.userId=req.query["userId"];
    chatUser.groupId=req.query["groupId"];
    chatUser.nickname=req.query["nickname"];
    chatUser.avatar=req.query["avatar"];
    chatUser.mobilePhone=req.query["mobilePhone"];
    chatUser.fromPlatform=req.query["fromPlatform"];//是否后台进入
    logger.info("chat->param:token["+token+"],otherParam:"+JSON.stringify(chatUser));
    var userInfo=req.session.wechatUserInfo,toView=true;
    if((!userInfo && common.isBlank(token))||(common.isBlank(chatUser.userId))){
        if(constant.fromPlatform.pm_mis!=chatUser.fromPlatform && userInfo){
            userInfo.groupId='';
            chatUser=userInfo;
        }else {
            toView=false;
            logger.warn('chat->非法访问,ip:' + common.getClientIp(req));
            req.session.wechatUserInfo=null;
            res.render('error', {error: '链接参数失效，请重新访问！'});
        }
    }
    if(toView){
        var viewDataObj={};//输出参数
        if(constant.fromPlatform.pm_mis!=chatUser.fromPlatform){
            var deviceAgent = req.headers["user-agent"].toLowerCase();
            if(!config.isAllowCopyHomeUrl && deviceAgent.indexOf('micromessenger') == -1){
                req.session.wechatUserInfo=null;
                res.render('error',{error: '请在微信客户端打开链接!'});
                return;
            }
        }
        if(common.isBlank(chatUser.userType)){
            chatUser.userType=0;
        }
        if(common.isBlank(chatUser.nickname)){
            chatUser.nickname=chatUser.userId;
        }
        chatUser.groupType=constant.fromPlatform.wechat;//微信组
        pmApiService.destroyHomeToken(token,function(isTrue){
            if(isTrue||(constant.fromPlatform.pm_mis!=chatUser.fromPlatform && userInfo)) {
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
                        if(results.checkResult!=null && !results.checkResult.isOK){
                            req.session.wechatUserInfo=null;
                            res.render('error',{error: '您缺少访问权限，请联系管理员！'});
                        }else{
                            if(results.checkResult!=null){
                                chatUser.userType=results.checkResult.userType;
                                chatUser.roleNo=results.checkResult.roleNo;
                                chatUser.nickname=results.checkResult.nickname;
                                chatUser.position=results.checkResult.position;
                                chatUser.avatar=results.checkResult.avatar;
                                chatUser.accountNo= chatUser.userId;//后台进入的用户，账户与userId保持一致，保存到member表时，userId不保存
                            }
                            viewDataObj.socketUrl=JSON.stringify(config.socketServerUrl);
                            req.session.wechatUserInfo=chatUser;
                            viewDataObj.userInfo=JSON.stringify(chatUser);
                            viewDataObj.roomName=roomName;
                            if(constant.fromPlatform.pm_mis==chatUser.fromPlatform){//后台用户从后台进入则直接进入后台模板
                                res.render("wechat/admin",viewDataObj);
                            }else{
                                res.render("wechat/index",viewDataObj);
                            }
                        }
                    });
            }else{
                req.session.wechatUserInfo=null;
                res.render('error',{error: '链接已过期，请重新访问！'});
            }
        });
    }
});

/**
 * 进入房间
 */
router.get('/room', function(req, res) {
    var userInfo=req.session.wechatUserInfo;
    if(userInfo){
        userInfo.groupId=req.query.groupId;
        chatService.getRoomOnlineNumByRoomId(constant.fromPlatform.wechat,userInfo.groupId,function(onlineNum){
            userService.checkRoomStatus(userInfo.groupId,onlineNum,function(isOK){
                if(isOK){
                    userService.joinNewRoom(userInfo,function(){
                        var viewObj={apiUrl:(config.pmApiUrl+'/common'),userInfo:JSON.stringify(userInfo),socketUrl:JSON.stringify(config.socketServerUrl)};
                        res.render('wechat/room',viewObj);
                    });
                }else{
                    res.redirect("/wechat");
                }
            });
        });
    }else{
        res.redirect("/wechat");
    }
});

/**
 * 提取手机验证码
 */
router.get('/getMobileVerifyCode',function(req, res){
    var mobilePhone=req.query["mobilePhone"];
    var useType=req.query["useType"];
    var ip = common.getClientIp(req);
    if(common.isBlank(mobilePhone)||!common.isMobilePhone(mobilePhone)){
        res.json(errorMessage.code_1003);
    }else if(useType != "wechat_login"){
        res.json(errorMessage.code_1000);
    }else{
        pmApiService.getMobileVerifyCode(mobilePhone, useType, ip, function(result){
            res.json(result);
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
    var verifyCode=req.body["verifyCode"],
         userInfo={groupId:req.body["groupId"],userId:req.body["userId"],nickname:req.body["nickname"],accountNo:req.body["accountNo"],mobilePhone:req.body["mobilePhone"]};
    console.log("checkClient->userInfo:"+JSON.stringify(userInfo));
    if(common.isBlank(userInfo.accountNo)||common.isBlank(userInfo.mobilePhone)||common.isBlank(verifyCode)){
        res.json(errorMessage.code_1001);
    }else if(!common.isMobilePhone(userInfo.mobilePhone)){
        res.json(errorMessage.code_1003);
    }else{
        //微信登录，校验验证码
        pmApiService.checkMobileVerifyCode(userInfo.mobilePhone, "wechat_login", verifyCode, function(result){
            if(!result || result.result != 0 || !result.data){
                if(result.errcode === "1006" || result.errcode === "1007"){
                    res.json({'errcode' : result.errcode, 'errmsg' : result.errmsg});
                }else{
                    res.json(errorMessage.code_1007);
                }
            }else{
                userInfo.ip=common.getClientIp(req);
                userInfo.groupType=constant.fromPlatform.wechat;//微信组
                userService.checkClient(userInfo,function(result){
                    console.log("result:"+JSON.stringify(result));
                    res.json(result);
                });
            }
        });
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
    var userId=req.body["userId"],groupId=req.body["groupId"],fromPlatform=req.body["fromPlatform"],accountNo=req.body["accountNo"],result={isVisitor:true};
    if(common.isBlank(userId)||common.isBlank(groupId)){
        res.json(result);
    }else {
        userService.checkUserLogin({userId:userId,groupId:groupId,fromPlatform:fromPlatform,accountNo:accountNo,groupType:constant.fromPlatform.wechat},function(row) {
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
    var publishTime=req.query["publishTime"],userId=req.query["userId"];
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
 * 提取文档信息
 */
router.get('/getArticleList', function(req, res) {
    var code=req.query["code"],
        platform=req.query["platform"],
        pageNo=req.query["pageNo"],
        pageSize=req.query["pageSize"],
        hasContent=req.query["hasContent"],
        orderByStr=req.query["orderByStr"];
    pageNo = common.isBlank(pageNo) ? 1 : pageNo;
    pageSize = common.isBlank(pageSize) ? 15 : pageSize;
    orderByStr = common.isBlank(orderByStr) ? "" : orderByStr;
    if(code=='trade_strategy'){
        code='trade_strategy_article,trade_strategy_video,trade_strategy_audio';
    }
    pmApiService.getArticleList(code,platform,"zh",hasContent,pageNo,pageSize,orderByStr,function(data){
        res.json(data?JSON.parse(data):null);
    });
});



/**
 * 提取文档信息
 */
router.get('/getArticleInfo', function(req, res) {
    var id=req.query["id"];
    pmApiService.getArticleInfo(id,function(data){
        res.json(data?JSON.parse(data):null);
    });
});

/**
 * 提取文档信息
 */
router.get('/getRoomList', function(req, res) {
    wechatService.getRoomList(function(data){
        res.json(data);
    });
});

/**
 * 提取文档信息
 */
router.get('/getUserInfo', function(req, res) {
    var id=req.query["id"];
    if(common.isBlank(id)){
        res.json(null);
    }else{
        userService.getUserInfo(id,function(data){
            if(data){
                res.json({name:data.userName,desc:data.introduction,descImg:data.introductionImg});
            }else{
                res.json(null);
            }
        });
    }
});

/**
 * 提取文档信息
 */
router.post('/setUserPraise', function(req, res) {
    var clientId=req.body.clientId,praiseId=req.body.praiseId;
    if(common.isBlank(clientId)||common.isBlank(praiseId)){
        res.json({isOK:false});
    }else{
        pmApiService.checkChatPraise(clientId,praiseId,function(isOK){
            if(isOK){
                chatPraiseService.setPraise(praiseId,constant.chatPraiseType.user);
            }
            res.json({isOK:isOK});
        });
    }
});
/**
 * 提取点赞数
 */
router.get('/getUserPraiseNum', function(req, res) {
    var praiseId=req.query.praiseId;
    if(common.isBlank(praiseId)){
        res.json({num:0});
    }else{
        chatPraiseService.getPraiseNum(praiseId,constant.chatPraiseType.user,function(data){
            res.json(data);
        });
    }
});

module.exports = router;
