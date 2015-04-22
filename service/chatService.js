var token = require('../models/token');//引入token数据模型
var common = require('../util/common');//引入common类
var userService = require('../service/userService');//引入userService服务类
var messageService = require('../service/messageService');//引入messageService服务类
/**
 * 聊天室服务类
 * 备注：处理聊天室接受发送的所有信息及其管理
 * author Alan.wu
 */
var chatService ={
    socket:null,
    init:function(){
        userService.synchGroupInfo();
        this.initSocket();
    },
    /**
     * 初始化socket
     */
    initSocket:function(){
        var app = require('express')();
        var server = require('http').Server(app);
        this.socket = require('socket.io')(server);
        server.listen(3002);
        console.log('the socket io is listenering on port 3002');
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
                if(groupRow!=null) {
                    var hasRow=false;
                    //检查用户是否在线
                    groupRow.forEach(function(row){
                        if(row.userInfo.userId==info.userId && socket.id==row.socket.id){
                            hasRow=true;
                            return false;
                        }
                    });
                    if(!hasRow) {
                        info.onlineDate=new Date();
                        //记录用户缓存信息
                        userService.cacheUserArr[info.groupId].push({socket: socket, userInfo: info});
                        //同步用户信息,在线状态设为1
                        info.onlineStatus='1';
                        userService.updateMemberInfo(info);
                        //加载已有内容
                        messageService.loadMsg(info.groupId,function(data){
                            chatService.socket.emit('loadMsg', data);//同步数据到客户端
                        });
                    }
                }else{
                    socket.emit('loadMsg',{fromUser:info,content:{type:'text',value:"参数异常，暂不能发言，请联系管理员！"},rule:true});
                }
            });
            //断开连接
            socket.on('disconnect',function(){
                //移除在线用户
                userService.removeOnlineUser(socket.id);
                console.log('disconnect,please check!');
            });
            //信息传输
            socket.on('sendMsg',function(data){
                var userInfo=data.fromUser,groupId=userInfo.groupId;
                //如果首次发言需要登录验证(备注：微信取openId为userId，即验证openId）
                userService.checkUserLogin(userInfo.userId,groupId,function(hasLogin){
                    if(hasLogin){
                        var sameGroupUserArr=userService.cacheUserArr[groupId];
                        var user=null;
                        var currentDate=new Date();
                        userInfo.publishTime=currentDate.getTime()*1000+currentDate.getMilliseconds();//产生唯一的id
                        //验证规则
                        userService.verifyRule(groupId,data.content,function(resultVal){
                            if(resultVal){//匹配规则，则按规则逻辑提示
                                console.log('resultVal:'+resultVal);
                                socket.emit('sendMsg',{fromUser:userInfo,content:{type:'text',value:resultVal},rule:true});
                            } else{
                                for(var i=0;i<sameGroupUserArr.length;i++){
                                    user = sameGroupUserArr[i];
                                    if(user.socket!=null){
                                        user.socket.emit('sendMsg',{fromUser:userInfo,content:data.content});
                                    }
                                }
                                //保存聊天数据
                                messageService.saveMsg(data);
                            }
                        });
                    }else{
                        socket.emit('sendMsg',{isVisitor:true,socketId:socket.id});
                    }
                });

            });
        });
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
                //row.remove();
                callback(true);
            }
        });
    }
};
//导出服务类
module.exports =chatService;

