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
        try{
            fs.writeFileSync(this.formatCurrPath(fileOutArr).filePath[0], styles, 'utf8');
        }catch (e){
            console.log("zipCss【"+fileOut+"】 fail,no file!");
            return;
        }
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
        try{
            fs.writeFileSync(this.formatCurrPath(fileOutArr).filePath[0], ujs.minify(flieInArr).code, 'utf8');
        }catch (e){
            console.log("zipJs【"+fileOut+"】 fail,no file!");
            return;
        }
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

//直播间前端js/css压缩
//pm studio
var config=require('../resources/config');//资源文件
for(var key in config.defTemplate){
    console.log("zip" +key+" js and css,plase wait....");
    var defTemp=config.defTemplate[key];
    var prefixPath='';var jsArr = [];
    for(var i=1;i<=defTemp.usedNum;i++){
        prefixPath='template\\'+key+'\\theme'+i+'\\static\\';
        if(i==1){//pc版
            fileZip.zipCss([prefixPath+'css\\index.css'],prefixPath+'css\\index.min.css');
            if(key=="hx"){
                fileZip.zipCss([prefixPath+'css\\dark.css'],prefixPath+'css\\dark.min.css');
                fileZip.zipCss([prefixPath+'css\\light.css'],prefixPath+'css\\light.min.css');
                fileZip.zipCss([prefixPath+'css\\gold.css'],prefixPath+'css\\gold.min.css');
                fileZip.zipCss([prefixPath+'css\\darkblue.css'],prefixPath+'css\\darkblue.min.css');
                fileZip.zipCss([prefixPath+'css\\orange.css'],prefixPath+'css\\orange.min.css');
            }
            jsArr = [];
            if(key!= "hx"){
                jsArr.push("template\\base\\util\\chatAnalyze.js");
            }
            jsArr.push("template\\base\\util\\common.js","template\\base\\lib\\newquote.js","template\\base\\lib\\jquery.face.js",
                prefixPath+"js\\index.js",prefixPath+"js\\index_video.js",prefixPath+"js\\index_chat.js",prefixPath+"js\\index_box.js",prefixPath+"js\\index_tool.js");
            fileZip.zipJs(jsArr,prefixPath+"js\\index.min.js");
            fileZip.zipJs([prefixPath+"js\\loginAuto.js"],prefixPath+"js\\lg.min.js");
        }
        if(i==2 || i==4){//移动版与或webui
        	fileZip.zipCss([prefixPath+'css\\index.css'],prefixPath+'css\\index.min.css');
            if(i==2){
                jsArr = [];
                if(key!= "hx"){
                    jsArr.push("template\\base\\util\\chatAnalyze.js");
                }
                jsArr.push("template\\base\\util\\common.js",prefixPath+"js\\index.js");
                fileZip.zipJs(jsArr,prefixPath+"js\\index.min.js");
            }else if(i==4){
            	fileZip.zipCss([prefixPath+'css\\index-dark.css'],prefixPath+'css\\index-dark.min.css');
            }
            jsArr = [];
            if(key!= "hx"){
                jsArr.push("template\\base\\util\\chatAnalyze.js");
            }
            jsArr.push("template\\base\\util\\common.js",prefixPath+"js\\room.js");
            fileZip.zipJs(jsArr,prefixPath+"js\\room.min.js");
            fileZip.zipJs([prefixPath+"js\\pop.js"],prefixPath+"js\\pop.min.js");
            fileZip.zipJs([prefixPath+"js\\loginAuto.js"],prefixPath+"js\\lg.min.js");
        }
        if(i==3 && key=='pm'){//pc嵌入直播间
            fileZip.zipCss([prefixPath+'css\\index.css'],prefixPath+'css\\index.min.css');
            fileZip.zipJs(["template\\base\\util\\common.js",prefixPath+"js\\index.js"],prefixPath+"js\\index.min.js");
        }
    }
}
//后台压缩
console.log("zip admin,plase wait....");
fileZip.zipCss(["template\\admin\\static\\css\\index.css"],'template\\admin\\static\\css\\index.min.css');
fileZip.zipCss(["template\\admin\\static\\css\\room.css"],'template\\admin\\static\\css\\room.min.css');
fileZip.zipJs(["template\\admin\\static\\js\\index.js"],'template\\admin\\static\\js\\index.min.js');
fileZip.zipJs(["template\\admin\\static\\js\\room.js"],'template\\admin\\static\\js\\room.min.js');
//通用js/css压缩
fileZip.zipJs(["template\\base\\util\\common.js"],'template\\base\\util\\common.min.js');
//导出类
module.exports = fileZip;