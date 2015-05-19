var Canvas = require('canvas');//引入canvas
/**
 * 图片处理通用方法
 * create by alan.wu
 * 2015-5-8
 */
var imgUtil = {
    /**
     * 按质量压缩图片
     * @param base64Data
     * @param quality
     * @param callback
     */
    zipImg:function(base64Data,maxWidthOrHeight,quality,callback){
        var img = new Canvas.Image;
        img.onload = function(){
            var w = img.width;
            var h = img.height;
            if(maxWidthOrHeight>0) {
                if ((h > maxWidthOrHeight) || (w > maxWidthOrHeight)) {     //计算比例
                    if(h>maxWidthOrHeight && w<=maxWidthOrHeight){
                        w= (maxWidthOrHeight/h)*w;
                        h = maxWidthOrHeight;
                    }else{
                        h = (maxWidthOrHeight / w) * h;
                        w = maxWidthOrHeight;
                    }
                    img.height = h;
                    img.width = w;
                }
            }
            // 将图像绘制到canvas上
            var canvas = new Canvas(w, h);
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            var data = [];
            var stream = canvas.createJPEGStream({
                bufsize : 2048*1024,
                quality :quality
            });
            stream.on('data', function(result){
                data.push(result);
            });
            stream.on('end', function(){
                var result = "data:image/jpeg;base64,"+Buffer.concat(data).toString('base64');
                console.log("zipImg->data.length:"+result.length);
                callback({isOk:true,data:result});
            });
        };
        img.onerror = function(err){
            callback({isOk:false,data:''});
        };
        img.src = base64Data;
    }
};
//导出类
module.exports = imgUtil;