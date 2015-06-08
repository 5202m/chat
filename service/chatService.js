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
    socket:null,
    noticeType:{ //通知客户端类型
       removeMsg:'removeMsg',//移除信息
       onlineNum:'onlineNum',//在线人数
       approvalResult:'approvalResult'//审核结果
    },
    /**
     * 初始化
     */
    init:function(){
        this.setSocket();
    },
    /**
     * 设置socket连接相关信息
     */
    setSocket: function () {
        //连接socket，并处理相关操作
        this.socket.on('connection', function(socket){
            //登录(缓存用户信息）
            socket.on('login',function(info){
                var groupRow=userService.cacheUserArr[info.groupId];
                if(groupRow==null||groupRow==undefined){
                    groupRow=[];
                }
                //设置用户进入聊天室的信息
                info.onlineDate=new Date();
                info.isNewIntoChat=true;
                //记录用户缓存信息
                groupRow.push({socket: socket, userInfo: info});
                //同步用户信息,在线状态设为1
                info.onlineStatus='1';
                userService.updateMemberInfo(info);
                //加载已有内容
                messageService.loadMsg(info.groupId,info.roleNo,function(data){
                    socket.emit('loadMsg', data);//同步数据到客户端
                });
                userService.cacheUserArr[info.groupId]=groupRow;
                //通知客户端
                chatService.clientNotice(chatService.noticeType.onlineNum,info.groupId);
            });
            //断开连接
            socket.on('disconnect',function(){
                //移除在线用户
                userService.removeOnlineUser(socket.id,function(groupId){
                    if(groupId){
                        //通知客户端
                        chatService.clientNotice(chatService.noticeType.onlineNum,groupId);
                    }
                });
                //socket.emit('disconnect', {reConnect:true});//同步数据到客户端
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
            if(msgResult) {//通过则通知客户端
                //通知相同组别的会员
                if(msgResult.status==1){//通过则通知相同组别的会员
                    chatService.clientNotice(chatService.noticeType.approvalResult, data.fromUser.groupId, msgResult.data, (constant.fromPlatform.pm_mis==data.fromUser.fromPlatform)?null:data.fromUser.userId);
                }else{//拒绝则通知发送者，信息已经拒绝
                    var roleNoArr=msgResult.data;
                    console.log("approvalMsg->roleNoArr:"+roleNoArr);
                    //发送给审核角色，更新记录状态(备注，如果是审核员在聊天室审核的，则排除自己，因为后面会统一处理)
                    chatService.clientNoticeByRejectMsg(chatService.noticeType.approvalResult, data.fromUser.groupId,roleNoArr,data.publishTimeArr,(socket? data.fromUser.userId:null));
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
        var userInfo=data.fromUser,groupId=userInfo.groupId;;
        //如果首次发言需要登录验证(备注：微信取openId为userId，即验证openId）
        userService.checkUserLogin(userInfo,function(row){
            if(row){
                var tip=userService.checkUserGag(row);
                var currentDate = new Date();
                userInfo.publishTime = currentDate.getTime()+"_"+process.hrtime()[1];//产生唯一的id
                var userGroupTmp=row.loginPlatform.chatUserGroup[0];
                userInfo.userType=userGroupTmp.userType?userGroupTmp.userType:userInfo.userType;
                userInfo.nickname=userGroupTmp.nickname;
                userInfo.mobilePhone=row.mobilePhone;
                userInfo.accountNo=userGroupTmp.accountNo;
                if(tip){
                    chatService.sendMsgToSelf(socket,userInfo,{fromUser:userInfo,uiId:data.uiId,value:tip,rule:true});
                    return false;
                }
                var sameGroupUserArr=userService.cacheUserArr[groupId];
                //验证规则
                userService.verifyRule(userInfo.userType,groupId,data.content,function(resultVal){
                    if(!resultVal.isOK){//匹配规则，则按规则逻辑提示
                        console.log('resultVal:'+JSON.stringify(resultVal));
                        //通知自己的客户端
                        chatService.sendMsgToSelf(socket,userInfo,{fromUser:userInfo,uiId:data.uiId,value:resultVal,rule:true});
                        //如果会员发送内容需要审核，把内容转个审核人审核
                        if(resultVal.needApproval && constant.roleUserType.member==userInfo.userType){
                            userService.checkRoleHasApproval(groupId,function(roleNoArr){//检查那个角色可以审核聊天内容
                                if(roleNoArr){
                                    data.content.status=0;//设为等待审批
                                    messageService.saveMsg(data,roleNoArr);//保存聊天数据
                                    for(var i in roleNoArr){//发送信息给审核人
                                        console.log("roleNoArr["+i+"]:"+roleNoArr[i]);
                                        chatService.sendMsgToOther(userInfo,roleNoArr[i],{fromUser: userInfo, content: data.content});
                                    }
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
                        for(var i=0;i<sameGroupUserArr.length;i++){
                            user = sameGroupUserArr[i];
                            userInfoTmp=user.userInfo;
                            if(user.socket!=null){
                                if((!userInfo.socketId && userInfo.userId == userInfoTmp.userId)|| (userInfo.socketId && userInfo.socketId == user.socket.id)){//如果是自己，清空内容，告知客户端发送成功即可
                                    sendInfo={uiId:data.uiId,fromUser:userInfo,serverSuccess:true,content:{msgType:data.content.msgType,needMax:data.content.needMax}};
                                    user.socket.emit('sendMsg',sendInfo);
                                }else{
                                    user.socket.emit('sendMsg',{fromUser:userInfo,content:data.content});
                                }
                            }
                        }
                        userInfoTmp.isNewIntoChat=false;
                    }
                });
            }else{
                chatService.sendMsgToSelf(socket,userInfo,{isVisitor:true,uiId:data.uiId});
            }
        });
    },

    /**
     * 发送给其他人数据
     * @param data
     */
    sendMsgToOther:function(userInfo,roleNo,data){
        var userSocket=chatService.getSocket(userInfo,roleNo);
        if(userSocket){
            userSocket.emit('sendMsg',data);
        }
    },
    /**
     * 发送给自己数据
     * @param data
     */
    sendMsgToSelf:function(socket,userInfo,data){
        socket=socket||chatService.getSocket(userInfo);
        if(socket){
            socket.emit('sendMsg',data);
        }
    },
    /**
     * 根据组id、用户id找对应socket
     * @param groupId
     * @param userInfo
     */
    getSocket:function(userInfo,roleNo){
        var groupUserArr=userService.cacheUserArr[userInfo.groupId],user=null;
        if(roleNo){
            for(var i=0;i<groupUserArr.length;i++) {
                user = groupUserArr[i];
                if(user.userInfo.roleNo == roleNo){
                    return user.socket;
                }
            }
        }else{
            for(var i=0;i<groupUserArr.length;i++) {
                user = groupUserArr[i];
                if ((!userInfo.socketId && user.userInfo.userId == userInfo.userId)|| (userInfo.socketId && userInfo.socketId == user.socket.id)) {
                    return user.socket;
                }
            }
        }
        return null;
    },

    /**
     * 客户端通知信息
     * @param type
     * @param groupId
     * @param data
     * @param filterUserId 排除某个用户
     */
    clientNotice:function(type,groupId,data,filterUserId){
        var groupRow=userService.cacheUserArr[groupId];
        if(groupRow){
            var sendData=data;
            if(chatService.noticeType.onlineNum==type){//在线人数
                sendData={onlineUserNum:groupRow.length}
            }
            groupRow.forEach(function(row){
                if(!filterUserId||(filterUserId && row.userInfo.userId!=filterUserId)){
                    row.socket.emit('notice',{type:type,data:sendData});
                }
            });
        }
    },

    /**
     * 通知审核角色信息被拒绝
     * @param type
     * @param groupId
     * @param roleNoArr
     * @param publishTimeArr
     * @param filterUserId
     */
    clientNoticeByRejectMsg:function(type,groupId,roleNoArr,publishTimeArr,filterUserId){
        var groupRow=userService.cacheUserArr[groupId];
        if(groupRow){
            var roleNoStr=","+roleNoArr.join(",")+",";
            groupRow.forEach(function(row){
                if(row.userInfo.userId!=filterUserId && roleNoStr.indexOf(","+row.userInfo.roleNo+",")!=-1){
                    row.socket.emit('notice',{type:type,data:{refuseMsg:true,publishTimeArr:publishTimeArr}});
                }
            });
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

