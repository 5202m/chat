var common = require('../util/common');//引入common类
var constant = require('../constant/constant');//引入constant
var userService = require('../service/userService');//引入userService服务类
var messageService = require('../service/messageService');//引入messageService服务类
var logger=require('../resources/logConf').getLogger('chatService');//引入log4js
var config=require('../resources/config');//资源文件
var async = require('async');//引入async
/**
 * 聊天室服务类
 * 备注：处理聊天室接受发送的所有信息及其管理
 * author Alan.wu
 */
var chatService ={
    oRoomId:'oRoomId',//自定义房间外的房间，用于房间外的socket通讯，目前只用于微解盘
    socketSpaceArr:["wechat","studio"],//组空间,与房间大类groupType保持一致
    socket:null,//socket对象
    noticeType:{ //通知客户端类型
        removeMsg:'removeMsg',//移除信息
        onlineNum:'onlineNum',//在线人数
        approvalResult:'approvalResult',//审核结果
        leaveRoom:'leaveRoom'//离开房间
    },
    leaveRoomFlag:{//离开房间标志
        roomClose:'roomClose',//房间关闭或禁用或开放时间结束
        otherLogin:'otherLogin'//被相同账号登陆
    },
    /**
     * 初始化
     */
    init:function(){
        for(var i in this.socketSpaceArr){
            this.setSocket(this.socketSpaceArr[i]);
        }
    },
    /**
     * 格式命名空间对应的名称
     */
    formatSpaceName:function(spaceName){
        spaceName=spaceName.replace(/_+.*/g,"");//去掉多余的下划线后缀
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
        return this.getSpaceSocket(spaceName,isFromRedis).of(this.formatSpaceName(spaceName)).in(roomId);
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
        if(constant.fromPlatform.studio==userInfo.groupType){
            var userType=userInfo.userType;
            if(userType && userType!=0){
                userInfo.sequence=userType;
            }else{
                var clientGroup=userInfo.clientGroup;
                if(constant.clientGroup.vip==clientGroup){
                    userInfo.sequence=10;
                }else if(constant.clientGroup.real==clientGroup){
                    userInfo.sequence=11;
                }else if(constant.clientGroup.simulate==clientGroup){
                    userInfo.sequence=12;
                }else if(constant.clientGroup.register==clientGroup){
                    userInfo.sequence=13;
                }else{
                    userInfo.sequence=14;
                }
            }
        }else{
            return;
        }
    },
    /**
     * 设置在线用户人数
     * @param socket
     * @param groupId
     */
    setRoomOnlineUser:function(userInfo,isAdd,callback){
        this.getRoomOnlineUser(userInfo.groupId,function(roomUserArr){
            if(isAdd){
                if(!roomUserArr){
                    roomUserArr={};
                }
                if(roomUserArr.hasOwnProperty(userInfo.userId)){
                    var oldUserInfo=roomUserArr[userInfo.userId];
                    if(oldUserInfo.socketId && oldUserInfo.socketId!=userInfo.socketId){//如果存在旧的在线记录，通知旧的socket离开房间或登出
                        chatService.leaveRoomBySocketId(oldUserInfo.groupType,oldUserInfo.socketId,chatService.leaveRoomFlag.otherLogin);
                    }
                }
                roomUserArr[userInfo.userId]=userInfo;
                global.memored.store("onlineUser_"+userInfo.groupId,roomUserArr,function(err){
                    if(err){
                        logger.error("getRoomOnlineUser[memored.store]->err:"+err);
                    }
                });
                callback(roomUserArr);
            }else{
                var isRemove=false;
                if(roomUserArr){
                    if(userInfo.socketId && roomUserArr.hasOwnProperty(userInfo.userId) && userInfo.socketId==roomUserArr[userInfo.userId].socketId){
                        delete roomUserArr[userInfo.userId];
                        isRemove=true;
                    }
                    global.memored.store("onlineUser_"+userInfo.groupId,roomUserArr,function(err){
                        if(err){
                            logger.error("getRoomOnlineUser[memored.store]->err:"+err);
                        }
                    });
                }else{
                    isRemove=true;
                }
                callback(isRemove);
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
     * 设置在线人数
     * @param groupType
     * @param groupId
     * @param isAdd
     * @param callback
     */
    setRoomOnlineNum:function(groupType,groupId,isAdd,callback){
        this.getRoomOnlineNum(groupType,groupId,function(val){
            var unitVal=isAdd?1: -1;
            if(!val){
                val=0;
            }
            val+=unitVal;
            val=val<0?0:val;
            global.memored.store(("onlineNum_"+groupType+"_"+groupId),val,function(err){
                if(err){
                    logger.error("setRoomOnlineNum[memored.store]->err:"+err);
                }
                callback(val);
            });
        });
    },
    /**
     * 提取房间在线人数
     * @param groupType 房间大类
     * @param groupId
     * @param callback
     */
    getRoomOnlineNum:function(groupType,groupId,callback){
        global.memored.read(("onlineNum_"+groupType+"_"+groupId), function(err, val) {
            if(err){
                logger.error("getRoomOnlineNum[memored.read]->err:"+err);
                callback(0);
            }else{
                callback(val?val:0);
            }
        });
    },
    /***
     * 移除缓存的房间
     * 备注：房间被禁用
     * @param roomId
     */
    removeCacheRoom:function(roomId){
        var groupType=roomId.replace(/_+.*/g,"");
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
     * 提取房间外的id
     * @param groupType
     * @returns {string}
     */
    getOutRoomId:function(groupType){
        return groupType+"_"+chatService.oRoomId;
    },
    /**
     * 设置socket连接相关信息
     * @param spaceName 命名空间对应的名称
     */
    setSocket: function (spaceName) {
        console.log("spaceName:"+spaceName);
        //连接socket，并处理相关操作
        var spaceObj=this.getSpaceSocket(spaceName,false);
        ///该注释代码用于与socketIO与session绑定，暂未启用
        /*var chatSession=require('../routes/chatSession');
         if(chatSession.session){//绑定session
         var sharedSession = require("express-socket.io-session");
         spaceObj.use(sharedSession(chatSession.session, {
         autoSave: false
         }));
         }*/
        spaceObj.on('connection', function(socket){
            //房间外的socket登录
            socket.on('outRoomLogin',function(data){
                socket.isOutRoom=true;//区分是房间里面的socket还是房间外的socket，true表示房间外的socket
                socket.join(chatService.getOutRoomId(data.groupType));
                chatService.setRoomOnlineNum(data.groupType,chatService.oRoomId,true,function(val){
                    var sendData = {
                        type: chatService.noticeType.onlineNum,
                        data: {onlineUserNum: val}
                    };
                    socket.broadcast.to(chatService.getOutRoomId(data.groupType)).emit('outRoomNotice', sendData);
                    socket.emit('outRoomNotice', sendData);
                });
            });
            socket.on('outRoomGet',function(data){//提取在线人数
                var groupIdArr=data.groupIds,rOnlineSizeArr=[];
                async.each(groupIdArr, function (groupId, callbackTmp) {
                    chatService.getRoomOnlineNum(data.groupType,groupId,function(val){
                        rOnlineSizeArr.push({groupId:groupId,onlineSize:val});
                        callbackTmp(null);
                    });
                }, function (err) {
                    socket.emit('outRoomNotice', {type: chatService.noticeType.onlineNum,data: {rOnlineSizeArr: rOnlineSizeArr}});
                });
            });
            //登录则加入房间,groupId作为唯一的房间号
            socket.on('login',function(data){
                var userInfo=data.userInfo,lastPublishTime=data.lastPublishTime, allowWhisper = data.allowWhisper;
                if(common.isBlank(userInfo.groupType)){
                    return false;
                }
                socket.isOutRoom=false;
                //更新在线状态
                userInfo.onlineStatus=1;
                userInfo.onlineDate=new Date();
                chatService.setClientSequence(userInfo);
                socket.userInfo=userInfo;//缓存用户信息
                userService.updateMemberInfo(userInfo,function(sendMsgCount){
                    socket.userInfo.sendMsgCount=sendMsgCount;
                    socket.join(userInfo.groupId);
                    chatService.setRoomOnlineUser(userInfo,true,function(roomUserArr){
                        if(constant.fromPlatform.studio==userInfo.groupType){//如果是直播间网页版聊天室,需要显示在线用户
                            socket.emit('onlineUserList',roomUserArr,Object.getOwnPropertyNames(roomUserArr).length);//给自己加载所有在线用户
                        }
                    });
                    //通知客户端在线人数
                    if(constant.fromPlatform.studio==userInfo.groupType){//如果是直播间网页版聊天室,则追加在线用户的输出
                        //广播自己的在线信息
                        socket.broadcast.to(userInfo.groupId).emit('notice',{type:chatService.noticeType.onlineNum,data:{onlineUserInfo:userInfo,online:true}});
                    }else{
                        chatService.setRoomOnlineNum(userInfo.groupType,userInfo.groupId,true,function(roomNum){
                            var noticeData={type:chatService.noticeType.onlineNum,data:{onlineUserNum:roomNum,userId:userInfo.userId,hasRegister:userInfo.hasRegister}};
                            chatService.setRoomOnlineNum(userInfo.groupType,chatService.oRoomId,true,function(outRoomNum){
                                socket.emit('notice',noticeData);
                                socket.broadcast.to(userInfo.groupId).emit('notice',noticeData);
                                socket.broadcast.to(chatService.getOutRoomId(userInfo.groupType)).emit('outRoomNotice',{type:chatService.noticeType.onlineNum,data:{groupId:userInfo.groupId,rOnlineUserNum:roomNum,onlineUserNum:outRoomNum}});
                            });
                        });
                    }
                });
                //加载已有内容
                messageService.loadMsg(userInfo,lastPublishTime,allowWhisper,function(msgData){
                    //同步数据到客户端
                    socket.emit('loadMsg', {msgData:msgData,isAdd:common.isValid(lastPublishTime)?true:false});
                });
            });
            //断开连接
            socket.on('disconnect',function(data){
                var userInfo=socket.userInfo;
                if(userInfo){ //移除在线用户,客户端断线处理逻辑
                    chatService.setRoomOnlineUser(userInfo,false,function(isRemove){//移除缓存在线用户
                        userService.removeOnlineUser(userInfo,isRemove,function(){
                            var logRemoveTip="disconnect";
                            if(!isRemove){
                                logRemoveTip="otherLogin";
                            }
                            //通知客户端在线人数
                            if(constant.fromPlatform.studio==userInfo.groupType){//如果是直播间,则移除页面在线用户
                                socket.broadcast.to(userInfo.groupId).emit('notice',{type:chatService.noticeType.onlineNum,data:{onlineUserInfo:userInfo,online:false}});
                                socket.leave(userInfo.groupId);
                                if(socket){
                                    delete socket;
                                }
                                logger.info('setSocket['+logRemoveTip+']=>client['+(userInfo.accountNo||userInfo.userId)+'] disconnect!');
                            }else{
                                //计算房间人数
                                chatService.setRoomOnlineNum(userInfo.groupType,userInfo.groupId,false,function(roomNum){
                                    //计算房间外的总人数
                                    chatService.setRoomOnlineNum(userInfo.groupType,chatService.oRoomId,false,function(outRoomNum){
                                        //通知客户端在线人数
                                        socket.broadcast.to(userInfo.groupId).emit('notice',{type:chatService.noticeType.onlineNum,data:{onlineUserNum:roomNum}});
                                        //通知非房间的socket
                                        socket.broadcast.to(chatService.getOutRoomId(userInfo.groupType)).emit('outRoomNotice',{type:chatService.noticeType.onlineNum,data:{groupId:userInfo.groupId,rOnlineUserNum:roomNum,onlineUserNum:outRoomNum}});
                                        socket.leave(userInfo.groupId);//离开房间
                                        if(socket){
                                            delete socket;
                                        }
                                        logger.info('setSocket['+logRemoveTip+']=>client['+(userInfo.accountNo||userInfo.userId)+'] disconnect!');
                                    });
                                });
                            }
                        });
                    });
                }else{//服务端断开，房间外socket的客户端断开对应的处理逻辑
                    if(socket.nsp) {
                        var nsp=socket.nsp,socketArr = nsp.sockets, socketTmp = null;
                        if(socket.isOutRoom){//如果是房间外的socket断开，则通知客户端,目前只是微解盘使用
                            var groupType=nsp.name.replace(/\//g,"");
                            chatService.setRoomOnlineNum(groupType,chatService.oRoomId,false,function(outRoomNum){
                                var outRoomId=chatService.getOutRoomId(groupType);
                                socket.broadcast.to(outRoomId).emit('outRoomNotice',{type:chatService.noticeType.onlineNum,data:{onlineUserNum:outRoomNum}});
                                socket.leave(outRoomId);
                                if(socket){
                                    delete socket;
                                }
                                logger.error('setSocket[disconnect]=>out of room client disconnect,please check!');
                            });
                        }else{//房间内，且是服务端断开,则需更新在线状态为下线
                            logger.error('setSocket[disconnect]=>server disconnect,please check!');
                            /*for (var i in socketArr) {
                             socketTmp = socketArr[i];
                             userInfo = socketTmp.userInfo;
                             if (userInfo) {//存在用户信息，记录用户下线状态
                             userService.removeOnlineUser(userInfo,function () {});
                             }
                             }*/
                        }
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
        });
    },
    /**
     * 选择客服并发送信息
     * 备注：如果csUserId有值表示已选择客服，无需再次随机选择；否则随机选择客服发送信息
     * @param sendSocket
     * @param userInfo
     * @param csUserId
     * @param data
     */
    toOnlineCS:function(sendSocket,userInfo,data,callback){
        var csUserId=constant.roleUserType.cs==userInfo.toUser.userId?null:userInfo.toUser.userId;
        if(csUserId){//非首次@客服，直接发送信息给他
            chatService.sendMsgToUser(false,userInfo.groupType,userInfo.groupId,csUserId,data,function(){
                callback({userId:csUserId,nickname:userInfo.toUser.nickname});
            });
        }else{//如果首次@客服，则随机分配客服
            chatService.getRoomOnlineCsUserArr(userInfo.groupId,function(csArr){
                if(csArr.length>0){//如果客服在线，随机给某个客服留言
                    var csArrIndex=parseInt(Math.round(Math.random()*csArr.length));
                    if(csArrIndex>csArr.length-1){
                        csArrIndex=csArr.length-1;
                    }
                    var csUserInfo=csArr[csArrIndex],csUserId=csUserInfo.userId,nickname=csUserInfo.nickname;
                    sendSocket.emit('targetCS',{userId:csUserId,nickname:nickname});//通知客户端目前所选客服，确定客户与客服之间的信息交换
                    logger.info("First toOnlineCS->csUserInfo:"+JSON.stringify(csUserInfo));
                    if(csUserInfo.socketId){//发送信息到客服
                        data.fromUser.toUser.userId=csUserId;
                        chatService.getSpaceSocket(csUserInfo.groupType,false).to(csUserInfo.socketId).emit('sendMsg',data);
                    }
                    callback({userId:csUserId,nickname:nickname});
                }else{//如果客服不在线，直接找某个客服留言
                    userService.getRoomCsUser(userInfo.groupId,function(info){
                        if(info) {
                            sendSocket.emit('targetCS', {userId: info.userNo, nickname: info.userName});//通知客户端目前所选客服，确定客户与客服之间的信息交换
                            callback({userId:info.userNo,nickname:info.userName});
                        }else{
                            callback(null);
                        }
                    });
                }
            });
        }
    },
    /**
     * 提取房间在线cs用户集
     * @param groupType
     * @param roomId
     * @param callback
     */
    getRoomOnlineCsUserArr:function(roomId,callback){
        this.getRoomOnlineUser(roomId,function(roomUserArr){
            var csArr=[],userInfoTmp=null;
            for(var i in roomUserArr){
                userInfoTmp = roomUserArr[i];
                if(constant.roleUserType.cs==userInfoTmp.userType){
                    csArr.push(userInfoTmp);
                }
            }
            callback(csArr);
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
        userService.checkUserLogin(userInfo,function(row){
            if(row){
                var currentDate = new Date();
                userInfo.publishTime = currentDate.getTime()+"_"+process.hrtime()[1];//产生唯一的id
                var userSaveInfo=row.loginPlatform.chatUserGroup[0].toObject();//用于信息保存
                userSaveInfo.userType=userInfo.userType=userSaveInfo.userType||userInfo.userType;
                userInfo.nickname=userSaveInfo.nickname;
                userSaveInfo.avatar=userInfo.avatar;
                userSaveInfo.position=userInfo.position;
                userSaveInfo.mobilePhone=row.mobilePhone;
                userSaveInfo.groupId=userInfo.groupId;
                userSaveInfo.publishTime=userInfo.publishTime;
                userSaveInfo.userId=userInfo.userId;
                userSaveInfo.toUser=userInfo.toUser;
                userSaveInfo.groupType=userSaveInfo._id||userInfo.groupType;
                var tipResult=userService.checkUserGag(row, userInfo.groupId);//\检查用户禁言
                if(!tipResult.isOK){//是否设置了用户禁言
                    chatService.sendMsgToSelf(socket,userInfo,{fromUser:userInfo,uiId:data.uiId,value:tipResult,rule:true});
                    return false;
                }
                //验证规则
                userService.verifyRule(userInfo.userType,groupId,data.content,function(resultVal){
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
                        var toUser=userInfo.toUser,isWh=toUser && common.isValid(toUser.userId) && "1"==toUser.talkStyle;//私聊
                        var isToCSUser=toUser && common.isValid(toUser.userId) && (constant.roleUserType.cs==userInfo.toUser.userType || constant.roleUserType.cs==userInfo.toUser.userId);//判断是否客服
                        if(!isToCSUser) {//非发送给客服
                            messageService.saveMsg({fromUser: userSaveInfo, content: data.content});
                        }
                        //发送聊天信息
                        if(data.content.msgType=='img'){
                            data.content.maxValue='';
                        }
                        var userInfoTmp=null,user=null,sendInfo=null;
                        //发送给自己
                        chatService.sendMsgToSelf(socket,userInfo,{uiId:data.uiId,fromUser:userInfo,serverSuccess:true,content:{msgType:data.content.msgType,needMax:data.content.needMax}});
                        //发送给除自己之外的用户
                        if(isToCSUser && socket){//判断是否发送信息给客服
                            chatService.toOnlineCS(socket,userInfo,{fromUser:userInfo,content:data.content},function(newUserInfo){
                                userSaveInfo.toUser.nickname=newUserInfo.nickname;
                                userSaveInfo.toUser.userId=newUserInfo.userId;
                                userSaveInfo.toUser.talkStyle=1;
                                console.log("userSaveInfo.toUser:"+JSON.stringify(userSaveInfo.toUser));
                                messageService.saveMsg({fromUser: userSaveInfo, content: data.content});
                            });
                        }else{
                            if(isWh){//私聊
                                chatService.sendMsgToUser(socket?false:true,userInfo.groupType,groupId,toUser.userId,{fromUser:userInfo,content:data.content});
                            }else{
                                if(socket) {
                                    socket.broadcast.to(groupId).emit('sendMsg', {fromUser:userInfo,content:data.content});
                                }else{//如果是外部发送信息，即socket不存在，比如发送图片，直接使用sendMsgToRoom方法
                                    chatService.sendMsgToRoom(true,userInfo.groupType,groupId,'sendMsg',{fromUser:userInfo,content:data.content},userInfo.userId);
                                }
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
     * 离开房间(房间关闭）
     * @param groupIds
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
     * 离开房间
     * @param groupType
     * @param socketId
     */
    leaveRoomBySocketId:function(groupType,socketId,flag){
        chatService.getSpaceSocket(groupType,false).to(socketId).emit('notice',{type:chatService.noticeType.leaveRoom,flag:flag});
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
            for(var j in userNoArr){
                for(var i in roomUserArr){
                    userInfoTmp = roomUserArr[i];
                    if(userInfoTmp.socketId && userInfoTmp.userId == userNoArr[j] && userInfoTmp.socketId!=excludeSocketId){
                        space.to(userInfoTmp.socketId).emit(eventKey,data);
                        break;
                    }
                }
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
            var userInfoTmp=null,space=chatService.getSpaceSocket(groupType,isFromRedis);
            for(var i in roomUserArr){
                userInfoTmp = roomUserArr[i];
                if(userInfoTmp.userId==toUserId){
                    space.to(userInfoTmp.socketId).emit('sendMsg',data);
                    break;
                }
            }
            if(callback){
                callback();
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

