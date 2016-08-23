/**
 * 通用方法
 * create by alan.wu
 * 2014-3-6
 */
var config = require('../resources/config');//引入config
var common = {
    /**
     * render路径
     * @param req
     * @param platform
     * @param themeKey
     * @param view
     * @returns {string}
     */
    renderPath:function(req,tempPlatform,view,themeKey){
        var defTemp=null,baseUrl=req.baseUrl,tmpKey='';
        for(var key in config.defTemplate){
            defTemp=config.defTemplate[key];
            if(defTemp.routeKey==baseUrl){
                if(!themeKey){
                    themeKey=defTemp[tempPlatform];
                }
                tmpKey=key;
                break;
            }
        }
        return global.rootdir+'/template/'+tmpKey+'/'+themeKey+'/view/'+(view?view:'index');
    },
    /**
     * 提取模板平台对应key
     * @param groupType
     */
    getTempPlatformKey:function(groupType){
        var baseRoute='/'+groupType;
        for(var key in config.defTemplate){
            if(config.defTemplate[key].routeKey==baseRoute){
                return key;
            }
        }
    },
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
        var ip=req.headers['x-forwarded-for'] || req.ip;
        return this.isBlank(ip)?'':ip.replace(/.*:(\d{1,4}.\d{1,4}.\d{1,4}.\d{1,4})$/g,"$1");
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
     * @param userAgent
     */
    isMobile : function(userAgent){
        if(!userAgent){
            return false;
        }
        if(userAgent.headers){
            userAgent=userAgent.headers["user-agent"];
        }
        return /(iphone|ipod|ipad|android|mobile|playbook|bb10|meego)/.test(userAgent.toLowerCase());
    },
    /**
     * 返回随机索引数
     * @param length
     * @returns {Number} 0至length-1
     */
    randomIndex:function(length){
        var lh=parseInt(Math.round(Math.random()*length));
        if(lh==length){
            lh=length-1;
        }
        return lh<0?0:lh;
    },
    /**
     * 移除手机号码前缀（国号，区号等）
     * @param mobile
     * @returns {XML|string|void}
     */
    rmMobilePrefix:function(mobile){
       return  mobile.replace(/^[0-9]+(-+)/g,'');
    },
    /**
     * 提取时分
     */
    getHHMM:function(date){
        if(!(date instanceof Date)){
            date=new Date(date);
        }
        var datetime = (date.getHours() < 10 ? "0" + date.getHours() : date.getHours())
            + ":"
            + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
        return datetime;
    },
    /**
     * 提取课程
     * @param data
     * @param serverTime
     */
    getSyllabusPlan:function(data,serverTime){
        if(!data||!data.courses){
            return null;
        }
        //提取课程
        var getCourses=function(tmBkTmp,i,isNext){
            var course=null,courseTmp=tmBkTmp.course;
            if(courseTmp && courseTmp.length>i){
                course=courseTmp[i];
                if(course.status==0 || common.isBlank(course.lecturerId)){
                    return null;
                }
                course.startTime=tmBkTmp.startTime;
                course.endTime=tmBkTmp.endTime;
                course.day=days[i].day;
                course.isNext=isNext;
                return course;
            }else{
                return null;
            }
        };
        var coursesObj=null;
        if(this.isValid(data.courses) && typeof data.courses !='object') {
            coursesObj = JSON.parse(data.courses);
        }else{
            coursesObj=data.courses;
        }
        var days=coursesObj.days,timeBuckets=coursesObj.timeBuckets;
        var currDay = (new Date(serverTime).getDay() + 6) % 7, tmpDay;
        var currTime=common.getHHMM(serverTime);
        var tmBk=null,courseObj=null;
        for(var i=0;i<days.length;i++){
            if(days[i].status==0){
                continue;
            }
            tmpDay = (days[i].day + 6) % 7;
            if(tmpDay>currDay){
                for(var k in timeBuckets){
                    tmBk=timeBuckets[k];
                    courseObj=getCourses(tmBk,i,true);
                    if(courseObj){
                        return courseObj;
                    }
                }
            }else if(tmpDay==currDay){
                for(var k in timeBuckets){
                    tmBk=timeBuckets[k];
                    if(tmBk.startTime<=currTime && tmBk.endTime>=currTime){
                        courseObj=getCourses(tmBk,i,false);
                    }else if(tmBk.startTime>currTime){
                        courseObj=getCourses(tmBk,i,true);
                    }
                    if(courseObj){
                        return courseObj;
                    }
                }
            }
        }
        //课程安排跨周，返回首次课程
        if(!data.publishEnd){ //没有发布结束时间，不提供跨周数据
            return null;
        }
        for(var i=0;i<days.length;i++){
            if(days[i].status==0){
                continue;
            }
            tmpDay = (days[i].day + 6) % 7;
            if(data.publishEnd < (tmpDay + 7 - currDay) * 86400000 + serverTime){
                continue;
            }
            for(var k=0;k<timeBuckets.length;k++) {
                courseObj=getCourses(timeBuckets[k],i,true);
                if(courseObj){
                    return courseObj;
                }
            }
        }
        return null;
    },
    /**
     * 是否直播间
     * @param type
     */
    isStudio:function(groupType){
        return groupType && groupType.indexOf("studio")!=-1;
    },
    /**
     * 设置浏览器跨域
     * @param req
     * @param res
     */
    setCrossDomain:function(req, res){
        /**IE设置跨域*/
        if(req.headers["user-agent"].toLowerCase().indexOf("msie") > 0){
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "X-Requested-With");
            res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
            res.header("X-Powered-By",' 3.2.1');
            res.header("P3P","CP=CAO PSA OUR");//处理ie跨域问题
        }
    }
};
//导出类
module.exports = common;