/**
 * 页面请求控制类
 * Created by Alan.wu on 2015/3/4.
 */
var router =  require('express').Router();
var async = require('async');//引入async
var request = require('request');
var constant = require('../../constant/constant');//引入constant
var config = require('../../resources/config');//引入config
var common = require('../../util/common');//引入common
var errorMessage = require('../../util/errorMessage');
var messageService = require('../../service/messageService');//引入messageService
var userService = require('../../service/userService');//引入userService
var baseApiService = require('../../service/baseApiService');//引入baseApiService
var syllabusService = require('../../service/syllabusService');//引入syllabusService
var studioService = require('../../service/studioService');//引入studioService
var chatService = require('../../service/chatService');//引入chatService
var visitorService = require('../../service/visitorService');//引入visitorService
var logger=require('../../resources/logConf').getLogger('base');//引入log4js
var chatPraiseService = require('../../service/chatPraiseService');//引入chatPraiseService
var showTradeService = require('../../service/showTradeService');//引入chatPraiseService
/**
 * 从基本路径提取groupType
 * 备注：route的基本路径配置的字符基本是与groupType保持一致的，所以可以直接从baseUrl中提取
 * @param baseUrl
 */
function getGroupType(req,isBase){
    return isBase?req.baseUrl:req.baseUrl.replace(/\//g,"");
}

/**
 * 获取重定向URL参数
 * @param req
 * @param platform
 */
function getRredirctUrl(req, platform){
    var paramArr = [];
    if(platform){
        paramArr.push("platform=" + platform);
    }else if(req.query["platform"]){
        paramArr.push("platform=" + req.query["platform"]);
    }
    var argKeys = ["utm_source", "utm_medium", "utm_campaign", "theme"],argKey;
    for(var i = 0, lenI = argKeys.length; i < lenI; i++){
        argKey = argKeys[i];
        if(req.query[argKey]){
            paramArr.push(argKey + "=" + req.query[argKey]);
        }
    }
    return paramArr.length > 0 ? ("?" + paramArr.join("&")) : "";
}
/**
 * 直播间页面入口
 */
router.get('/', function(req, res) {
    var chatUser=req.session.studioUserInfo,clientGroup=constant.clientGroup.visitor;
    var targetGType=getGroupType(req);
    var openId = req.query["userId"];
    if(openId) {
        studioService.login({thirdId:openId,groupType:getGroupType(req)}, 3, function(loginRes){
            if(loginRes.isOK){
                loginRes.userInfo.isLogin=true;
                req.session.studioUserInfo=loginRes.userInfo;
                req.session.studioUserInfo.firstLogin=true;
            }else{
                req.session.studioUserInfo = {
                    isLogin : false,
                    clientGroup : constant.clientGroup.visitor,
                    userType : constant.roleUserType.visitor,
                    mobilePhone : null,
                    thirdId : openId
                };
            }
            res.redirect(getGroupType(req,true)+getRredirctUrl(req, "wechat"));
        });
        return;
    }else if(chatUser && chatUser.isLogin){
        clientGroup=chatUser.clientGroup;
    }else{
        if(!chatUser){
            chatUser={};
            chatUser.isLogin=false;
            chatUser.clientGroup=clientGroup;
            chatUser.userType=constant.roleUserType.visitor;
            req.session.studioUserInfo=chatUser;
        }
    }
    if(req.session.logoutToGroup){
        chatUser.toGroup = req.session.logoutToGroup;
        req.session.logoutToGroup = null;
    }
    chatUser.groupType=targetGType;
    chatUser.userType=chatUser.userType||constant.roleUserType.member;//没有userType则默认为会员
    logger.info("chatUser:"+JSON.stringify(chatUser));
    var isMobile = common.isMobile(req);
    var fromPlatform=req.query["platform"];
    if(fromPlatform && !chatUser.toGroup && !chatUser.groupId && common.containSplitStr(config.studioThirdUsed.platfrom,fromPlatform)){
        chatUser.groupId=config.studioThirdUsed.roomId[chatUser.groupType];
    }else if(fromPlatform == "wechat"){
        chatUser.groupId = null; //微信每次请求直接跳转到首页
    }
    var redirctUrl = getRredirctUrl(req, fromPlatform);
    if(isMobile && !chatUser.toGroup && !chatUser.groupId){
        chatUser.groupId = null;
        req.session.studioUserInfo.groupId = null;
        toStudioView(chatUser, null, clientGroup, isMobile, req, res);
        return;
    }
    studioService.getDefaultRoom(chatUser.groupType,clientGroup,function(groupId){
        if(common.isBlank(groupId)){
            req.session.studioUserInfo=null;
            res.render('error',{error: '默认房间设置有误，请检查！'});
        }else{
            var targetGroupId = chatUser.toGroup || chatUser.groupId || groupId;
            chatService.getRoomOnlineTotalNum(targetGroupId,function(onlineNum){
                userService.checkRoomStatus(targetGroupId,onlineNum,function(isOK) {
                    if(isOK){
                        if(targetGroupId != chatUser.groupId){//目标房间不是当前已登录房间==>追加到目标房间，后跳转
                            studioService.joinNewGroup(chatUser.groupType,chatUser.mobilePhone,chatUser.userId, targetGroupId, chatUser.isLogin, function (resultTmp) {
                                req.session.studioUserInfo.toGroup = null;
                                req.session.studioUserInfo.groupId = targetGroupId;
                                toStudioView(chatUser, targetGroupId, clientGroup, isMobile,req,res);
                            });
                        }else{//目标房间是当前已登录房间==>直接跳转
                            req.session.studioUserInfo.toGroup = null;
                            req.session.studioUserInfo.groupId = targetGroupId;
                            toStudioView(chatUser, targetGroupId, clientGroup, isMobile, req,res);
                        }
                    }else if(targetGroupId == chatUser.toGroup){//目标房间是跳转房间==>清空跳转，重新刷新
                        req.session.studioUserInfo.toGroup = null;
                        res.redirect(getGroupType(req,true) + redirctUrl);
                    }else if(targetGroupId == chatUser.groupId){//目标房间是当前房间==>登出重新跳转
                        req.session.studioUserInfo=null;
                        res.redirect(getGroupType(req,true) + redirctUrl);
                    }else{//目标房间是默认房间(此时肯定未登录状态，否则会满足“目标房间是当前房间”)==>直接报错
                        req.session.studioUserInfo=null;
                        res.render("error",{error: '非常抱歉，你进入的默认房间已限制访问！'});
                    }
                });
            });
        }
    });
});

//转到页面
function toStudioView(chatUser,groupId,clientGroup,isMobile,req,res){
    studioService.getIndexLoadData(chatUser.groupType,groupId, true,(!isMobile||(isMobile && common.isValid(groupId))),function(data){
        var newStudioList=[],rowTmp=null;
        var isVisitor=(constant.clientGroup.visitor==clientGroup);
        var viewDataObj={apiUrl:config.pmApiUrl,filePath:config.filesDomain,web24kPath:config.web24kPath,mobile24kPath:config.mobile24kPath};//输出参数
        chatUser.groupId=groupId;
        viewDataObj.theme = req.query["theme"] || "";
        viewDataObj.socketUrl=JSON.stringify(config.socketServerUrl);
        viewDataObj.userInfo=JSON.stringify({avatar:chatUser.avatar,groupType:chatUser.groupType,isLogin:chatUser.isLogin,groupId:chatUser.groupId,userId:chatUser.userId,clientGroup:chatUser.clientGroup,nickname:chatUser.nickname,userType:chatUser.userType});
        viewDataObj.userSession=chatUser;
        viewDataObj.serverTime=new Date().getTime();
        viewDataObj.syllabusData='';
        viewDataObj.currStudioAuth=false;
        viewDataObj.visitorSpeak=false;
        if(!data.studioList){
            if(data.syllabusResult){
                var syResult=data.syllabusResult;
                viewDataObj.syllabusData=JSON.stringify({courseType:syResult.courseType,studioLink:(common.isBlank(syResult.studioLink)?"":JSON.parse(syResult.studioLink)),courses:(common.isBlank(syResult.courses)?"":syllabusService.removeContext(JSON.parse(syResult.courses)))});
            }
        }else{
            data.studioList.forEach(function(row){
                rowTmp={};
                rowTmp.id=row._id;
                rowTmp.name=row.name;
                rowTmp.level=row.level;
                rowTmp.isCurr=(row._id==groupId);
                //聊天室规则
                rowTmp.allowWhisper=common.containSplitStr(row.talkStyle,1);
                rowTmp.whisperRoles=row.whisperRoles;
                rowTmp.disable=(!common.containSplitStr(row.clientGroup,clientGroup));
                rowTmp.allowVisitor=isVisitor?(!rowTmp.disable):common.containSplitStr(row.clientGroup,constant.clientGroup.visitor);
                var ruleArr=row.chatRules,isPass=true;
                for(var i in ruleArr) {
                    isPass = common.dateTimeWeekCheck(ruleArr[i].periodDate, true);
                    if (ruleArr[i].type == 'whisper_allowed') {
                        if(rowTmp.allowWhisper && !isPass){
                            rowTmp.allowWhisper=false;
                            rowTmp.whisperRoles=null;
                        }
                    }else if(ruleArr[i].type == 'visitor_filter'){
                        if(rowTmp.isCurr && rowTmp.allowVisitor && isPass){
                            viewDataObj.visitorSpeak = true;
                        }
                    }
                }
                rowTmp.remark=common.trim(row.remark);
                rowTmp.clientGroup=common.trim(row.clientGroup);
                rowTmp.isOpen=common.dateTimeWeekCheck(row.openDate, true);
                if(rowTmp.isCurr) {
                    viewDataObj.currStudioAuth = !rowTmp.disable;
                    if(data.syllabusResult){
                        var syResult=data.syllabusResult;
                        viewDataObj.syllabusData=JSON.stringify({courseType:syResult.courseType,studioLink:(common.isBlank(syResult.studioLink)?"":JSON.parse(syResult.studioLink)),courses:(common.isBlank(syResult.courses)?"":syllabusService.removeContext(JSON.parse(syResult.courses)))});
                    }
                }
                newStudioList.push(rowTmp);
            });
        }
        viewDataObj.studioList = newStudioList;
        viewDataObj.isDevTest=config.isDevTest;
        //记录访客信息
        var fromPlatform=req.query["platform"];
        var snUser=req.session.studioUserInfo;
        if(snUser.firstLogin && snUser.groupId){//刷新页面不记录访客记录
            snUser.firstLogin=false;
            var vrRow={userId:snUser.userId,platform:fromPlatform || "",userAgent:req.headers["user-agent"],groupType:getGroupType(req),roomId:snUser.groupId,nickname:snUser.nickname,clientGroup:snUser.clientGroup,clientStoreId:snUser.clientStoreId,mobile:snUser.mobilePhone,ip:common.getClientIp(req)};
            visitorService.saveVisitorRecord("login",vrRow);
        }
        viewDataObj.fromPlatform=fromPlatform;
        if(!isMobile && fromPlatform == config.studioThirdUsed.webui && chatUser.groupType == constant.fromPlatform.fxstudio){
            res.render(common.renderPath(req,constant.tempPlatform.webui,"room"),viewDataObj);
            return;
        }
        var isThirdUsed = fromPlatform && common.containSplitStr(config.studioThirdUsed.platfrom,fromPlatform);
        if(isMobile){
            if(groupId || isThirdUsed){
                res.render(common.renderPath(req,constant.tempPlatform.mb,"room"),viewDataObj);
            }else{
                res.render(common.renderPath(req,constant.tempPlatform.mb),viewDataObj);
            }
        }else{
            if(isThirdUsed && fromPlatform != config.studioThirdUsed.webui){
                res.render(common.renderPath(req,constant.tempPlatform.mini),viewDataObj);
            }else{
                res.render(common.renderPath(req,constant.tempPlatform.pc),viewDataObj);
            }
        }
    });
}
/**
 * 提取手机验证码
 */
router.get('/getMobileVerifyCode',function(req, res){
    var mobilePhone=req.query["mobilePhone"];
    var useType=req.query["useType"];
    var ip = common.getClientIp(req);
    if(common.isBlank(mobilePhone)||!common.isMobilePhone(mobilePhone)){
        res.json(errorMessage.code_1003);
    }else if(common.isBlank(useType)){
        res.json(errorMessage.code_1000);
    }else{
        baseApiService.getMobileVerifyCode(mobilePhone,useType,ip,function(result){
            res.json(result);
        });
    }
});
/**
 * 直播间登录
 * 1）手机号+验证码直接登陆，如果没有从API中检查用户类型并添加一条记录
 * 2）用户ID登陆
 */
router.post('/login',function(req, res){
    var mobilePhone=req.body["mobilePhone"],
        verifyCode=req.body["verifyCode"],
        userId=req.body["userId"],
        clientStoreId=req.body["clientStoreId"];
    var result={isOK:false,error:null};
    var isAutoLogin = !common.isBlank(userId);
    var userSession=req.session.studioUserInfo;
    if(!userSession || !userSession.groupType){
        res.json(result);
        return;
    }
    if(!isAutoLogin){
        if(common.isBlank(mobilePhone)||common.isBlank(verifyCode)){
            result.error=errorMessage.code_1006;
        }else if(!common.isMobilePhone(mobilePhone)){
            result.error=errorMessage.code_1003;
        }
    }
    if(result.error){
        res.json(result);
    }else if(!isAutoLogin){
        //手机号+验证码登陆
        baseApiService.checkMobileVerifyCode(mobilePhone, userSession.groupType+"_login", verifyCode, function(chkCodeRes){
            if(!chkCodeRes || chkCodeRes.result != 0 || !chkCodeRes.data){
                if(chkCodeRes.errcode === "1006" || chkCodeRes.errcode === "1007"){
                    result.error = {'errcode' : chkCodeRes.errcode, 'errmsg' : chkCodeRes.errmsg};
                    res.json(result);
                }else{
                    result.error=errorMessage.code_1007;
                    res.json(result);
                }
            }else{
                var thirdId = (userSession && userSession.thirdId) || null;
                studioService.login({mobilePhone:mobilePhone, thirdId:thirdId, groupType:userSession.groupType}, 1, function(loginRes){
                    if(loginRes.isOK && constant.clientGroup.real != loginRes.userInfo.clientGroup){
                        //real 类型客户将拆分成A和N客户
                        loginRes.userInfo.isLogin=true;
                        req.session.studioUserInfo=loginRes.userInfo;
                        req.session.studioUserInfo.clientStoreId=clientStoreId;
                        req.session.studioUserInfo.firstLogin=true;
                        res.json({isOK:true, userInfo : {clientGroup : loginRes.userInfo.clientGroup}});
                    }else{
                        studioService.checkClientGroup(mobilePhone,null,common.getTempPlatformKey(userSession.groupType),function(clientGroup, accountNo){
                            if(loginRes.isOK){
                                //已经有账户，按类别升级即可
                                studioService.updateClientGroup(userSession.groupType,mobilePhone, clientGroup, accountNo, function (isOk) {
                                    if(isOk){
                                        loginRes.userInfo.clientGroup = clientGroup;
                                    }
                                    loginRes.userInfo.isLogin=true;
                                    req.session.studioUserInfo=loginRes.userInfo;
                                    req.session.studioUserInfo.clientStoreId=clientStoreId;
                                    req.session.studioUserInfo.firstLogin=true;
                                    res.json({isOK:true, userInfo : {clientGroup : loginRes.userInfo.clientGroup}}); //即使修改账户级别失败也登录成功
                                });
                            }else{
                                var userInfo={mobilePhone:mobilePhone, ip:common.getClientIp(req), groupType:userSession.groupType, accountNo: accountNo, thirdId:thirdId};
                                studioService.studioRegister(userInfo,clientGroup,function(result){
                                    if(result.isOK){
                                        req.session.studioUserInfo={groupType:userSession.groupType,clientStoreId:clientStoreId,firstLogin:true,isLogin:true,mobilePhone:userInfo.mobilePhone,userId:userInfo.userId,defGroupId:userInfo.defGroupId,clientGroup:userInfo.clientGroup,nickname:userInfo.nickname};
                                        result.userInfo = {clientGroup : userInfo.clientGroup};
                                    }
                                    res.json(result);
                                });
                            }
                        });
                    }
                });
            }
        });
    }else{
        //userId自动登录
        studioService.login({userId:userId,groupType:userSession.groupType}, 2, function(loginRes){
            if(loginRes.isOK){
                loginRes.userInfo.isLogin=true;
                req.session.studioUserInfo=loginRes.userInfo;
                req.session.studioUserInfo.clientStoreId=clientStoreId;
                req.session.studioUserInfo.firstLogin=true;
                res.json({isOK:true, clientGroup : loginRes.userInfo.clientGroup});
            }else{
                res.json(loginRes);
            }
        });
    }
});

/**
 * 登出
 */
router.get('/logout', function(req, res) {
    var snUser=req.session.studioUserInfo;
    var platform = req.query["platform"];
    visitorService.saveVisitorRecord("logout",{roomId:snUser.groupId,clientStoreId:snUser.clientStoreId,groupType:snUser.groupType,ip:common.getClientIp(req)});
    req.session.studioUserInfo=null;
    //注销之后检查当前房间是否给游客授权，若授权则以游客身份再次进入当前房间
    studioService.checkGroupAuth(snUser.groupId,constant.clientGroup.visitor,function(isOK){
        if(isOK){
            req.session.logoutToGroup=snUser.groupId;
        }
        var target=getGroupType(req,true);
        res.redirect(platform ? (target+"?platform=" + platform) : target);
    });
});

/**
 * 跳转直播间主页
 */
router.get('/home', function(req, res) {
    req.session.studioUserInfo.groupId = null;
    res.redirect(getGroupType(req,true));
});

/**
 * 提取文档信息
 */
router.get('/getArticleList', function(req, res) {
    var params={};
    params.code=req.query["code"];
    params.platform=req.query["platform"];
    params.pageNo=req.query["pageNo"];
    params.authorId=req.query["authorId"];
    params.pageSize=req.query["pageSize"];
    params.hasContent=req.query["hasContent"];
    params.orderByStr=req.query["orderByStr"];
    params.pageNo = common.isBlank(params.pageNo) ? 1 : params.pageNo;
    params.pageSize = common.isBlank(params.pageSize) ? 15 : params.pageSize;
    params.orderByStr = common.isBlank(params.orderByStr) ? "" : params.orderByStr;
    baseApiService.getArticleList(params,function(data){
        res.json(data?JSON.parse(data):null);
    });
});

/**
 * 提取文档信息
 */
router.get('/getArticleInfo', function(req, res) {
    var params={};
    params.id=req.query["id"];
    baseApiService.getArticleInfo(params,function(data){
        res.json(data?JSON.parse(data):null);
    });
});


/**
 * 提取客户组信息
 */
router.get('/getClientGroupList', function(req, res) {
    studioService.getClientGroupList(getGroupType(req),function(data){
        res.json(data);
    });
});

/**
 * 提取课程安排
 */
router.get('/getSyllabus', function(req, res) {
    var groupType=req.query["groupType"];
    var groupId=req.query["groupId"];
    syllabusService.getSyllabus(groupType, groupId, function(data){
        res.json({data:data,serverTime:new Date().getTime()});
    });
});

/**
 * 检查聊天组权限
 */
router.post('/checkGroupAuth',function(req, res){
    var groupId=req.body["groupId"],result={isOK:false,error:null},chatUser=req.session.studioUserInfo;
    var isRedirectDef = req.body["redirectDef"] == "1";
    if((common.isBlank(groupId) && !isRedirectDef)||!chatUser){
        result.error=errorMessage.code_1000;
    }
    if(!result.error){
        var clientGroup = chatUser && chatUser.isLogin ? chatUser.clientGroup : constant.clientGroup.visitor;
        if(isRedirectDef){
            studioService.getDefaultRoom(getGroupType(req),clientGroup,function(groupId) {
                if (common.isBlank(groupId)) {
                    result.isOK=false;
                }else{
                    req.session.studioUserInfo.toGroup=groupId;
                    result.groupId=groupId;
                    result.isOK=true;
                }
                res.json(result);
            });
        }else{
            studioService.checkGroupAuth(groupId,chatUser.clientGroup,function(isOK){
                if(isOK){
                    req.session.studioUserInfo.toGroup=groupId;
                    result.groupId=groupId;
                }
                result.isOK=isOK;
                res.json(result);
            });
        }
    }else{
        res.json(result);
    }
});

/**
 * 升级客户组权限
 */
router.post('/upgrade',function(req, res){
    var result={isOK:false,error:null},chatUser=req.session.studioUserInfo;
    var clientGroup = req.body["clientGroup"];
    if(clientGroup === constant.clientGroup.register){
        result.error=errorMessage.code_1011;
        res.json(result);
    }else if(clientGroup==chatUser.clientGroup){
        result.error=errorMessage.code_1010;
        res.json(result);
    }else{
        studioService.upgradeClientGroup(chatUser.groupType,chatUser.mobilePhone,clientGroup,function(isOk, clientGroupRes){
            if(isOk){
                result.isOK = true;
                result.clientGroup = clientGroupRes;
            }
            res.json(result);
        });
    }
});

/**
 * 通过用户昵称提取访客记录
 */
router.get('/getVistiorByName', function(req, res) {
    var nickname=req.query["nickname"],groupType=req.query["groupType"],roomId=req.query["groupId"];
    if(common.isBlank(nickname)||common.isBlank(groupType)){
        res.json(null);
    }else{
        visitorService.getVistiorByName(groupType,roomId, nickname, function(data){
            res.json(data);
        });
    }
});

/**
 * 提取客户经理
 */
router.get('/getCS', function(req, res) {
    var groupId=req.query["groupId"];
    if(!req.session.studioUserInfo || common.isBlank(groupId)){
        res.json(null);
    }else{
        userService.getRoomCsUserList(groupId,function(data){
            res.json(data);
        });
    }
});

/**
 * 提取红包连接地址
 */
router.post('/getAcLink',function(req, res){
    if(!req.session.studioUserInfo){
        res.end();
    }else{
        request(config.packetAcUrl,function(err, response, data){
            if (!err && response.statusCode == 200) {
                try{
                    res.json(JSON.parse(data));
                }catch(e){
                    logger.error("getAcLink>>>error:"+e);
                    res.json(null);
                }
            }else{
                logger.error("getAcLink>>>error:"+err);
                res.json(null);
            }
        });
    }
});

/**
 * 修改昵称
 */
router.post('/modifyName',function(req, res){
    var userInfo=req.session.studioUserInfo,nickname=req.body["nickname"];
    if(!userInfo || common.isBlank(userInfo.mobilePhone)){
        res.json({isOK:false,msg:'请重新登录后再修改！'});
    }else if(common.isBlank(nickname)){
        res.json({isOK:false,msg:'昵称不能为空！'});
    }else{
        userService.modifyNickname(userInfo.mobilePhone,getGroupType(req),nickname,function(result){
            if(result.isOK){
                req.session.studioUserInfo.nickname=nickname;
                result.nickname=nickname;
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
        logger.warn("warn:please upload img by linux server!");
        res.json({success:false});
    }
});

/**
 * 提取课程数据
 */
router.get('/getCourseInfo', function(req, res) {
    var userInfo=req.session.studioUserInfo;
    var day=req.query["day"],startTime=req.query["startTime"],endTime=req.query["endTime"],authorId=req.query["authorId"];
    if(!userInfo || common.isBlank(day)){
        res.json({remark:'',authors:[]});
    }else {
        syllabusService.getCourseInfo({groupType:userInfo.groupType,groupId:userInfo.groupId,day:day,startTime:startTime,endTime:endTime,authorId:authorId},function(data){
            res.json(data);
        });
    }
});

/**
 * 提取晒单数据
 */
router.get('/getShowTradeInfo', function(req, res) {
    var userInfo=req.session.studioUserInfo;
    var userNo = req.query["userNo"];
    if(!userInfo || common.isBlank(userNo)){
        res.json(null);
    }else {
        showTradeService.getShowTrade(userInfo.groupType, userNo, function(data){
            res.json(data);
        });
    }
});

/**
 * 设置点赞
 */
router.post('/setUserPraise', function(req, res) {
    var clientId=req.body.clientId,praiseId=req.body.praiseId;
    if(common.isBlank(clientId)||common.isBlank(praiseId)){
        res.json({isOK:false});
    }else{
        var fromPlatform=getGroupType(req);
        baseApiService.checkChatPraise(clientId,praiseId,fromPlatform,function(isOK){
            if(isOK){
                chatPraiseService.setPraise(praiseId,constant.chatPraiseType.user,fromPlatform);
            }
            res.json({isOK:isOK});
        });
    }
});

/**
 * 房间对应的课程数据包括房间对应的在线人数
 */
router.get('/getRmCourseList', function(req, res) {
    var roomIds=req.query["roomIds"];
    var userInfo=req.session.studioUserInfo;
    var result={isOK:false,data:{}};
    if(!userInfo || common.isBlank(roomIds)){
        res.json(result);
    }else {
        syllabusService.getSyllabus(userInfo.groupType,roomIds,function(data){
            result.isOK=true;
            if(data && data.length>0){
                var row=null,course=null;
                var currTime=new Date().getTime();
                var newData=[];
                if(data instanceof Array){
                    newData=data;
                }else{
                    newData.push(data);
                }
                var backObj={};
                for(var i in newData){
                    row=newData[i];
                    course=common.getSyllabusPlan(row,currTime);
                    if(course){
                        backObj={day:course.day,name:course.lecturer,startTime:course.startTime,endTime:course.endTime,isNext:course.isNext};
                    }else{
                        backObj={day:'',name:'',startTime:'',endTime:'',isNext:false};
                    }
                    result.data[row.groupId]=backObj;
                }
            }
            async.each(roomIds.split(","), function (rid, callbackTmp) {
                if(!result.data.hasOwnProperty(rid)){
                    result.data[rid] = {day:'',name:'',startTime:'',endTime:'',isNext:false};
                }
                chatService.getRoomOnlineTotalNum(rid,function(onlineNum){
                    result.data[rid].onlineNum=onlineNum;
                    callbackTmp(null);
                });
            }, function (err) {
                res.json(result);
            });
        });
    }
});

/**
 * 伦敦金/伦敦银 看涨看跌投票
 */
router.post('/highsLowsVote', function(req, res){
    var params = {};//extend(extend({}, req.query), req.body);
    params.symbol = req.body['symbol'];//产品名
    params.highslows = req.body['highslows'];//看涨或看跌
    if(common.isBlank(params.symbol)){
        res.json({isOK:false,msg:'产品不能为空！'});
    }
    else if(common.isBlank(params.highslows)){
        res.json({isOK:false,msg:'看跌或看涨不能为空！'});
    }
    else {
        studioService.highsLowsVote(params.symbol, params.highslows, function (result) {
            res.json(result);
        });
    }
});

/**
 * 获取伦敦金/伦敦银 看涨看跌投票数据
 */
router.get('/getHighsLowsVote', function(req, res){
    var params = {};//extend(extend({}, req.query), req.body);
    params.symbol = req.query['symbol'];//产品名
    params.highslows = req.query['highslows'];//看涨或看跌
    studioService.getHighsLowsVote(params.symbol, params.highslows, function (result) {
        res.json(result);
    });
});

/**
 * CFTC持仓比例数据
 */
router.get('/get24kCftc', function(req, res){
    baseApiService.get24kCftc(function(result){
        res.json(result);
    });
});

/**
 * 获取财经日历数据
 */
router.post('/getFinancData', function(req, res){
    var releaseTime = req.body['releaseTime'];
    var dataTypeCon = req.body['dataTypeCon'] ? req.body['dataTypeCon'] : 1;
    if(common.isBlank(releaseTime)){
        res.json({"result":1,"msg":'日期不能为空！'});
    }
    else if(common.isBlank(dataTypeCon)){
        res.json({"result":1,"msg":'数据类型不能为空！'});
    }
    else{
        baseApiService.getZxFinanceDataList(releaseTime, dataTypeCon, function(result){
            res.json(result);
        });
    }
});

/**
 * 更新用户头像
 */
router.post('/modifyAvatar',function(req, res){
    var userInfo=req.session.studioUserInfo,avatar=req.body["avatar"];
    if(!userInfo || common.isBlank(userInfo.mobilePhone)){
        res.json({isOK:false,msg:'请重新登录后再修改！'});
    }else if(common.isBlank(avatar)){
        res.json({isOK:false,msg:'头像不能为空！'});
    }else{
        userService.modifyAvatar(userInfo.mobilePhone,getGroupType(req),avatar,function(result){
            if(result.isOK){
                req.session.studioUserInfo.avatar=avatar;
                result.avatar=avatar;
            }
            res.json(result);
        });
    }
});

/**
 * 保存到桌面
 */
router.get('/getShortCut', function(req, res) {
    var type = getGroupType(req);
    var cbFn = function(err){
        if(err){
            logger.warn('getShortCut << download link error:'+ err);
        }
    };
    if(/^fx.*/.test(type)){
        res.download(global.rootdir+"/template/fx/fxstudio.url", "视频直播间-环球投资.url", cbFn);
    }else{
        res.download(global.rootdir+"/template/pm/studio.url", "视频直播间-金道贵金属.url", cbFn);
    }
});

/**
 * 专家咨询发送邮件
 */
router.post('/email', function(req, res){
    var key = req.body['key'];
    var data = req.body['data'];
    data = JSON.parse(data);
    if(common.isBlank(data.email)){
        res.json({isOK:false,msg:'请输入发件人！'});
    }else if(common.isBlank(data.content)){
        res.json({isOK:false,msg:'请输入邮件内容！'});
    }else if(common.isBlank(data.code)) {
        res.json({isOK:false,msg:'请输入验证码！'});
    }else if(req.session.emailVerifyCode && data.code.toLowerCase() != req.session.emailVerifyCode){
       res.json({isOK:false,msg:'验证码错误，请重新输入！'});
    }else{
        baseApiService.sendEmail(key, data, function(result){
            if(result.result==0){
                res.json({isOK:true, msg: '邮件发送成功！'});
            }
            else{
                res.json({isOK:false,msg:result.msg});
            }
        });
    }
});

/**
 * 提取验证码
 */
router.get('/getVerifyCode', function(req, res) {
    if(process.platform.indexOf("win")!=-1||!req.session.studioUserInfo){
        res.end("");
    }else{
        var typeCode=req.query['code'];
        var verifyCodeObj = require("../../util/verifyCode").Generate(50,25);
        if('email'==typeCode){
            req.session.emailVerifyCode= verifyCodeObj.code;
        }else if('acLogin'==typeCode){
            req.session.studioUserInfo.verMalCode= verifyCodeObj.code;
        }else{
            res.end("");
            return;
        }
        res.writeHead(200, {"Content-Type": "image/jpeg"});
        res.end(new Buffer(verifyCodeObj.dataURL.replace(/^data:image.*base64,/,""),'base64'));
    }
});

module.exports = router;