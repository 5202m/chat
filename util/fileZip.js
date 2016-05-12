var fs = require('fs');
var cleanCSS = require('clean-css');
var ujs=require("uglify-js");
/**
 * 文件压缩
 * create by alan.wu
 * 2015-5-8
 */
var fileZip = {
    /**
     * 压缩css
     * @param flieInArr
     * @param fileOut
     */
   zipCss:function(flieInArr,fileOut){
       var styles="",origCode='',obj=this.formatCurrPath(flieInArr);
       flieInArr=obj.filePath;
       for(var i=0; i<flieInArr.length; i++) {
           origCode = fs.readFileSync(flieInArr[i], 'utf8');
           styles+=new cleanCSS().minify(origCode).styles;
       }
        var fileOutArr=[];
        fileOutArr.push(fileOut);
       fs.writeFileSync(this.formatCurrPath(fileOutArr).filePath[0], styles, 'utf8');
       console.log("zipCss【"+obj.fileName.join(",")+"】 success!");
   },
    /**
     * 压缩js
     * @param flieInArr
     * @param fileOut
     */
    zipJs:function(flieInArr,fileOut){
        var obj=this.formatCurrPath(flieInArr);
        flieInArr=obj.filePath;
        var fileOutArr=[];
        fileOutArr.push(fileOut);
        fs.writeFileSync(this.formatCurrPath(fileOutArr).filePath[0], ujs.minify(flieInArr).code, 'utf8');
        console.log("zipJs【"+obj.fileName.join(",")+"】 success!");
    },
    /**
     * 格式路径
     * @param filePath
     */
    formatCurrPath:function(filePathArr){
        var newPathArr=[],fileName=[],sysPath=process.cwd().replace("util",""),currPath='';
        for(var i in filePathArr){
            currPath=filePathArr[i];
            fileName.push(currPath.substring(currPath.lastIndexOf("\\")+1,currPath.length));
            newPathArr.push((sysPath+filePathArr[i]).replace(/\\/g,"\\\\"));
        }
        return {filePath:newPathArr,fileName:fileName};
    }
};

//微解盘前端js/css压缩
fileZip.zipJs(["public\\js\\wechat\\admin.js"],'public\\js\\wechat\\admin.min.js');
fileZip.zipJs(["public\\js\\wechat\\index.js"],'public\\js\\wechat\\index.min.js');
fileZip.zipJs(["public\\js\\wechat\\room.js"],'public\\js\\wechat\\room.min.js');
fileZip.zipCss(["public\\css\\wechat\\admin.css"],'public\\css\\wechat\\admin.min.css');
fileZip.zipCss(["public\\css\\wechat\\index.css"],'public\\css\\wechat\\index.min.css');

fileZip.zipJs(["public\\js\\fxchat\\index.js"],'public\\js\\fxchat\\index.min.js');
fileZip.zipJs(["public\\js\\fxchat\\room.js"],'public\\js\\fxchat\\room.min.js');
fileZip.zipCss(["public\\css\\fxchat\\index.css"],'public\\css\\fxchat\\index.min.css');

//直播间前端js/css压缩
fileZip.zipJs(["public\\js\\studio\\admin.js"],'public\\js\\studio\\admin.min.js');
fileZip.zipJs(["public\\js\\studio\\index.js"],'public\\js\\studio\\index.min.js');
fileZip.zipJs(["public\\js\\studio\\mini.js"],'public\\js\\studio\\mini.min.js');
fileZip.zipCss(["public\\css\\studio\\admin.css"],'public\\css\\studio\\admin.min.css');
fileZip.zipCss(["public\\css\\studio\\index.css"],'public\\css\\studio\\index.min.css');
fileZip.zipCss(["public\\css\\studio\\mini.css"],'public\\css\\studio\\mini.min.css');

//直播间前端（手机版）js/css压缩
fileZip.zipJs(["public\\js\\studio_mb\\index.js"],'public\\js\\studio_mb\\index.min.js');
fileZip.zipJs(["public\\js\\studio_mb\\room.js"],'public\\js\\studio_mb\\room.min.js');
fileZip.zipJs(["public\\js\\studio_mb\\pop.js"],'public\\js\\studio_mb\\pop.min.js');
fileZip.zipCss(["public\\css\\studio_mb\\index.css"],'public\\css\\studio_mb\\index.min.css');

//通用js/css压缩
fileZip.zipJs(["public\\js\\util\\common.js"],'public\\js\\util\\common.min.js');
fileZip.zipJs(["public\\js\\lib\\jsWindows\\jsWindows.js"],'public\\js\\lib\\jsWindows\\jsWindows.min.js');
fileZip.zipCss(["public\\js\\lib\\jsWindows\\jsWindows.css"],'public\\js\\lib\\jsWindows\\jsWindows.min.css');
//导出类
module.exports = fileZip;