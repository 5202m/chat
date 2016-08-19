/**
 * 页面请求控制类
 * Created by Jade.zhu on 2016/06/13.
 */
var router =  require('express').Router();
var async = require('async');//引入async
var request = require('request');
var constant = require('../../constant/constant');//引入constant
var config = require('../../resources/config');//引入config
var common = require('../../util/common');//引入common
var adminService = require('../../service/adminService.js');//引入adminService
var studioService = require('../../service/studioService');//引入studioService
var userService = require('../../service/userService');//引入userService
var baseApiService = require('../../service/baseApiService.js');//baseApiService
var messageService = require('../../service/messageService');//引入messageService
var chatService = require('../../service/chatService');//引入chatService
var logger=require('../../resources/logConf').getLogger('admin');//引入log4js

/**
 * 聊天室后台页面入口
 */
router.get('/', function(req, res) {
    var isNw = req.query['nw'];
    var viewDataObj = {isLogin:false};
    viewDataObj.isNw = isNw?isNw:false;
    viewDataObj.isDevTest=config.isDevTest;
    var adminUserInfo = req.session.adminUserInfo;
    if(adminUserInfo){
        var userId = adminUserInfo.userId;
        viewDataObj.teacher = adminUserInfo;
        async.parallel({
                chartGroup: function(callback){
                    adminService.getChatGroupListByAuthUser(userId,function(result){
                        callback(null,result);
                    });
                },
                getRooms: function(callback){
                    adminService.getChatGroupRoomsList(function(result){
                        callback(null,result);
                    });
                }
            },
            function(err, results) {
                if(results.chartGroup){
                    viewDataObj.rooms = results.chartGroup;
                }
                if(results.getRooms){
                    viewDataObj.chatGroup = results.getRooms;
                }
                viewDataObj.isLogin = true;
                res.render(global.rootdir+'/template/admin/view/index', viewDataObj);
            });
    }else{
        res.render(global.rootdir+'/template/admin/view/index', viewDataObj);
    }
});

/**
 * 聊天室房间
 */
router.get('/room',function(req, res){
    var isNw = req.query['nw'];
    var groupId = req.query['groupId'];
    var groupType = req.query['groupType'];
    var roomName = req.query['roomName'];
    var adminUserInfo = req.session.adminUserInfo;
    var viewDataObj = {apiUrl: config.pmApiUrl, filePath: config.filesDomain};
    viewDataObj.isNw = isNw?isNw:false;
    viewDataObj.roomName = roomName;
    if(adminUserInfo) {
        var userInfo={};
        common.copyObject(userInfo,adminUserInfo,true);
        userInfo.groupId = groupId;
        userInfo.groupType = groupType;
        async.parallel({
                checkResult: function(callback){
                    userService.checkSystemUserInfo(userInfo,function(result){
                        callback(null,result);
                    });
                },
                getGroup: function(callback){
                    studioService.getStudioByGroupId(groupId,function(result){
                        callback(null,result);
                    });
                }
            },
            function(err, results) {
                if(results.checkResult!=null && !results.checkResult.isOK){
                    res.render('error',{error: '您缺少访问权限，请联系管理员！'});
                }else{
                    if(results.checkResult!=null){
                        viewDataObj.userInfo = JSON.stringify(userInfo);
                        viewDataObj.groupId = groupId;
                        viewDataObj.groupType = groupType;
                    }
                    if(results.getGroup){
                        viewDataObj.groupInfo=results.getGroup.toObject();
                        viewDataObj.groupInfo.allowWhisper=common.containSplitStr(viewDataObj.groupInfo.talkStyle,1);
                    }
                    viewDataObj.nickname=userInfo.nickname;
                    viewDataObj.userType=userInfo.userType;
                    viewDataObj.socketUrl = JSON.stringify(config.socketServerUrl);
                    viewDataObj.isDevTest=config.isDevTest;
                    res.render(global.rootdir+'/template/admin/view/room', viewDataObj);
                }
         });
    }else{
        res.render('error',{error: '您未登录，请登录后访问'});
    }
});

/**
 * 添加文章/老师观点
 */
