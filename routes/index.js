/**
 * 路由入口
 * @type {exports}
 */
var apiChatRoutes = require('./api/chatAPI');//配置聊天室api路由
var adminRoutes = require('./web/admin');//配置同源页面路由
var path = require('path');
/**
 * 初始化入口
 * @param app
 */
exports.init = function(app,express){
    /**
     * 设置静态目录映射
     */
    var dirname=global.rootdir;
    app.use('/base',express.static(path.join(dirname, 'template/base')));
    app.use('/admin',express.static(path.join(dirname, 'template/admin/static')));
    var config=require('../resources/config');//资源文件
    /**
     * 域名拦截跳转
     */
    app.all('/', function(req, res, next) {
        var defTmpObj=null;
        for(var key in config.defTemplate){
            defTmpObj=config.defTemplate[key];
            if(defTmpObj.host==req.hostname){
                res.redirect(defTmpObj.routeKey);
                return;
            }
        }
        next();
    });
    /**
     * 设置路由入口拦截
     */
    app.all('/studio|fxstudio|hxstudio', function(req, res, next) {
        var useSession=req.session.studioUserInfo;
        var currGroupType=req.path.replace(/\/(.*studio)(\/.*)?/g,"$1");
        if(useSession && useSession.groupType && currGroupType!=useSession.groupType){//请求访问的直播间类别有变化，清除session
            console.log("req.path:"+req.path);
            req.session.studioUserInfo=null;
            if(req.query["platform"]){
                next();
            }else{
                res.redirect("/"+currGroupType);
            }
        }else{
            next();
        }
    });
    var tempPrefix=null,defTemp=null,viewPathArr=[];
    var baseRouter=require('./web/base');
    for(var key in config.defTemplate){
        defTemp=config.defTemplate[key];
        for(var i=1;i<=defTemp.usedNum;i++){
            tempPrefix='/'+key+'/theme'+i;
            viewPathArr.push(path.join(dirname, 'template'+tempPrefix+'/view'));
            app.use(tempPrefix,express.static(path.join(dirname, 'template'+tempPrefix+'/static')));
        }
        app.use(defTemp.routeKey,require('./web/'+key),baseRouter);
        if(key=='hx' && Object.getOwnPropertyNames(config.defTemplate).length==1){
            app.all('/v/HXPM',function(req, res, next) {
                res.redirect(defTemp.routeKey);
            });
        }
    }
    /**
     * 设置路由入口
     */
    app.use('/api', apiChatRoutes);
    app.use('/admin', adminRoutes,baseRouter);
    viewPathArr.push(path.join(dirname, 'template/admin/view'));//设置后台模板
    /**
     * 设置模板映射
     */
    app.set('views', viewPathArr);
    app.set( 'view engine', 'html' );
    app.engine('.html',require('ejs').__express);//两个下划线
};
