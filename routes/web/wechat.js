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
var syllabusService = require('../../service/syllabusService');//引入syllabusService
var wechatService = require('../../service/wechatService');//引入studioService
var chatPraiseService = require('../../service/chatPraiseService');//引入chatPraiseService
var logger=require('../../resources/logConf').getLogger('wechat');//引入log4js

/**
 * 聊天室前台页面入口
 */
router.get('/', function(req, res) {
    var token=req.query["token"],chatUser={};
    chatUser.userId=req.query["userId"];
    chatUser.nickname=req.query["nickname"];
    chatUser.avatar=req.query["avatar"];
    logger.info("chat-index->param:token["+token+"],otherParam:"+JSON.stringify(chatUser));
    var userInfo=req.session.wechatUserInfo;
    if(common.isBlank(token)||common.isBlank(chatUser.userId)){
        if(userInfo){//存在session，则不需要判断请求参数
            userInfo.groupId=null;//清空session保留的房间id
            chatUser=userInfo;
        }else {
            req.session.wechatUserInfo=null;
            logger.warn('chat-index->非法访问,ip:' + common.getClientIp(req));
            res.render('error', {error: '链接参数失效，请重新访问！'});
            return;
        }
    }
    var deviceAgent = req.headers["user-agent"].toLowerCase();
    if(!config.isAllowCopyHomeUrl && deviceAgent.indexOf('micromessenger') == -1){
        req.session.wechatUserInfo=null;
        res.render('error',{error: '请在微信客户端打开链接!'});
        return;
    }
    if(common.isBlank(chatUser.userType)){
        chatUser.userType=0;
    }
    if(common.isBlank(chatUser.nickname)){
        chatUser.nickname=chatUser.userId;
    }
    chatUser.groupType=getGroupType(req);//房间组
    pmApiService.destroyHomeToken(token,(userInfo!=null && userInfo!=undefined) ,function(isTrue){
        if(isTrue) {
            req.session.wechatUserInfo=chatUser;
            //跳转页面，过滤输出mobilePhone,accountNo，防止前台页面看到,如是水军则直接过滤mobilePhone，因为accountNo需要发言是使用
            var viewUserInfo=JSON.stringify(common.filterField(chatUser,chatUser.userType==constant.roleUserType.navy?"mobilePhone":"mobilePhone,accountNo"));
            res.render(getRenderPath(req,"index"),{socketUrl:JSON.stringify(config.socketServerUrl),userInfo:viewUserInfo});
        }else{
            req.session.wechatUserInfo=null;
            res.render('error',{error: '链接已过期，请重新访问！'});
        }
    });
});

/**
 * 聊天室后台入口
 */
router.get('/admin', function(req, res) {
    var token=req.query["token"],roomName=req.query["roomName"],chatUser={};
    chatUser.userId=req.query["userId"];
    chatUser.groupId=req.query["groupId"];
    chatUser.avatar=req.query["avatar"];
    chatUser.mobilePhone=req.query["mobilePhone"];
    chatUser.fromPlatform=req.query["fromPlatform"];//是否后台进入
    logger.info("chat-admin->param:token["+token+"],otherParam:"+JSON.stringify(chatUser));
    if(common.isBlank(token)||common.isBlank(chatUser.groupId)||common.isBlank(chatUser.userId)||constant.fromPlatform.pm_mis!=chatUser.fromPlatform){
        logger.warn('chat-admin->非法访问,ip:' + common.getClientIp(req));
        res.render('error', {error: '链接参数失效或有误，请重新访问！'});
    }
    chatUser.groupType=getGroupType(req);//房间组
    pmApiService.destroyHomeToken(token,false,function(isTrue){
        if(isTrue) {
            async.parallel({
                    checkResult: function(callback){
                        userService.checkSystemUserInfo(chatUser,function(result){
                            callback(null,result);
                        });
                    },
                    returnObj: function(callback){ callback(null,null);}
                },
                function(err, results) {
                    if(results.checkResult==null){
                        res.render('error',{error: '系统检查参数出现异常，请联系管理员！'});
                    }else{
                        if(!results.checkResult.isOK){
                            res.render('error',{error: '您缺少访问权限，请联系管理员！'});
                        }else{
                            chatUser.userType=results.checkResult.userType;
                            chatUser.roleNo=results.checkResult.roleNo;
                            chatUser.nickname=results.checkResult.nickname;
                            chatUser.position=results.checkResult.position;
                            chatUser.avatar=results.checkResult.avatar;
                            chatUser.accountNo= chatUser.userId;//后台进入的用户，账户与userId保持一致，保存到member表时，userId不保存
                            //过滤输出mobilePhone，防止后台页面看到
                            res.render(getRenderPath(req,"admin"),{socketUrl:JSON.stringify(config.socketServerUrl),roomName:roomName,userInfo:JSON.stringify(common.filterField(chatUser,"mobilePhone"))});
                        }
                    }
                });
        }else{
            res.render('error',{error: '链接已过期，请重新访问！'});
        }
    });
});
/**
 * 进入房间
 */
router.get('/room', function(req, res) {
    var userInfo=req.session.wechatUserInfo;
    if(userInfo){
        userInfo.groupId=req.query.groupId;
        chatService.getRoomOnlineNum(getGroupType(req),userInfo.groupId,function(onlineNum){
            userService.checkRoomStatus(userInfo.groupId,onlineNum,function(isOK){
                if(isOK){
                    userService.joinNewRoom(userInfo,function(isTrue,result){
                        if(isTrue && result && result.mobilePhone){//更新session值
                            req.session.wechatUserInfo.mobilePhone=result.mobilePhone;
                            req.session.wechatUserInfo.accountNo=result.accountNo;
                        }
                        //进入房间页面，过滤输出mobilePhone,accountNo，防止页面看到
                        res.render(getRenderPath(req,"room"),{userInfo:JSON.stringify(common.filterField(userInfo,"mobilePhone,accountNo")),socketUrl:JSON.stringify(config.socketServerUrl)});
                    });
                }else{
                    res.redirect(req.baseUrl);
                }
            });
        });
    }else{
        res.redirect(req.baseUrl);
    }
});

