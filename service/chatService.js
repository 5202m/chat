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
       removeMsg:'removeMsg',
       onlineNum:'onlineNum'
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
                messageService.loadMsg(info.groupId,function(data){
                    chatService.socket.emit('loadMsg', data);//同步数据到客户端
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
            //信息传输
            socket.on('sendMsg',function(data){
                chatService.acceptMsg(data,socket);
            });
        });
    },
    /**
     * 接收信息数据
     */
    acceptMsg:function(data,socket){
        var userInfo=data.fromUser,groupId=userInfo.groupId;
        //如果首次发言需要登录验证(备注：微信取openId为userId，即验证openId）
        userService.checkUserLogin(userInfo,function(row){
            if(row){
                var tip=userService.checkUserGag(row);
                var currentDate = new Date();
                userInfo.publishTime = currentDate.getTime()+"_"+process.hrtime()[1];//产生唯一的id
                if(tip){
                    (socket||chatService.getSocket(groupId,userInfo)).emit('sendMsg',{fromUser:userInfo,uiId:data.uiId,value:tip,rule:true});
                    return false;
                }
                var sameGroupUserArr=userService.cacheUserArr[groupId];
                //验证规则
                userService.verifyRule(groupId,data.content,function(resultVal){
                    if(resultVal){//匹配规则，则按规则逻辑提示
                        console.log('resultVal:'+resultVal);
                        (socket||chatService.getSocket(groupId,userInfo)).emit('sendMsg',{fromUser:userInfo,uiId:data.uiId,value:resultVal,rule:true});
                    } else{
                        //保存聊天数据
                        messageService.saveMsg(data);
                        //发送聊天信息
                        if(data.content.msgType=='img'){
                            data.content.maxValue='';
                        }
                        var userInfoTmp=null,user=null,subRow=null,isBindWechatTmp=false,sendInfo=null;
                        var isValid=(common.isValid(userInfo.fromPlatform)&&constant.fromPlatform.pm_mis!=userInfo.fromPlatform)||(common.isBlank(userInfo.fromPlatform));
                        for(var i=0;i<sameGroupUserArr.length;i++){
                            user = sameGroupUserArr[i];
                            userInfoTmp=user.userInfo;
                            if(user.socket!=null){
                                if((!userInfo.socketId && userInfo.userId == userInfoTmp.userId)|| (userInfo.socketId && userInfo.socketId == user.socket.id)){//如果是自己，清空内容，告知客户端发送成功即可
                                    sendInfo={uiId:data.uiId,fromUser:userInfo,serverSuccess:true,content:{msgType:data.content.msgType,needMax:data.content.needMax}};
                                    //微信组用户如果没有绑定微信，进入聊天室小于5次，则弹出提示语
                                    if(constant.weChatGroupId==userInfoTmp.groupId && userInfoTmp.isNewIntoChat && isValid){
                                        userInfoTmp.isNewIntoChat=false;
                                        subRow = row.loginPlatform.chatUserGroup[0];
                                        isBindWechatTmp = subRow.isBindWechat;
                                        if (!isBindWechatTmp && Number(subRow.intoChatTimes) <= 5) {//没有绑定，小于5次，则调用goldApi检查是否绑定状态
                                            userService.checkAClient({accountNo: subRow.accountNo}, true, function (checkResult) {
                                                if (checkResult.flag == 5) {//已经绑定微信，更新状态
                                                    isBindWechatTmp = true;
                                                }
                                                userService.updateChatUserGroupWechat(groupId,userInfo.userId,isBindWechatTmp, (subRow.intoChatTimes + 1));
                                                sendInfo.isShowWechatTip={uiId:data.uiId,fromUser:userInfo,serverSuccess:true,isShowWechatTip:true,content:{msgType:data.content.msgType,needMax:data.content.needMax}};
                                                user.socket.emit('sendMsg',sendInfo);
                                            });
                                        }else{
                                            user.socket.emit('sendMsg',sendInfo);
                                        }
                                    }else{
                                        user.socket.emit('sendMsg',sendInfo);
                                    }
                                }else{
                                    user.socket.emit('sendMsg',{fromUser:userInfo,content:data.content});
                                }
                            }
                        }
                        userInfoTmp.isNewIntoChat=false;
                    }
                });
            }else{
                (socket||chatService.getSocket(groupId,userInfo)).emit('sendMsg',{isVisitor:true,uiId:data.uiId});
            }
        });
    },
    /**
     * 根据组id、用户id找对应socket
     * @param groupId
     * @param userInfo
     */
    getSocket:function(groupId,userInfo){
        var groupUserArr=userService.cacheUserArr[groupId],user=null;
        for(var i=0;i<groupUserArr.length;i++) {
            user = groupUserArr[i];
            if ((!userInfo.socketId && user.userInfo.userId == userInfo.userId)|| (userInfo.socketId && userInfo.socketId == user.socket.id)) {
                return user.socket;
            }
        }
        return null;
    },

    /**
     * 客户端通知信息
     * @param type
     * @param groupId
     * @param data
     */
    clientNotice:function(type,groupId,data){
        var groupRow=userService.cacheUserArr[groupId];
        if(groupRow){
            var sendData=data;
            if(chatService.noticeType.onlineNum==type){
                sendData={onlineUserNum:groupRow.length}
            }
            groupRow.forEach(function(row){
                row.socket.emit('notice',{type:type,data:sendData});
            });
        }
    },
    /**
     * 销毁访问主页的token
     * @param val
     */
    destroyHomeToken:function(val,callback){
        token.findOne({value:val},function (err,row) {
            if(err!=null||row==null){
                callback(false);
            }else{
                row.remove();
                callback(true);
            }
        });
    }
};
//导出服务类
module.exports =chatService;

