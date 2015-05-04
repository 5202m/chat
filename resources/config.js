/**
 *
 * Created by Alan.wu on 2015/4/18.
 */
var config = {
    weChatGroupId:'wechat',//微信组id
    chatIndexUrl:{//聊天室主页路径
        wechat:'chat/wechat'
    },
    fromPlatform:{//来源平台,区分系统用户登录来源
        pm_mis:'pm_mis',
        wechat:'wechat'
    },
    systemUserPrefix:'sys_',//微信前台登录，系统用户默认前缀
    roleUserType:{ //角色与聊天室用户类别对应关系
        member:0,//会员
        admin:1,//管理员
        analyst:2 //分析师
    },
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
//导出常量类
module.exports =config;

