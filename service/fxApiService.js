var request = require('request');
var util = require('util');
var common = require('../util/common'); //引入公共的js
var constant = require('../constant/constant');//引入constant
var config = require('../resources/config');//引入config
var logger = require('../resources/logConf').getLogger('fxApiService');
/**
 * fxApi服务类
 * @type {{}}
 * create by alan.wu
 */
var fxApiService = {
    /**
     * 提取fx GTS2接口的签名
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
    /**外汇接口
     * 通过账号与手机号检查用户是否A客户
     * @param params
     * @returns
     */
    checkAClient:function(params,callback){
        var flagResult={flag:0};
        if((!params.isCheckByMobile && common.isBlank(params.accountNo))||common.isBlank(params.mobilePhone)){//检查输入参数是否为空
            callback(flagResult);
            return;
        }
        params.mobilePhone=common.trim(params.mobilePhone);
        if(params.isCheckByMobile){//通过手机号码传入检查数据(GTS2)
            var submitInfo={
                prefix:86,
                mobileNo:params.mobilePhone,
                args:'[]',
                _principal_:{loginName:params.mobilePhone, remoteIpAddress:params.ip, invoker:constant.gwApiInvoker.fx_website.key, companyId:2}
            };
            var sg=this.getApiSignature(submitInfo);
            if(!sg){
                callback(flagResult);
                return;
            }
            submitInfo["_signature_"]=sg;
            submitInfo['_principal_']=JSON.stringify(submitInfo['_principal_']);
            request.post({url:(config.gwfxGTS2ApiUrl+'/account/getCustomerByMobileNo'), form: submitInfo}, function(error,response,tmpData){
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
                        logger.error("checkFxAClient by GTS2Api["+params.mobilePhone+"]->error:"+e);
                        flagResult.flag=0;
                    }
                }else{
                    logger.error("checkFxAClient by GTS2Api["+params.mobilePhone+"]->error:"+error);
                }
                if(flagResult.flag==0){ //如果没有GTS2账号，则检查MT4，通过手机号码传入检查数据(MT4)
                    request.post({url:(config.gwfxMT4ApiUrl+'/ForexCustomerManager/findCustomerInfoByPhone'), form: {mobilephone:'86--'+params.mobilePhone}}, function(error,response,mt4TmpData){
                        /*logger.info("tmpDataMT4:"+mt4TmpData);*/
                        if(!error && common.isValid(mt4TmpData)) {
                            try{
                                var mt4Data = JSON.parse(mt4TmpData);
                                var mt4Result = mt4Data.result;
                                if (mt4Data.code == 'SUCCESS' && mt4Result && mt4Result.length > 0) {
                                    flagResult.flag = 2;//未入金激活
                                    var acc=null;
                                    for(var i = 0, lenI = mt4Result.length; i < lenI; i++){
                                        acc = mt4Result[i];
                                        flagResult.accountNo = acc.mt4Ploginname;
                                        if(acc.isActive=="1"){
                                            flagResult.flag = 3;
                                            break;
                                        }
                                    }
                                }
                            }catch(e){
                                logger.error("checkFxAClient by MT4Api["+params.mobilePhone+"]->error:"+e);
                            }
                        }else{
                            logger.error("checkFxAClient by MT4Api["+params.mobilePhone+"]->error:"+error);
                        }
                        callback(flagResult);
                    });
                }else{
                    callback(flagResult);
                }
            });
        }else{//通过账号传入检查数据
            params.accountNo=common.trim(params.accountNo);
            if(/^8[0-9]+$/g.test(params.accountNo)){//GTS2接口
                var submitInfo={
                    customerNumber:params.accountNo,
                    args:'[]',
                    _principal_:{loginName:params.accountNo, remoteIpAddress:params.ip, invoker:constant.gwApiInvoker.fx_website.key, companyId:2}
                };
                var sg=this.getApiSignature(submitInfo);
                if(!sg){
                    callback(flagResult);
                    return;
                }
                submitInfo["_signature_"]=sg;
                submitInfo['_principal_']=JSON.stringify(submitInfo['_principal_']);
                request.post({url:(config.gwfxGTS2ApiUrl+'/account/getCustomerByCustomerNumber'), form: submitInfo}, function(error,response,tmpData){
                    /* logger.info("tmpData:"+tmpData);*/
                    if(!error && common.isValid(tmpData)) {
                        var allData = null;
                        try{
                            allData = JSON.parse(tmpData);
                        }catch(e){
                            logger.error("checkFxAClient by GTS2Api["+params.accountNo+"]->error:"+e);
                            callback(flagResult);
                            return;
                        }
                        var result = allData.result,row=null;
                        if (allData && allData.code == 'SUCCESS'&& result!=null && result.code=='OK' && (row=result.result)!=null) {
                            if (row.mobilePhone && (row.mobilePhone.indexOf(params.mobilePhone)!=-1||params.mobilePhone.indexOf(common.rmMobilePrefix(row.mobilePhone))!=-1)) {
                                flagResult.flag = 1;//存在记录
                            }else {
                                flagResult.flag =0;//没有对应记录
                            }
                        } else {
                            flagResult.flag = 0;//没有对应记录
                        }
                    }else{
                        logger.error("checkFxAClient by GTS2Api["+params.mobilePhone+","+params.accountNo+"]->error:"+error);
                    }
                    callback(flagResult);
                });
            }else if(/^(90|92|95)[0-9]+$/g.test(params.accountNo)){//MT4接口 NZ：92/95开头 UK：90开头
                request.post({url:(config.gwfxMT4ApiUrl+'/ForexCustomerManager/findCustomerInfoByLoginname'), form: {loginname:params.accountNo}}, function(error,response,tmpData){
                    try{
                        if(!error && common.isValid(tmpData)) {
                            var allData = null;
                            try{
                                allData = JSON.parse(tmpData);
                            }catch(e){
                                logger.error("checkFxAClient by MT4Api["+params.mobilePhone+"]->error:"+error);
                                callback(flagResult);
                                return;
                            }
                            if (allData && allData.code == 'SUCCESS'&& allData.result!=null) {
                                var dbPhone=allData.result.mobilePhone;
                                if (dbPhone &&(dbPhone.indexOf(params.mobilePhone)!=-1||params.mobilePhone.indexOf(common.rmMobilePrefix(dbPhone))!=-1)) {
                                    flagResult.flag = 1;//存在记录
                                }else {
                                    flagResult.flag = 0;//没有对应记录
                                }
                            } else {
                                flagResult.flag = 0;//没有对应记录
                            }
                        }else{
                            logger.error("checkFxAClient by MT4Api["+params.mobilePhone+","+params.accountNo+"]->error:"+error);
                        }
                        callback(flagResult);
                    }catch(e){
                        logger.error("checkFxAClient by MT4Api["+params.mobilePhone+","+params.accountNo+"]->e:"+e);
                        flagResult.flag=0;
                        callback(flagResult);
                    }
                });
            }else{
                callback(flagResult);
            }
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
                request.post({url: (config.gwfxMT4SmApiUrl + '/ForexCustomerManager/isPhoneExistDemoAcc'),form: {mobilephone: '86--' + mobilePhone}}, function (error, response, mt4TmpData) {
                    /*logger.info("tmpDataMT4:" + mt4TmpData);*/
                    try{
                        if (!error && common.isValid(mt4TmpData)) {
                            var mt4Data = JSON.parse(mt4TmpData);
                            isTrue=(mt4Data.code == 'SUCCESS'&& mt4Data.result);
                        } else {
                            logger.warn("checkSimulateClient by MT4Api[" + mobilePhone + "]->error:" + error);
                        }
                    }catch(e){
                        isTrue = false;
                        logger.error("checkSimulateClient by MT4Api[" + mobilePhone + "]->error:" + e);
                    }
                    callback(isTrue);
                });
            } else {
                callback(isTrue);
            }
        });
    }
};

//导出服务类
module.exports =fxApiService;

