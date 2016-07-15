/*＃＃＃＃＃＃＃＃＃＃引入所需插件＃＃＃＃＃＃＃＃begin */
var express = require('express');
var bodyParser = require('body-parser');
/*＃＃＃＃＃＃＃＃＃＃定义app配置信息＃＃＃＃＃＃＃＃begin */
global.rootdir=__dirname;
var app = express();
// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json({limit: '50mb'}));//最大传输量
app.use(bodyParser.urlencoded({ extended: false }));
//设置session
require('./routes/chatSession').startSession(app);
require('./routes/index').init(app,express);//配置同源页面路由
// catch 404 and forward to error handler （400请求错误处理）
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    res.render('error',{error: '请求错误:'+err.status,reqPath:req.path.replace(/\/(.*studio)(\/.*)?/g,"$1")});
    //next(err);
});
// error handlers
// no stacktraces leaked to user（500请求错误处理）
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: '500错误，请联系客服！'
    });
});
/*＃＃＃＃＃＃＃＃＃＃定义app配置信息＃＃＃＃＃＃＃＃end */

module.exports = app;
