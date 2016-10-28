/**
 * 通用方法
 * create by alan.wu
 * 2014-3-6
 */
var common = {
    /**
     * 日期变量
     */
    daysCN:{"0":"星期天","1":"星期一","2":"星期二","3":"星期三","4":"星期四","5":"星期五","6":"星期六"},
    /**
     * 组类型
     */
    clientGroupStr : {vip:'VIP用户',active:'真实[A]',notActive:'真实[N]',simulate:'模拟',register:'注册','visitor':'游客'},
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
        return v == undefined || v == null || v == 'undefined'||v == 'null'||$.trim(v) == '';
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
        return this.isBlank(val)?"":val.toString().replace(/(^\s*)|(\s*$)/g, "");
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
        return this.isBlank(str)?'':str.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    },
    /**
     * 格式化去日期（不含时间）
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
     * 提取分秒
     */
    getMMSS:function(date){
        if(!(date instanceof Date)){
            date=new Date(date);
        }
        return (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes())+":"+(date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds());
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
     * 格式化去日期（含时间）
     */
    formatterDateTime : function(date,splitChar) {
        if(!splitChar){
            splitChar='-';
        }
        if(!(date instanceof Date)){
            date=new Date(date);
        }
        if(date == "Invalid Date"){
            return "";
        }
        var datetime = date.getFullYear()
            + splitChar// "年"
            + ((date.getMonth() + 1) >=10 ? (date.getMonth() + 1) : "0"
            + (date.getMonth() + 1))
            + splitChar// "月"
            + (date.getDate() < 10 ? "0" + date.getDate() : date.getDate())
            + ' '
            + (date.getHours() < 10 ? "0" + date.getHours() : date
                .getHours())
            + ":"
            + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date
                .getMinutes())
            + ":"
            + (date.getSeconds() < 10 ? "0" + date.getSeconds() : date
                .getSeconds());
        return datetime;
    },
    /**
     * 毫秒转日期(格式：yyyy-MM-dd HH:mm:ss)
     */
    longMsTimeToDateTime : function(time,splitChar) {
        var myDate = new Date(time);
        return this.formatterDateTime(myDate,splitChar);
    },
    /**
     * 显示弹层
     * @param dom
     */
    showBox:function(dom,bgCls){
      $(dom).slideDown();
      $(bgCls||".layer-shadow").show();
    },
    /**
     * 隐藏弹层
     * @param dom
     */
    hideBox:function(dom,bgCls){
        $(dom).slideUp();
        $(bgCls||".layer-shadow").hide();
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
     * 通用ajax方法
     * @param url
     * @param params
     * @param callback
     * @param async
     * @returns
     */
    getJson:function (url, params, callback,async,failCallBack) {
        var result = null;
        $.ajax({
            url: url,
            type: "POST",
            timeout : 100000, //超时时间设置，单位毫秒
            cache: false,
            async: (async!=undefined?async:(callback?true:false)),//默认为异步(true),false则为同步
            dataType: "json",
            data: params,
            success: typeof (callback) == "function" ? callback : function (data) {
                result = data;
            },
            error: function (obj,textStatus) {
                if(typeof (failCallBack) == "function"){
                    failCallBack(textStatus);
                }else{
                    if (common.isValid(obj.responseText) && obj.statusText != "OK") {
                        console.error(obj.responseText);
                    }else{
                        console.error("请求超时,请重试:url[%s]",url);
                    }
                }
            }
        });
        return result;
    },
    /**
     * 对象数组排序
     * @param key 对象的key值
     * @param desc true 为降序，false升序
     * @returns {Function}
     */
    arraySort:function(key,desc){
        return function(a,b){
            return desc? (a[key] < b[key]) : (a[key] > b[key]);
        }
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
     *  @param serverDate
     */
    dateTimeWeekCheck:function(dateTime, nullResult,serverDate){
        if(this.isBlank(dateTime)){
            return !!nullResult;
        }
        if(!$.isPlainObject(dateTime)){
            dateTime=JSON.parse(dateTime);
        }
        var currDate=serverDate?new Date(serverDate):new Date(),isPass=false, currDateStr = this.formatterDate(currDate);
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
     * 过滤重复数组
     */
    arrayUnique:function(array){
        if(!array){
            return array;
        }
        var res = [], hash = {};
        for(var i=0, elem; (elem = array[i]) != null; i++)  {
            if (!hash[elem])
            {
                res.push(elem);
                hash[elem] = true;
            }
        }
        return res;
    },
    /**
     * 是否支持websocket
     */
    isWebSocket:function(){
       return window.WebSocket;
    },
    /**
     * 提取socketIo
     * @param io
     * @param url
     * @returns {*|Mongoose}
     */
    getSocket:function(io,url,groupType){
        if(common.isWebSocket()){
            console.log("used websocket!");
            return io.connect(url.webSocket+'/'+groupType,{transports: ['websocket']});
        }else{
            return io.connect(url.socketIO+'/'+groupType);
        }
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
     * 清除html多余代码
     *  排除表情,去除其他所有html标签
     * @param msg
     * @returns {XML|string|void}
     */
    clearMsgHtml:function(msg){
        var msg=msg.replace(/((^((&nbsp;)+))|\n|\t|\r)/g,'').replace(/<\/?(?!(img|IMG)\s+src="[^>"]+\/face\/[^>"]+"\s*>)[^>]*>/g,'');
        if(msg){
           msg= $.trim(msg);
        }
        return msg;
    },
    /**
     * 格式到json
     * @param str
     */
    formatToJson:function(str){
        return this.isBlank(str)?null:JSON.parse(str);
    },
    /**
     * 提取课程数据
     */
    getSyllabusPlan:function(data,serverTime, isAudio, isWebui){
        if(!data||!data.courses){
            return null;
        }
        //提取链接
        var getSLink=function(studioLinkTmp,studioType){
            if(studioLinkTmp && studioType != 3){
                var isMb=common.isMobile();
                var linkTmp;
                if(typeof studioLinkTmp !='object'){
                    studioLinkTmp=JSON.parse(studioLinkTmp);
                }
                for(var i in studioLinkTmp){
                    linkTmp=studioLinkTmp[i];
                    if(isMb){
                        if(studioType==1 && ((!isAudio  && linkTmp.code==3) || (isAudio  && linkTmp.code==4))){
                            return linkTmp.url;
                        }
                    }else if(isWebui) {
                        if(studioType==1 && linkTmp.code==3){
                            var urlTmp = linkTmp.url || "";
                            urlTmp = urlTmp.replace(/^http:/, "rtmps:").replace(/\/index\.m3u8$/, "");
                            return urlTmp;
                        }
                    }else{
                        if(linkTmp.code==studioType){
                            return linkTmp.url;
                        }
                    }
                }
            }
            return null;
        };
        //提取课程
        var getCourses=function(tmBkTmp,i,isNext){
            var course=null,courseTmp=tmBkTmp.course;
            if(courseTmp && courseTmp.length>i){
                course=courseTmp[i];
                if(course.status==0 || common.isBlank(course.lecturerId)){
                    return null;
                }
                course.studioLink=getSLink(data.studioLink,course.courseType);
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
                    if(tmBk.startTime<=currTime && (tmBk.endTime>=currTime||tmBk.endTime=="00:00")){
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
     * 格式化显示课程安排表
     * @param syllabus {{days : [{day: Integer, status : Integer}], timeBuckets : [{startTime : String, endTime : String, course : [{lecturer : String, title : String, status : Integer}]}]}}
     * @param serverTime
     * @param style 类型 1-在线视频 2-微解盘 3-直播间手机版
     * @param [options]
     */
    formatSyllabus:function(syllabus, serverTime, style, options){
        var defConstants = {
            dayCN : ['星期天','星期一','星期二','星期三','星期四','星期五','星期六'],
            indexCN : ['第一节','第二节','第三节','第四节','第五节','第六节','第七节','第八节'],
            courseCls : ['prev', 'ing', 'next'],
            tableCls : "syllabus",
            courseType : {'0':'文字在线','1':'视频在线','2':'ONE TV'}
        };
        var currDay=new Date(serverTime).getDay(),currTimes=this.getHHMM(serverTime);
        var loc_constants = $.extend({}, defConstants, options);
        //计算时间状态,返回对应的样式
        var loc_timeClsFunc = function(day, startTime, endTime, notCheckTime){
            var loc_index = 0;
            var tempDay = (day + 6) % 7; //将1,2,3,4,5,6,0转化为0,1,2,3,4,5,6
            var currTempDay = (currDay + 6) % 7;
            if(tempDay > currTempDay){
                loc_index = 2;
            }else if(tempDay < currTempDay){
                loc_index = 0;
            }else{
                if(notCheckTime){
                    loc_index = 1;
                }else if(endTime <= currTimes){
                    loc_index = 0;
                }else if(startTime > currTimes){
                    loc_index = 2;
                }else{
                    loc_index = 1;
                }
            }
            return loc_constants.courseCls[loc_index];
        };

        var loc_html = [];
        try
        {
            if(syllabus)
            {
                var loc_courses = $.isPlainObject(syllabus)?syllabus:JSON.parse(syllabus);
                var loc_dayLen = !loc_courses.days ? 0 : loc_courses.days.length;
                if(loc_dayLen > 0)
                {
                    if(style === 1)
                    {
                        var courseTypeTxt={'0':'文字','1':'视频','2':'oneTV'};
                        loc_html.push('<div class="sy_panel">');
                        //星期（头部）
                        var loc_startDateTime = serverTime - 86400000 * ((currDay + 6) % 7);
                        var loc_date = null;
                        var loc_dateStr = null;
                        var loc_activeCls = null;
                        loc_html.push('<div class="sy_nav">');
                        var loc_width = ' style="width:' + (100 / loc_dayLen) + '%;"';
                        for(var i = 0; i < loc_dayLen; i++)
                        {
                            loc_date = new Date(loc_startDateTime + ((loc_courses.days[i].day + 6) % 7) * 86400000);
                            loc_dateStr = loc_date.getFullYear() + "-"
                            + (loc_date.getMonth() < 9 ? "0" : "") + (loc_date.getMonth() + 1) + "-"
                            + (loc_date.getDate() < 10 ? "0" : "") + loc_date.getDate();
                            loc_activeCls = (loc_courses.days[i].day == currDay) ? ' class="active"' : "";
                            loc_html.push('<a href="javascript:void(0)" d="' + loc_courses.days[i].day + '"' + loc_activeCls + loc_width + '>' + loc_constants.dayCN[loc_courses.days[i].day] + '<br/><span>' + loc_dateStr + '</span><em class="dir">^</em></a>');
                        }
                        loc_html.push('</div>');
                        //课程
                        loc_html.push('<div class="sy_cont"><div>');
                        loc_html.push('<table cellpadding="0" cellspacing="0" border="0" class="' + loc_constants.tableCls + '">');
                        var loc_timeBucket = null;
                        var loc_timeCls = null;
                        for(var i = 0; i < loc_dayLen; i++)
                        {
                            loc_html.push('<tbody d="' + loc_courses.days[i].day + '">');
                            if(loc_courses.days[i].status == 0)
                            {
                                //全天休市
                                loc_timeCls = loc_timeClsFunc(loc_courses.days[i].day, null, null, true);
                                loc_html.push('<tr class="' + loc_timeCls + '" width="100%"><td>休市</td></tr>');
                            }
                            else
                            {
                                for(var j = 0, lenJ = loc_courses.timeBuckets.length; j < lenJ; j++)
                                {
                                    loc_timeBucket = loc_courses.timeBuckets[j];
                                    loc_timeCls = loc_timeClsFunc(loc_courses.days[i].day, loc_timeBucket.startTime, loc_timeBucket.endTime, false);
                                    if(loc_timeBucket.course[i].status == 0)
                                    {
                                    	//时间段休市
                                    	loc_html.push('<tr class="' + loc_timeCls + '">');
                                    	loc_html.push('<td width="25%">' + loc_timeBucket.startTime + '-' + loc_timeBucket.endTime+'</td>');
                                        loc_html.push('<td colspan="2" width="75%">休市</td>');
                                        loc_html.push('</tr>');
                                    }
                                    else if(loc_timeBucket.course[i].lecturer)
                                    {
                                    	//讲师内容不为空才会显示对应的时间段
                                    	loc_html.push('<tr class="' + loc_timeCls + '">');
                                    	loc_html.push('<td width="25%">' + loc_timeBucket.startTime + '-' + loc_timeBucket.endTime + '【'+courseTypeTxt[loc_timeBucket.course[i].courseType]+'】</td>');
                                        loc_html.push('<td width="25%">' + loc_timeBucket.course[i].lecturer + '</td>');
                                        loc_html.push('<td width="50%">' + loc_timeBucket.course[i].title + '</td>');
                                        loc_html.push('</tr>');
                                    }
                                }
                            }
                            loc_html.push('</tbody>');
                        }
                        loc_html.push('</table>');
                        loc_html.push('</div></div>');
                        loc_html.push('</div>');
                    }
                    else if(style === 2)
                    {
                        loc_html.push('<table cellpadding="0" cellspacing="1" border="0" class="' + loc_constants.tableCls + '">');
                        //头部
                        loc_html.push('<tr>');
                        loc_html.push('<th>星期\\节次</th>');
                        var lenJ = !loc_courses.timeBuckets ? 0 : loc_courses.timeBuckets.length;
                        var loc_timeBucket = null;
                        var loc_timeCls = null;
                        for(var j = 0; j < lenJ; j++)
                        {
                            loc_timeBucket = loc_courses.timeBuckets[j];
                            loc_html.push('<th>' + loc_constants.indexCN[j] + "<br><span>(" + loc_timeBucket.startTime + "-" + loc_timeBucket.endTime + ')</span></th>');
                        }
                        loc_html.push('</tr>');
                        //课程
                        var loc_day = null;
                        for(var i = 0, lenI = !loc_courses.days ? 0 : loc_courses.days.length; i < lenI; i++)
                        {
                            loc_day = loc_courses.days[i];
                            loc_html.push('<tr>');
                            loc_html.push('<th>' + loc_constants.dayCN[loc_day.day] + '</th>');
                            if(loc_day.status == 0)
                            {
                                //全天休市
                                loc_timeCls = loc_timeClsFunc(loc_day.day, null, null, true);
                                loc_html.push('<td class="' + loc_timeCls + '" colspan="' + lenJ + '">休市</td>');
                            }
                            else
                            {
                                for(var j = 0; j < lenJ; j++){
                                    loc_timeBucket = loc_courses.timeBuckets[j];
                                    loc_timeCls = loc_timeClsFunc(loc_day.day, loc_timeBucket.startTime, loc_timeBucket.endTime, false);
                                    loc_html.push('<td class="' + loc_timeCls + '">' + (loc_timeBucket.course[i].status == 0 ? "休市" : loc_timeBucket.course[i].lecturer) + '</td>');
                                }
                            }
                            loc_html.push('</tr>');
                        }
                        loc_html.push('</table>');
                    }
                    else if(style === 3)
                    {
                        //星期（头部）
                        var loc_startDateTime = currTimes - 86400000 * ((currDay + 6) % 7);
                        var loc_date = null;
                        var loc_activeCls = null;
                        var loc_day = null;
                        var loc_width = ' style="width:' + (100 / loc_dayLen) + '%;"';
                        loc_html.push("<tr>");
                        for(var i = 0; i < loc_dayLen; i++)
                        {
                            loc_day = loc_courses.days[i];
                            loc_date = new Date(loc_startDateTime + ((loc_courses.days[i].day + 6) % 7) * 86400000);
                            loc_activeCls = (loc_courses.days[i].day == currDay) ? ' class="active"' : "";
                            loc_html.push('<th d="' + loc_courses.days[i].day + '"' + loc_activeCls + loc_width + '>' + loc_constants.dayCN[loc_courses.days[i].day] + '<i></i></th>');
                        }
                        loc_html.push("</tr>");
                        loc_html.push('<tr><td class="space" colspan="' + loc_dayLen + '"></td></tr>');
                        //课程
                        var loc_timeBucket = null;
                        var loc_timeCls = null;
                        for(var i = 0; i < loc_dayLen; i++)
                        {
                            loc_day = loc_courses.days[i];
                            loc_html.push('<tr d="' + loc_day.day + '"><td colspan="' + loc_dayLen + '">');
                            if(loc_day.status == 0)
                            {
                                //全天休市
                                loc_timeCls = loc_timeClsFunc(loc_day.day, null, null, true);
                                loc_html.push('<p class="' + loc_timeCls + '">休市</p>');
                            }
                            else
                            {
                                for(var j = 0, lenJ = !loc_courses.timeBuckets ? 0 : loc_courses.timeBuckets.length; j < lenJ; j++){
                                    loc_timeBucket = loc_courses.timeBuckets[j];
                                    if(!loc_timeBucket.course[i].lecturer){
                                        continue;
                                    }
                                    loc_timeCls = loc_timeClsFunc(loc_day.day, loc_timeBucket.startTime, loc_timeBucket.endTime, false);
                                    loc_html.push('<p class="' + loc_timeCls + '">');
                                    loc_html.push('<span>' + loc_timeBucket.startTime + "-" + loc_timeBucket.endTime + '</span>');
                                    if(loc_timeBucket.course[i].status == 0){
                                        loc_html.push('<span>休市</span>');
                                    }else{
                                        loc_html.push('<span>' + loc_constants.courseType[loc_timeBucket.course[i].courseType] + '</span>');
                                        loc_html.push('<span>' + loc_timeBucket.course[i].lecturer + '</span>');
                                        loc_html.push('<span class="item">' + loc_timeBucket.course[i].title + '</span>');
                                    }
                                    loc_html.push('</p>');
                                }
                            }
                            loc_html.push('</td></tr>');
                        }
                    }
                }
            }
        }
        catch(e1)
        {
            console.error("formatSyllabus->"+e1);
            return "";
        }
        return loc_html.join("");
    },
    /**
     * 判断客户端是否手机
     */
    isMobile : function(){
        return /(iphone|ipod|ipad|android|mobile|playbook|bb10|meego)/.test(navigator.userAgent.toLowerCase());
    },
    /**
     * 判断客户端是否https协议
     */
    isHTTPS : function(){
        return /^https:\/\//.test(location.href);
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
            for(var row in targetObj){
                if(!srcObj.hasOwnProperty(row)){
                    srcObj[row]=targetObj[row];
                }
            }
        }
    },
    /**
     * 是否合法的昵称
     * @param name
     * @returns {boolean}
     */
    isRightName:function(name){
        return !(/^([0-9]{2,20})$/g.test(name)) && /^([\w\u4e00-\u9fa5]{2,20})$/g.test(name);
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
     * 保存到桌面
     * @param sUrl
     * @param sName
     */
    saveToDesktop : function (sUrl, sName){
        try {
            var WshShell = new ActiveXObject("WScript.Shell");
            var oUrlLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") + "\\" + sName + ".url");
            oUrlLink.TargetPath = sUrl;
            oUrlLink.Save();
        }
        catch (e) {
            //alert("当前浏览器不支持保存到桌面！");
            return false;
        }
        return true;
    },
    /**
     * 获取url参数值
     * @param name
     * @returns {*}
     */
    getUrlParam: function(name){
        var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
        var r = window.location.search.substr(1).match(reg);  //匹配目标参数
        if (r!=null){ return unescape(r[2]);}
        return null; //返回参数值
    },
    /**
     * 排序
     * @param key 排序字段
     * @param desc  升/降序
     * @returns {string}
     */
    keysrt:function (key,desc) {
       return function(a,b){
        return desc ? ~~(a[key] < b[key]) : ~~(a[key] > b[key]);
       };
    },
    /**
     * 新闻滚动
     * @param intervalId 定时器ID
     * @param speed 速度
     * @param domPanel 父容器
     * @param domContainerId 内容容器ID
     * @param domChildId1 内容1容器ID
     * @param domChildId2 内容2容器ID
     * @param isShow 是否显示
     */
    newsMarquee: function(intervalId, speed, domPanel, domContainerId, domChildId1, domChildId2, isShow) {
        if(intervalId){
            clearInterval(intervalId);
            intervalId=null;
        }
        //var speed=30;
        var newsPanel = (typeof domPanel=='object')?domPanel:$(domPanel);//$(".mod_scrollnews");
        var tab = (typeof domContainerId=='object')?domContainerId[0]:$(domContainerId)[0];//$("#scrollnews_demo")[0];
        var tab1 = (typeof domChildId1=='object')?domChildId1:$(domChildId1);//$("#newscont1");
        var tab2 = (typeof domChildId2=='object')?domChildId2:$(domChildId2);//$("#newscont2");
        if(isShow && tab1.children().size() > 0){
            newsPanel.show();
        }else{
            newsPanel.hide();
        }
        tab2.html("");
        $(tab).unbind("mouseover mouseout");
        if(isShow){
            tab1.css("width", "auto");
            tab2.css("width", "auto");
            var widthTmp = newsPanel.width() - 27;
            if(tab1.width() < widthTmp){
                tab1.css("width", widthTmp);
                tab2.css("width", widthTmp);
            }
            //需要滚动
            tab2.html(tab1.html());
            /**滚动*/
            var marqueeFunc = function(){
                if(tab1.width()-tab.scrollLeft<=0) {
                    tab.scrollLeft -= tab1.width();
                 }else{
                    tab.scrollLeft++;
                 }
            };
            intervalId=window.setInterval(marqueeFunc,speed);
            $(tab).bind("mouseover", function() {
                window.clearInterval(intervalId);
                intervalId=null;
            }).bind("mouseout", function() {
                if(intervalId){
                    window.clearInterval(intervalId);
                    intervalId=null;
                }
                intervalId=window.setInterval(marqueeFunc,speed);
            });
        }
    },
    /**
     * placeholder IE支持
     */
    placeholderSupport : function(dom){
        dom=(typeof dom=='object')?dom:$(dom);
        var supportPlaceholder = 'placeholder' in document.createElement('input');
        if(!supportPlaceholder){
            dom.each(function(){
                var loc_placeholder = $(this).attr("placeholder");
                if(!!loc_placeholder){
                    var loc_this = $(this);
                    var loc_span = $('<span class="placeholder">' + loc_placeholder + '</span>');
                    loc_this.before(loc_span);
                    loc_span.bind("click", function(){
                        $(this).hide();
                        $(this).next().focus();
                    });
                    loc_this.bind("focus", function(){
                        $(this).prev().hide();
                    });
                    loc_this.bind("blur", function(){
                        if($(this).val() === "")
                        {
                            $(this).prev().show();
                        }
                    });
                    if(loc_this[0].defaultValue!=''){
                        loc_this.prev().hide();
                    }
                    $(this).attr("placeholder", "");
                }
            });
        }
    },
    /* 打开弹窗 */
    openPopup: function(dom) {
        dom=(typeof dom=='object')?dom:$(dom);
        dom.show();
    },
    /**
     * 是否邮箱
     * @param val
     * @returns {boolean|*}
     */
    isEmail: function(val){
        return /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(val);
    },
    /**
     * 获取两个日期之间相差的天数
     * @param startDate
     * @param endDate
     * @returns {number}
     */
    getDateDiff:function(startDate, endDate) {
        var startTime = new Date(startDate).getTime();
        var endTime = new Date(endDate).getTime();
        var dates = Math.abs((startTime - endTime))/(1000*60*60*24);
        return  dates;
    },
    /**
     * 获取两个日期之间相差的小时
     * @param startDate
     * @param endDate
     * @returns {number}
     */
    getHourDiff:function(startDate, endDate) {
        var startTime = new Date(startDate).getTime();
        var endTime = new Date(endDate).getTime();
        var dates = Math.abs((startTime - endTime))/(1000*60*60);
        dates = Math.floor(dates);
        return  dates;
    },
    /**
     * 获取两个日期之间相差的分钟
     * @param startDate
     * @param endDate
     * @returns {number}
     */
    getMinuteDiff:function(startDate, endDate) {
        var startTime = new Date(startDate).getTime();
        var endTime = new Date(endDate).getTime();
        var dates = Math.abs((startTime - endTime))/(1000*60);
        dates = Math.floor(dates);
        return  dates;
    },
    /**
     * js日期、月份：日期加一天
     * @param date
     * @param days
     * @returns {string}
     */
    addDate: function (date,days){
        var d=new Date(date);
        d.setDate(d.getDate()+days);
        var m=d.getMonth()+1;
        return d.getFullYear()+'-'+m+'-'+d.getDate();
    }
};
/**
 * 打开客户界面
 * @param type
 */
function openLive800Chat(type){
    var url="https://www.onlineservice-hk.com/k800/chatClient/chatbox.jsp?companyID=209&s=1";
    if(type){
        location.href=url;
    }else{
        window.open (url,'Live800Chatindow','height=520,width=740,top=0,left=0,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no');
    }
}
/**
 * 打开客服QQ
 */
function openQQChatByCommonv3(param, uin){
    if(common.isBlank(uin)){
        uin = '800018282';
    }
    var url="http://crm2.qq.com/page/portalpage/wpa.php?uin="+uin+"&cref=&ref=&f=1&ty=1&ap=&as="+param;
    window.open (url,'QQChatindow','height=544, width=644,top=0,left=0,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no');
}
//QQ窗口客服(手机)
function openQQChatByCommonjs(){
    var url="http://wpa.b.qq.com/cgi/wpa.php?ln=2&uin=800018282";
    window.open (url);
}
//如果没有定义console,直接用alert替代
if(!window.console){
    console = (function(){
        var instance = null;
        function Constructor(){}
        Constructor.prototype = {
            log : function(str){
               return;
            },
            error:function(str){
                //alert(str);
                return;
            }
        };
        function getInstance(){
            if(instance == null){
                instance =  new Constructor();
            }
            return instance;
        };
        return getInstance();
    })();
}
/**
 * 可编辑div焦点定位通用方法
 * @returns {$.fn}
 */
$.fn.focusEnd = function() {
    $(this).focus();
    var tmp = $('<span/>').appendTo($(this)),
        node = tmp.get(0),
        range = null,
        sel = null;
    if (document.selection) {
        range = document.body.createTextRange();
        range.moveToElementText(node);
        range.select();
    } else if (window.getSelection) {
        range = document.createRange();
        range.selectNode(node);
        sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
    tmp.remove();
    return this;
};

/*替换字符串中占位符 扩展方法 begin*/
String.prototype.formatStr=function() {
    if(arguments.length==0) return this;
    for(var s=this, i=0; i<arguments.length; i++)
        s=s.replace(new RegExp("\\{"+i+"\\}","g"), (arguments[i] == null || arguments[i] == undefined) ? "" : arguments[i]);
    return s;
};
/*替换字符串中占位符 扩展方法 end*/

/*FX在线客服 begin*/
function live800Prompt(type) {
    window.onbeforeunload = null;
    var qqPrompt = "http://wpa.b.qq.com/cgi/wpa.php?ln=2&uin=800018886";
    var live800Prompt = "http://onlinecustomer-service.gwghk.com/live800/chatClient/chatbox.jsp?companyID=283&enterurl=http%3A%2F%2Fwww%2Egwfx%2Ecom%2F&tm=1355377642406";
    if (type == 2) {
        try {
            var myuuids = UUID.prototype.createUUID();
            //getGacookiesTrack(myuuids,"2","1");
            window.open(qqPrompt,'Live800Chatindow','height=520,width=740,top=0,left=0,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no');
        } catch (e) {
            window.open(qqPrompt,'Live800Chatindow','height=520,width=740,top=0,left=0,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no');
        }
    } else {
        try {
            var myuuids = UUID.prototype.createUUID();
            //getGacookiesTrack(myuuids,"2","2");
            window.open(live800Prompt,'Live800Chatindow','height=520,width=740,top=0,left=0,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no');
        } catch (e) {
            window.open(live800Prompt)
        }
    }
}

function qqPrompt(type){
    //注意：下面的注释不能删除
//dynamic content: contact info edm content
    var qqPrompt = "http://wpa.b.qq.com/cgi/wpa.php?ln=2&uin=800018886";
    var live800Prompt = "http://onlinecustomer-service.gwghk.com/live800/chatClient/chatbox.jsp?companyID=283&enterurl=http%3A%2F%2Fwww%2Egwfx%2Ecom%2F&tm=1355377642406";
    window.onbeforeunload = null;
    try {
        //追踪代码录入数据库
        var myuuids=UUID.prototype.createUUID();
        getGacookiesTrack(myuuids,"2","1");
        window.open(qqPrompt,'Live800Chatindow','height=520,width=740,top=0,left=0,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no');
    } catch (e) {
        window.open(qqPrompt,'Live800Chatindow','height=520,width=740,top=0,left=0,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no');
    }
}
/*FX在线客服 end*/