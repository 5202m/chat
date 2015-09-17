/** 微信服务类
 * Created by Alan.wu on 2015/7/8.
 */
var http = require('http');//引入http
var async = require('async');//引入async
var constant = require('../constant/constant');//引入constant
var chatGroup = require('../models/chatGroup');//引入chatGroup数据模型
var member = require('../models/member');//引入member数据模型
var common = require('../util/common');//引入common类
var pmApiService = require('../service/pmApiService');//引入pmApiService
var logger=require('../resources/logConf').getLogger('wechatService');//引入log4js
var userService = require('../service/userService');//引入userService
/**
 * 定义微信服务类
 * @type {{}}
 */
var wechatService = {
    /**
     * 提取组列表
     */
     getRoomList:function(callback){
        chatGroup.find({valid:1,status:1,'chatStudio':{ $exists:false},groupType:constant.fromPlatform.wechat}).select("name groupType defaultAnalyst openDate sequence status maxCount").sort({'sequence':'asc'}).exec(function (err,rows) {
            if(err){
                logger.error("getGroupList fail:"+err);
            }
            callback(rows);
        });
     }
};

//导出服务类
module.exports =wechatService;