router.post('/addArticle', function(req, res){
    var adminUserInfo = req.session.adminUserInfo;
    if(adminUserInfo) {
        var data = req.body['data'];
        var isNotice = req.body['isNotice'] == "Y";
        if(common.isBlank(data)){
            res.json({isOK: false, msg: '参数错误'});
        }else{
            baseApiService.addArticle(data, function(result){
                if (result && result.isOK) {
                    var dataObj=JSON.parse(data);
                    dataObj.id = result.id;
                    dataObj.createDate = result.createDate;
                    var bDateTime=new Date(dataObj.publishStartDate).getTime();
                    var eDateTime=new Date(dataObj.publishEndDate).getTime();
                    var currTime=new Date().getTime();
                    if(isNotice || (currTime>=bDateTime && currTime<=eDateTime)){
                        chatService.sendMsgToRoom(true,null,dataObj.platform,"notice",{type:chatService.noticeType.articleInfo,data:dataObj},null);
                    }
                    res.json(result);
                }else{
                    //logger.error("addArticle->fail:"+e);
                    res.json({isOK: false, msg: '添加失败'});
                }
            });
        }
    }else{
        res.render('error',{error: '您未登录，请登录后访问'});
    }
});
/**
 * 聊天室登录页
 */
router.post('/login', function(req, res){
    var userId = req.body['userId'];
    var password = req.body['password'];
    if(common.isBlank(userId)){
        res.json({isOK:false, msg:'用户名不能为空'});
    }
    else if(common.isBlank(password)){
        res.json({isOK:false, msg:'登录密码不能为空'});
    }
    else{
        password = common.getMD5(constant.md5Key+password);
        adminService.checkSystemUserInfo(userId, password, function(result){
            if(result.isOK) {
                req.session.adminUserInfo = result;
                res.json({isOK:true, msg:''});
            }
            else{
                res.json({isOK:false, msg:'用户名或密码错误'});
            }
        });
    }
});

/**
 * 登出聊天室，使用ajax方式退出
 */
router.get('/logout', function(req, res){
    var isNw = req.query['nw'];
    req.session.adminUserInfo = null;
    res.json({isOK:true, isNw:isNw});
});

/**
 * 设置禁言
 */
router.post('/setUserGag', function(req, res){
    var data = req.body['data'];
    var isVisitor = req.body['isvisitor'];
    if(common.isBlank(data)){
        res.json({isOK:false, msg:'提交数据有误'});
    }
    else {
        if (typeof data == 'string') {
            data = JSON.parse(data);
        }
        if(isVisitor == 'true'){
            adminService.setVisitorGag(data, function(result){
                if(result){
                    if(result.isOk){
                        res.json({isOK:true, msg:''});
                    }
                    else if(result.isIn){
                        res.json({isOK:false, msg:'禁言列表已存在该用户'});
                    }
                    else{
                        res.json({isOK:false, msg:'禁言失败'});
                    }
                }
            });
        } else {
            adminService.setUserGag(data,function(result){
                if(result){
                    res.json({isOK:true, msg:''});
                }
                else{
                    res.json({isOK:false, msg:'禁言失败'});
                }
            });
        }
    }
});

/**
 * 获取已设置禁言的数据
 */
router.post('/getUserGag',function(req, res){
    var data = req.body['data'];
    if (typeof data == 'string') {
        data = JSON.parse(data);
    }
    adminService.getUserGag(data,function(result){
        if(result){
            res.json(result);
        }
        else{
            res.json(null);
        }
    });
});

/**
 * 删除聊天记录
 */
router.post('/removeMsg',function(req, res){
    var data = req.body['data'];
    if(typeof data == 'string'){
        data = JSON.parse(data);
    }
    if(!data.publishTimeArr){
        res.json(null);
    }else{
        messageService.deleteMsg(data,function(result){
            if(result){
                chatService.removeMsg(data.groupId,data.publishTimeArr.join(","));
                res.json({isOK:result});
            }else{
                res.json(null);
            }
        });
    }
});

/**
 * 更新文章/老师观点
 */
router.post('/modifyArticle', function(req, res){
    var adminUserInfo = req.session.adminUserInfo;
    if(adminUserInfo) {
        var where = req.body['where'];
        var data = req.body['data'];
        if(common.isBlank(where) || common.isBlank(data)){
            res.json({isOK: false, msg: '参数错误'});
        }
        if(typeof where == 'string'){
            where = JSON.parse(where);
        }
        if(typeof data == 'string'){
            data = JSON.parse(data);
        }
        var searchObj = {_id:where._id, detailList:{$elemMatch:{lang:where.lang}}};
        var field = "publishStartDate publishEndDate detailList.$";
        var updater = {'$set':{'publishStartDate':data.publishStartDate,
            'publishEndDate':data.publishEndDate,
            'detailList.$.title':data.title,
            'detailList.$.content':data.content}};
        baseApiService.modifyArticle(searchObj, field, updater, function(result){
            if (result) {
                res.json(result);
            }else{
                //logger.error("addArticle->fail:"+e);
                res.json({isOK: false, msg: '更新失败'});
            }
        });
    }
    else{
        res.render('error',{error: '您未登录，请登录后访问'});
    }
});

module.exports = router;
