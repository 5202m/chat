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
var pmApiService = require('../../service/pmApiService');//引入pmApiService
var studioService = require('../../service/studioService');//引入studioService
var chatService = require('../../service/chatService');//引入chatService
var visitorService = require('../../service/visitorService');//引入visitorService
var logger=require('../../resources/logConf').getLogger('index');//引入log4js

/**
 * 聊天室页面入口
 */
router.get('/admin', function(req, res) {
    var token=req.query["token"];
    var chatUser={};
    chatUser.userId=req.query["userId"];
    chatUser.groupId=req.query["groupId"];
    chatUser.nickname=req.query["nickname"];
    chatUser.mobilePhone=req.query["mobilePhone"];
    chatUser.fromPlatform=req.query["fromPlatform"];//是否后台进入
    logger.info("chat->param:token["+token+"],otherParam:"+JSON.stringify(chatUser));
    if(common.isBlank(token)||common.isBlank(chatUser.groupId)||common.isBlank(chatUser.userId)||common.isBlank(chatUser.mobilePhone)){
        logger.warn('chat->非法访问,ip:'+ common.getClientIp(req));
        res.render('error',{error: '输入参数有误，请检查链接的输入参数！'});
    }else{
        chatUser.groupType=constant.fromPlatform.studio;
        var viewDataObj={apiUrl:config.pmApiUrl+'/common',filePath:config.filesDomain};//输出参数
        if(common.isBlank(chatUser.nickname)){
            chatUser.nickname=chatUser.userId;
        }
        pmApiService.destroyHomeToken(token,function(isTrue){
            if(isTrue) {
                async.parallel({
                        checkResult: function(callback){
                            if(common.isValid(chatUser.fromPlatform)&&constant.fromPlatform.pm_mis==chatUser.fromPlatform){//检查系统用户
                                userService.checkSystemUserInfo(chatUser,function(result){
                                    callback(null,result);
                                });
                            }
                        },
                        getGroup: function(callback){
                            studioService.getStudioByGroupId(chatUser.groupId,function(result){
                                callback(null,result);
                            });
                        }
                    },
                    function(err, results) {
                        if(results.checkResult!=null && !results.checkResult.isOK){
                            res.render('error',{error: '您缺少访问权限，请联系管理员！'});
                        }else{
                            if(results.checkResult!=null){
                                chatUser.userType=results.checkResult.userType;
                                chatUser.roleNo=results.checkResult.roleNo;
                                chatUser.roleName=results.checkResult.roleName;
                                chatUser.avatar=results.checkResult.avatar;
                                chatUser.nickname=results.checkResult.nickname;
                                chatUser.accountNo= chatUser.userId;//后台进入的用户，账户与userId保持一致，保存到member表时，userId不保存
                                chatUser.position=results.checkResult.position;
                                chatUser.introduction=results.checkResult.introduction;
                            }
                            if(results.getGroup){
                                viewDataObj.groupInfo=results.getGroup.toObject();
                                viewDataObj.groupInfo.allowWhisper=common.containSplitStr(viewDataObj.groupInfo.talkStyle,1);
                            }
                            var mainKey=chatUser.groupId.replace(/_+.*/g,"");//去掉后缀
                            viewDataObj.socketUrl=JSON.stringify(config.socketServerUrl);
                            viewDataObj.userInfo=JSON.stringify(chatUser);
                            viewDataObj.nickname=chatUser.nickname;
                            res.render("studio/admin",viewDataObj);
                        }
                    });
            }else{
                res.render('error',{error: '链接已过期，请重新访问！'});
            }
        });
    }
});

/**
 * 直播间页面入口
 */
