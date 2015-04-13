/*＃＃＃＃＃＃＃＃＃＃引入所需插件＃＃＃＃＃＃＃＃begin */
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var mongoose = require('mongoose');
/*＃＃＃＃＃＃＃＃＃＃引入所需插件＃＃＃＃＃＃＃＃end */

/*＃＃＃＃＃＃＃＃＃＃路由入口设置＃＃＃＃＃＃＃＃begin */
var webRoutes = require('./routes/web/');//配置同源页面路由
var apiChatRoutes = require('./routes/api/chatAPI');//配置聊天室api路由

/*＃＃＃＃＃＃＃＃＃＃引入所需插件＃＃＃＃＃＃＃＃end */


/*＃＃＃＃＃＃＃＃＃＃定义app配置信息＃＃＃＃＃＃＃＃begin */
var app = express();
//设置跨域访问
/*app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1');
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});*/
// view engine setup(定义页面，使用html）
app.set('views', path.join(__dirname, 'views'));
/*app.set('view engine', 'ejs');*/
app.set( 'view engine', 'html' );
app.engine('.html',require('ejs').__express);//两个下划线
// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use(express.static(path.join(__dirname, 'views')));如需要设成静态目录，则这就去掉注释。（备注：设为静态目录，不能动态填充数据）
/*---------------- 外部链接路由的路径 ---------------- begin */
app.use('/', webRoutes);
app.use('/api/chat/', apiChatRoutes);
/*----------------  外部链接路由的路径 ---------------- end */

// catch 404 and forward to error handler （400请求错误处理）
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace （开发模式）
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user（500请求错误处理）
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
/*＃＃＃＃＃＃＃＃＃＃定义app配置信息＃＃＃＃＃＃＃＃end */

/*＃＃＃＃＃＃＃＃＃＃数据库连接配置＃＃＃＃＃＃＃＃begin */
mongoose.connect('mongodb://192.168.35.236/cms');
/*＃＃＃＃＃＃＃＃＃＃数据库连接配置＃＃＃＃＃＃＃＃end */

module.exports = app;
