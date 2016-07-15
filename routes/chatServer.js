var chatService = require('../service/chatService');//引入chatService
var config=require('./../resources/config');//资源文件
/**
 * 聊天室服务器
 * 备注：处理聊天室接受发送的所有信息及其管理
 * author Alan.wu
 */
var chatServer ={
    /**
     * 启动服务器
     * @param server
     */
    start:function(server){
        chatService.socket=require('socket.io')(server);
        var adapter = require('socket.io-redis');
        chatService.socket.adapter(adapter({host: config.redisUrlObj.host, port: config.redisUrlObj.port }));
        if(chatService.socket){
            chatService.init();//初始化
        }
    },
    /**
     * 停止服务
     */
    stop:function(){
        chatService.socket.close();
    }
};
//导出服务
module.exports =chatServer;

