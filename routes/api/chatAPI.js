/**
 * API请求控制类
 * Created by Alan.wu on 2015/3/4.
 */
var express = require('express');
var router = express.Router();

/*＃＃＃＃＃＃＃＃＃＃ 引入所需类 ＃＃＃＃＃＃＃＃begin */
var userService = require('../../service/userService');
var chatService = require('../../service/chatService');//引入chatService
var common = require('../../util/common'); //引入公共的js
var errorMessage = require('../../util/errorMessage');
var constant = require('../../constant/constant');//引入constant
/*＃＃＃＃＃＃＃＃＃＃ 引入所需服务类 ＃＃＃＃＃＃＃＃end */

/**
 * 提取聊天室缓存中在线用户
 */
router.get('/getOnlineUser', function(req, res) {
    var groupId=req.param("groupId");
    if(common.isBlank(groupId)){
        res.json(errorMessage.code_1000);
    }else{
        var userArr=userService.cacheUserArr[groupId];
        var result=[];
        for(var i=0;i<userArr.length;i++){
            result.push(userArr[i].userInfo);
        }
        res.json(result);
    }
});


/**
 * 移除客户端信息
 */
router.post('/removeMsg', function(req, res) {
    var msgIds=req.param("msgIds"),groupId=req.param("groupId");
    var result={isOk:false,error:null};
    if(common.isBlank(msgIds)||common.isBlank(groupId)){
        result.error=errorMessage.code_1000;
    }else{
        chatService.clientNotice(chatService.noticeType.removeMsg,groupId,{msgIds:msgIds});
        result.isOk=true;
    }
    res.json(result);
});

/**
 * 审核信息，通知客户端
 */
router.post('/approvalMsg', function(req, res) {
    var publishTimeArr=req.param("publishTimeArr"),
        fUserIdArr=req.param("fUserIdArr"),
        status=req.param("status"),
        groupId=req.param("groupId"),
        approvalUserNo=req.param("approvalUserNo");
    var result={isOk:false,error:null};
    if(common.isBlank(publishTimeArr)||common.isBlank(fUserIdArr)||common.isBlank(status)||common.isBlank(groupId)){
        result.error=errorMessage.code_1000;
    }else{
        var data={fromUser:{groupId:groupId,userId:approvalUserNo,fromPlatform:constant.fromPlatform.pm_mis},status:status,publishTimeArr:publishTimeArr.split(","),fuIdArr:fUserIdArr.split(",")};
        chatService.approvalMsg(data,null);
        result.isOk=true;
    }
    res.json(result);
});


module.exports = router;
