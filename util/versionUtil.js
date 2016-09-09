var fs = require('fs');
/**
 * 版本号
 * create by alan.wu
 * 2016-9-7
 */
var versionUtil = {
    /**
     * 提取版本
     */
   getVersion:function(){
        var vNo='';
        try{
            vNo=fs.readFileSync(global.rootdir+'/template/version.json', 'utf8');
        }catch(e){
            console.log("read the version file fail,please check it!");
        }
        return JSON.parse(vNo).version;
   }
};
//导出类
module.exports = versionUtil;