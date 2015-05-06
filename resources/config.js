/**
 *
 * Created by Alan.wu on 2015/4/18.
 */
var config = {
    pmApiUrl:'http://218.213.241.84:3000/api',//pmApi地址
    goldApiHostname: '192.168.35.160',//gwapi地址
    goldApiPort:80,
    getCustomerInfoUrl:'/goldoffice_api/RESTful/account/getCustomerInfo',
    socketServerUrl:'http://127.0.0.1:3002',
    //db
    dbURL:'mongodb://192.168.35.236/cms',
    dbUserName:'',
    dbUserPWD:''
};
//导出配置类
module.exports =config;

