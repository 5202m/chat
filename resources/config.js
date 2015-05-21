/**
 *
 * Created by Alan.wu on 2015/4/18.
 */
var config = {
    isAllowCopyHomeUrl:true,//是否允许copy链接（针对微信进入聊天室）
    pmApiUrl:'http://218.213.241.84:3000/api',//pmApi地址
    goldApiUrl: 'http://192.168.35.160/goldoffice_api/RESTful',//gwapi地址
    socketServerUrl:'http://127.0.0.1:3002',
    //db
    dbURL:'mongodb://192.168.35.236/pm_mis',
    dbUserName:'pmmisuser',
    dbUserPWD:'pmmispwd123'
};
//导出配置类
module.exports =config;

