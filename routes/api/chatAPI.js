/**
 * API请求控制类
 * Created by Alan.wu on 2015/3/4.
 */
var express = require('express');
var router = express.Router();

/*＃＃＃＃＃＃＃＃＃＃ 引入所需类 ＃＃＃＃＃＃＃＃begin */
var userService = require('../../service/userService');
var chatService = require('../../service/chatService');//引入chatService
var visitorService = require('../../service/visitorService');//引入visitorService
var common = require('../../util/common'); //引入公共的js
var errorMessage = require('../../util/errorMessage');
var constant = require('../../constant/constant');//引入constant
/*＃＃＃＃＃＃＃＃＃＃ 引入所需服务类 ＃＃＃＃＃＃＃＃end */

/**
 * 移除客户端信息
 */
router.post('/removeMsg', function(req, res) {
    var msgIds=req.body["msgIds"],groupId=req.body["groupId"];
    var result={isOK:false,error:null};
    if(common.isBlank(msgIds)||common.isBlank(groupId)){
        result.error=errorMessage.code_1000;
    }else{
        chatService.removeMsg(groupId,msgIds);
        result.isOK=true;
    }
    res.json(result);
});

/**
 * 审核信息，通知客户端
 */
router.post('/approvalMsg', function(req, res) {
    var publishTimeArr=req.body["publishTimeArr"],
        fUserIdArr=req.body["fUserIdArr"],
        status=req.body["status"],
        groupId=req.body["groupId"],
        approvalUserNo=req.body["approvalUserNo"];
    var result={isOK:false,error:null};
    if(common.isBlank(publishTimeArr)||common.isBlank(fUserIdArr)||common.isBlank(status)||common.isBlank(groupId)){
        result.error=errorMessage.code_1000;
    }else{
        var data={fromUser:{groupId:groupId,userId:approvalUserNo,fromPlatform:constant.fromPlatform.pm_mis},status:status,publishTimeArr:publishTimeArr.split(","),fuIdArr:fUserIdArr.split(",")};
        chatService.approvalMsg(data,null);
        result.isOK=true;
    }
    res.json(result);
});

/**
 * 离开房间
 */
router.post('/leaveRoom', function(req, res) {
    var groupIds=req.body["groupIds"],userIds=req.body["userIds"];
    var result={isOK:false,error:null};
    console.log("leaveRoom->groupId:"+groupIds+";userIds:"+userIds);
    if(common.isBlank(groupIds)){
        result.error=errorMessage.code_1000;
    }else{
        if(common.isValid(userIds)){//存在用户id
            chatService.leaveRoomByUserId(groupIds,userIds,chatService.leaveRoomFlag.forcedOut);
            result.isOK=true;
        }else{//不存在用户id，则通知房间所有用户下线
            chatService.leaveRoom(groupIds,chatService.leaveRoomFlag.roomClose);
            result.isOK=true;
        }
    }
    res.json(result);
});

module.exports = router;
