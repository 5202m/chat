/**
 *
 * Created by Alan.wu on 2015/4/18.
 */
var config = {
    isAllowCopyHomeUrl:true,//是否允许copy链接（针对微信进入聊天室）
    pmApiUrl:'http://172.30.6.22:3000/api',//pmApi地址
    goldApiUrl: 'http://192.168.35.160/goldoffice_api/RESTful',//gwapi地址
    simulateApiUrl:'http://192.168.35.160/goldoffice_api_demo/RESTful',//模拟账户api地址
    socketServerUrl:'http://172.30.6.22:3002',
    filesDomain: 'http://192.168.35.91:8090',//图片等文件访问域名
    web24kPath:'http://testweb1.24k.hk:8090',//24k信息地址
    //db
    dbURL:'mongodb://192.168.35.236/pm_mis',
    dbUserName:'pmmisuser',
    dbUserPWD:'pmmispwd123'
};
//导出配置类
module.exports =config;