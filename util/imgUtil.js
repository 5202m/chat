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
        try{
            var img = new Canvas.Image;
            img.onload = function(){
                var w = img.width;
                var h = img.height;
                if(w<=0||h<=0){
                    console.error("zipImg->fail:image width or height is zero!");
                    callback({isOK:false,data:''});
                    return;
                }
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
                }else{
                    if(h>=800 && w>=800){
                        h = h*0.50;
                        w = w*0.50;
                    }
                }
                // 将图像绘制到canvas上
                var canvas = new Canvas(w, h);
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                var data = [];
                var stream =null;
                try{
                    stream = canvas.jpegStream({
                        bufsize :4096,
                        quality :quality
                    });
                }catch(er){
                    console.error("zipImg->fail,jpegStream has error:"+er);
                    callback({isOK:false,data:''});
                    return;
                }
                if(!stream){
                    console.error("zipImg->fail:stream is null");
                    callback({isOK:false,data:''});
                    return;
                }
                stream.on('data', function(result){
                    data.push(result);
                });
                stream.on('end', function(){
                    var result = "data:image/jpeg;base64,"+Buffer.concat(data).toString('base64');
                    console.log("zipImg->data.length:"+result.length);
                    callback({isOK:true,data:result});
                });
            };
            img.onerror = function(err){
                callback({isOK:false,data:''});
            };
            img.src = base64Data;
        }catch(e){
            console.error("zipImg->fail,Exception:",e);
            callback({isOK:false,data:''});
        }
    }
};
//导出类
module.exports = imgUtil;