var common = require('../util/common');//引入common类
var constant = require('../constant/constant');//引入constant
var userService = require('../service/userService');//引入userService服务类
var messageService = require('../service/messageService');//引入messageService服务类
var logger=require('../resources/logConf').getLogger('chatService');//引入log4js
/**
 * 聊天室服务类
 * 备注：处理聊天室接受发送的所有信息及其管理
 * author Alan.wu
 */
var chatService ={
    oRoomId:'oRoomId',//自定义房间外的房间，用于房间外的socket通讯，目前只用于微解盘
    socketSpaceArr:["wechatGroup","studioGroup"],//组空间
    socket:null,//socket对象
    noticeType:{ //通知客户端类型
       removeMsg:'removeMsg',//移除信息
       onlineNum:'onlineNum',//在线人数
       approvalResult:'approvalResult',//审核结果
       leaveRoom:'leaveRoom'//离开房间
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
        return spaceName.indexOf("Group")==-1?('/'+spaceName+"Group"):('/'+spaceName);
    },
    /**
     * 通过空间与组名提取对应房间
     * @param groupId
     */
    getRoomSockets:function(spaceName,groupId){
        return spaceName?this.getSpaceSocket(spaceName).in(groupId):this.getSpaceSocket(groupId).in(groupId);
    },
    /**
     * 提取命名空间的socket
     * @param spaceName
     * @returns {*}
     */
    getSpaceSocket:function(spaceName){
        return chatService.socket.of(chatService.formatSpaceName(spaceName));
    },

    /**
     * 提取在线用户
     * @param sockets
     * @param groupId
     */
    getOnlineUserList:function(sockets,groupId){
        var userList=[],userInfo=null;
        sockets.forEach(function(row){
             userInfo=row.userInfo;
             if(userInfo && groupId==userInfo.groupId){
                 userList.push(userInfo);
             }
        });
        return userList;
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
     * 提取房间在线人数
     * @param groupId
     */
    getRoomOnlineNum:function(groupType,groupId){
        var groupOnlineArr=chatService.getSpaceSocket(groupType).groupArr;
        if(groupOnlineArr && groupOnlineArr.hasOwnProperty(groupId)){
            return groupOnlineArr[groupId];
        }else{
            return 0;
        }
    },
    /**
     * 设置组人数
     * @param socket
     * @param groupId
     */
    getSocketGroupNum:function(socket,groupId,isAdd){
       var groupArr=socket.nsp.groupArr;
       if(isAdd){
           if(!groupArr){
               groupArr=[];
               groupArr[groupId]=1;
           }else{
               if(groupArr.hasOwnProperty(groupId)){
                   groupArr[groupId]+=1;
               }else{
                   groupArr[groupId]=1;
               }
           }
       }else{
           if(!groupArr|| !groupArr.hasOwnProperty(groupId)){
                return 0;
           }
           if(groupArr[groupId]>=1){
               groupArr[groupId]-=1;
           }
       }
       socket.nsp.groupArr=groupArr;
       return groupArr[groupId];
    },

    /**
     * 设置socket连接相关信息
     * @param spaceName 命名空间对应的名称
     */
    setSocket: function (spaceName) {
        console.log("spaceName:"+spaceName);
        //连接socket，并处理相关操作
        this.getSpaceSocket(spaceName).on('connection', function(socket){
            socket.on('outRoomLogin',function(data){//房间外的socket登录
                socket.isOutRoom=true;//区分是房间里面的socket还是房间外的socket，true表示房间外的socket
                socket.join(chatService.oRoomId);
                var sendData = {
                    type: chatService.noticeType.onlineNum,
                    data: {onlineUserNum: chatService.getSocketGroupNum(socket,chatService.oRoomId,true)}
                };
                socket.broadcast.to(chatService.oRoomId).emit('outRoomNotice', sendData);
                socket.emit('outRoomNotice', sendData);
            });
            socket.on('outRoomGet',function(data){//提取在线人数
                var groupIdArr=data.groupIds,groupId='',rOnlineSizeArr=[];
                var space = chatService.getSpaceSocket(data.groupType),groupOnlineNum=0;
                for(var i in groupIdArr){
                    groupId=groupIdArr[i];
                    groupOnlineNum=(space.groupArr && space.groupArr.hasOwnProperty(groupId))?space.groupArr[groupId]:0;
                    rOnlineSizeArr.push({groupId:groupId,onlineSize:groupOnlineNum});
                }
                var sendData = {
                    type: chatService.noticeType.onlineNum,
                    data: {rOnlineSizeArr: rOnlineSizeArr}
                };
                socket.emit('outRoomNotice', sendData);
            });
            //登录则加入房间,groupId作为唯一的房间号
            socket.on('login',function(data){
                var userInfo=data.userInfo,lastPublishTime=data.lastPublishTime;
                if(common.isBlank(userInfo.groupType)){
                    return false;
                }
                socket.isOutRoom=false;
                //更新在线状态
                userInfo.onlineStatus=1;
                userInfo.onlineDate=new Date();
                socket.userInfo=userInfo;//缓存用户信息
                chatService.setClientSequence(socket.userInfo);
                userService.updateMemberInfo(userInfo,function(sendMsgCount){
                    socket.userInfo.sendMsgCount=sendMsgCount;
                    socket.join(userInfo.groupId);
                    //通知客户端在线人数
                    var roomSockets=chatService.getRoomSockets(userInfo.groupType,userInfo.groupId);
                    var rOnlineSize=chatService.getSocketGroupNum(socket,userInfo.groupId,true);
                    if(constant.fromPlatform.studio==userInfo.groupType){//如果是直播间网页版聊天室,则追加在线用户的输出
                        //给自己加载所有在线用户
                        socket.emit('onlineUserList',chatService.getOnlineUserList(roomSockets.sockets,userInfo.groupId));
                        //广播自己的在线信息
                        socket.broadcast.to(userInfo.groupId).emit('notice',{type:chatService.noticeType.onlineNum,data:{onlineUserInfo:socket.userInfo,online:true}});
                    }else{
                        var onlineUserNum=chatService.getSocketGroupNum(socket,chatService.oRoomId,true);
                        socket.broadcast.to(chatService.oRoomId).emit('outRoomNotice',{type:chatService.noticeType.onlineNum,data:{groupId:userInfo.groupId,rOnlineUserNum:rOnlineSize,onlineUserNum:onlineUserNum}});
                        var noticeData={type:chatService.noticeType.onlineNum,data:{onlineUserNum:rOnlineSize,userId:userInfo.userId,hasRegister:userInfo.hasRegister}};
                        socket.emit('notice',noticeData);
                        socket.broadcast.to(userInfo.groupId).emit('notice',noticeData);
                    }
                });
                //加载已有内容
                messageService.loadMsg(userInfo,lastPublishTime,function(msgData){
                    //同步数据到客户端
                    socket.emit('loadMsg', {msgData:msgData,isAdd:common.isValid(lastPublishTime)?true:false});
                });
            });
            //断开连接
            socket.on('disconnect',function(data){
                var userInfo=socket.userInfo;
                if(userInfo){ //移除在线用户,客户端断线处理逻辑
                    userService.removeOnlineUser(userInfo,function(){
                        //通知客户端在线人数
                        var rOnlineSize=chatService.getSocketGroupNum(socket,userInfo.groupId,false);
                        if(constant.fromPlatform.studio==userInfo.groupType){//如果是直播间,则移除页面在线用户
                            socket.broadcast.to(userInfo.groupId).emit('notice',{type:chatService.noticeType.onlineNum,data:{onlineUserInfo:socket.userInfo,online:false}});
                        }else{
                            //通知客户端在线人数
                            var onlineUserNum=chatService.getSocketGroupNum(socket,chatService.oRoomId,false);
                            socket.broadcast.to(userInfo.groupId).emit('notice',{type:chatService.noticeType.onlineNum,data:{onlineUserNum:rOnlineSize}});
                            //通知非房间的socket
                            socket.broadcast.to(chatService.oRoomId).emit('outRoomNotice',{type:chatService.noticeType.onlineNum,data:{groupId:userInfo.groupId,rOnlineUserNum:rOnlineSize,onlineUserNum:onlineUserNum}});
                        }
                        socket.leave(userInfo.groupId);
                        if(socket){
                            delete socket;
                        }
                        logger.info('setSocket[disconnect]=>client['+(userInfo.accountNo||userInfo.userId)+'] disconnect!');
                    });
                }else{//服务端断开，房间外socket的客户端断开对应的处理逻辑
                    if(socket.nsp) { //批量更新客户端在线状态为离线
                        var nsp=socket.nsp,socketArr = nsp.sockets, socketTmp = null;
                        if(socket.isOutRoom){//如果是房间外的socket断开，则通知客户端
                            socket.broadcast.to(chatService.oRoomId).emit('outRoomNotice',{type:chatService.noticeType.onlineNum,data:{onlineUserNum:chatService.getSocketGroupNum(socket,chatService.oRoomId,false)}});
                            socket.leave(chatService.oRoomId);
                            if(socket){
                                delete socket;
                            }
                            logger.error('setSocket[disconnect]=>out of room client disconnect,please check!');
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
     * 审核信息
     */
    approvalMsg:function(data,socket){
        messageService.updateMsgStatus(data,function(msgResult){
            var fromUser=data.fromUser;
            if(msgResult) {//通过则通知客户端
                //通知相同组别的会员
                if(msgResult.status==1){//通过则通知相同组别的会员,如果是聊天室发送过来的，排除自己，如果是聊天记录直接审核的，则发给全部用户
                    (socket?socket.broadcast.to(fromUser.groupId):chatService.getRoomSockets(fromUser.groupType,fromUser.groupId)).emit('notice',{type:chatService.noticeType.approvalResult,data:msgResult.data});
                }else{//拒绝则通知审核角色，信息已经拒绝
                    var userNoArr=msgResult.data;
                    //发送给审核角色，更新记录状态(备注，如果是审核员在聊天室审核的，则排除自己，因为后面会统一处理)
                    var sockets=chatService.getRoomSockets(fromUser.groupType,fromUser.groupId).sockets;
                    logger.info("approvalMsg->userNoStr:"+userNoArr.join(","));
                    var socketTmp=null,socketId=socket?socket.id:null;

                    var lenUsers = msgResult.data instanceof Array ? msgResult.data.length : 0;
                    for(var i=0;i<sockets.length;i++) {
                        socketTmp = sockets[i];
                        if (socketTmp.userInfo && socketTmp.id!=socketId){
                            for(var j = 0; j < lenUsers; j++){
                                if(socketTmp.userInfo.userId == userNoArr[j]){
                                    socketTmp.emit('notice',{type:chatService.noticeType.approvalResult,data:{refuseMsg:true,publishTimeArr:data.publishTimeArr}});
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            //通知审核者，已经审核
            if(socket){
                socket.emit('notice', {
                    type: chatService.noticeType.approvalResult,
                    data: {fromUserId: data.fromUser.userId, isOk: (msgResult?true:false), publishTimeArr: data.publishTimeArr,status:data.status}
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
                    chatService.sendMsgToUser(socket,userInfo,{fromUser:userInfo,uiId:data.uiId,value:tipResult,rule:true});
                    return false;
                }
                //验证规则
                userService.verifyRule(userInfo.userType,groupId,data.content,function(resultVal){
                    if(!resultVal.isOK){//匹配规则，则按规则逻辑提示
                        logger.info('acceptMsg=>resultVal:'+JSON.stringify(resultVal));
                        //通知自己的客户端
                        chatService.sendMsgToUser(socket,userInfo,{fromUser:userInfo,uiId:data.uiId,value:resultVal,rule:true});
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
                                    chatService.sendMsgToUserArr(userInfo,userNos,null,{fromUser: userInfo, content: data.content});
                                }else{
                                    console.log('后台聊天内容审核用户权限配置有误，请检查！');
                                }
                            });
                        }
                    } else{
                        //没有定义审核规则，无需审核
                        data.content.status=1;//设为通过
                        messageService.saveMsg({fromUser:userSaveInfo,content:data.content});
                        //发送聊天信息
                        if(data.content.msgType=='img'){
                            data.content.maxValue='';
                        }
                        var userInfoTmp=null,user=null,sendInfo=null;
                        //发送给自己
                        chatService.sendMsgToUser(socket,userInfo,{uiId:data.uiId,fromUser:userInfo,serverSuccess:true,content:{msgType:data.content.msgType,needMax:data.content.needMax}});
                        //发送给除自己之外的用户
                        var toUser=userInfo.toUser,isWh=toUser && common.isValid(toUser.userId) && "1"==toUser.talkStyle;//私聊
                        if(socket){
                            if(isWh){//私聊
                                chatService.getRoomSockets(userInfo.groupType,groupId).sockets.forEach(function(socketRow){
                                    if(socketRow.userInfo && socketRow.userInfo.userId==toUser.userId){
                                        socketRow.emit('sendMsg', {fromUser:userInfo,content:data.content});
                                        return false;
                                    }
                                });
                            }else{
                                socket.broadcast.to(groupId).emit('sendMsg', {fromUser:userInfo,content:data.content});
                            }
                            socket.userInfo.sendMsgCount+=1;//统计发言数据
                        }else{
                            chatService.getRoomSockets(userInfo.groupType,groupId).sockets.forEach(function(socketRow){
                                if(isWh){//私聊
                                    if(socketRow.userInfo && socketRow.userInfo.userId==toUser.userId){
                                        socketRow.emit('sendMsg', {fromUser:userInfo,content:data.content});
                                        return false;
                                    }
                                }else{
                                    if(socketRow.id==userInfo.socketId){
                                        socketRow.broadcast.to(groupId).emit('sendMsg', {fromUser:userInfo,content:data.content});
                                        return false;
                                    }
                                }
                            });
                        }
                    }
                });
            }else{
                //通知自己的客户端
                chatService.sendMsgToUser(socket,userInfo,{isVisitor:true,uiId:data.uiId});
            }
        });
    },
    /**
     * 移除数据
     * @param groupId
     * @param msgIds
     */
    removeMsg:function(groupId,msgIds){
        chatService.getRoomSockets(null,groupId).emit("notice",{type:chatService.noticeType.removeMsg,data:msgIds});
    },

    /**
     * 离开房间
     * @param groupIds
     */
    leaveRoom:function(groupIds){
        var groupIdArr=groupIds.split(",");
        for(var i in groupIdArr){
            chatService.getRoomSockets(null,groupIdArr[i]).emit("notice",{type:chatService.noticeType.leaveRoom});
        }
    },
    /**
     * 发送给角色对应的用户
     * @param userInfo
     * @param userNoArr
     * @param socketId 要排除的socketId
     * @param data
     */
    sendMsgToUserArr:function(userInfo,userNoArr,socketId,data){
        var sockets=chatService.getRoomSockets(userInfo.groupType,userInfo.groupId).sockets;
        var socket=null;
        logger.info("sendMsgToUsers=>userNoStr:"+userNoArr.join(","));
        var lenUsers = userNoArr instanceof Array ? userNoArr.length : 0;
        for(var i=0;i<sockets.length;i++) {
            socket = sockets[i];
            if (socket.userInfo && socket.id!=socketId){
                for(var j = 0; j < lenUsers; j++){
                    if(socket.userInfo.userId == userNoArr[j]){
                        socket.emit('sendMsg',data);
                        break;
                    }
                }
            }
        }
    },
    /**
     * 发送给某个用户
     * @param data
     */
    sendMsgToUser:function(socket,userInfo,data){
        if(socket){
            socket.emit('sendMsg',data);
        }else{
            var room=chatService.getRoomSockets(userInfo.groupType,userInfo.groupId);
            if(common.isValid(userInfo.socketId)){
                if(room.connected.hasOwnProperty(userInfo.socketId)){
                    room.connected[userInfo.socketId].emit('sendMsg',data);
                }
            }else{
                var sockets=room.sockets;
                for(var i=0;i<sockets.length;i++) {
                    socket = sockets[i];
                    if (socket.userInfo && socket.userInfo.userId == userInfo.userId){//如果客户端有socketId,则直接发给对应socketId的用户(图片上传会使用到）
                        socket.emit('sendMsg',data);
                        break;
                    }
                }
            }
        }
    }
};
//导出服务类
module.exports =chatService;