router.get('/', function(req, res) {
    var chatUser=req.session.studioUserInfo,clientGroup=constant.clientGroup.visitor;
    if(chatUser && chatUser.isLogin){
        clientGroup=chatUser.clientGroup;
    }else{
        if(!chatUser){
            chatUser={};
            chatUser.isLogin=false;
            chatUser.clientGroup=clientGroup;
            chatUser.initVisit=true;//首次访问
            req.session.studioUserInfo=chatUser;
        }else{
            chatUser.initVisit=false;//已经在页面
        }
    }
    chatUser.groupType=constant.fromPlatform.studio;
    chatUser.userType=chatUser.userType||constant.roleUserType.member;//没有userType则默认为会员
    logger.info("chatUser:"+JSON.stringify(chatUser));
    studioService.getDefaultRoom(clientGroup,function(groupId){
        if(common.isBlank(groupId)){
            req.session.studioUserInfo=null;
            res.render('error',{error: '默认房间设置有误，请检查！'});
        }else{
            var targetGroupId = chatUser.toGroup || chatUser.groupId || groupId;
            chatService.getRoomOnlineNum(constant.fromPlatform.studio, targetGroupId,function(onlineNum){
                userService.checkRoomStatus(targetGroupId,onlineNum,function(isOK) {
                    if(isOK){
                        if(targetGroupId != chatUser.groupId){//目标房间不是当前已登录房间==>追加到目标房间，后跳转
                            studioService.joinNewGroup(chatUser.groupType,chatUser.mobilePhone,chatUser.userId, targetGroupId, chatUser.isLogin, function (resultTmp) {
                                req.session.studioUserInfo.toGroup = null;
                                req.session.studioUserInfo.groupId = targetGroupId;
                                toStudioView(chatUser, targetGroupId, clientGroup, res);
                            });
                        }else{//目标房间是当前已登录房间==>直接跳转
                            req.session.studioUserInfo.toGroup = null;
                            req.session.studioUserInfo.groupId = targetGroupId;
                            toStudioView(chatUser, targetGroupId, clientGroup, res);
                        }
                    }else if(targetGroupId == chatUser.toGroup){//目标房间是跳转房间==>清空跳转，重新刷新
                        req.session.studioUserInfo.toGroup = null;
                        res.redirect("/studio");
                    }else if(targetGroupId == chatUser.groupId){//目标房间是当前房间==>登出重新跳转
                        req.session.studioUserInfo=null;
                        res.redirect("/studio");
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
function toStudioView(chatUser,groupId,clientGroup,res){
    studioService.getIndexLoadData(groupId,function(data){
        var viewDataObj={apiUrl:config.pmApiUrl+'/common',filePath:config.filesDomain,web24kPath:config.web24kPath};//输出参数
        var mainKey=groupId.replace(/_+.*/g,"");//去掉后缀
        chatUser.groupId=groupId;
        viewDataObj.socketUrl=JSON.stringify(config.socketServerUrl);
        viewDataObj.userInfo=JSON.stringify({initVisit:chatUser.initVisit,groupType:constant.fromPlatform.studio,isLogin:chatUser.isLogin,groupId:chatUser.groupId,userId:chatUser.userId,clientGroup:chatUser.clientGroup,nickname:chatUser.nickname,userType:chatUser.userType});
        viewDataObj.userSession=chatUser;
        var newStudioList=[],rowTmp=null;
        var isVisitor=(constant.clientGroup.visitor==clientGroup);
        data.studioList.forEach(function(row){
            rowTmp={chatStudio:{}};
            rowTmp.id=row._id;
            rowTmp.name=row.name;
            rowTmp.level=row.level;
            rowTmp.allowWhisper=common.containSplitStr(row.talkStyle,1);
            rowTmp.disable=(!common.containSplitStr(row.chatStudio.clientGroup,clientGroup));
            rowTmp.allowVisitor=isVisitor?(!rowTmp.disable):common.containSplitStr(row.chatStudio.clientGroup,constant.clientGroup.visitor);
            rowTmp.chatStudio.yyChannel=common.trim(row.chatStudio.yyChannel);
            rowTmp.chatStudio.minChannel=common.trim(row.chatStudio.minChannel);
            rowTmp.chatStudio.remark=common.trim(row.chatStudio.remark);
            rowTmp.isCurr=(row._id==groupId);
            if(rowTmp.isCurr) {
                viewDataObj.studioDate = common.trim(row.chatStudio.studioDate);
                viewDataObj.exStudioStr= common.trim(row.chatStudio.externalStudio);
            }
            newStudioList.push(rowTmp);
        });
        viewDataObj.studioList= newStudioList;
        res.render("studio/index",viewDataObj);
    });
}


/**
 * 找回密码
 */
router.post('/getPwd',function(req, res){
    var mobilePhone=req.body["mobilePhone"],
        verifyCode=req.body["verifyCode"],
        isCheck=req.body["isCheck"],
        pwd=req.body["pwd"],
        result={isOK:false,error:null};
    if(common.isBlank(mobilePhone)||common.isBlank(verifyCode)){
        result.error=errorMessage.code_1000;
    }
    if(!common.isMobilePhone(mobilePhone)){
        result.error=errorMessage.code_1003;
    }
    if(!result.error){
        //校验验证码
    	if(isCheck=="true"){
    		//验证手机号（手机验证码）
    		pmApiService.checkMobileVerifyCode(mobilePhone, "studio_resetPWD", verifyCode, function(checkResult){
    			if(!checkResult || checkResult.result != 0 || !checkResult.data){
    				//验证码错误
                    if(checkResult.errcode === "1006" || checkResult.errcode === "1007"){
                        result.error = {'errcode' : checkResult.errcode, 'errmsg' : checkResult.errmsg};
                        res.json(result);
                    }else{
                        result.error=errorMessage.code_1007;
                        res.json(result);
                    }
                }else{
                	//验证码正确
                	result.isOK=true;
                	req.session.mobileVerifyCode = verifyCode;
                    res.json(result);
                }
    		});
    	}else{
            if(common.isBlank(pwd)){
                result.error=errorMessage.code_1000;
                res.json(result);
            }else if(req.session.mobileVerifyCode !== verifyCode){
                result.error=errorMessage.code_1007;
                res.json(result);
            }else{
                req.session.mobileVerifyCode = null;
                studioService.resetPwd(mobilePhone,pwd,null,function(resetResult){
                    res.json(resetResult);
                });
            }
    	}
    }else{
        res.json(result);
    }
});


/**
 * 重置密码
 */
router.post('/resetPwd',function(req, res){
    var userInfo=req.session.studioUserInfo,pwd=req.body["pwd"],oldPwd=req.body["oldPwd"],result={isOK:false,error:null};
    if(common.isBlank(userInfo.mobilePhone)||common.isBlank(pwd)||common.isBlank(oldPwd)){
        result.error=errorMessage.code_1000;
    }
    if(!result.error){
        studioService.resetPwd(userInfo.mobilePhone,pwd,oldPwd,function(result){
            res.json(result);
        });
    }else{
        res.json(result);
    }
});

/**
 * 直播间注册
 */
router.post('/reg',function(req, res){
    var mobilePhone=req.body["mobilePhone"],
        nickname=req.body["nickname"],
        verifyCode=req.body["verifyCode"],
        clientGroup=req.body["clientGroup"],//主要用于金道用户的首次登录转注册
        pwd=req.body["pwd"];
    if(common.isBlank(mobilePhone)||common.isBlank(nickname)||common.isBlank(pwd)||(common.isBlank(clientGroup)&&common.isBlank(verifyCode))){
        res.json({isOK:false,error:errorMessage.code_1000});
    }else if(!common.isMobilePhone(mobilePhone)){
        res.json({isOK:false,error:errorMessage.code_1003});
    }else{
        if(clientGroup){
            //金道用户的首次登录，之前已经校验了手机验证码，并保存在session中。
            if(verifyCode === req.session.mobileVerifyCode){
                //验证码正确
                var userInfo={mobilePhone:mobilePhone,nickname:nickname,pwd:pwd,ip:common.getClientIp(req),groupType:constant.fromPlatform.studio};
                studioService.studioRegister(userInfo,clientGroup,function(result){
                    if(result.isOK){
                        req.session.studioUserInfo={isLogin:true,mobilePhone:userInfo.mobilePhone,userId:userInfo.userId,defGroupId:userInfo.defGroupId,clientGroup:userInfo.clientGroup,nickname:userInfo.nickname};
                    }
                    res.json(result);
                });
            }else{
                res.json({isOK:false, error : errorMessage.code_1007});
            }
            req.session.mobileVerifyCode = null;
        }else{
            pmApiService.checkMobileVerifyCode(mobilePhone, "studio_reg", verifyCode, function(result){
                if(!result || result.result != 0 || !result.data){
                    if(result.errcode === "1006" || result.errcode === "1007"){
                        res.json({isOK:false, error : {'errcode' : result.errcode, 'errmsg' : result.errmsg}});
                    }else{
                        res.json({isOK:false, error : errorMessage.code_1007});
                    }
                }else{
                    //验证码正确
                    var userInfo={mobilePhone:mobilePhone,nickname:nickname,pwd:pwd,ip:common.getClientIp(req),groupType:constant.fromPlatform.studio};
                    studioService.studioRegister(userInfo,clientGroup,function(result){
                        if(result.isOK){
                            req.session.studioUserInfo={isLogin:true,mobilePhone:userInfo.mobilePhone,userId:userInfo.userId,defGroupId:userInfo.defGroupId,clientGroup:userInfo.clientGroup,nickname:userInfo.nickname};
                        }
                        res.json(result);
                    });
                }
            });
        }
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
    }else if(useType !== "studio_reg" && useType !== "studio_login" && useType !== "studio_resetPWD"){
        res.json(errorMessage.code_1000);
    }else{
        pmApiService.getMobileVerifyCode(mobilePhone,useType,ip,function(result){
            res.json(result);
        });
    }
});
/**
 * 直播间登录
 */
router.post('/login',function(req, res){
    var mobilePhone=req.body["mobilePhone"],
        isPM=req.body["isPM"],
        verifyCode=req.body["verifyCode"],
        clientStoreId=req.body["clientStoreId"],
        pwd=req.body["pwd"];
    var result={isOK:false,error:null};
    isPM=(isPM=='true');
    if(!isPM && (common.isBlank(mobilePhone)||common.isBlank(pwd))){
        result.error=errorMessage.code_1005;
    }
    if(isPM && (common.isBlank(mobilePhone)||common.isBlank(verifyCode))){
        result.error=errorMessage.code_1006;
    }
    if(!common.isMobilePhone(mobilePhone)){
        result.error=errorMessage.code_1003;
    }
    if(result.error){
        res.json(result);
    }else if(!isPM){
        //非PM直接登陆
        studioService.login({mobilePhone:mobilePhone,pwd:pwd,groupType:constant.fromPlatform.studio},isPM,function(newResult){
            if(newResult.isOK){
                //记录访客信息
                visitorService.saveVisitorRecord("login",{clientStoreId:clientStoreId,groupType:constant.fromPlatform.studio,mobile:mobilePhone});
                newResult.userInfo.isLogin=true;
                req.session.studioUserInfo=newResult.userInfo;
                res.json({isOK:true});
            }else{
                res.json(newResult);
            }
        });
    }else{
        pmApiService.checkMobileVerifyCode(mobilePhone, "studio_login", verifyCode, function(result){
            if(!result || result.result != 0 || !result.data){
                if(result.errcode === "1006" || result.errcode === "1007"){
                    result.error = {'errcode' : result.errcode, 'errmsg' : result.errmsg};
                    res.json(result);
                }else{
                    result.error=errorMessage.code_1007;
                    res.json(result);
                }
            }else{
                //验证码正确
                studioService.login({mobilePhone:mobilePhone,pwd:pwd,groupType:constant.fromPlatform.studio},isPM,function(newResult){
                    if(newResult.isOK){
                        newResult.userInfo.isLogin=true;
                        req.session.studioUserInfo=newResult.userInfo;
                        res.json({isOK:true});
                    }else{//金道用户首次登录,如本地库没有记录，则证明是首次登录，直接返回
                        studioService.checkClientGroup(mobilePhone,null,function(clientGroup){
                            if(clientGroup!=constant.clientGroup.register){
                                newResult.hasPM=true;
                                newResult.mobilePhone=mobilePhone;
                                newResult.clientGroup=clientGroup;
                                newResult.verifyCode=verifyCode;
                            }
                            logger.info("studioLogin:pm user first to login！"+JSON.stringify(newResult));
                            req.session.mobileVerifyCode = verifyCode;
                            res.json(newResult);
                        });
                    }
                });
            }
        });
    }
});
/**
 * 登出
 */
router.get('/logout', function(req, res) {
    req.session.studioUserInfo=null;
    visitorService.saveVisitorRecord("logout",{clientStoreId:req.session.clientStoreId,groupType:constant.fromPlatform.studio});
    res.redirect("/studio");
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
    pmApiService.getArticleList(code,platform,"zh",hasContent,pageNo,pageSize,orderByStr,function(data){
        res.json(data?JSON.parse(data):null);
    });
});

/**
 * 提取文档信息
 */
router.get('/getClientGroupList', function(req, res) {
    studioService.getClientGroupList(function(data){
        res.json(data);
    });
});

/**
 * 检查聊天组权限
 */
router.post('/checkGroupAuth',function(req, res){
    var groupId=req.body["groupId"],result={isOK:false,error:null},chatUser=req.session.studioUserInfo;
    if(common.isBlank(groupId)||!chatUser){
        result.error=errorMessage.code_1000;
    }
    if(!result.error){
        studioService.checkGroupAuth(groupId,chatUser.clientGroup,function(isOK){
            if(isOK){
                req.session.studioUserInfo.toGroup=groupId;
                result.groupId=groupId;
            }
            result.isOK=isOK;
            res.json(result);
        });
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
        studioService.upgradeClientGroup(chatUser.mobilePhone,clientGroup,function(isOk){
            if(isOk){
                result.isOK = true;
            }
            res.json(result);
        });
    }
});

module.exports = router;
