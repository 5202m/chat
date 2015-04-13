/**
 * API请求控制类
 * Created by Alan.wu on 2015/3/4.
 */
var express = require('express');
var router = express.Router();

/*＃＃＃＃＃＃＃＃＃＃ 引入所需类 ＃＃＃＃＃＃＃＃begin */
var chatService = require('../../service/chatService');
var common = require('../../util/common'); //引入公共的js
var errorMessage = require('../../util/errorMessage');
/*＃＃＃＃＃＃＃＃＃＃ 引入所需服务类 ＃＃＃＃＃＃＃＃end */

/**
 * 提取聊天室缓存中在线用户
 */
router.get('/getOnlineUser', function(req, res) {
    var groupId=req.param("groupId");
    if(common.isBlank(groupId)){
        res.json(errorMessage.code_1000);
    }else{
        var userArr=chatService.cacheUserArr[groupId];
        var result=[];
        for(var i=0;i<userArr.length;i++){
            result.push(userArr[i].userInfo);
        }
        res.json(result);
    }
});

/**
 * 聊天室token提取
 */
router.get('/getToken', function(req, res) {
    if(common.isBlank(groupId)){
        res.json(errorMessage.code_1000);
    }else{
        var userArr=chatService.cacheUserArr[groupId];
        var result=[];
        for(var i=0;i<userArr.length;i++){
            result.push(userArr[i].userInfo);
        }
        res.json(result);
    }
});

module.exports = router;
