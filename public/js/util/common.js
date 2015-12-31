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
     * 提取时分秒
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
            async: async!=undefined?async:false,
            dataType: "json",
            data: params,
            complete : function(XMLHttpRequest,status){ //请求完成后最终执行参数
                if(typeof (failCallBack) == "function"){
                    failCallBack(status);
                }else{
                    if(status=='timeout'){					//超时,status还有success,error等值的情况
                        alert("请求超时,请重试!");
                    }
                }
            },
            success: typeof (callback) == "function" ? callback : function (data) {
                result = data;
            },
            error: function (obj) {
                if(typeof (failCallBack) == "function"){
                    failCallBack(obj);
                }else{
                    if (common.isValid(obj.responseText)) {
                        if (obj.statusText != "OK") alert(obj.responseText);
                    }else{
                        alert("请求超时,请重试!");
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
     * 刷新session
     * 每隔15分钟
     */
    refreshSession:function(){
        setInterval(function(){
            $.get("/refreshSession?t="+new Date(),function(){});
        },1000*60*15);//每间隔15分钟刷新下报价信息*/
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
     * 格式化显示课程安排表
     * @param syllabus {{days : [{day: Integer, status : Integer}], timeBuckets : [{startTime : String, endTime : String, course : [{lecturer : String, title : String, status : Integer}]}]}}
     * @param currTime {{day : Integer, time : String}}
     * @param style 类型 1-直播间 2-微解盘
     */
    formatSyllabus:function(syllabus, currTime, style){
        var loc_constants = {
            dayCN : ['星期天','星期一','星期二','星期三','星期四','星期五','星期六'],
            indexCN : ['第一节','第二节','第三节','第四节','第五节','第六节','第七节','第八节'],
            courseCls : ['prev', 'ing', 'next'],
            tableCls : "syllabus"
        };
        //计算时间状态,返回对应的样式
        var loc_timeClsFunc = function(day, startTime, endTime, currTime, notCheckTime){
            var loc_index = 0;
            var tempDay = (day + 6) % 7; //将1,2,3,4,5,6,0转化为0,1,2,3,4,5,6
            var currTempDay = (currTime.day + 6) % 7;
            if(tempDay > currTempDay){
                loc_index = 2;
            }else if(tempDay < currTempDay){
                loc_index = 0;
            }else{
                if(notCheckTime){
                    loc_index = 1;
                }else if(endTime <= currTime.time){
                    loc_index = 0;
                }else if(startTime > currTime.time){
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
                var loc_courses = JSON.parse(syllabus);
                var loc_dayLen = !loc_courses.days ? 0 : loc_courses.days.length;
                if(loc_dayLen > 0)
                {
                    if(style === 1)
                    {
                        loc_html.push('<div class="sy_panel">');
                        //星期（头部）
                        var loc_startDateTime = currTime.timeLong - 86400000 * ((currTime.day + 6) % 7);
                        var loc_date = null;
                        var loc_dateStr = null;
                        var loc_activeCls = null;
                        loc_html.push('<div class="sy_nav">');
                        var loc_width = ' style="width:' + (100 / loc_dayLen) + '%;"'
                        for(var i = 0; i < loc_dayLen; i++)
                        {
                            loc_date = new Date(loc_startDateTime + ((loc_courses.days[i].day + 6) % 7) * 86400000);
                            loc_dateStr = loc_date.getFullYear() + "-"
                            + (loc_date.getMonth() < 9 ? "0" : "") + (loc_date.getMonth() + 1) + "-"
                            + (loc_date.getDate() < 10 ? "0" : "") + loc_date.getDate();
                            loc_activeCls = (loc_courses.days[i].day == currTime.day) ? ' class="active"' : "";
                            loc_html.push('<a href="javascript:void(0)" d="' + loc_courses.days[i].day + '"' + loc_activeCls + loc_width + '>' + loc_constants.dayCN[loc_courses.days[i].day] + '<br/><span>' + loc_dateStr + '</span></a>');
                        }
                        loc_html.push('</div>');
                        //课程
                        loc_html.push('<div class="sy_cont"><div>');
                        loc_html.push('<table cellpadding="0" cellspacing="1" border="0" class="' + loc_constants.tableCls + '">');
                        var loc_timeBucket = null;
                        var loc_timeCls = null;
                        for(var i = 0; i < loc_dayLen; i++)
                        {
                            loc_html.push('<tbody d="' + loc_courses.days[i].day + '">');
                            if(loc_courses.days[i].status == 0)
                            {
                                //全天休市
                                loc_timeCls = loc_timeClsFunc(loc_courses.days[i].day, null, null, currTime, true);
                                loc_html.push('<tr class="' + loc_timeCls + '" width="100%"><td>休市</td></tr>');
                            }
                            else
                            {
                                for(var j = 0, lenJ = loc_courses.timeBuckets.length; j < lenJ; j++)
                                {
                                    loc_timeBucket = loc_courses.timeBuckets[j];
                                    loc_timeCls = loc_timeClsFunc(loc_courses.days[i].day, loc_timeBucket.startTime, loc_timeBucket.endTime, currTime, false);
                                    loc_html.push('<tr class="' + loc_timeCls + '">');
                                    loc_html.push('<td width="25%">' + loc_timeBucket.startTime + '-' + loc_timeBucket.endTime + '</td>');
                                    if(loc_timeBucket.course[i].status == 0)
                                    {
                                        loc_html.push('<td colspan="2" width="75%">休市</td>');
                                    }
                                    else
                                    {
                                        loc_html.push('<td width="25%">' + loc_timeBucket.course[i].lecturer + '</td>');
                                        loc_html.push('<td width="50%">' + loc_timeBucket.course[i].title + '</td>');
                                    }
                                    loc_html.push('</tr>');
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
                                loc_timeCls = loc_timeClsFunc(loc_day.day, null, null, currTime, true);
                                loc_html.push('<td class="' + loc_timeCls + '" colspan="' + lenJ + '">休市</td>');
                            }
                            else
                            {
                                for(var j = 0; j < lenJ; j++){
                                    loc_timeBucket = loc_courses.timeBuckets[j];
                                    loc_timeCls = loc_timeClsFunc(loc_day.day, loc_timeBucket.startTime, loc_timeBucket.endTime, currTime, false);
                                    loc_html.push('<td class="' + loc_timeCls + '">' + (loc_timeBucket.course[i].status == 0 ? "休市" : loc_timeBucket.course[i].lecturer) + '</td>');
                                }
                            }
                            loc_html.push('</tr>');
                        }
                        loc_html.push('</table>');
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
function openQQChatByCommonv3(){
    var url="http://crm2.qq.com/page/portalpage/wpa.php?uin=800018282&cref=&ref=&f=1&ty=1&ap=&as=";
    window.open (url,'QQChatindow','height=544, width=644,top=0,left=0,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no');
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