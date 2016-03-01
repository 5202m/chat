/**
 * 通用方法
 * create by alan.wu
 * 2014-3-6
 */
var common = {
    /**
     * 功能：删除数组中某个下标的元素
     */
    remove:function (arr,index) {
        if (isNaN(index) || index > arr.length) {
            return false;
        }
        arr.splice(index, 1);
    },
    /**
     * 字符拼接
     * @param val
     * @returns {string}
     */
    joinSplit:function(val) {
        return ",".concat(val).concat(",");
    },
    /**
     * 空判断
     * @param v
     * @returns {boolean}
     */
    isBlank:function(v) {
        return v == undefined || v == null||v == 'null'||v == 'undefined' || this.trim(v) == '';
    },
    /**
     * 非空判断
     * @param obj
     * @returns {boolean}
     */
    isValid:function (obj) {
        return !this.isBlank(obj);
    },
    /**
     * 过滤空格
     * @param val
     * @returns {XML|string|void}
     */
    trim:function(val){
        return !val?"":val.toString().replace(/(^\s*)|(\s*$)/g, "");
    },
    /**
     * HTML代码转String
     * @param html
     */
    escapeHtml:function(html) {
        return document.createElement('div').appendChild(document.createTextNode(html)).parentNode.innerHTML.replace(/"/g, '\\"');
    },
    /**
     * String转HTML
     * @param str
     */
    encodeHtml:function(str) {
        return this.isBlank(str)?'': (str.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    },
    /**
     * 提取ip
     * @param req
     * @returns {*}
     */
    getClientIp:function(req){
        if(!req){
            return '';
        }
        return req.headers['x-forwarded-for'] || req.ip;
    },
    /**
     * 通过房间id提取房间组别类型
     * @param roomId
     */
    getRoomType:function(roomId){
        return  roomId.replace(/_+.*/g,"");
    },
    /**
     * 链接正则
     * @returns {Object}
     */
    urlReg:function(){
        return /(http|https):\/\/[A-Za-z0-9]+\.[A-Za-z0-9].+/g;
    },
    /**
     * 检查目标字符是否以源字符或源字符加下划线为前缀
     * @param src
     * @param target
     * @returns {boolean|*}
     */
    hasPrefix:function(src,target){
        return common.getPrefixReg(src).test(target);
    },
    /**
     * 前缀正则
     */
    getPrefixReg:function(val){
       return eval('/(^'+val+'$)|(^'+val+'_{1}.+)/g');
    },
    /**
     * 验证是否符合手机号码格式
     * @param val
     */
    isMobilePhone:function(val){
       return /(^[0-9]{11})$|(^86(-){0,3}[0-9]{11})$/.test(val);
    },
    /**
     * 检查当前日期是否符合日期插件数据
     * @param dateTime
     * @param nullResult 空值结果
     *          1）对于禁言设置，空值表示没有设置禁言，即当前时间不包含在其中。传值false
     *          2）对于聊天规则设置，空值表示永久生效，即当前时间包含在其中。传值true
     */
    dateTimeWeekCheck:function(dateTime, nullResult){
        if(this.isBlank(dateTime)){
            return !!nullResult;
        }
        dateTime=JSON.parse(dateTime);
        var currDate=new Date(),isPass=false,currDateStr = this.formatterDate(currDate);
        isPass=this.isBlank(dateTime.beginDate)||currDateStr>=dateTime.beginDate;
        if(isPass){
            isPass=this.isBlank(dateTime.endDate)||currDateStr<=dateTime.endDate;
        }
        if(!isPass){
            return false;
        }
        var weekTime=dateTime.weekTime;
        if(this.isBlank(weekTime)){
            return isPass;
        }
        var row=null,currTime=null,weekTimePass=false;
        for(var i in weekTime){
            row=weekTime[i];
            if(this.isValid(row.week) && currDate.getDay()!=parseInt(row.week)){
                continue;
            }
            if(this.isBlank(row.beginTime) && this.isBlank(row.beginTime)){
                return true;
            }
            currTime=this.getHHMMSS(currDate);
            weekTimePass=this.isBlank(row.beginTime)||currTime>=row.beginTime;
            if(weekTimePass){
                weekTimePass=this.isBlank(row.endTime)||currTime<=row.endTime;
            }
            if(weekTimePass){
                break;
            }
        }
        return weekTimePass;
    },
    /**
     * 格式化去日期（含时间）
     */
    formatterDate : function(date,splitChar) {
        if(!splitChar){
            splitChar='-';
        }
        if(!(date instanceof Date)){
            date=new Date(date);
        }
        var datetime = date.getFullYear()
            + splitChar// "年"
            + ((date.getMonth() + 1) >=10 ? (date.getMonth() + 1) : "0"
            + (date.getMonth() + 1))
            + splitChar// "月"
            + (date.getDate() < 10 ? "0" + date.getDate() : date.getDate());
        return datetime;
    },
    /**
     * 提取时分秒
     */
    getHHMMSS:function(date){
        if(!(date instanceof Date)){
            date=new Date(date);
        }
        var datetime = (date.getHours() < 10 ? "0" + date.getHours() : date.getHours())
            + ":"
            + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes())
            + ":"
            + (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds());
        return datetime;
    },
    /**
     * 随机生成数字
     * @param _idx  位数
     * @returns {string}
     */
    randomNumber:function(_idx){
        var str = '';
        for(var i = 0; i < _idx; i++){
            str += Math.floor(Math.random() * 10);
        }
        return str;
    },
    /**
     * 包含字符，逗号分隔
     * @param src
     * @param subStr
     */
    containSplitStr:function(src,subStr){
        if(common.isBlank(src)||common.isBlank(subStr)) {
            return false;
        }
        return (','+src+',').indexOf((','+subStr+','))!=-1;
    },
    /**
     * 提取分割匹配正则
     * @param val
     * @returns {Object}
     */
    getSplitMatchReg:function(val){
      return eval('/^'+val+'|,'+val+'$|,'+val+',/g');
    },
    /**
     * 提取md5加密密文
     * @param val
     * @returns {*}
     */
    getMD5:function(val){
        var md5 = require('crypto').createHash('md5');
        md5.update(val);
        return md5.digest('hex');
    },
    /**
     * 判断数组是否存在记录
     */
    checkArrExist:function(arr){
        return arr && arr.length>0;
    },
    /**
     * 过滤某个属性
     * @param dataObj
     * @param fieldStr
     * @returns {{}}
     */
    filterField:function(dataObj,fieldStr){
        var result={};
        for(var f in  dataObj){
            if(!this.containSplitStr(fieldStr,f)){
                result[f]=dataObj[f];
            }
        }
        return result;
    },
    /**
     * 对象copy
     * @param srcObj
     * @param targetObj
     * @param hasTargetField 包含目标对象属性
     */
    copyObject:function(srcObj,targetObj,hasTargetField){
        if(!targetObj){
            return srcObj;
        }
        for(var row in srcObj){
            if(targetObj.hasOwnProperty(row) && common.isValid(targetObj[row])){
                srcObj[row]=targetObj[row];
            }
        }
        if(hasTargetField){
            var srcTmp = (typeof srcObj.toObject === "function") ? srcObj.toObject() : srcObj;
            for(var row in targetObj){
                if(!srcTmp.hasOwnProperty(row)){
                    srcObj[row]=targetObj[row];
                }
            }
        }
    },
    /**
     * 判断客户端是否手机
     * @param req
     */
    isMobile : function(req){
        var deviceAgent = req.headers["user-agent"].toLowerCase();
        var isMobile = deviceAgent.match(/(iphone|ipod|ipad|android)/);
        return !!isMobile;
    }
};
//导出类
try {
    if (module) {
        module.exports = common;
    }
}catch (e){
}