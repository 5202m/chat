var constant = require('../../constant/constant');//引入constant
var config = require('../../resources/config');//引入config
var common = require('../../util/common');//引入common
var errorMessage = require('../../util/errorMessage');
var baseApiService = require('../../service/baseApiService');//引入baseApiService
var studioService = require('../../service/studioService');//引入studioService
var apiService = require('../../service/hxApiService');//引入ApiService
var userService = require('../../service/userService');//引入userService
var logger=require('../../resources/logConf').getLogger('hx');//引入log4js
/**
 * hx页面请求控制类
 * Created by Alan.wu on 2016/6/14.
 */
var router =  require('express').Router();
/**
 * 直播间登录
 * 1）手机号+验证码直接登陆，如果没有从API中检查用户类型并添加一条记录
 * 2）用户ID登陆
 */
router.post('/hxLogin',function(req, res){
    var mobilePhone=req.body["mobilePhone"],
        verifyCode=req.body["verifyCode"],
        verMalCode=req.body["verMalCode"],
        accountNo=req.body["accountNo"],
        userId=req.body["userId"],
        pwd=req.body["pwd"],
        isPwdLogin=(req.body["isPwdLogin"]=='true'),
        clientStoreId=req.body["clientStoreId"];
    var result={isOK:false,error:null};
    var isAutoLogin = !common.isBlank(userId);
    var userSession=req.session.studioUserInfo;
    if(!userSession || !userSession.groupType){
        res.json(result);
        return;
    }
    if(!isAutoLogin){
        if(isPwdLogin){
            if(common.isBlank(accountNo)||common.isBlank(pwd)){
                result.error=errorMessage.code_1013;
            }else if(common.isBlank(verMalCode)||(verMalCode.toLowerCase()!=userSession.verMalCode)){
                result.error=errorMessage.code_1002;
            }else if(!/^6\d{7}$/g.test(accountNo)&&!/^2\d{8}$/g.test(accountNo)){
                result.error=errorMessage.code_1014;
            }
        }else{
            if(common.isBlank(mobilePhone)||common.isBlank(verifyCode)){
                result.error=errorMessage.code_1006;
            }else if(!common.isMobilePhone(mobilePhone)){
                result.error=errorMessage.code_1003;
            }
        }
    }
    if(result.error){
        res.json(result);
    }else if(!isAutoLogin){
        if(isPwdLogin) {//交易账户+密码登录
            apiService.checkAClient({accountNo:accountNo,password:pwd,ip:common.getClientIp(req),isCheckByMobile:false},function(checkAResult){
                console.log("checkAClient->flagResult:"+JSON.stringify(checkAResult));
                var clientGroup=constant.clientGroup.visitor;
                if(checkAResult.flag==0 || common.isBlank(checkAResult.mobilePhone)){
                    if(checkAResult.error){
                        result.error = checkAResult.error;
                    }else{
                        result.error = errorMessage.code_10;
                    }
                    res.json(result);
                }else{
                    if(checkAResult.flag==2){
                        clientGroup=constant.clientGroup.notActive;
                    }
                    if(checkAResult.flag==3){
                        clientGroup=constant.clientGroup.active;
                    }
                    saveLoginInfo(res,req,userSession,checkAResult.mobilePhone,accountNo,null,clientStoreId,clientGroup,function(saveResult){
                        saveResult.isOK=true;
                        res.json(saveResult);
                    });
                }
            });
        }else{//手机号+验证码登陆
            baseApiService.checkMobileVerifyCode(mobilePhone, "hxstudio_login", verifyCode, function (chkCodeRes) {
                if (!chkCodeRes || chkCodeRes.result != 0 || !chkCodeRes.data) {
                    if (chkCodeRes.errcode === "1006" || chkCodeRes.errcode === "1007") {
                        result.error = {'errcode': chkCodeRes.errcode, 'errmsg': chkCodeRes.errmsg};
                        res.json(result);
                    } else {
                        result.error = errorMessage.code_1007;
                        res.json(result);
                    }
                } else {
                    var thirdId = (userSession && userSession.thirdId) || null;
                    studioService.login({
                        mobilePhone: mobilePhone,
                        thirdId: thirdId,
                        groupType: userSession.groupType
                    }, 1, function (loginRes) {
                        if (loginRes.isOK) {
                            loginRes.userInfo.isLogin = true;
                            req.session.studioUserInfo = loginRes.userInfo;
                            req.session.studioUserInfo.clientStoreId = clientStoreId;
                            req.session.studioUserInfo.firstLogin = true;
                            if(loginRes.userInfo.clientGroup!=constant.clientGroup.vip && loginRes.userInfo.clientGroup!=constant.clientGroup.active){//检查账号接口同步数据
                                studioService.checkClientGroup(mobilePhone, null, common.getTempPlatformKey(userSession.groupType), function (clientGroup, accountNo) {
                                    saveLoginInfo(res,req,userSession,mobilePhone,accountNo,thirdId,clientStoreId,clientGroup,function(saveResult){
                                        res.json({isOK: true, userInfo: {clientGroup:clientGroup}});
                                    });
                                });
                            }else{
                                res.json({isOK: true, userInfo: {clientGroup: loginRes.userInfo.clientGroup}});
                            }
                        } else {//本地库没有该客户，则通过接口验证并提取数据
                            studioService.checkClientGroup(mobilePhone, null, common.getTempPlatformKey(userSession.groupType), function (clientGroup, accountNo) {
                                saveLoginInfo(res,req,userSession,mobilePhone,accountNo,thirdId,clientStoreId,clientGroup,function(saveResult){
                                    res.json(saveResult);
                                });
                            });
                        }
                    });
                }
            });
        }
    }else{
        //userId自动登录
        studioService.login({userId:userId,groupType:userSession.groupType}, 2, function(loginRes){
            if(loginRes.isOK){
                loginRes.userInfo.isLogin=true;
                req.session.studioUserInfo=loginRes.userInfo;
                req.session.studioUserInfo.clientStoreId=clientStoreId;
                req.session.studioUserInfo.firstLogin=true;
                if(loginRes.userInfo.clientGroup!=constant.clientGroup.vip && loginRes.userInfo.clientGroup!=constant.clientGroup.active) {//检查账号接口同步数据
                    studioService.checkClientGroup(loginRes.userInfo.mobilePhone, null, common.getTempPlatformKey(userSession.groupType), function (clientGroup, accountNo) {
                        saveLoginInfo(res, req, userSession, mobilePhone, accountNo, null, clientStoreId, clientGroup, function (saveResult) {
                            res.json({isOK: true, clientGroup:clientGroup});
                        });
                    });
                }else{
                    res.json({isOK: true, clientGroup:loginRes.userInfo.clientGroup});
                }
            }else{
                res.json(loginRes);
            }
        });
    }
});

