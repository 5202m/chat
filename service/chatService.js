var token = require('../models/token');//引入token数据模型
var common = require('../util/common');//引入common类
var constant = require('../constant/constant');//引入constant
var userService = require('../service/userService');//引入userService服务类
var messageService = require('../service/messageService');//引入messageService服务类
/**
 * 聊天室服务类
 * 备注：处理聊天室接受发送的所有信息及其管理
 * author Alan.wu
 */
var chatService ={
    socketSpaceArr:["wechatGroup"],
    socket:null,//socket对象
    noticeType:{ //通知客户端类型
       removeMsg:'removeMsg',//移除信息
       onlineNum:'onlineNum',//在线人数
       approvalResult:'approvalResult'//审核结果
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
    getRoomSockets:function(groupId){
        return chatService.socket.of(chatService.formatSpaceName(groupId)).in(groupId);
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
     * 设置socket连接相关信息
     * @param spaceName 命名空间对应的名称
     */
    setSocket: function (spaceName) {
        console.log("spaceName:"+spaceName);
        //连接socket，并处理相关操作
        this.getSpaceSocket(spaceName).on('connection', function(socket){
            //登录则加入房间,groupId作为唯一的房间号
            socket.on('login',function(data){
                var userInfo=data.userInfo,lastPublishTime=data.lastPublishTime;
                socket.userInfo={groupId:userInfo.groupId,userId:userInfo.userId,roleNo:userInfo.roleNo,fromPlatform:userInfo.fromPlatform};//缓存用户信息
                socket.join(userInfo.groupId);
                //更新在线状态
                userInfo.onlineStatus='1';
                userInfo.onlineDate=new Date();
                userService.updateMemberInfo(userInfo,function(sendMsgCount){
                    socket.sendMsgCount=sendMsgCount;
                });
                //加载已有内容
                messageService.loadMsg(userInfo.groupId,userInfo.roleNo,lastPublishTime,function(msgData){
                    //同步数据到客户端
                    socket.emit('loadMsg', {msgData:msgData,isAdd:common.isValid(lastPublishTime)?true:false});
                });
                //通知客户端在线人数
                var roomSockets=chatService.getRoomSockets(userInfo.groupId);
                roomSockets.onlineSize=roomSockets.onlineSize?(roomSockets.onlineSize+1):1;//数目加1
                roomSockets.emit('notice',{type:chatService.noticeType.onlineNum,data:{onlineUserNum:roomSockets.onlineSize}});
            });
            //断开连接
            socket.on('disconnect',function(){
                //移除在线用户
                var userInfo=socket.userInfo;
                userService.removeOnlineUser(userInfo,socket.sendMsgCount,function(groupId){
                    if(groupId){
                        //通知客户端在线人数
                        socket.leave(groupId);
                        var roomSockets=chatService.getRoomSockets(groupId);
                        //通知客户端在线人数
                        roomSockets.onlineSize-=(roomSockets.onlineSize==0?0:1);//数目减一
                        roomSockets.emit('notice',{type:chatService.noticeType.onlineNum,data:{onlineUserNum:roomSockets.onlineSize}});
                    }
                });
                console.log('disconnect,please check!');
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
                    (socket?socket.broadcast.to(fromUser.groupId):chatService.getRoomSockets(fromUser.groupId)).emit('notice',{type:chatService.noticeType.approvalResult,data:msgResult.data});
                }else{//拒绝则通知审核角色，信息已经拒绝
                    var roleNoArr=msgResult.data;
                    //发送给审核角色，更新记录状态(备注，如果是审核员在聊天室审核的，则排除自己，因为后面会统一处理)
                    var sockets=chatService.getRoomSockets(fromUser.groupId).sockets;
                    var roleNoStr=","+roleNoArr.join(",")+",";
                    console.log("approvalMsg->roleNoStr:"+roleNoStr);
                    var socketTmp=null,socketId=socket?socket.id:null;
                    for(var i=0;i<sockets.length;i++) {
                        socketTmp = sockets[i];
                        if (socketTmp.id!=socketId && roleNoStr.indexOf(","+socketTmp.userInfo.roleNo +",")!=-1){
                            socketTmp.emit('notice',{type:chatService.noticeType.approvalResult,data:{refuseMsg:true,publishTimeArr:data.publishTimeArr}});
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
                var userGroupTmp=row.loginPlatform.chatUserGroup[0];
                userInfo.userType=userGroupTmp.userType?userGroupTmp.userType:userInfo.userType;
                userInfo.nickname=userGroupTmp.nickname;
                userInfo.mobilePhone=row.mobilePhone;
                userInfo.accountNo=userGroupTmp.accountNo;
                var tipResult=userService.checkUserGag(row);//\检查用户禁言
                if(!tipResult.isOK){//是否设置了用户禁言
                    chatService.sendMsgToUser(socket,userInfo,{fromUser:userInfo,uiId:data.uiId,value:tipResult,rule:true});
                    return false;
                }
                //验证规则
                userService.verifyRule(userInfo.userType,groupId,data.content,function(resultVal){
                    if(!resultVal.isOK){//匹配规则，则按规则逻辑提示
                        console.log('resultVal:'+JSON.stringify(resultVal));
                        //通知自己的客户端
                        chatService.sendMsgToUser(socket,userInfo,{fromUser:userInfo,uiId:data.uiId,value:resultVal,rule:true});
                        //如果会员发送内容需要审核，把内容转个审核人审核
                        if(resultVal.needApproval && constant.roleUserType.member==userInfo.userType){
                            userService.checkRoleHasApproval(groupId,function(roleNoArr){//检查那个角色可以审核聊天内容
                                if(roleNoArr){
                                    data.content.status=0;//设为等待审批
                                    messageService.saveMsg(data,roleNoArr);//保存聊天数据
                                    if(socket){//统计发言总数
                                        socket.sendMsgCount+=1
                                    }
                                    //发送信息给审核人
                                    chatService.sendMsgToRole(userInfo,roleNoArr,null,{fromUser: userInfo, content: data.content});
                                }else{
                                    console.log('后台聊天内容审核角色权限配置有误，请检查！');
                                }
                            });
                        }
                    } else{
                        //没有定义审核规则，无需审核
                        data.content.status=1;//设为通过
                        messageService.saveMsg(data);
                        //发送聊天信息
                        if(data.content.msgType=='img'){
                            data.content.maxValue='';
                        }
                        var userInfoTmp=null,user=null,sendInfo=null;
                        //发送给自己
                        chatService.sendMsgToUser(socket,userInfo,{uiId:data.uiId,fromUser:userInfo,serverSuccess:true,content:{msgType:data.content.msgType,needMax:data.content.needMax}});
                        //发送给除自己之外的用户
                        if(socket){
                            socket.broadcast.to(groupId).emit('sendMsg', {fromUser:userInfo,content:data.content});
                            socket.sendMsgCount+=1;//统计发言数据
                        }else{
                            chatService.getRoomSockets(groupId).sockets.forEach(function(socketRow){
                                if(socketRow.id==userInfo.socketId){
                                    socketRow.broadcast.to(groupId).emit('sendMsg', {fromUser:userInfo,content:data.content});
                                    return false;
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
        chatService.getRoomSockets(groupId).emit("notice",{type:chatService.noticeType.removeMsg,data:msgIds});
    },
    /**
     * 发送给角色对应的用户
     * @param userInfo
     * @param roleNoArr
     * @param socketId 要排除的socketId
     * @param data
     */
    sendMsgToRole:function(userInfo,roleNoArr,socketId,data){
        var sockets=chatService.getRoomSockets(userInfo.groupId).sockets;
        var socket=null;
        var roleNoStr=","+roleNoArr.join(",")+",";
        console.log("roleNoStr:"+roleNoStr);
        for(var i=0;i<sockets.length;i++) {
            socket = sockets[i];
            if (socket.id!=socketId && roleNoStr.indexOf(","+socket.userInfo.roleNo +",")!=-1){
                socket.emit('sendMsg',data);
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
            var sockets=chatService.getRoomSockets(userInfo.groupId).sockets;
            for(var i=0;i<sockets.length;i++) {
                socket = sockets[i];
                if (socket.userInfo.userId == userInfo.userId||socket.id==userInfo.socketId){//如果客户端有socketId,则直接发给对应socketId的用户(图片上传会使用到）
                    socket.emit('sendMsg',data);
                    break;
                }
            }
        }
    },
    /**
     * 销毁访问主页的token
     * @param val
     */
    destroyHomeToken:function(val,callback){
        token.findOne({value:val},function (err,row) {
            if(err||!row){
                callback(false);
            }else{
                var currTime=new Date().getTime();
                if(row.endTime==0||row.beginTime==0){
                    row.remove(function(){
                        callback(true);
                    });
                }else if(currTime>row.endTime){
                    row.remove(function(){
                        callback(false);
                    });
                }else{
                    callback(true);
                }
            }
        });
    }
};
//导出服务类
module.exports =chatService;

