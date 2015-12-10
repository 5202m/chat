/**
 *
 * Created by Alan.wu on 2015/4/18.
 */
var config = {
    clusterWorkCount:4,//开启多进程个数，如果该参数大于系统内核个数，默认是开启(cpu核数-1)个进程
    sessionConfig:{key:'connect.sid',secret:'pm@chat'},//session 对应key,secret
    redisUrlObj:{ host: '192.168.35.236', port: 6379 },	//链接redis缓存客户端连接
    isAllowCopyHomeUrl:true,//是否允许copy链接（针对微信进入聊天室）
    pmApiUrl:'http://127.0.0.1:3000/api',//pmApi地址
    goldApiUrl: 'http://192.168.35.160/goldoffice_api/RESTful',//黄金api地址
    gwfxApiUrl:'http://192.168.35.115:8080/Goldoffice_api/RESTful',//外汇api地址
    simulateApiUrl:'http://192.168.35.160/goldoffice_api_demo/RESTful',//模拟账户api地址
    socketServerUrl:{webSocket:'http://127.0.0.1:3002',socketIO:'http://127.0.0.1:3003'},
    filesDomain: 'http://192.168.35.91:8090',//图片等文件访问域名
    web24kPath:'http://testweb1.24k.hk:8090',//24k信息地址
    //db
    dbURL:'mongodb://192.168.35.236/pm_mis',
    dbUserName:'pmmisuser',
    dbUserPWD:'pmmispwd123'
};
//导出配置类
module.exports =config;