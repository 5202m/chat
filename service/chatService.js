var common = require('../util/common');//引入common类
var constant = require('../constant/constant');//引入constant
var userService = require('../service/userService');//引入userService服务类
var messageService = require('../service/messageService');//引入messageService服务类
var logger=require('../resources/logConf').getLogger('chatService');//引入log4js
var visitorService=require('../service/visitorService');
var pushInfoService=require('../service/pushInfoService');
var chatShowTradeService = require('../service/showTradeService');
var studioService = require('../service/studioService');
var config=require('../resources/config');//资源文件
var async = require('async');//引入async
/**
 * 聊天室服务类
 * 备注：处理聊天室接受发送的所有信息及其管理
 * author Alan.wu
 */
var chatService ={
    oRoomId:'oRoomId',//自定义房间外的房间，用于房间外的socket通讯，目前只用于微解盘
    socket:null,//socket对象
    noticeType:{ //通知客户端类型
        pushInfo:'pushInfo',//推送信息
        removeMsg:'removeMsg',//移除信息
        onlineNum:'onlineNum',//在线人数
        approvalResult:'approvalResult',//审核结果
        leaveRoom:'leaveRoom',//离开房间
        serverTime:'serverTime',//服务器时间
        articleInfo:'articleInfo',//文档信息
        showTrade:'showTrade'//推送晒单信息
    },
    leaveRoomFlag:{//离开房间标志
        roomClose:'roomClose',//房间关闭或禁用或开放时间结束
        otherLogin:'otherLogin',//被相同账号登陆
        forcedOut:'forcedOut'//被管理员强制下线
    },
    /**
     * 初始化
     */
    init:function(){
        //根据配置文件初始化socket命名空间
        for(var key in config.defTemplate){
            this.setSocket(config.defTemplate[key].routeKey.replace("/",""));
        }
    },
    /**
     * 格式命名空间对应的名称
     */
    formatSpaceName:function(spaceName){
        spaceName=common.getRoomType(spaceName);//去掉多余的下划线后缀
        return "/"+spaceName;
    },
    /**
     * 通过空间与组名提取对应房间
     * @param spaceName
     * @param roomId
     * @param isFromRedis 如果是多进程数据交换则需要使用redis同步，设置为TRUE，默认为false
     * @returns {*}
     */
    getRoomSockets:function(spaceName,roomId,isFromRedis){
        spaceName=spaceName||roomId;
        return this.getSpaceSocket(spaceName,isFromRedis).in(roomId);
    },
    /**
     * 提取命名空间的socket
     * @param spaceName
     * @param isFromRedis 备注：如是外部调用socket则使用redis同步发送信息到各自socket线程
     * @returns {*}
     */
    getSpaceSocket:function(spaceName,isFromRedis){
        var socketClient=null;
        if(isFromRedis){//判断是否使用redis发送
           socketClient=require('socket.io-emitter')({ host: config.redisUrlObj.host, port: config.redisUrlObj.port});
        }else{
            socketClient=chatService.socket;
        }
        return socketClient.of(chatService.formatSpaceName(spaceName));
    },
    /**
     * 设置客户序列
     * @param userInfo
     */
    setClientSequence:function(userInfo){
        if(common.isStudio(userInfo.groupType)){
            var userType=userInfo.userType;
            if(userType && userType!=0 && userType!=-1){
                userInfo.sequence=userType;
            }else{
                var clientGroup=userInfo.clientGroup;
                if(constant.clientGroup.vip==clientGroup){
                    userInfo.sequence=10;
                }else if(constant.clientGroup.active==clientGroup){
                    userInfo.sequence=11;
                }else if(constant.clientGroup.notActive==clientGroup){
                    userInfo.sequence=12;
                }else if(constant.clientGroup.simulate==clientGroup){
                    userInfo.sequence=13;
                }else if(constant.clientGroup.register==clientGroup){
                    userInfo.sequence=14;
                }else{
                    userInfo.sequence=15;
                }
            }
        }else{
            return;
        }
    },
    /**
     * 设置在线用户人数
     * @param userInfo
     * @param isAdd
     * @param serverSocketId
     */
    setRoomOnlineUser:function(userInfo,isAdd,serverSocketId,callback){
        this.getRoomOnlineUser(userInfo.groupId,function(roomUserArr){
            if(isAdd){
                if(!roomUserArr){
                    roomUserArr={};
                }
                var cacheUserInfo={
                    clientGroup:userInfo.clientGroup,
                    isMobile:userInfo.isMobile,
                    avatar:userInfo.avatar,
                    nickname:userInfo.nickname,
                    socketId:userInfo.socketId,
                    userId:userInfo.userId,
                    sequence:userInfo.sequence,
                    userType:userInfo.userType
                };
                if(roomUserArr.hasOwnProperty(userInfo.userId)){
                    var oldUserInfo=roomUserArr[userInfo.userId];
                    if(oldUserInfo.socketId && oldUserInfo.socketId!=userInfo.socketId){//如果存在旧的在线记录，通知旧的socket离开房间或登出
                        cacheUserInfo.prevSocketId=oldUserInfo.socketId;
                        chatService.leaveRoomBySocketId(userInfo.groupType,oldUserInfo.socketId,chatService.leaveRoomFlag.otherLogin);
                    }
                }
                roomUserArr[cacheUserInfo.userId]=cacheUserInfo;
                chatService.setRoomOnlineUserStore(userInfo.groupId,roomUserArr);
                callback(roomUserArr);
            }else{
                var isRemove=false,noticeClient=true;
                if(roomUserArr){
                    if(roomUserArr.hasOwnProperty(userInfo.userId) && userInfo.socketId){
                        var tmpUserInfo=roomUserArr[userInfo.userId];
                        if(userInfo.socketId==tmpUserInfo.socketId ||!tmpUserInfo.prevSocketId){//socketId一致则直接断线或者不存在旧的socketId(被相同账号挤出的情况)
                            delete roomUserArr[userInfo.userId];
                            isRemove=true;
                            chatService.setRoomOnlineUserStore(userInfo.groupId,roomUserArr);
                        }
                        if(tmpUserInfo.prevSocketId){
                            noticeClient=false;
                        }
                    }else{
                        if(serverSocketId){//服务端监控对应socketId下线，则同步更新在线用户的缓存数据
                            for(var k in roomUserArr){
                                if(serverSocketId==roomUserArr[k].socketId){
                                    delete roomUserArr[k];
                                    chatService.setRoomOnlineUserStore(userInfo.groupId,roomUserArr);
                                    break;
                                }
                            }
                        }
                    }
                    //!chatService.getRoomSockets(userInfo.groupType,userInfo.groupId,false).connected.hasOwnProperty(userInfo.socketId)
                }else{
                    isRemove=true;
                }
                callback(isRemove,noticeClient);
            }
        });
    },
    /**
     * 设置房间在线用户存储
     * @param groupId
     * @param roomUserArr
     */
    setRoomOnlineUserStore:function(groupId,roomUserArr){
        global.memored.store("onlineUser_"+groupId,roomUserArr,function(err){
            if(err){
                logger.error("setRoomOnlineUser[memored.store]->err:"+err);
            }
        });
    },
    /**
     * 提取房间在线用户
     * @param roomId 房间Id
     * @param callback
     */
    getRoomOnlineUser:function(roomId,callback){
        global.memored.read("onlineUser_"+roomId, function(err, roomUserArr) {
            if(err){
                logger.error("getRoomOnlineUser[memored.read]->err:"+err);
                callback(null);
            }else{
                callback(roomUserArr);
            }
        });
    },

    /**
     * 清除缓存数据及强制离线，清除缓存的在线线用户
     * @param callback
     */
    clearAllData:function(callback){
        //更新缓存在线用户状态改成下线
        global.memored.keys(function(err, keys) {
            if(err){
                logger.error("clearAllData has error!",err);
                callback(true);
                return;
            }
            async.each(keys, function (key, callbackTmp) {
                if(key.indexOf("onlineUser_")!=-1){
                    var roomId=key.replace("onlineUser_","");
                    visitorService.batchUpdateStatus(roomId);//更新访客记录状态
                    userService.batchOfflineStatus(roomId);
                }else{
                    callbackTmp(null);
                }
            }, function (err) {
                if(err){
                    logger.error("clearAllData has error!",err);
                }
                global.memored.clean(function() {//移除所有缓存记录
                    logger.info('All cache entries have been deleted.');
                });
                callback(true);
            });
        });
    },
    /**
     * 提取房间在线总人数
     * @param groupId
     * @param callback
     */
    getRoomOnlineTotalNum:function(groupId,callback){
        this.getRoomOnlineUser(groupId,function(roomUserArr){
            callback(roomUserArr?Object.getOwnPropertyNames(roomUserArr).length:0);
        });
    },
    /***
     * 移除缓存的房间
     * 备注：房间被禁用
     * @param roomId
     */
    removeCacheRoom:function(roomId){
        var groupType=common.getRoomType(roomId);
        global.memored.remove(("onlineNum_"+groupType+"_"+roomId),function(){});//移除统计在线人数的房间
        global.memored.remove(("onlineUser_"+roomId),function(){});//移除在线人的房间
    },
    /**
     * 显示socket对应的session
     * @param socket
     * 备注：如启用了socketIO与session绑定，则可以调用该方法提取session数据
     */
    showSocketSession:function(socket){
        if(socket.handshake && socket.handshake.sessionStore){
            socket.handshake.sessionStore.get(socket.handshake.sessionID, function(err, data) {
                logger.info('handshake=>data:'+JSON.stringify(data));
            });
        }
    },
    /**
     * 设置socket连接相关信息
     * @param spaceName 命名空间对应的名称
     */
    setSocket: function (spaceName) {
        //连接socket，并处理相关操作
        var spaceObj=this.getSpaceSocket(spaceName,false);
        //该注释代码用于与socketIO与session绑定，暂未启用
         /*var chatSession=require('../routes/chatSession');
         if(chatSession.session){//绑定session
             var sharedSession = require("express-socket.io-session");
             spaceObj.use(sharedSession(chatSession.session, {
                  autoSave: false
             }));
         }*/
        spaceObj.on('connection', function(socket){
            //登录则加入房间,groupId作为唯一的房间号
            socket.on('login',function(data,webUserAgent){
                var userAgent=webUserAgent?webUserAgent:socket.client.request.headers["user-agent"];
                var userInfo=data.userInfo,lastPublishTime=data.lastPublishTime, allowWhisper = data.allowWhisper,fUserTypeStr=data.fUserTypeStr;
                userInfo.isMobile=common.isMobile(userAgent);
                var fromPlatform = data.fromPlatform;
                if(common.isBlank(userInfo.groupType)){
                    return false;
                }
                //设置客户序列
                chatService.setClientSequence(userInfo);
                //加载用户列表数据
                chatService.setRoomOnlineUser(userInfo,true,null,function(roomUserArr){
                    var newUserArr=[],onlineUserObj=null,visitorNum=0;
                    var sysArr=[],notActiveArr=[],activeArr=[],simulateArr=[],vipArr=[],registerArr=[],visitorArr=[];
                    for(var i in roomUserArr){
                        onlineUserObj=roomUserArr[i];
                        if(onlineUserObj.userId==userInfo.userId){
                            newUserArr.push(onlineUserObj);
                            continue;
                        }
                        if(onlineUserObj.userType>0){
                            sysArr.push(onlineUserObj);
                            continue;
                        }
                        if(onlineUserObj.clientGroup == constant.clientGroup.vip){
                            vipArr.push(onlineUserObj);
                        }else if(onlineUserObj.clientGroup == constant.clientGroup.active) {
                            activeArr.push(onlineUserObj);
                        }else if(onlineUserObj.clientGroup == constant.clientGroup.notActive) {
                            notActiveArr.push(onlineUserObj);
                        }else if(onlineUserObj.clientGroup == constant.clientGroup.simulate) {
                            simulateArr.push(onlineUserObj);
                        }else if(onlineUserObj.clientGroup == constant.clientGroup.register) {
                            registerArr.push(onlineUserObj);
                        }else{
                            visitorArr.push(onlineUserObj);
                            visitorNum++;//取出真实游客数量
                        }
                    }
                    sysArr.sort(common.arraySort("userType",true));
                    newUserArr=newUserArr.concat(sysArr,vipArr,activeArr,notActiveArr,simulateArr,registerArr,visitorArr);
                    socket.emit('onlineUserList',newUserArr,newUserArr.length,visitorNum);//给自己加载所有在线用户
                });
                //加载已有内容
                messageService.loadMsg(userInfo,lastPublishTime,false,function(msgData){
                    //同步数据到客户端
                    socket.emit('loadMsg', {msgData:msgData,isAdd:common.isValid(lastPublishTime)?true:false});
                });
                //更新在线状态
                userInfo.onlineStatus=1;
                userInfo.onlineDate=new Date();
                socket.userInfo=userInfo;//缓存用户信息
                userService.updateMemberInfo(userInfo,function(sendMsgCount,dbMobile,offlineDate){
                    socket.userInfo.sendMsgCount=sendMsgCount;
                    socket.join(userInfo.groupId);
                    //通知客户端在线人数
                    if(common.isStudio(userInfo.groupType)){//如果是直播间网页版聊天室,则追加在线用户的输出
                        //广播自己的在线信息
                        socket.broadcast.to(userInfo.groupId).emit('notice',{type:chatService.noticeType.onlineNum,data:{onlineUserInfo:userInfo,online:true}});
                        //直播间创建访客记录
                        if(parseInt(userInfo.userType)<=constant.roleUserType.member){
                            var vrRow={userAgent:userAgent,platform:fromPlatform,visitorId:userInfo.visitorId,groupType:userInfo.groupType,roomId:userInfo.groupId,nickname:userInfo.nickname,clientGroup:userInfo.clientGroup,clientStoreId:userInfo.clientStoreId,ip:socket.handshake.address};
                            if(userInfo.clientGroup!=constant.clientGroup.visitor){
                                vrRow.mobile=dbMobile;
                                vrRow.userId=userInfo.userId;
                                vrRow.loginStatus=1;
                            }
                            visitorService.saveVisitorRecord('online',vrRow);
                        }
                        //加载私聊离线信息提示
                        if(allowWhisper && offlineDate && common.isValid(fUserTypeStr)){
                            messageService.getWhUseMsgCount(userInfo.groupType,userInfo.groupId,userInfo.userType,fUserTypeStr.split(","),userInfo.userId,offlineDate, function(whUserData){
                                if(whUserData && Object.getOwnPropertyNames(whUserData).length>0){
                                    socket.emit('loadWhMsg',{type:'offline',data:whUserData});
                                }
                            });
                        }
                        //允许私聊,推送私聊信息
                        if(allowWhisper){
                            pushInfoService.checkPushInfo(userInfo.groupType,userInfo.groupId,userInfo.clientGroup,constant.pushInfoPosition.whBox,true,function(pushInfos){
                                 if(pushInfos && pushInfos.length > 0){
                                     var pushInfo = null,  noticeInfo={type:chatService.noticeType.pushInfo,data:{position:constant.pushInfoPosition.whBox, infos : []}};
                                     for(var i = 0, len = pushInfos.length; i < len; i++){
                                         pushInfo = pushInfos[i];
                                         noticeInfo.data.infos.push({serverTime:new Date().getTime(),publishTime:((new Date().getTime()+pushInfo.onlineMin*60*1000)+"_"+process.hrtime()[1]),contentId:pushInfo._id,timeOut:pushInfo.onlineMin,content:pushInfo.content});
                                     }
                                     if(pushInfo.replyRepeat==0){
                                         messageService.existRecord({"toUser.talkStyle": 1,"toUser.userType":3,"toUser.questionId":pushInfo._id},function(hasRecord){
                                             if(!hasRecord){
                                                 socket.emit('notice',noticeInfo);
                                             }
                                         });
                                     }else{
                                         socket.emit('notice',noticeInfo);
                                     }
                                 }
                            });
                        }
                        //公聊框推送
                        pushInfoService.checkPushInfo(userInfo.groupType,userInfo.groupId,userInfo.clientGroup,constant.pushInfoPosition.talkBox, false,function(pushInfos){
                            if(pushInfos && pushInfos.length > 0){
                                var pushInfo = null, noticeInfo = {type:chatService.noticeType.pushInfo, data:{position:constant.pushInfoPosition.talkBox, infos : []}};
                                for(var i = 0, lenI = pushInfos.length; i < lenI; i++){
                                    pushInfo = pushInfos[i];
                                    noticeInfo.data.infos.push({serverTime:new Date().getTime(),contentId:pushInfo._id, pushDate:pushInfo.pushDate, intervalMin:pushInfo.intervalMin, onlineMin:pushInfo.onlineMin,content:pushInfo.content});
                                }
                                socket.emit('notice',noticeInfo);
                            }
                        });
                        //视频框推送
                        pushInfoService.checkPushInfo(userInfo.groupType,userInfo.groupId,userInfo.clientGroup,constant.pushInfoPosition.videoBox, true,function(pushInfos){
                            if(pushInfos && pushInfos.length > 0){
                                var pushInfo = null, noticeInfo = {type:chatService.noticeType.pushInfo, data:{position:constant.pushInfoPosition.videoBox, infos : []}};
                                for(var i = 0, lenI = pushInfos.length; i < lenI; i++){
                                    pushInfo = pushInfos[i];
                                    noticeInfo.data.infos.push({contentId:pushInfo._id,title: pushInfo.title, pushDate:pushInfo.pushDate,pushType: pushInfo.pushType,clientGroup: pushInfo.clientGroup, intervalMin:pushInfo.intervalMin, onlineMin:pushInfo.onlineMin,content:pushInfo.content,url:pushInfo.url});
                                }
                                socket.emit('notice',noticeInfo);
                            }
                        });
                    }
                });
                //服务器时间
                socket.emit('notice',{type:chatService.noticeType.serverTime, data:new Date().getTime()});
            });
            //断开连接
            socket.on('disconnect',function(data){
                var userInfo=socket.userInfo;
                if(userInfo){ //移除在线用户,客户端断线处理逻辑
                    chatService.setRoomOnlineUser(userInfo,false,null,function(isRemove,noticeClient){//移除缓存在线用户
                        userService.removeOnlineUser(userInfo,isRemove,function(){
                            var logRemoveTip="disconnect";
                            if(!isRemove){
                                logRemoveTip="otherLogin";
                            }
                            //通知客户端在线人数
                            if(isRemove && noticeClient){
                                socket.broadcast.to(userInfo.groupId).emit('notice',{type:chatService.noticeType.onlineNum,data:{onlineUserInfo:userInfo,online:false}});
                            }
                            //直播间记录离线数据
                            visitorService.saveVisitorRecord('offline',{roomId:userInfo.groupId,groupType:userInfo.groupType,clientStoreId:userInfo.clientStoreId});
                            socket.leave(userInfo.groupId);
                            if(socket){
                                delete socket;
                            }
                            logger.info('setSocket['+logRemoveTip+']=>client['+(userInfo.accountNo||userInfo.userId)+'] disconnect!');
                        });
                    });
                }else{//监听从服务端断开的客户socket连接
                    if(socket.nsp) {
                        /*try{
                            var nspRooms=socket.nsp.adapter.rooms;
                            if(socket.id && nspRooms) {
                                for(var rmKey in nspRooms){
                                    if(common.isStudio(rmKey)){
                                        //移除从服务端断开的客户socket连接
                                        chatService.setRoomOnlineUser({groupId:rmKey}, false, socket.id);
                                        break;
                                    }
                                }
                            }
                        }catch(e){
                            logger.error('disconnect server nspRooms fail!');
                        }*/
                        logger.error('setSocket[disconnect]=>server disconnect,please check!');
                    }
                }
            });
            //审核信息
            socket.on('approvalMsg',function(data){
                chatService.approvalMsg(data,socket);
            });
            //信息传输
            socket.on('sendMsg',function(data){
                chatService.acceptMsg(data,socket);
            });
            //提取私聊信息
            socket.on('getWhMsg',function(userInfo){
                messageService.loadMsg(userInfo,null,true, function(result){
                    if(result && result.length>0){
                        socket.emit('loadWhMsg',{type:'online',data:result,toUserId:userInfo.toUser.userId});
                    }
                });
            });
            //提取服务器时间
            socket.on('serverTime',function(){
                socket.emit('notice',{type:chatService.noticeType.serverTime, data:new Date().getTime()});
            });
        });
    },
    /**
     * 审核信息
     */
    approvalMsg:function(data,socket){
        messageService.updateMsgStatus(data,function(msgResult){
            var fromUser=data.fromUser;
            if(msgResult) {//通过则通知客户端
                //通知相同组别的会员
                if(msgResult.status==1){//通过则通知相同组别的会员,如果是聊天室发送过来的，排除自己，如果是聊天记录直接审核的，则发给全部用户
                    if(socket){
                        socket.broadcast.to(fromUser.groupId).emit('notice',{type:chatService.noticeType.approvalResult,data:msgResult.data});
                    }else{
                        chatService.sendMsgToRoom(true,fromUser.groupId,"notice",{type:chatService.noticeType.approvalResult,data:msgResult.data});
                    }
                }else{//拒绝则通知审核角色，信息已经拒绝
                    var userNoArr=msgResult.data;
                    //发送给审核角色，更新记录状态(备注，如果是审核员在聊天室审核的，则排除自己，因为后面会统一处理)
                    logger.info("approvalMsg->userNoStr:"+userNoArr.join(","));
                    var socketId=socket?socket.id:null;
                    chatService.sendMsgToUserArr(socket?false:true,fromUser,userNoArr,socketId,'notice',{type:chatService.noticeType.approvalResult,data:{refuseMsg:true,publishTimeArr:data.publishTimeArr}});
                }
            }
            //通知审核者，已经审核
            if(socket){
                socket.emit('notice', {
                    type: chatService.noticeType.approvalResult,
                    data: {fromUserId: data.fromUser.userId, isOK: (msgResult?true:false), publishTimeArr: data.publishTimeArr,status:data.status}
                });
            }
        })
    },
    /**
     * 接收信息数据
     */
    acceptMsg:function(data,socket){
        var userInfo=data.fromUser,groupId=userInfo.groupId;
        //如果首次发言需要登录验证(备注：微信取openId为userId，即验证openId）
        var toUser=userInfo.toUser,isWh=toUser && common.isValid(toUser.userId) && "1"==toUser.talkStyle;//私聊
        //如果是私聊游客或水军发言直接保存数据
        var isWhVisitor=(isWh && constant.clientGroup.visitor==userInfo.clientGroup);
        var isAllowPass=isWhVisitor||userInfo.userType==constant.roleUserType.navy||(common.isStudio(userInfo.groupType) && constant.clientGroup.visitor==userInfo.clientGroup);
        userService.checkUserLogin(userInfo,isAllowPass,function(row){
            if(row){
                var userSaveInfo={};
                if(!isAllowPass){
                    var tipResult=userService.checkUserGag(row, userInfo.groupId);//检查用户禁言
                    if(!tipResult.isOK){//是否设置了用户禁言
                        chatService.sendMsgToSelf(socket,userInfo,{fromUser:userInfo,uiId:data.uiId,value:tipResult,rule:true});
                        return false;
                    }
                    userSaveInfo=row.loginPlatform.chatUserGroup[0].toObject();//用于信息保存
                    if(userSaveInfo.vipUser){
                        userSaveInfo.clientGroup = "vip";
                    }
                    userSaveInfo.mobilePhone=row.mobilePhone;
                    if(userSaveInfo.nickname){
                        userInfo.nickname=userSaveInfo.nickname;//如果后台设置了昵称则更新为后台
                    }

                    userSaveInfo.userType=userInfo.userType=userSaveInfo.userType||userInfo.userType;
                }else{
                    userSaveInfo.userType=isWhVisitor?constant.roleUserType.visitor:userInfo.userType;
                    userSaveInfo.nickname= userInfo.nickname;
                    userSaveInfo.accountNo=userInfo.accountNo;
                }
                var currentDate = new Date();
                userInfo.publishTime = currentDate.getTime()+"_"+process.hrtime()[1];//产生唯一的id
                userSaveInfo.groupType=userSaveInfo._id||userInfo.groupType;
                userSaveInfo.position=userInfo.position;
                userSaveInfo.avatar=userInfo.avatar;
                userSaveInfo.groupId=userInfo.groupId;
                userSaveInfo.publishTime=userInfo.publishTime;
                userSaveInfo.userId=userInfo.userId;
                userSaveInfo.toUser=userInfo.toUser;
                //验证规则
                userService.verifyRule(userInfo.clientGroup,userInfo.nickname, isWh,userInfo.userType,groupId,data.content,function(resultVal){
                    if(!resultVal.isOK){//匹配规则，则按规则逻辑提示
                        logger.info('acceptMsg=>resultVal:'+JSON.stringify(resultVal));
                        //通知自己的客户端
                        chatService.sendMsgToSelf(socket,userInfo,{fromUser:userInfo,uiId:data.uiId,value:resultVal,rule:true});
                        //如果会员发送内容需要审核，把内容转个审核人审核
                        if(resultVal.needApproval && constant.roleUserType.member==userInfo.userType){
                            //检查哪些人可以审核聊天内容
                            userService.getAuthUsersByGroupId(groupId, function(userNos){
                                if(userNos){
                                    data.content.status=0;//设为等待审批
                                    messageService.saveMsg({fromUser:userSaveInfo,content:data.content},userNos);//保存聊天数据
                                    if(socket){//统计发言总数
                                        socket.userInfo.sendMsgCount+=1
                                    }
                                    //发送信息给审核人
                                    chatService.sendMsgToUserArr(socket?false:true,userInfo,userNos,null,'sendMsg',{fromUser: userInfo, content: data.content});
                                }else{
                                    console.log('后台聊天内容审核用户权限配置有误，请检查！');
                                }
                            });
                        }
                    } else{
                        //没有定义审核规则，无需审核
                        data.content.status=1;//设为通过
                        //私聊权限逻辑判断
                        if(isWh && (!common.containSplitStr(resultVal.talkStyle,toUser.talkStyle)||(constant.roleUserType.member<parseInt(userInfo.userType) && !common.containSplitStr(resultVal.whisperRoles,userInfo.userType))||
                                    (constant.roleUserType.member>=parseInt(userInfo.userType) && !common.containSplitStr(resultVal.whisperRoles,toUser.userType)))){
                            //通知自己的客户端
                            chatService.sendMsgToSelf(socket,userInfo,{fromUser:userInfo,uiId:data.uiId,value:{tip:'你或对方没有私聊权限'},rule:true});
                            return false;
                        }
                        //发送给自己
                        var myMsg = {uiId:data.uiId,fromUser:userInfo,serverSuccess:true,content:{msgType:data.content.msgType,needMax:data.content.needMax}};
                        if(resultVal.tip){
                            myMsg.rule = true;
                            myMsg.value = resultVal;
                        }
                        chatService.sendMsgToSelf(socket,userInfo,myMsg);
                        var imgMaxValue=data.content.maxValue;
                        //发送给除自己之外的用户
                        if(isWh){//私聊
                            data.content.maxValue="";
                            chatService.sendMsgToUser(socket?false:true,userInfo.groupType,groupId,toUser.userId,{fromUser:userInfo,content:data.content},function(isOnline){
                                data.content.msgStatus=isOnline?1:0;//判断信息是否离线或在线
                                data.content.maxValue=imgMaxValue;
                                messageService.saveMsg({fromUser: userSaveInfo, content: data.content});
                            });
                        }else{
                            messageService.saveMsg({fromUser: userSaveInfo, content: data.content});
                            data.content.maxValue="";
                            if(socket) {
                                socket.to(groupId).emit('sendMsg', {fromUser:userInfo,content:data.content});
                            }else{//如果是外部发送信息，即socket不存在，比如发送图片，直接使用sendMsgToRoom方法
                                chatService.sendMsgToRoom(true,userInfo.groupType,groupId,'sendMsg',{fromUser:userInfo,content:data.content},null);
                            }
                        }
                        if(socket) {
                            socket.userInfo.sendMsgCount += 1;//统计发言数据
                        }
                    }
                });
            }else{
                //通知自己的客户端
                chatService.sendMsgToSelf(socket,userInfo,{isVisitor:true,uiId:data.uiId});
            }
        });
    },
    /**
     * 移除数据
     * @param groupId
     * @param msgIds
     */
    removeMsg:function(groupId,msgIds){
        chatService.sendMsgToRoom(true,null,groupId,"notice",{type:chatService.noticeType.removeMsg,data:msgIds});
    },

    /**
     * 删除字幕推送信息
     * @param groupId
     * @param msgIds
     */
    removePushInfo:function(position,groupIds ,ids){
        try{
            var groupIds = groupIds.split('|');
            if(groupIds.length>0) {
                var obj=null;
                for(var i=0;i<groupIds.length;i++) {
                    obj=groupIds[i].split(",");
                    for(var j=0;j<obj.length;j++) {
                        chatService.sendMsgToRoom(true, null, obj[j], "notice", {
                            type: chatService.noticeType.pushInfo,
                            data:{position:position,ids: ids.split('|')[i],delete:true}
                        });
                    }
                }
            }
        }catch(e){
            logger.error("removePushInfo fail",e);
        }
    },
    /**
     * 新增或修改字幕,需要查询数据
     * @param ids
     */
    submitPushInfo:function(infoStr , isValid){
        try{
            var obj=JSON.parse(infoStr);
            obj.isValid=isValid;
            obj.edit=true;
            var rmIds=obj.roomIds;
            for(var i in rmIds ){
                chatService.sendMsgToRoom(true,null,rmIds[i],"notice",{type:chatService.noticeType.pushInfo,data:obj});
            }
        }catch(e){
            logger.error("submitPushInfo fail",e);
        }

    },
    /**
     * 通知文档数据
     * @param articleJSON
     * @param opType
     */
    noticeArticle:function(articleJSON, opType){
        try{
            var article = JSON.parse(articleJSON);
            if(article && article.platform){
                article.position = 5;//课堂笔记
                article.opType   = opType;//操作类型
                var rmIds = article.platform.split(",");
                for(var i in rmIds ){
                    chatService.sendMsgToRoom(true,null,rmIds[i],"notice",{type:chatService.noticeType.articleInfo,data:article});
                }
            }
        }catch(e){
            logger.error("noticeArticle fail",e);
        }

    },
    /**
     * 离开房间(房间关闭）
     * @param groupIds
     * @param flag
     */
    leaveRoom:function(groupIds,flag){
        var groupIdArr=groupIds.split(","),groupId='';
        for(var i in groupIdArr){
            groupId=groupIdArr[i];
            chatService.sendMsgToRoom(true,null,groupId,"notice",{type:chatService.noticeType.leaveRoom,flag:flag});
            chatService.removeCacheRoom(groupId);
        }
    },
    /**
     * 根据socketId离开房间
     * @param groupType
     * @param socketId
     * @param flag
     */
    leaveRoomBySocketId:function(groupType,socketId,flag){
        chatService.getSpaceSocket(groupType,false).to(socketId).emit('notice',{type:chatService.noticeType.leaveRoom,flag:flag});
    },
    /**
     * 根据userId离开房间
     * @param roomIds 若干房间
     * @param userIds 若干用户
     * @param flag
     */
    leaveRoomByUserId:function(roomIds,userIds,flag){
        if(common.isBlank(roomIds)||common.isBlank(userIds)){
            logger.error("leaveRoomByUserId=>userId is null");
            return;
        }
        var roomIdArr=roomIds.split(","),groupType='';
        for(var i in roomIdArr){
            groupType=common.getRoomType(roomIdArr[i]);
            chatService.sendMsgToUserArr(true,{groupType:groupType,groupId:roomIdArr[i]},userIds.split(','),null,'notice',{type:chatService.noticeType.leaveRoom,flag:flag});
        }
    },
    /**
     * 发送信息到房间
     * @param isFromRedis
     * @param groupType 房间类别
     * @param roomId 房间id
     * @param eventKey 事件关键字
     * @param data 发送的内容
     * @param  excludeUserId 排除用户
     */
    sendMsgToRoom:function(isFromRedis,groupType,roomId,eventKey,data,excludeUserId){
        if(excludeUserId){
            this.getRoomOnlineUser(roomId,function(roomUserArr){
                var userInfoTmp=null,space=chatService.getSpaceSocket(groupType,isFromRedis);
                for(var i in roomUserArr){
                    userInfoTmp = roomUserArr[i];
                    if(userInfoTmp.userId!=excludeUserId){
                        space.to(userInfoTmp.socketId).emit(eventKey,data);
                    }
                }
            });
        }else{
            chatService.getRoomSockets(null,roomId,isFromRedis).emit(eventKey,data);
        }
    },
    /**
     * 发送信息到命名空间
     * @param isFromRedis
     * @param groupType 房间类别
     * @param roomId 房间id
     * @param eventKey 事件关键字
     * @param data 发送的内容
     * @param  excludeUserId 排除用户
     */
    sendMsgToSpace:function(groupType,eventKey,data){
        chatService.getSpaceSocket(groupType,true).emit(eventKey,data);
    },
    /**
     * 发送给对应的用户组
     * @param isFromRedis
     * @param userInfo
     * @param userNoArr
     * @param eventKey
     * @param excludeSocketId 要排除的socketId
     * @param data
     */
    sendMsgToUserArr:function(isFromRedis,userInfo,userNoArr,excludeSocketId,eventKey,data){
        this.getRoomOnlineUser(userInfo.groupId,function(roomUserArr){
            logger.info("sendMsgToUserArr=>userNoStr:"+userNoArr.join(","));
            var userInfoTmp=null,space=chatService.getSpaceSocket(userInfo.groupType,isFromRedis);
            var isForce=false;
            var toUserIdArr=[];
            for(var j in userNoArr){
                for(var userId in roomUserArr){
                    userInfoTmp = roomUserArr[userId];
                    if(userInfoTmp && userInfoTmp.socketId && userId == userNoArr[j] && userInfoTmp.socketId!=excludeSocketId){
                        if(chatService.leaveRoomFlag.forcedOut==data.flag) {
                            toUserIdArr.push(userId);
                            delete roomUserArr[userId];
                            isForce=true;
                        }else{
                            space.to(userInfoTmp.socketId).emit(eventKey,data);
                        }
                        break;
                    }
                }
            }
            if(isForce){
                data.userIds=toUserIdArr;
                chatService.sendMsgToRoom(true,null,userInfo.groupId,eventKey,data);
                chatService.setRoomOnlineUserStore(userInfo.groupId,roomUserArr);
            }
        });
    },
    /**
     * 发送给对应的用户
     * @param isFromRedis
     * @param groupType
     * @param groupId
     * @param toUserId
     * @param data
     */
    sendMsgToUser:function(isFromRedis,groupType,groupId,toUserId,data,callback){
        this.getRoomOnlineUser(groupId,function(roomUserArr){
            var userInfoTmp=null,space=chatService.getSpaceSocket(groupType,isFromRedis),online=false;
            for(var i in roomUserArr){
                userInfoTmp = roomUserArr[i];
                if(userInfoTmp.userId==toUserId){
                    space.to(userInfoTmp.socketId).emit('sendMsg',data);
                    online=true;
                    break;
                }
            }
            if(callback){
                callback(online);
            }
        });
    },
    /**
     * 发送给自己
     * @param data
     */
    sendMsgToSelf:function(socket,userInfo,data){
        if(socket){
            socket.emit('sendMsg',data);
        }else{
            if(common.isValid(userInfo.socketId)){
                chatService.getSpaceSocket(userInfo.groupType,true).to(userInfo.socketId).emit('sendMsg',data);
            }else{
                logger.error("userInfo->socketId null,please check!");
            }
        }
    }
};
//导出服务类
module.exports =chatService;

