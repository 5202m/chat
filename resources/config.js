/**
 *
 * Created by Alan.wu on 2015/4/18.
 */
var config = {
    clusterWorkCount:2,//开启多线程个数，如果该参数大于系统内核个数，默认是开启(cpu核数-1)个线程
    sessionConfig:{key:'connect.sid',secret:'pm@chat'},//session 对应key,secret
    redisUrlObj:{ host: '192.168.35.236', port: 6379 },	//链接redis缓存客户端连接
    isAllowCopyHomeUrl:false,//是否允许copy链接（针对微信进入聊天室）
    pmApiUrl:'http://113.28.105.65:3000/api',//pmApi地址
    goldApiUrl: 'http://192.168.35.160/goldoffice_api/RESTful',//gwapi地址
    gwfxGTS2ApiUrl:'http://192.168.35.115:8080/Goldoffice_api/RESTful',//外汇GTS2 Api地址
    gwfxMT4ApiUrl:'http://192.168.75.40:8081/GwfxApi/RESTful',//外汇MT4 Api地址
    simulateApiUrl:'http://192.168.35.160/goldoffice_api_demo/RESTful',//模拟账户api地址
    socketServerUrl:{webSocket:'http://113.28.105.65:3002',socketIO:'http://113.28.105.65:3003'},
    liveUrl:"http://ct.phgsa.cn/live/01/playlist.m3u8",//手机直播地址
    filesDomain: 'http://113.28.105.65:8090',//图片等文件访问域名
    web24kPath:'http://testweb1.24k.hk:8090',//24k信息地址
    packetAcUrl:'http://testweb1.24k.hk/activity20160105/getActivityUrl',//红包活动连接
    mobile24kPath:'http://testweb1.24k.hk:8092',//24k信息地址 http://m.24k.hk
    //db
    dbURL:'mongodb://192.168.35.236/pm_mis',
    dbUserName:'pmmisuser',
    dbUserPWD:'pmmispwd123'
};
//导出配置类
module.exports =config;