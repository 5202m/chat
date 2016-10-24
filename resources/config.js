/**
 *
 * Created by Alan.wu on 2015/4/18.
 */
var config = {
    studioThirdUsed:{//第三方引用直播间默认房间
        platfrom:'webui,app,pc,web24k',
        webui:'webui', //直播间中studio.js中针对webui不跳转到mini版本
        web24k:'web24k', //api中课程表信息，web24k只取一条课程记录
        roomId:{
            studio : 'studio_teach',
            fxstudio : 'fxstudio_11',
            hxstudio : 'hxstudio_26'
        }
    },
    defTemplate:{
        pm:{usedNum:4,pc:'theme1',mb:'theme2',mini:'theme3',webui:'theme4',routeKey:'/studio',host:'pmchat.24k.hk'},
        fx:{usedNum:4,pc:'theme1',mb:'theme2',mini:'',webui:'theme4',routeKey:'/fxstudio',host:'chat.gwfx.com'},
        hx:{usedNum:4,pc:'theme1',mb:'theme2',mini:'',webui:'theme4',routeKey:'/hxstudio',host:'handan.hx9999.com'}
    },//默认模板设置,//默认模板设置
    utm : {
        smsUrl : "http://testweboa.gwfx.com:8088/GwUserTrackingManager_NEW/smsTemplate/send", //http://das.gwfx.com/smsTemplate/send
        emailUrl : "http://testweboa.gwfx.com:8088/GwUserTrackingManager_NEW/emailTemplate/send", //http://das.gwfx.com/emailTemplate/send
        cstGroupUrl : "http://testweboa.gwfx.com:8088/GwUserTrackingManager_NEW/customerGroup/updateCustomer", //http://das.gwfx.com/customerGroup/updateCustomer
        fxstudio : {
            sid : "fa573c78eaa8402cb6c84dabfcce7158",
            token : "8867af2616da47d7927ff0df7ea60668"
        },
        studio : {
            sid : "fa573c78eaa8402cb6c84dabfcce7159",
            token : "8867af2616da47d7927ff0df7ea60669"
        }
    },//UTM系统信息
    isDevTest:true,//是否开发或测试环境
    clusterWorkCount:2,//开启多线程个数，如果该参数大于系统内核个数，默认是开启(cpu核数-1)个线程
    sessionConfig:{key:'connect.sid',secret:'pm@chat'},//session 对应key,secret
    redisUrlObj:{ host: '192.168.35.236', port: 6379 },	//链接redis缓存客户端连接
    isAllowCopyHomeUrl:true,//是否允许copy链接（针对微信进入聊天室）
    pmApiUrl:'http://192.168.35.91:3000/api',//pmApi地址
    goldApiUrl: 'http://192.168.35.160/goldoffice_api/RESTful',//gwapi地址
    gwfxGTS2ApiUrl:'http://192.168.35.100:8083/Midoffice_fx_api/RESTful',//外汇GTS2 Api地址
    gwfxGTS2SmApiUrl:'http://192.168.35.99:8080/Goldoffice_demo_api/RESTful',//外汇GTS2 模拟场 Api地址  真实地址:http://gts2apidemo.gwfx.com/Goldoffice_api
    gwfxMT4ApiUrl:'http://192.168.75.40:8081/GwfxApi/RESTful',//外汇MT4 Api地址
    gwfxMT4SmApiUrl:'http://192.168.75.40:8081/GwfxApi/RESTful',//外汇MT4 Api地址
    simulateApiUrl:'http://192.168.35.160/goldoffice_api_demo/RESTful',//模拟账户api地址  真实地址:http://gts2apidemo.24k.hk/Goldoffice_api/RESTful
    hxGTS2ApiUrl:'http://192.168.35.100:8083/Midoffice_hx_api/RESTful',//恒信GTS2 Api地址 真实地址http://gts2api.hx9999.com/Goldoffice_api/RESTful gts2api.hx9999.com -> 192.168.42.164
    hxGTS2SmApiUrl:'http://192.168.35.99:8080/Goldoffice_demo_api/RESTful',//恒信GTS2 真实地址 http://gts2apidemo.hx9999.com/Goldoffice_api/RESTful
    hxMT4ApiUrl:'http://hxapi.hx9999.com',//恒信MT4 Api地址 http://hxapi.hx9999.com
    hxApiLoginSid:{apiLogin:'handan',apiPassword:'abc123'},
    socketServerUrl:{webSocket:'http://127.0.0.1:3002',socketIO:'http://127.0.0.1:3003'},
    filesDomain: 'http://192.168.35.91:8090',//图片等文件访问域名
    web24kPath:'http://testweb1.24k.hk:8090',//24k信息地址
    packetAcUrl:'http://testweb1.24k.hk/activity20160105/getActivityUrl',//红包活动连接
    mobile24kPath:'http://testweb1.24k.hk:8092',//24k信息地址 http://m.24k.hk
    //db
    dbURL:'mongodb://192.168.35.236/pm_mis',
    dbUserName:'pmmisuser',
    dbUserPWD:'pmmispwd123'
};
//导出配置类
module.exports =config;