/**
 * 提取手机验证码
 */
router.get('/getMobileVerifyCode',function(req, res){
    var mobilePhone=req.query["mobilePhone"],useType=req.query["useType"],
    ip = common.getClientIp(req),userTypeMb=getGroupType(req)+"_login";
    if(common.isBlank(mobilePhone)||!common.isMobilePhone(mobilePhone)){
        res.json(errorMessage.code_1003);
    }else if(useType != userTypeMb){
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
        var userTypeMb=getGroupType(req)+"_login";
        pmApiService.checkMobileVerifyCode(userInfo.mobilePhone, userTypeMb, verifyCode, function(result){
            if(!result || result.result != 0 || !result.data){
                if(result.errcode === "1006" || result.errcode === "1007"){
                    res.json({'errcode' : result.errcode, 'errmsg' : result.errmsg});
                }else{
                    res.json(errorMessage.code_1007);
                }
            }else{
                userInfo.ip=common.getClientIp(req);
                userInfo.groupType=getGroupType(req);
                userService.checkClient(constant.fromPlatform.fxchat==userInfo.groupType,userInfo,function(result){
                    if(result.isSys){
                        req.session.wechatUserInfo.accountNo=userInfo.accountNo;
                        req.session.wechatUserInfo.userType=result.userType;
                        req.session.wechatUserInfo.nickname=result.nickname;
                        result.accountNo=userInfo.accountNo;
                        if(common.isBlank(req.session.wechatUserInfo.avatar)){
                            req.session.wechatUserInfo.avatar=result.avatar;
                        }
                    }
                    logger.info("checkClient->result:"+JSON.stringify(result));
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
    var userId=req.body["userId"],userType =req.body["userType"],groupId=req.body["groupId"],fromPlatform=req.body["fromPlatform"],accountNo=req.body["accountNo"],result={isVisitor:true};
    if(common.isBlank(userId)||common.isBlank(groupId)||common.isBlank(userType)){
        res.json(result);
    }else {
        if(userType==constant.roleUserType.navy){
            res.json({isVisitor:false});
        }
        userService.checkUserLogin({userId:userId,groupId:groupId,fromPlatform:fromPlatform,accountNo:accountNo,groupType:getGroupType(req)},false,function(row) {
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
    var params={};
    params.code=req.query["code"];
    params.platform=req.query["platform"];
    params.pageNo=req.query["pageNo"];
    params.pageSize=req.query["pageSize"];
    params.hasContent=req.query["hasContent"];
    params.orderByStr=req.query["orderByStr"];
    params.pageNo = common.isBlank(params.pageNo) ? 1 : params.pageNo;
    params.pageSize = common.isBlank(params.pageSize) ? 15 : params.pageSize;
    params.orderByStr = common.isBlank(params.orderByStr) ? "" : params.orderByStr;
    if(params.code=='trade_strategy'){
        params.code='trade_strategy_article,trade_strategy_video,trade_strategy_audio';
    }
    pmApiService.getArticleList(params,function(data){
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
 * 提取课程安排
 */
router.get('/getSyllabus', function(req, res) {
    var groupType=req.query["groupType"];
    var groupId=req.query["groupId"];
    syllabusService.getSyllabus(groupType, groupId, function(data){
        var serverDate=new Date();
        var loc_nowTime=serverDate.getTime();
        var title='';
        if(data){
            var loc_day = serverDate.getDay();
            //#月#日-#月#日老师课程表安排，以当前时间计算当周的开始结束日期
            loc_day = (loc_day + 6) % 7;
            //计算课程表最后一天
            var loc_temp = data.courses ? JSON.parse(data.courses) : {};
            loc_temp = loc_temp.days instanceof Array ? loc_temp.days.pop()["day"] : 1;
            loc_temp = typeof loc_temp == "number" ? ((loc_temp + 6) % 7) : 0;
            var loc_startDate = new Date(loc_nowTime.getTime() - loc_day * 86400000);
            var loc_endDate = new Date(loc_nowTime.getTime() + (loc_temp - loc_day) * 86400000);
            title = (loc_startDate.getMonth() + 1) + '月' + loc_startDate.getDate() + '日-'+ (loc_endDate.getMonth() + 1) + '月' + loc_endDate.getDate() + '日老师课程表安排';
        }
        res.json({courses:data,title:title,serverTime:loc_nowTime});
    });
});

/**
 * 提取文档信息
 */
router.get('/getRoomList', function(req, res) {
    wechatService.getRoomList(getGroupType(req),function(data){
        res.json({rList:data,serverDate:new Date()});
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
        var fromPlatform=getGroupType(req);
        pmApiService.checkChatPraise(clientId,praiseId,fromPlatform,function(isOK){
            if(isOK){
                chatPraiseService.setPraise(praiseId,constant.chatPraiseType.user,fromPlatform);
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

/**
 * 从基本路径提取groupType
 * 备注：route的基本路径配置的字符基本是与groupType保持一致的，所以可以直接从baseUrl中提取
 * @param baseUrl
 */
function getGroupType(req){
    return req.baseUrl.replace(/\//g,"");
}

/**
 *  提取模板的定向路径
 * @param pageName
 */
function getRenderPath(req,pageName){
    return getGroupType(req)+"/"+pageName;
}
module.exports = router;
