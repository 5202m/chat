/**
 * 直播间工具操作类
 * author Alan.wu
 */
var tool={
    financeShowIntervalId:null,
    financeHideIntervalId:null,
    /**
     * 初始化入口
     */
    init:function(){
        this.setEvent();
    },
    setEvent:function(){
        /*工具菜单可视控制*/
        $('.mod_menu li').hover(function(){
            if(!$(this).hasClass('entered')){
                tool.loadFun($(this).attr('class'));
                if($('.dr3').hasClass('on')){
                    clearTimeout(tool.financeHideIntervalId);
                }
            }
            if($(this).hasClass('dr2') && $(this).hasClass('entered')) {
                $('.dr2 .teacher-point ul').css('height', ($('.mod_menu').height() - 75));
                indexJS.setListScroll('.dr2 .teacher-point ul',{isCustom:false,scrollbarPosition:"outside"});//设置滚动
            }
            $(this).addClass('on entered');
            $(this).find(".dropcont").show();
        },function(){
            $(this).removeClass('on');
            $(this).find(".dropcont").hide();
            if(!$('.dr3').hasClass('on')){
                clearInterval(tool.financeShowIntervalId);
                tool.financeHideIntervalId = window.setTimeout("tool.clearCls('.dr3','entered')", 60000);
            }
        });
        $('#calendarFinance').val(common.formatterDate(indexJS.serverTime,"-"));
        /*财经日历选择日期*/
        $('#calendarFinance').change(function(){
            var releaseTime = $(this).val();
            tool.setFinanceData(releaseTime, 1);
        });
        $('.dr3 .date_select a').click(function(){
            $( "#calendarFinance").trigger('click');
        });
        /*支点计算器tab切换*/
        $('.calc_box .calc_tabnav a').click(function(){
            if(!$(this).hasClass('clicked')){
                tool.setPivotCalc($(this).attr('symbol'));
            }
            $('.calc_box .calc_tabnav a').removeClass('on');
            $('.calc_box .calc_tab').removeClass('on');
            $(this).addClass('on clicked');
            $($('.calc_box .calc_tab')[$(this).index()]).addClass('on');
        });
    },
    /**
     * 根据激活隐藏域的class加载数据
     * @param cls
     */
    loadFun:function(cls){
        switch(cls){
            case 'dropitem dr2':
                tool.teacherPoint();
                break;
            case 'dropitem dr3':
                tool.initCalendar(function(){
                    tool.setFinanceData('',1);/*财经日历数据*/
                    $('.dr3').addClass('initCalendar');
                    tool.financeShowIntervalId = window.setInterval("tool.setFinanceData('',1)", 60000);
                });
                break;
            case 'dropitem dr4':
                tool.setCftcCot();/*cftc持仓比例*/
                break;
            case 'dropitem dr5':
                /*只加载当前显示的选项卡*/
                tool.setPivotCalc('LLG');/*伦敦金支点计算器数据*/
                /*tool.getPivotCalc('LLS');*//*伦敦银支点计算器数据*/
                break;
            case 'dropitem dr6':
                tool.setDownloadPPT();/*课件下载*/
                break;
        }
    },
    /**
     * 初始化日历控件
     */
    initCalendar:function(callback){
        if(!$('.dr3').hasClass('initCalendar')) {/*避免多次初始化*/
            /*财经日历选择日期框*/
            LazyLoad.js(['/base/lib/pikaday/moment.min.js','/base/lib/pikaday/pikaday.min.js'], function () {
                var defaultDate = tool.currentDate();
                var i18n = { // 本地化
                    previousMonth: '上个月',
                    nextMonth: '下个月',
                    months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
                    weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
                    weekdaysShort: ['日', '一', '二', '三', '四', '五', '六']
                };
                var picker = new Pikaday({
                    field: $('#calendarFinance')[0],
                    firstDay: 1,
                    container: $('#calendarContainer')[0],
                    defaultDate: defaultDate,
                    i18n: i18n,
                    minDate: new Date(2000, 0, 1),
                    maxDate: new Date(2050, 12, 31),
                    yearRange: [2000, 2050],
                    onSelect: function () {
                        var date = document.createTextNode(this.getMoment().format('YYYY-MM-DD') + ' '); //生成的时间格式化成 2013-09-25
                        $('#calendarFinance').append(date);
                        //this.destroy();//不能使用销毁的方式，否则创建后为选择日期，会出现多个日历
                    }
                });
                callback();
            });
        }
        else{
            callback();
        }
    },
    /**
     * 财经日历数据
     * @param releaseTime 日期
     * @param dataTypeCon 数据类型
     */
    setFinanceData:function(releaseTime, dataTypeCon){
        if(common.isBlank(releaseTime)){
            releaseTime = tool.currentDate();
        }
        common.getJson('/hxstudio/getFinancData', {releaseTime: releaseTime, dataTypeCon: dataTypeCon}, function(result){
            if(result.result == 0){
                var countryImg = {'德国':'Germany', '法国':'France', '欧元区':'EUR', '加拿大':'CAD', '美国':'USD', '澳大利亚':'AUD', '日本':'JPY', '瑞士':'CHF', '意大利':'Italy', '英国':'GBP', '中国':'CNY', '新西兰':'NZD', '韩国':'SK', '香港':'HKD', '西班牙':'Spain', '台湾':'Taiwan', '印度':'INR', '新加坡':'Singapore'};
                var financeHtml = '';
                var financeFormat = tool.formatHtml('finance');
                $.each(result.data.financeData, function(key, value){
                    financeHtml += financeFormat.formatStr(value.time.substring(0,5),
                                                        common.isBlank(countryImg[value.country])?'none':countryImg[value.country],
                                                        value.country,
                                                        tool.importanceLevel(value.importanceLevel),
                                                        value.name,
                                                        common.isBlank(value.lastValue)?'---':value.lastValue,
                                                        common.isBlank(value.predictValue)?'---':value.predictValue,
                                                        common.isBlank(value.value)?'---':value.value
                                                        );
                });
                $('.dr3 .calendar_ul ul').html(financeHtml);
                indexJS.setListScroll('.calendar_ul.scrollbox2',{isCustom:false,scrollbarPosition:"outside"});/*设置滚动条*/
            }
        });
    },
    /*CFTC持仓比例*/
    setCftcCot:function(){
        $.getJSON('/hxstudio/get24kCftc',null,function(data){
            var cftcName = {'gold':'纽约期金', 'silver':'纽约期银', 'usd':'美元指数', 'oil':'纽约原油', 'cu':'纽约期铜'};
            if(data != null && data){
                var percHtml = '', dataHtml = '';
                var percFormat = tool.formatHtml('cftcperc');
                var dataFormat = tool.formatHtml('cftcdata');
                $.each(cftcName, function(key, value){
                    var l = data[key].long;
                    var s = data[key].short;
                    var total = parseInt(l) + parseInt(s);
                    var longPerc = Math.round(parseInt(l) / total * 100);
                    var shortPerc = Math.round(parseInt(s) / total * 100);
                    percHtml += percFormat.formatStr(value, longPerc, shortPerc);
                    dataHtml += dataFormat.formatStr(value, l, s, data[key].updatetime);
                });
                $('.dr4 .percent_list .perc_table').html(percHtml);
                $('.dr4 .perc_data .data_table tbody').html(dataHtml);
            }
        });
    },
    /**
     * 支点计算地址
     * @returns {string}
     */
    getOAUrl:function(){
        var h=window.location.host;
        if(h.indexOf("localhost")>=0){
            h="http://testweb.gwfx.com:9001/gateway.do?service=HqDataService&method=getPivotPointData&symbol=";
        }
        else if(h.indexOf("testweb1.24k.hk")>=0){
            h="http://testweb.gwfx.com:9001/gateway.do?service=HqDataService&method=getPivotPointData&symbol=";
        }
        else{
            //真实地址
            h="http://kdata.gwfx.com:8099/gateway.do?service=HqDataService&method=getPivotPointData&symbol=";
        }
        return h;
    },
    /**
     * 支点计算数据
     * @param symbol 类别：伦敦金LLG/伦敦银LLS
     */
    setPivotCalc:function(symbol){
        $.post(tool.getOAUrl()+symbol, {}, function(result){
            var dw = ['d', 'w'];
            if("true" === result.sucess.toLowerCase()){
                var size = result.msg.length;
                for(var i = 0; i < size; i++){
                    if($.inArray(result.msg[i].pivotType, dw) > -1){
                        $('#r3_' + result.msg[i].symbol + '_' + result.msg[i].pivotType).text(result.msg[i].resistance3);
                        $('#r2_' + result.msg[i].symbol + '_' + result.msg[i].pivotType).text(result.msg[i].resistance2);
                        $('#r1_' + result.msg[i].symbol + '_' + result.msg[i].pivotType).text(result.msg[i].resistance1);
                        $('#p_' + result.msg[i].symbol + '_' + result.msg[i].pivotType).text(result.msg[i].pivotPoint);
                        $('#s3_' + result.msg[i].symbol + '_' + result.msg[i].pivotType).text(result.msg[i].support3);
                        $('#s2_' + result.msg[i].symbol + '_' + result.msg[i].pivotType).text(result.msg[i].support2);
                        $('#s1_' + result.msg[i].symbol + '_' + result.msg[i].pivotType).text(result.msg[i].support1);
                    }
                }
            }
        },'json');
    },
    /**
     * 课件下载
     */
    setDownloadPPT:function(){
        var fileSuffix = {'pptx':'','ppt':'','pdf':' class="pdf"','docx':' class="word"','doc':' class="word"','rar':' class="rar"','zip':' class="rar"'};
        indexJS.getArticleList("download",indexJS.userInfo.groupId,1,1,100,'{"sequence":"desc"}',null,function(dataList){
            if(dataList && dataList.result==0){
                var data=dataList.data,row=null;
                var pptHtml = '';
                var pptFormat = tool.formatHtml('download');
                var cls;
                for(var i in data){
                    cls = (i == 0) ? ' class="fir"' : '';
                    row=data[i].detailList[0];
                    var suffix = data[i].mediaUrl.substring(data[i].mediaUrl.lastIndexOf('.')+1).toLowerCase();
                    var name = row.title+'.'+suffix;
                    var publishDate = common.formatterDate(data[i].publishStartDate, '-').replace('-','/').replace('-','/');
                    pptHtml += pptFormat.formatStr(cls,fileSuffix[suffix],row.title,(row.authorInfo?row.authorInfo.name:''),publishDate,data[i].mediaUrl,name, '');
                }
                $('.dr6 .ppt_list ul').html(pptHtml);
                indexJS.setListScroll('.ppt_list',{isCustom:false,scrollbarPosition:"outside"});/*设置滚动条*/
            }
            else{
                $('.dr6 .ppt_list ul').html('');
            }
        });
    },
    /**
     * 老师观点数据
     */
    teacherPoint:function(){
        indexJS.getArticleList("trade_strategy_article",indexJS.userInfo.groupId,1,1,100,'{"createDate":"desc"}', '',function(dataList) {
            var size = dataList.data.length, cls = '';
            if(dataList && dataList.result==0 && dataList.data && size>0) {
                var tearchPointHtml = '',tearchPointFormat = tool.formatHtml('tearchPoint');
                $.each(dataList.data, function(key, row){
                    var detail = row.detailList[0];
                    var publishDate = common.formatterDate(row.publishStartDate,'-').replace('-','年').replace('-','月')+'日';
                    if(key+1==size){
                        cls = ' class="last"';
                    }
                    tearchPointHtml += tearchPointFormat.formatStr(cls,detail.title,detail.authorInfo.name,publishDate,detail.content);
                });
                $('.dr2 .teacher-point ul').css('height', ($('.mod_menu').height() - 75));
                $('.dr2 .teacher-point ul').html(tearchPointHtml)
                indexJS.setListScroll('.dr2 .teacher-point ul',{isCustom:false,scrollbarPosition:"outside"});//设置滚动
            }else{
                //$('#lvInfoId p.content').html('亲，老师还未发布观点哦');
            }
        });
    },
    /**
     * 返回服务器当天日期
     */
    currentDate:function(){
        return common.formatterDate(indexJS.serverTime,"-");
    },
    /**
     * 用于定时器中清除classname
     * @param obj
     * @param cls
     */
    clearCls:function(obj, cls){
        $(obj).removeClass(cls);
    },
    /**
     * 根据传入的模块域标识返回待处理的html模板
     * @param region 模块域
     * @returns {string} html模板
     */
    formatHtml: function(region){
        var formatHtmlArr = [];
        switch(region){
            case 'finance':
                formatHtmlArr.push('<li>');
                formatHtmlArr.push('   <table cellpadding="0" cellspacing="0" border="0" width="100%" class="calendar_table">');
                formatHtmlArr.push('       <tr>');
                formatHtmlArr.push('           <td width="98"><span class="time">{0}</span></td>');
                formatHtmlArr.push('           <td><img src="http://www.24k.hk/public/economicCalenda/images/country/{1}.png" width="23">{2}</td>');
                formatHtmlArr.push('           <td width="80"><div class="stars">{3}</div></td>');
                formatHtmlArr.push('       </tr>');
                formatHtmlArr.push('       <tr>');
                formatHtmlArr.push('           <td colspan="3"><span class="tit">{4}</span></td>');
                formatHtmlArr.push('       </tr>');
                formatHtmlArr.push('       <tr>');
                formatHtmlArr.push('           <td>前值:<strong>{5}</strong></td>');
                formatHtmlArr.push('           <td>预测值:<strong>{6}</strong></td>');
                formatHtmlArr.push('           <td>公布值:<strong>{7}</strong></td>');
                formatHtmlArr.push('       </tr>');
                formatHtmlArr.push('   </table>');
                formatHtmlArr.push('</li>');
                break;
            case 'cftcperc':
                formatHtmlArr.push('<tr>');
                formatHtmlArr.push('   <td width="70"><strong>{0}</strong></td>');
                formatHtmlArr.push('   <td width="30">{1}%</td>');
                formatHtmlArr.push('   <td><div class="perc_box"><b style="width:{1}%"></b></div></td>');
                formatHtmlArr.push('   <td width="30" class="align_r">{2}%</td>');
                formatHtmlArr.push('</tr>');
                break;
            case 'cftcdata':
                formatHtmlArr.push('<tr>');
                formatHtmlArr.push('   <td>{0}</td>');
                formatHtmlArr.push('   <td align="right">{1}</td>');
                formatHtmlArr.push('   <td align="right">{2}</td>');
                formatHtmlArr.push('   <td></td>');
                formatHtmlArr.push('   <td align="center">{3}</td>');
                formatHtmlArr.push('</tr>');
                break;
            case 'download':
                formatHtmlArr.push('<li{0}>');
                formatHtmlArr.push('   <i{1}></i>');
                formatHtmlArr.push('   <div class="detail">');
                formatHtmlArr.push('       <strong>{2}</strong>');
                formatHtmlArr.push('       <span>{3}<b>{4}</b></span>');
                formatHtmlArr.push('       <a href="{5}" target="download" download="{6}" class="downbtn"><i></i><span>下载<b>{7}</b></span></a>');
                formatHtmlArr.push('   </div>');
                formatHtmlArr.push('</li>');
                break;
            case 'tearchPoint':
                formatHtmlArr.push('<li{0}>');
                formatHtmlArr.push('    <h4>{1}</h4>');
                formatHtmlArr.push('    <h6>');
                formatHtmlArr.push('        <i>作者:{2}</i>');
                formatHtmlArr.push('        <span>{3}</span>');
                /*formatHtmlArr.push('        <span>阅读:{4}</span>');*/
                formatHtmlArr.push('    </h6>');
                formatHtmlArr.push('    <p>{4}</p>');
                /*formatHtmlArr.push('    <a href="javascript:;">查看全文</a>');*/
                formatHtmlArr.push('</li>');
                break;
        }
        return formatHtmlArr.join("");
    },
    /**
     * 根据重要级别返回星星
     * @param level 重要级别
     */
    importanceLevel:function(level){
        var html = '';
        switch(level) {
            case 1:
                html = '<span class="bling">★</span><span>★</span><span>★</span><span>★</span><span>★</span>';
                break;
            case 2:
                html = '<span class="bling">★</span><span class="bling">★</span><span>★</span><span>★</span><span>★</span>';
                break;
            case 3:
                html = '<span class="bling">★</span><span class="bling">★</span><span class="bling">★</span><span>★</span><span>★</span>';
                break;
            case 4:
                html = '<span class="bling">★</span><span class="bling">★</span><span class="bling">★</span><span class="bling">★</span><span>★</span>';
                break;
            case 5:
                html = '<span class="bling">★</span><span class="bling">★</span><span class="bling">★</span><span class="bling">★</span><span class="bling">★</span>';
                break;
            default:
                html = '<span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>';
                break;
        }
        return html;
    }
};

// 初始化
$(function() {
    tool.init();
});
