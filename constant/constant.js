/**
 * Created by Administrator on 2015/5/5.
 */
var constant={
    fromPlatform:{//来源平台,区分系统用户登录来源
        pm_mis:'pm_mis',//后台
        wechat:'wechat',//黄金微解盘
        fxchat:'fxchat',//外汇微解盘
        studio:'studio',//pm直播间
        fxstudio:'fxstudio',//fx直播间
        hxstudio:'hxstudio'//hx直播间
    },
    tempPlatform:{//模板对应的平台，与config文件对应defTemplate 对应
      pc:'pc',
      mb:'mb',
      admin:'admin',
      mini:'mini',
      webui:'webui'
    },
    clientGroup:{//客户类别
      vip:'vip',
      active : 'active', //真实客户-激活
      notActive : 'notActive', //真实客户-未激活
      real:'real',//真实用户
      simulate:'simulate',//模拟用户
      register:'register',//注册用户
      visitor:'visitor'//游客
    },
    clientGroupSeq:{//客户类别序列
        vip:7,
        active : 6, //真实客户-激活
        notActive : 5, //真实客户-未激活
        real:4,//真实用户
        simulate:3,//模拟用户
        register:2,//注册用户
        visitor:1//游客
    },
    pushInfoPosition:{//信息推送位置
        taskbar:0,//任务栏
        whBox:1,//私聊框
        talkBox:3,//公聊框
        videoBox:4//视频框
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
    gwApiInvoker:{//公司内存restful接口对应的invoker
        fx_website:{key:'fx_website',value:'2ac168bbb45d396a3315d95aa4215191'},//外汇
        fx_website_demo:{key:'fx_website_demo',value:'06639931e8e5f56c3572956f014882ba'},//外汇
        hx_website:{key:"hx_website",value:"7070e594b6e33cba86d99c8dd963dd81"},//恒信
        hx_website_demo:{key:"hx_website_demo",value:"4aa8e9b29196e52f7c3a073c3dc5ae56"}//恒信
    },
    chatGrout:{
        dict_chat_group_type: 'chat_group_type'//组类别
    },
    md5Key : "GOLDENWAY"
};
//导出常量类
module.exports =constant;