var request = require('request');
var util = require('util');
var common = require('../util/common'); //引入公共的js
var config = require('../resources/config');//引入config
var logger = require('../resources/logConf').getLogger('pmApiService');
/**
 * pmApi服务类
 * @type {{}}
 * create by alan.wu
 */
var pmApiService = {
    /**
     * 黄金接口
     * 通过账号与手机号检查用户是否A客户
     * 备注：目前只是微信组聊天室客户发言时需检测，只针对goldApi
     * @param params
     * @param callback
     */
    checkAClient:function(params,callback){
        var flagResult={flag:0};//客户记录标志:0（记录不存在）、1（未绑定微信）、2（未入金激活）、3（绑定微信并且已经入金激活）
        if(params.isCheckByMobile){
            request.post({url:(config.goldApiUrl+'/account/getCustomerInfoByMobileNo'), form: {mobileNo: '86-' + params.mobilePhone}}, function(error,response,tmpData){
                //logger.info("checkContactInfo->error:"+error+";tmpData:"+tmpData);
                if(error){
                    logger.error("getCustomerInfoByMobileNo->error" + error);
                }
                try{
                    if(!error && common.isValid(tmpData)) {
                        var allData = JSON.parse(tmpData);
                        var result = allData.result;
                        if (allData.code == 'SUCCESS' && result && result.length > 0) {
                            flagResult.flag = 2;//未入金激活
                            var acc = null;
                            for(var i = 0, lenI = result ? result.length : 0; i < lenI; i++){
                                acc = result[i];
                                flagResult.accountNo = acc.accountNo;
                                if(acc.accountStatus == "A"){
                                    flagResult.flag = 3;
                                    break;
                                }
                            }
                        }
                    }
                }catch(e){
                    logger.error("getCustomerInfoByMobileNo->error" + e);
                }
                callback(flagResult);
            });
        }else{
            request.post({url:(config.goldApiUrl+'/account/getCustomerInfo'), form: {loginname:params.accountNo}}, function(error,response,tmpData){
                if(!error && common.isValid(tmpData)) {
                    try{
                        var allData = JSON.parse(tmpData);
                        var result = allData.result;
                        if (allData.code == 'SUCCESS'&& result!=null) {
                            if (result.mobilePhone.indexOf(params.mobilePhone)==-1) {
                                flagResult.flag = 0;//没有对应记录
                            }  else if (result.accountStatus != 'A') {
                                flagResult.flag = 2;//未入金激活
                            } else if (result.isBindWeichat!=1) {
                                flagResult.flag = 1;//未绑定微信
                            }else {
                                flagResult.flag = 3;//绑定微信并且已经入金激活
                            }
                        } else {
                            flagResult.flag = 0;//没有对应记录
                        }
                    }catch(e){
                        logger.error("getCustomerInfo->error" + e);
                    }
                }
                callback(flagResult);
            });
        }
    },
    /**
     * 通过手机号检查模拟账户
     * @param mobilePhone
     * @param callback
     */
    checkSmClient:function(mobilePhone,callback){
        var isTrue=false;
        request.post({url:(config.simulateApiUrl+'/account/demo/checkEmailMobile'), form: {args:'["","86-'+mobilePhone+'"]'}}, function(error,response,data){
            logger.info("checkEmailMobile["+mobilePhone+"]->error:"+error+";tmpData:"+data);
            if(!error && common.isValid(data)) {
                try{
                    var allData = JSON.parse(data),result = allData.result;
                    isTrue=(allData.code == 'SUCCESS'&& result!=null && result.code=='1044');
                }catch(e){
                    isTrue = false;
                    logger.error("checkSimulateClient by GTSApi[" + mobilePhone + "]->error:" + e);
                }
            }
            callback(isTrue);
        });
    },

    /**
     * 发送邮件
     * @param params
     * @param templateCode
     * @param emails
     * @param groupType
     * @param callback ({{isOK : boolean, msg : String}})
     */
    sendEmailByUTM : function(params, templateCode, emails, groupType, callback) {
        if (!emails || !templateCode || !groupType || !config.utm.hasOwnProperty(groupType)){
            callback({isOK : false, msg : "参数错误！"});
            return;
        }
        var utmConfig = config.utm[groupType];
        var emailData = {
            timestamp: common.formatDate(new Date(), "yyyyMMddHHmmss"),
            accountSid: utmConfig.sid,
            sign: "",
            emails: emails,
            templateCode: templateCode,
            templateParam: JSON.stringify(params)
        };
        emailData.sign = common.getMD5(emailData.accountSid + utmConfig.token + emailData.timestamp);

        logger.info("<<sendEmailByUTM:发送邮件：content=[%s]", JSON.stringify(emailData));
        request.post(config.utm.emailUrl, function (error, response, data) {
            if (error || response.statusCode != 200 || !data) {
                logger.error("<<sendEmailByUTM:发送邮件异常，errMessage:", error);
                callback({isOK : false, msg : "发送邮件错误！"});
            } else {
                try {
                    data = JSON.parse(data);
                    if (data.respCode != "Success") {
                        logger.error("<<sendEmailByUTM:发送邮件失败，[errMessage:%s]", data.respMsg);
                        callback({isOK : false, msg : "发送邮件错误:" + data.respMsg + "!"});
                    }else{
                        callback({isOK : true, msg : ""});
                    }
                } catch (e) {
                    logger.error("<<sendEmailByUTM:发送邮件出错，[response:%s]", data);
                    callback({isOK : false, msg : "发送邮件错误！"});
                }
            }
        }).form(emailData);
    }
};

//导出服务类
module.exports =pmApiService;

