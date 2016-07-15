var request = require('request');
var util = require('util');
var common = require('../util/common'); //引入公共的js
var constant = require('../constant/constant');//引入constant
var config = require('../resources/config');//引入config
var errorMessage = require('../util/errorMessage');
var logger = require('../resources/logConf').getLogger('hxApiService');
/**
 * fxApi服务类
 * @type {{}}
 * create by alan.wu
 */
var hxApiService = {
    /**
     * 提取登录sid
     * @param callback
     */
    getLoginSid:function(callback){
        memored.read('hxLoginSid', function(err, value) {
           if(common.isValid(value)){
               callback(value);
           }else{
               request.get(config.hxMT4ApiUrl+'/members/login?apiLogin='+config.hxApiLoginSid.apiLogin+"&apiPassword="+config.hxApiLoginSid.apiPassword, function(err, res, data){
                   if(err){
                       logger.error("getLoginSid fail:" + err);
                       callback(null);
                   }else{
                       try{
                           var sid=JSON.parse(data).data;
                           global.memored.store("hxLoginSid",sid,60*1000,function(err){
                               if(err){
                                   logger.error("store hxLoginSid[memored.store]->err:"+err);
                               }else{
                                   callback(sid);
                               }
                           });
                       }catch(e){
                           logger.error("getLoginSid fail:" + e);
                       }
                   }
               });
           }
        });
    },
    /**
     * 提取hx GTS2接口的签名
     * @param data
     */
    getApiSignature:function(data){
        var invokerVal='';
        if(data["_principal_"]){
            var pl=data["_principal_"];
            if(typeof pl!="object"){
                pl=JSON.parse(pl);
            }
            if(!pl.invoker || !constant.gwApiInvoker.hasOwnProperty(pl.invoker)){
                return null;
            }
            invokerVal=constant.gwApiInvoker[pl.invoker].value;
        }
        var names = [];
        for(var name in data){
            if(name == '_signature_'){
                continue;
            }else{
                names.push(name);
            }
        }
        names.sort();
        var str = '',value='';
        for(var i = 0; i < names.length; i++){
            value = data[names[i]];
            value = (value == null)? "" :(typeof value=="object"?JSON.stringify(value):value);
            str += value + '&';
        }
        str+=invokerVal;
        return common.getMD5(str);
    },
    /**
     * 通过账号与手机号检查用户是否A客户
     * @param params
     * @returns
     */
    checkAClient:function(params,callback){
        var flagResult={flag:0};
        if((!params.isCheckByMobile && common.isBlank(params.accountNo))||(params.isCheckByMobile && common.isBlank(params.mobilePhone))){//检查输入参数是否为空
            callback(flagResult);
            return;
        }
        if(params.isCheckByMobile){//通过手机号码传入检查数据(GTS2)
            params.mobilePhone=common.trim(params.mobilePhone);
            var submitInfo={
                prefix:86,
                mobileNo:params.mobilePhone,
                args:'[]',
                _principal_:{loginName:params.mobilePhone, remoteIpAddress:params.ip, invoker:constant.gwApiInvoker.hx_website.key, companyId:2}
            };
            var sg=this.getApiSignature(submitInfo);
            if(!sg){
                callback(flagResult);
                return;
            }
            submitInfo["_signature_"]=sg;
            submitInfo['_principal_']=JSON.stringify(submitInfo['_principal_']);
            request.post({url:(config.hxGTS2ApiUrl+'/account/getCustomerByMobileNo'), form: submitInfo}, function(error,response,tmpData){
                /*logger.info("tmpDataGTS2:"+tmpData);*/
                if(!error && common.isValid(tmpData)) {
                    try{
                        var allData = JSON.parse(tmpData);
                        var result = allData.result;
                        if (allData.code == 'SUCCESS' && result && result.length > 0) {
                            flagResult.flag = 2;//未入金激活
                            var accList = null,acc=null;
                            for(var i = 0, lenI = result.length; i < lenI; i++){
                                accList = result[i].accountInfoList;
                                if(accList && accList.length>0){
                                    for(var k in accList){
                                        acc=accList[k];
                                        flagResult.accountNo = acc.accountNo;
                                        if(acc.activateTime){
                                            flagResult.flag = 3;
                                            break;
                                        }
                                    }
                                    if(flagResult.flag ==3){
                                        break;
                                    }
                                }
                            }
                        }
                    }catch(e){
                        logger.error("checkHxAClient by GTS2Api["+params.mobilePhone+"]->error:"+e);
                        flagResult.flag=0;
                    }
                }else{
                    logger.error("checkHxAClient by GTS2Api["+params.mobilePhone+"]->error:"+error);
                }
                if(flagResult.flag==0){ //如果没有GTS2账号，则检查MT4，通过手机号码传入检查数据(MT4)
                    hxApiService.getLoginSid(function(sid){
                        if(!sid){
                            callback(flagResult);
                        }else{
                            request.post({url:(config.hxMT4ApiUrl+'/members/getMembers'), form: {sid:sid,mobile:params.mobilePhone}}, function(error,response,mt4TmpData){
                                //logger.info("tmpDataMT4:"+mt4TmpData);
                                if(!error && common.isValid(mt4TmpData)) {
                                    try{
                                        var mt4Data = JSON.parse(mt4TmpData);
                                        if(0==mt4Data.status && mt4Data.data && tmpData.data.login){
                                            flagResult.flag=(mt4Data.data.isActivate=='Y')?3:2;
                                            flagResult.accountNo=mt4Data.data.login;
                                        }
                                    }catch(e){
                                        logger.error("checkHxAClient by MT4Api["+params.mobilePhone+"]->error:"+e);
                                    }
                                }else{
                                    logger.error("checkHxAClient by MT4Api["+params.mobilePhone+"]->error:"+error);
                                }
                                callback(flagResult);
                            });
                        }
                    });
                }else{
                    callback(flagResult);
                }
            });
        }else{//通过账号传入检查数据
            params.accountNo=common.trim(params.accountNo);
            var platform='';
            if(/^6\d{7}$/g.test(params.accountNo)){
                platform='GTS2';
            }else if(/^2\d{8}$/g.test(params.accountNo)){
                platform='MT4';
            }else{
                callback(flagResult);
                return;
            }
            hxApiService.getLoginSid(function(sid) {
                request.post({url: (config.hxMT4ApiUrl + '/members/realLogin'),form: {sid: sid,login: params.accountNo,password: params.password,platform: platform,ip: params.ip}}, function (error, response, tmpData) {
                    /*logger.info("tmpData:" + tmpData);*/
                    if (!error && common.isValid(tmpData)) {
                        try {
                            tmpData = JSON.parse(tmpData);
                            if(0==tmpData.status && tmpData.data && tmpData.data.mobile){
                                flagResult.flag=(tmpData.data.isActivate=='Y')?3:2;
                                flagResult.mobilePhone=tmpData.data.mobile;
                            }
                            if('AMS100'==tmpData.status || 'AMS101'==tmpData.status || 'API011'==tmpData.status||'API1013'==tmpData.status){
                                flagResult.error=errorMessage.code_1015;
                            }
                            if('API1015'==tmpData.status ||'API1017'==tmpData.status){
                                flagResult.error=errorMessage.code_1016;
                            }
                        } catch (e) {
                            logger.error("checkHxAClient by GTS2Api[" + params.accountNo + "]->e:" + e);
                        }
                    } else {
                        logger.error("checkHxAClient by GTS2Api[" + params.accountNo + "]->error:" + error);
                    }
                    callback(flagResult);
                });
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
        var submitInfo={
            countryCode:86,
            mobilePhone:mobilePhone,
            args:'[]',
            _principal_:{loginName:mobilePhone, remoteIpAddress:'', invoker:constant.gwApiInvoker.fx_website.key, companyId:2}
        };
        var sg=this.getApiSignature(submitInfo);
        if(!sg){
            callback(isTrue);
            return;
        }
        submitInfo["_signature_"]=sg;
        submitInfo['_principal_']=JSON.stringify(submitInfo['_principal_']);
        request.post({url:(config.gwfxGTS2SmApiUrl+'/checkDemoContainActivateMobilePhone'), form: submitInfo}, function(error,response,tmpData) {
            /*logger.info("tmpDataGTS2:" + tmpData);*/
            try{
                if (!error && common.isValid(tmpData)) {
                    var allData = JSON.parse(tmpData);
                    isTrue=(allData.code == 'SUCCESS'&& allData.result);
                } else {
                    logger.warn("checkSimulateClient by GTS2Api[" + mobilePhone + "]->error:" + error);
                }
            }catch(e){
                isTrue = false;
                logger.error("checkSimulateClient by GTS2Api[" + mobilePhone + "]->error:" + e);
            }
            if (!isTrue) { //如果没有GTS2账号，则检查MT4，通过手机号码传入检查数据(MT4)
                hxApiService.getLoginSid(function(sid) {
                    request.post({url: (config.hxMT4ApiUrl + '/members/isOpenDemousers'),form: {sid: sid,mobile:mobilePhone}}, function (error, response, hxMT4TmpData) {
                        /*logger.info("hxMT4TmpData:" + hxMT4TmpData);*/
                        if (!error && common.isValid(hxMT4TmpData)) {
                            try {
                                hxMT4TmpData=JSON.parse(hxMT4TmpData);
                                isTrue=(0==hxMT4TmpData.status && hxMT4TmpData.data=='Y');
                            } catch (e) {
                                logger.error("checkHxSmClient by hxMT4[" + mobilePhone + "]->error:" + e);
                                isTrue=false;
                            }
                        } else {
                            logger.error("checkHxSmClient by hxMT4[" + mobilePhone + "]->error:" + error);
                        }
                        callback(isTrue);
                    });
                });
            } else {
                callback(isTrue);
            }
        });
    }
};

//导出服务类
module.exports =hxApiService;

