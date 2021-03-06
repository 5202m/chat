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
var chatPointsService = require('../../service/chatPointsService');//引入chatPointsService
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
/**
 * 更新字幕推送信息
 */
router.post('/submitPushInfo', function(req, res) {
    var infoStr=req.body["infoStr"];
    var isValid=req.body["isValid"];
    var result={isOK:false,error:null };
    if(common.isBlank(infoStr)){
        result.error=errorMessage.code_1000;
    }else{
        chatService.submitPushInfo(infoStr , isValid);//多个
        result.isOK=true;
    }
    res.json(result);
});
/**
 * 更新字幕推送信息
 */
router.post('/removePushInfo', function(req, res) {
    var ids=req.body["ids"];
    var roomIds=req.body["roomIds"];
    var position=req.body["position"];
    var result={isOK:false,error:null };
    if(common.isBlank(ids)){
        result.error=errorMessage.code_1000;
    }else{
        chatService.removePushInfo(position,roomIds,ids);//多个
        result.isOK=true;
    }
    res.json(result);
});
/**
 * 更新文档推送信息
 */
router.post('/noticeArticle', function(req, res) {
    var articleJSON=req.body["article"];
    var opType=req.body["opType"];
    var result={isOK:false,error:null };
    if(common.isBlank(articleJSON)){
        result.error=errorMessage.code_1000;
    }else{
        chatService.noticeArticle(articleJSON , opType);
        result.isOK=true;
    }
    res.json(result);
});
/**
 * 客户晒单推送信息
 */
router.post('/showTradeNotice', function(req, res) {
    var tradeInfoJSON=req.body["tradeInfo"];
    var result={isOK:false,error:null };
    var tradeInfoArray;
    if(common.isBlank(tradeInfoJSON)){
        result.error=errorMessage.code_1000;
    }else{
        try {
            tradeInfoArray = JSON.parse(tradeInfoJSON);
        } catch (e) {
            result.error=errorMessage.code_10;
            res.json(result);
            return;
        }
        var tradeInfoResult = [],mobileArr=[],tradeInfo =null;
        for(var i = 0;i<tradeInfoArray.length;i++){
            tradeInfo = tradeInfoArray[i];
            if(tradeInfo.tradeType == 2){ //客户晒单
                mobileArr.push(tradeInfo.boUser.telephone);
            }
        }
        //通过手机号码查询客户组
        userService.getClientGroupByMId(mobileArr,tradeInfo.groupType,function(mbObj){
            for(var i = 0;i<tradeInfoArray.length;i++){
                tradeInfo = tradeInfoArray[i];
                if(tradeInfo.tradeType == 2){ //客户晒单
                    tradeInfoResult.push(tradeInfo);
                    chatPointsService.add({clientGroup:mbObj[tradeInfo.boUser.telephone],groupType: tradeInfo.groupType,groupType: tradeInfo.groupType,userId:tradeInfo.boUser.telephone, item: 'daily_showTrade', val: 0,isGlobal: false,remark: '',opUser: tradeInfo.createUser,opIp: tradeInfo.createIp},function(result){});
                }
            }
            if(tradeInfoResult.length>0){
                chatService.sendMsgToSpace(tradeInfo.groupType,"notice",{type:chatService.noticeType.showTrade,data:tradeInfoResult});
            }
        });
        result.isOK=true;
    }
    res.json(result);
});

/**
 * 更新规则提示
 */
router.post('/modifyRuleNotice', function(req, res) {
    var ruleInfo=req.body["ruleInfo"];
    var roomIds=req.body["roomIds"];
    var result={isOK:false,error:null };
    if(common.isBlank(ruleInfo)){
        result.error=errorMessage.code_1000;
    }else{
        try{
            ruleInfo=JSON.parse(ruleInfo);
        }catch (e){
            result.error=errorMessage.code_10;
            res.json(result);
            return;
        }
        roomIds=roomIds.split(",");
        for(var i in roomIds){
            chatService.sendMsgToRoom(true,null,roomIds[i],"notice",{type:"modifyRule",data:ruleInfo},null);
        }
        result.isOK=true;
    }
    res.json(result);
});
module.exports = router;
