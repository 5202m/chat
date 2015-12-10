/**
 * 路由入口
 * @type {exports}
 */
var wechatRoutes = require('./web/wechat');//配置同源页面路由
var studioRoutes = require('./web/studio');//配置同源页面路由
var apiChatRoutes = require('./api/chatAPI');//配置聊天室api路由
/**
 * 初始化入口
 * @param app
 */
exports.init = function(app){
    app.use(['/wechat','/fxchat'], wechatRoutes);//贵金属、外汇微解盘共享路由代码
    app.use('/api', apiChatRoutes);
    app.all('/studio/*', function(req, res, next) {//拦截非登录用户使用登录操作
        if((!req.session.studioUserInfo || (req.session.studioUserInfo && !req.session.studioUserInfo.isLogin)) && "/studio/resetPwd,/studio/logout".indexOf(req.url)!=-1){
            res.redirect("/studio");
        }else{
            next();
        }
    });
    app.use('/studio', studioRoutes);
    //用于session的刷新，防止session过期用户掉线，暂未使用（对应前台common.js的refreshSession方法）
    app.get('/refreshSession', function(req, res) {
        res.end();
    });
};