/**
 * 保存登录信息
 * @param res
 * @param req
 * @param userSession
 * @param mobilePhone
 * @param accountNo
 * @param thirdId
 * @param clientStoreId
 */
function saveLoginInfo(res,req,userSession,mobilePhone,accountNo,thirdId,clientStoreId,clientGroup,callback){
    var userInfo = {
        mobilePhone: mobilePhone,
        ip: common.getClientIp(req),
        groupType: userSession.groupType,
        accountNo: accountNo,
        thirdId: null,
        clientGroup:clientGroup
    };
    studioService.checkMemberAndSave(userInfo,function(result){
        req.session.studioUserInfo = {
            groupType: userSession.groupType,
            clientStoreId: clientStoreId,
            firstLogin: true,
            isLogin: true,
            mobilePhone: userInfo.mobilePhone,
            userId: userInfo.userId,
            defGroupId: userInfo.defGroupId,
            clientGroup: userInfo.clientGroup,
            nickname: userInfo.nickname,
            avatar:userInfo.avatar
        };
        result.userInfo = {clientGroup: userInfo.clientGroup};
        callback(result);
    });
}

/**
 * 保存到桌面
 */
router.get('/getHxShortCut', function(req, res) {
    var cbFn = function(err){
        if(err){
            logger.warn('getShortCut << download link error:'+ err);
        }
    };
    res.download(global.rootdir+"/template/hx/hxstudio.url", "视频直播间-恒信贵金属.url", cbFn);
});

/**
 * 获取老师列表
 */
router.post('/getTeachers',function(req, res){
    var params = req.body['data'];
    if(typeof params == "string"){
        params = JSON.parse(params);
    }
    userService.getTeacherList(params, function(result){
        res.json(result);
    });
});

/**
 * 根据userId获取老师信息
 */
router.post('/getTeacher',function(req, res){
    var params = req.body['data'];
    if(common.isBlank(params)){
        res.json(null);
    }
    if(typeof params == 'string'){
        params = JSON.parse(params);
    }
    userService.getTeacherByUserId(params, function(result){
        res.json(result);
    });
});

module.exports = router;
