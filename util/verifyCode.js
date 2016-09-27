/**
 * 验证码通用方法
 * @type {exports}
 * author:alan.wu
 */
var Canvas = require('canvas');
/**
 * 随机数转换(浮点数）
 * @param start
 * @param end
 * @returns {*}
 */
var randFloat = function(start, end) {
    return start + Math.random() * (end - start);
};

/**
 * 随机数转换(整数）
 * @param start
 * @param end
 * @returns {*}
 */
var randInt = function(start, end) {
    return Math.floor(Math.random() * (end - start)) + start;
}

/**
 * 验证码通用方法
 * @param W
 * @param H
 * @returns {{}}
 * @constructor
 */
exports.Generate = function(W,H) {
    var retObj={};
    try{
        var canvas = new Canvas(W, H);
        var ctx = canvas.getContext('2d');
        var items = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPRSTUVWXYZ23456789'.split('');
        var vCode =[];

        //设置背景色
        ctx.fillStyle = '#f3fbfe';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = .8;
        ctx.font = '5px sans-serif';
        //填充背花纹
        for (var i = 0; i < 10; i++) {
            ctx.fillStyle = 'rgb(' + randInt(150, 225) + ',' + randInt(150, 225) + ',' + randInt(150, 225) + ')';
            for (var j = 0; j < 5; j++) {
                ctx.fillText(items[randInt(0, items.length)], randFloat(-10, W + 10), randFloat(-10, H +10));
            }
        }
        //填充验证码
        var color = 'rgb(' + randInt(1, 120) + ',' + randInt(1, 120) + ',' + randInt(1, 120) + ')';
        ctx.font = '18px _sans';
        for (var i = 0; i < 4; i++) {
            var j = randInt(0, items.length);
            ctx.fillStyle = color;
            ctx.fillText(items[j],2+i * 10,20);
            vCode.push(items[j]);
        }
        //画弧线路径
        ctx.beginPath();
        ctx.font = '10px sans-serif';
        ctx.strokeStyle = color;
        var A = randFloat(10, H / 2);
        var b = randFloat(H / 4, 3 * H / 4);
        var f = randFloat(H / 4, 3 * H / 4);
        var T = randFloat(H * 1.5, W);
        var w = 2 * Math.PI / T;
        var S = function(x) {
            return A * Math.sin(w * x + f) + b;
        };
        ctx.lineWidth =1;
        for (var x = -20; x < 200; x += 4) {
            ctx.moveTo(x, S(x));
            ctx.lineTo(x + 3, S(x + 3));
        }
        ctx.closePath();
        ctx.stroke();
        //导出结果
        retObj={
            code: vCode.join("").toLowerCase(),
            dataURL: canvas.toDataURL('image/png')
        };
    }catch(e){
        retObj={
            code:'',
            dataURL:''
        };
        console.log("Generate Code Fail:",e);
    }
    return retObj;
};