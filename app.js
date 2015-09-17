/*＃＃＃＃＃＃＃＃＃＃引入所需插件＃＃＃＃＃＃＃＃begin */
var express = require('express');
var path = require('path');
var logger=require('./resources/logConf');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var mongoose = require('mongoose');
var config=require('./resources/config');//资源文件

/*＃＃＃＃＃＃＃＃＃＃定义app配置信息＃＃＃＃＃＃＃＃begin */
var app = express();
// view engine setup(定义页面，使用html）
app.set('views', path.join(__dirname, 'views'));
app.set( 'view engine', 'html' );
app.engine('.html',require('ejs').__express);//两个下划线
// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json({limit: '50mb'}));//最大传输量
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
logger.use(app);//配置框架日志输出
//session设置
app.use(session({
   secret: 'pm@chat',
   //name: 'pm@chat',   //这里的name值得是cookie的name，默认cookie的name是：connect.sid
    //cookie: {maxAge: 90000 },  //设置maxAge是80000ms，即90s后session和相应的cookie失效过期
    resave: false,
    saveUninitialized: true
}));
require('./routes/index').init(app);//配置同源页面路由
// catch 404 and forward to error handler （400请求错误处理）
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    res.render('error',{error: '请求错误:'+err.status});
    //next(err);
});
// error handlers
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
var dbOptions = {
    server: {auto_reconnect: true, poolSize: 5 },
    user: config.dbUserName,
    pass: config.dbUserPWD
};
mongoose.connect(config.dbURL,dbOptions);
/*＃＃＃＃＃＃＃＃＃＃数据库连接配置＃＃＃＃＃＃＃＃end */

module.exports = app;
