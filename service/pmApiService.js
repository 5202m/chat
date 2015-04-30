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
     * 格式url
     */
    formatApiUrl:function(url){
      return config.pmApiUrl+url;
    },
    /**
     * 提取公告信息
     */
     getBulletinList:function(lang,curPageNo,pageSize,callback){
         request(this.formatApiUrl(util.format('/article/getArticleList?code=bulletin&lang=%s&curPageNo=%d&pageSize=%d',lang,curPageNo,pageSize)),function(err, response, data){
             if (!err && response.statusCode == 200) {
                 callback(data);
             }else{
                 logger.error("getBulletinList>>>error:"+err);
                 callback({});
             }
         });
     },
    /**
     * 提取广告信息
     */
    getAdvertisement:function(callback){
        request(this.formatApiUrl('/advertisement/getAdvertisement?platform=1'),function(err, response, data){
            if (!err && response.statusCode == 200) {
                callback(data);
            }else{
                logger.error("getBulletinList>>>error:"+err);
                callback({});
            }
        });
    }
};

//导出服务类
module.exports =pmApiService;

