/**
 *
 * Created by Alan.wu on 2015/4/18.
 */
var config = {
    weChatGroupId:'wechat',//微信组id
    chatIndexUrl:{//聊天室主页路径
        wechat:'chat/wechat'
    },
    pmApiUrl:'http://218.213.241.84:3000/api',//pmApi地址
    goldApiHostname: '192.168.35.160',//gwapi地址
    goldApiPort:80,
    getCustomerInfoUrl:'/goldoffice_api/RESTful/account/getCustomerInfo',
    socketServerUrl:'http://218.213.241.84:3002',
    //db
    dbURL:'mongodb://192.168.35.236/cms',
    dbUserName:'',
    dbUserPWD:''
};
//导出常量类
module.exports =config;

