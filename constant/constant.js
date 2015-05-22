/**
 * Created by Administrator on 2015/5/5.
 */
var constant={
    weChatGroupId:'wechat',//微信组id
    chatIndexUrl:{//聊天室主页路径
        wechat:'chat/wechat',
        pm_finance:'chat/index'
    },
    fromPlatform:{//来源平台,区分系统用户登录来源
        pm_mis:'pm_mis',
        wechat:'wechat'
    },
    systemUserPrefix:'sys_',//微信前台登录，系统用户默认前缀
    roleUserType:{ //角色与聊天室用户类别对应关系
        member:0,//会员
        admin:1,//管理员
        analyst:2, //分析师
        cs:3 //客服
    }
};
//导出常量类
module.exports =constant;