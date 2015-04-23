/**
 *
 * Created by Alan.wu on 2015/4/18.
 */
var config = {
    weChatGroupId:'wechat',
    //gwapi
    goldApiHostname: '192.168.35.160',
    goldApiPort:80,
    getCustomerInfoUrl:'/goldoffice_api/RESTful/account/getCustomerInfo',
    socketServerUrl:'http://172.30.6.22:3002',

    //db
    dbURL:'mongodb://192.168.35.236/cms',
    dbUserName:'',
    dbUserPWD:''
};
//导出常量类
module.exports =config;

