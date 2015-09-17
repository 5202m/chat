/**
 * Created by Administrator on 2015/5/5.
 */
var constant={
    weChatGroupId:'wechat',//微信组id
    chatIndexUrl:{//聊天室主页路径
        wechat:'chat/wechat',
        studio:'chat/studioChat',
        pm_finance:'chat/index'
    },
    socketSpaceSuffix:"Group",//socket命名空间后缀
    fromPlatform:{//来源平台,区分系统用户登录来源
        pm_mis:'pm_mis',//后台
        wechat:'wechat',//微信
        studio:'studio'//直播间
    },
    clientGroup:{//客户类别
      vip:'vip',
      real:'real',//真实用户
      simulate:'simulate',//模拟用户
      register:'register',//注册用户
      visitor:'visitor'//游客
    },
    pwdKey:'pm_chat_pwd',//密码加密key
    systemUserPrefix:'sys_',//微信前台登录，系统用户默认前缀
    roleUserType:{ //角色与聊天室用户类别对应关系
        member:0,//会员
        admin:1,//管理员
        analyst:2, //分析师
        cs:3 //客服
    },
    chatPraiseType:{//点赞类型
        user:'user',//用户
        article:'article'//文章
    }
};
//导出常量类
module.exports =constant;