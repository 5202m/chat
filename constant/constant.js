/**
 * Created by Administrator on 2015/5/5.
 */
var constant={
    fromPlatform:{//来源平台,区分系统用户登录来源
        pm_mis:'pm_mis',//后台
        wechat:'wechat',//黄金微解盘
        fxchat:'fxchat',//外汇微解盘
        studio:'studio'//直播间
    },
    clientGroup:{//客户类别
      vip:'vip',
      real:'real',//真实用户
      simulate:'simulate',//模拟用户
      register:'register',//注册用户
      visitor:'visitor'//游客
    },
    pushInfoPosition:{//信息推送位置
        taskbar:0,//任务栏
        whBox:1//私聊框
    },
    pwdKey:'pm_chat_pwd',//密码加密key
    systemUserPrefix:'sys_',//微信前台登录，系统用户默认前缀
    roleUserType:{ //角色与聊天室用户类别对应关系
        visitor:-1,
        member:0,//前台会员
        admin:1,//管理员
        analyst:2, //分析师
        cs:3, //客服
        navy:4//水军
    },
    chatPraiseType:{//点赞类型
        user:'user',//用户
        article:'article'//文章
    },
    goldOrfxApiInvoker:{//黄金外汇restful接口对应的invoker
        fx_website:{key:'fx_website',value:'2ac168bbb45d396a3315d95aa4215191'}//外汇网站
    }
};
//导出常量类
module.exports =constant;