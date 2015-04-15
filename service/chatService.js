var chatContent = require('../models/chatContent');//引入chatContent数据模型
var chatGroup = require('../models/chatGroup');//引入chatGroup数据模型
var token = require('../models/token');//引入token数据模型
var common = require('../util/common');//引入common类
var userService = require('../service/userService');//引入userService服务类
/**
 * 聊天室服务类
 * 备注：处理聊天室接受发送的所有信息及其管理
 * author Alan.wu
 */
var chatService ={
    socket:null,
    cacheUserArr:[],//按组别分类保存用户信息的二维数组
    groupList:{},//组别类型(从数据库中提取，更新到该缓存中）
    init:function(){
        this.updateGroupInfo();
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
     * 根据平台初始化用户缓存集合
     */
    initCacheUserArr:function(groupId){
        if(chatService.cacheUserArr.length==0){//不存在数据，则初始化
            for(var index in this.groupList){
                this.cacheUserArr[this.groupList[index]._id]=[];
            }
        }else{//存在数据，则不同更新cacheUserArr数据
            var row=null;
            var newCacheUserArr=[];
            var gId=null;
            for(var gIndex in this.groupList){
                gId=this.groupList[index]._id;
                row=this.cacheUserArr[gId];
                if(row!=null && row!=undefined && row.length>0){
                    newCacheUserArr[gId]=row;
                }else{
                    newCacheUserArr[gId]=[];
                }
            }
            if(newCacheUserArr.length>0){
                chatService.cacheUserArr=newCacheUserArr;
            }
        }
    },
    /**
     * 设置socket连接相关信息
     */
    setSocket: function () {
        //连接socket，并处理相关操作
        this.socket.on('connection', function(socket){
            //登录(缓存用户信息）
            socket.on('login',function(info){
                var groupRow=chatService.cacheUserArr[info.groupId];

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
                        chatService.cacheUserArr[info.groupId].push({socket: socket, userInfo: info});
                        //记录用户信息,在线状态设为1
                        info.onlineStatus='1';
                        chatService.synchMemberInfo(info);
                        //加载已有内容
                        chatService.loadMsg(info.groupId);
                    }
                }else{
                    socket.emit('loadMsg',"参数异常，暂不能发言，请联系管理员！");
                }
            });
            //断开连接
            socket.on('disconnect',function(){
                //移除在线用户
                chatService.removeOnlineUser(socket);
                console.log('disconnect,please check!');
            });
            //信息传输
            socket.on('sendMsg',function(data){
                console.log('server data:'+data.msg);
                var userInfo=data.fromUser;
                var sameGroupUserArr=chatService.cacheUserArr[userInfo.groupId];
                var user=null;
                userInfo.publishDate=new Date();
                userInfo["id"]=userInfo.publishDate.getTime()*1000+userInfo.publishDate.getMilliseconds();//产生唯一的id
                //验证规则
                chatService.verifyRule(userInfo.groupId,data.msg,function(resultVal){
                    if(resultVal){//匹配规则，则按规则逻辑提示
                        console.log('resultVal:'+resultVal);
                        socket.emit('sendMsg',{fromUser:userInfo,msg:resultVal,rule:true});
                    } else{
                        for(var i=0;i<sameGroupUserArr.length;i++){
                            user = sameGroupUserArr[i];
                            if(user.socket!=null){
                                user.socket.emit('sendMsg',{fromUser:userInfo,msg:data.msg});
                            }
                        }
                        //保存聊天数据
                        chatService.saveMsg(data);
                    }
                });
            });
        });
    },
    //移除在线用户
    removeOnlineUser:function(socket){
        //从缓存中移除
        var groupArr=chatService.cacheUserArr;
        var subArr=null,obj=null;
        var userInfo=null;
        for(var i in groupArr){
            subArr=groupArr[i];
            for(var k=0;k<subArr.length;k++){
                obj=subArr[k];
                if(obj.socket.id==socket.id){
                    subArr.splice(k,1);
                    userInfo=obj.userInfo;
                }
            }
        }
        //更新用户记录表的在线状态(下线设置为0）
        if(userInfo!=null) {
            userService.updateChatUserGroupStatus(userInfo, '0', function (err) {
                if(!err){
                    console.log("update member status success!");
                }
            });
        }
    },
    /**
     * 记录会员信息（包括记录会员的登录状态，在线情况，昵称，用户名等）
     * @param info
     */
    synchMemberInfo:function(info){
        userService.saveChatUserGroupInfo(info,function(err){
            if(!err){
                console.log("save member success!");
            }
        });
    },
    /**
     * 更新组别数据（如后台有改动会同步组别数据）
     */
    updateGroupInfo:function(){
        chatGroup.find({valid:1},function (err,row) {
            chatService.groupList=row;
            chatService.initCacheUserArr();//初始化数组
        });
    },
    /**
     * 从数据库中加载已有的聊天记录
     */
    loadMsg:function(groupId){
        chatContent.find().where('groupId').equals(groupId).where('status').equals(1).limit(100).sort({'id':'desc'}).exec(function (err,row) {
            chatService.socket.emit('loadMsg',row);//同步数据到客户端
        });
    },
    /**
     * 保存内容到数据库中
     */
    saveMsg:function(data){
        var userInfo=data.fromUser;
        var row={
            _id:userInfo.id,
            userId:userInfo.userId,
            nickname:userInfo.nickname,
            avatar:userInfo.avatar,
            userType:userInfo.userType,
            groupId:userInfo.groupId,
            content:data.msg, //内容
            status:1, //内容状态：0 、禁用 ；1、启动
            publishDate:userInfo.publishDate, //发布日期
            createUser:userInfo.userId,
            createIp:userInfo.createIp,//新增记录的Ip
            createDate:new Date() //创建日期
        };
        chatContent.create(row,function(){
            console.log('save chatContent success!');
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
    },
    /**
     * 验证规则
     */
    verifyRule:function(groupId,msg,callback){
        chatGroup.findById(groupId,function (err,row) {
            var ruleArr=row.chatRules,resultTip=[],beforeVal='',type='';
            var periodStartDate= 0,periodEndDate= 0,currentTime= 0;
            //先检查禁止发言的规则
            for(var i in ruleArr){
                beforeVal=ruleArr[i].beforeRuleVal;
                type=ruleArr[i].type;
                periodStartDate=ruleArr[i].periodStartDate;
                periodEndDate=ruleArr[i].periodEndDate;
                currentTime=new Date().getTime();
                var isNullPeriod=(periodStartDate==null && periodEndDate==null);
                var isPeriod=periodStartDate!=null && currentTime>=periodStartDate.getTime() && periodEndDate!=null && currentTime<=periodEndDate.getTime();
                if(isPeriod && type=='speak_not_allowed'){
                    resultTip=[];
                    resultTip.push(ruleArr[i].afterRuleTips);
                    break;
                }
                if((isNullPeriod || isPeriod) && type!='speak_not_allowed' && common.isValid(beforeVal)){
                    beforeVal=beforeVal.replace(/(,|，)$/,'');//去掉结尾的逗号
                    beforeVal=beforeVal.replace(/,|，/g,'|');//逗号替换成|，便于统一使用正则表达式
                    if(type=='keyword_filter'){//过滤关键字
                        if(eval('/'+beforeVal+'/').test(msg)){
                            resultTip.push(ruleArr[i].afterRuleTips);
                            break;
                        }
                    }
                    if(type=='keyword_replace'){//替换关键字
                        if(eval('/'+beforeVal+'/').test(msg)){
                            msg=msg.replace(eval('/'+beforeVal+'/g'),ruleArr[i].afterRuleVal);
                            resultTip.push(ruleArr[i].afterRuleTips);
                        }
                    }
                }
            }
            callback(resultTip.join(";"));
        });
    }
};
//导出服务类
module.exports =chatService;

