var config=require('./../resources/config');//资源文件
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
/**
 * 聊天室session共享类
 * 备注：处理session所有信息及其管理
 * author Alan.wu
 */
var chatSession ={
    session:null,
    cookieParser:null,
    /** session开启入口
     * 启动session
     * @param app
     */
    startSession:function(app){
        this.startRedisSession();
        if(app){
            app.use(this.cookieParser);
            app.use(this.session);
            app.session=this.session;
        }
    },
    /**
     * 启动redis共享session
     * 备注：数据库中无效的Session，设置有效期为一天
     */
    startRedisSession:function(){
        var RedisStore = require('connect-redis')(expressSession),
            store=new RedisStore({
                host: config.redisUrlObj.host,
                port: config.redisUrlObj.port,
                db:2,//使用2号库
                ttl: 60*60*24 //redis数据库中无效的Session，设置有效期为一天。
            });
        this.initSession(store);
    },
    /**
     * 启动内存共享session
     */
    startMemorySession:function(){
        this.initSession(new expressSession.MemoryStore());
    },
    /**
     * 启动Express session
     */
    startExpressSession:function(){
        this.initSession(null);
    },
    /**
     * 初始化session
     * @param store
     */
    initSession:function(store){
        var sessionSettings={
            key: config.sessionConfig.key,
            secret: config.sessionConfig.secret,
            resave: true,
            saveUninitialized: true
            /*,cookie: {maxAge: 30000} 已在startRedisSession中设置，无需再次设置*/
        };
        if(store){
            sessionSettings.store=store;
        }
        this.cookieParser=cookieParser(config.sessionConfig.secret);
        this.session=expressSession(sessionSettings);
    }
};
//导出服务
module.exports =chatSession;

