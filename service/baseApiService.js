var request = require('request');
var util = require('util');
var common = require('../util/common'); //引入公共的js
var config = require('../resources/config');//引入config
var logger = require('../resources/logConf').getLogger('baseApiService');
/**
 * baseApi服务类
 * @type {{}}
 * create by alan.wu
 */
var baseApiService = {
    /**
     * 格式url
     */
    formatApiUrl:function(url){
      return config.pmApiUrl+url;
    },
    /**
     * 销毁访问主页的token
     * @param val
     * @param isAllowPass
     */
    destroyHomeToken:function(val,isAllowPass,callback){
        callback(true);
        return;
        if(isAllowPass){
            callback(true);
            return;
        }
        request.post({url:this.formatApiUrl('/token/destroyToken'), form:{token:val}}, function(err,response,data){
            if(err) {
                logger.error("destroyHomeToken>>>error:"+err);
                callback(false);
            }else{
                var dataObj={};
                try{
                    dataObj=JSON.parse(data);
                    callback(dataObj.isOK);
                }catch (e){
                    logger.error("destroyHomeToken>>>data:"+data);
                    callback(true);
                }
            }
        });
    },

    /**
     * 提取文档接口
     * @param params
     * @param callback
     */
    getArticleList:function(params,callback){
        var url=util.format('/article/getArticleList?authorId=%s&platform=%s&code=%s&lang=%s&hasContent=%s&isAll=%s&pageNo=%d&pageSize=%d&pageLess=%s&pageKey=%s&orderByJsonStr=%s'
            ,params.authorId,params.platform,params.code,'zh',params.hasContent
            ,params.isAll,params.pageNo,params.pageSize,params.pageLess,params.pageKey
            ,params.orderByStr);
        request(this.formatApiUrl(url),function(err, response, data){
            if (!err && response.statusCode == 200) {
                callback(data);
            }else{
                logger.error("getArticleList>>>error:"+err);
                callback(null);
            }
        });
    },
    /**
     * 提取文档详情接口
     * @param params
     * @param callback
     */
    getArticleInfo:function(params,callback){
        request(this.formatApiUrl("/article/getArticleInfo?id="+params.id),function(err, response, data){
            if (!err && response.statusCode == 200) {
                callback(data);
            }else{
                logger.error("getArticleInfo>>>error:"+err);
                callback(null);
            }
        });
    },

    /**
     * 提取手机验证码
     * @param mobilePhone
     * @param useType
     * @param ip
     * @param callback
     */
    getMobileVerifyCode:function(mobilePhone, useType, ip, callback){
        request.post(config.pmApiUrl+"/sms/send",function(error, response, data){
            if (!error && response.statusCode == 200 && common.isValid(data)) {
                data=JSON.parse(data);
                if(data.result!=0){
                    logger.error("getMobileVerifyCode fail:" + data.errmsg);
                }
                callback(data);
            }else{
                logger.error("getMobileVerifyCode fail:"+error);
                callback({result : 1, errcode : -1, errmsg : "短信发送失败！"});
            }
        }).form({
            mobilePhone : mobilePhone,
            useType : useType,
            deviceKey : ip
        });
    },

    /**
     * 验证手机验证码
     * @param mobilePhone
     * @param useType
     * @param verifyCode
     * @param callback
     */
    checkMobileVerifyCode : function(mobilePhone, useType, verifyCode, callback){
        request.post(config.pmApiUrl+"/sms/checkAuth",function(error, response, data){
            if (!error && response.statusCode == 200 && common.isValid(data)) {
                data=JSON.parse(data);
                if(data.result!=0){
                    logger.error("checkMobileVerifyCode fail:" + data.error);
                }
                callback(data);
            }else{
                logger.error("checkMobileVerifyCode fail:"+error);
                callback({result : 1, errcode : -1, errmsg : "短信验证失败！"});
            }
        }).form({
            mobilePhone : mobilePhone,
            useType : useType,
            authCode : verifyCode
        });
    },

    /**
     * 检查点赞记录是否已经点赞
     * @param clientId
     * @param praiseId
     * @param fromPlatform
     * @param callback
     */
    checkChatPraise:function(clientId,praiseId,fromPlatform,callback){
        request.post({url:this.formatApiUrl('/chat/checkChatPraise'), form:{clientId:clientId,praiseId:praiseId,fromPlatform:fromPlatform}},function(err, response, data){
            if (err){
                callback(false);
            }else{
                try{
                    callback(JSON.parse(data).result);
                }catch(e){
                    logger.error("checkChatPraise fail:"+e);
                    callback(false);
                }
            }
        });
    },

    /**
     * 获取CFTC持仓比例数据
     */
    get24kCftc: function(callback){
        request(this.formatApiUrl('/common/get24kCftc'),function(err, response, data){
            if (err){
                callback(false);
            }else{
                try{
                    callback(JSON.parse(data));
                }catch(e){
                    logger.error("get24kCftc fail:"+e);
                    callback(false);
                }
            }
        });
    },
    /**
     * 获取财经日历列表数据
     * @param callback
     */
    getZxFinanceDataList: function(releaseTime, dataTypeCon, callback){
        request(this.formatApiUrl('/zxFinanceData/list?releaseTime=' + releaseTime + '&dataTypeCon=' + dataTypeCon),function(err, response, data){
            if (err){
                callback(false);
            }else{
                try{
                    callback(JSON.parse(data));
                }catch(e){
                    logger.error("getZxFinanceDataList fail:"+e);
                    callback(false);
                }
            }
        });
    },
    /**
     * 发送邮件
     * @param key
     * @param data
     * @param callback
     */
    sendEmail: function(key, data, callback){
        request.post({url:this.formatApiUrl('/common/email'), form:{key:key,data:JSON.stringify(data)}},function(err, response, data){
            if (err){
                callback(false);
            }else{
                try{
                    callback(JSON.parse(data));
                }catch(e){
                    logger.error("sendEmail fail:"+e);
                    callback(false);
                }
            }
        });
    },
    /**
     * 添加文档
     * @param data
     * @param callback
     */
    addArticle: function(data, callback){
        if(typeof data != 'string'){
            data = JSON.stringify(data);
        }
        request.post({url:this.formatApiUrl('/article/add'), form:{data: data} },function(err, response, result){
            if(err){
                logger.error("addArticle fail:"+err);
                callback(null);
            }else{
                try{
                    callback(JSON.parse(result));
                }catch(e){
                    logger.error("addArticle fail:"+e);
                    callback(null);
                }
            }
        });
    },
    /**
     * 更新文章
     * @param query
     * @param field
     * @param updater
     * @param callback
     */
    modifyArticle:function(query, field, updater, callback){
        if(typeof query != 'string'){
            try {
                query = JSON.stringify(query);
            }catch(e){
                callback(null);
                return;
            }
        }
        if(typeof update != 'string'){
            try {
                updater = JSON.stringify(updater);
            }catch(e){
                callback(null);
                return;
            }
        }
        request.post({url:this.formatApiUrl('/article/modify'), form:{query: query, field:field, data: updater} },function(err, response, result){
            if(err){
                logger.error("modifyArticle fail:"+err);
                callback(null);
            }else{
                try{
                    callback(JSON.parse(result));
                }catch(e){
                    logger.error("modifyArticle fail:"+e);
                    callback(null);
                }
            }
        });
    }
};

//导出服务类
module.exports =baseApiService;

