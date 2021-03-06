/**
 * 直播间工具操作类
 * author Alan.wu
 */
var tool={
    financeShowIntervalId:null,
    financeHideIntervalId:null,
    tradeForUser:null,//指定用户的晒单(userNo)
    tradeList:[],//晒单数据
    tradeLoadAll:false,
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
            if($('.dr10').hasClass('entered')){
                $('.dr10').removeClass('entered');
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
        /*我要晒单按钮事件*/
        $('#wantShowTrade').click(function(){
            if(indexJS.userInfo.isLogin){
                if(common.isBlank(indexJS.userInfo.isSetName) || indexJS.userInfo.isSetName) {
                    $('#userName').val(indexJS.userInfo.nickname).attr('readonly', 'readonly');
                }
                $('.pop_addsd').removeClass('dn').show();
            }else{
                var ops = ops || {};
                box.openLgBox(ops.closeable, ops.showTip);
            }
        });
        /*我的晒单按钮事件*/
        $('#myShowTrade').click(function(){
            if(indexJS.userInfo.isLogin){
                tool.tradeForUser = indexJS.userInfo.userId;
                tool.initShowTrade();
                /*$('.dr10 .mysd_list .sdinfo .sdinfo_cont .headimg img').attr('src',$('#avatarInfoId').attr('src'));
                $('.dr10 .mysd_list .sdinfo .sdinfo_cont span b').text(indexJS.userInfo.nickname);*/
                $('#all-orders').addClass('dn');
                $('#my-orders').removeClass('dn');
                $('#myShowTrade').hide();
                $('#backShowTrade').show();
            }else{
                var ops = {};
                box.openLgBox(ops.closeable, ops.showTip);
            }
        });
        //  晒单显示更多文字
        $("#all-orders .showMore").live("click", function () {
            if($(this).text() != "查看全部"){
                $(this).text("查看全部");
                $(this).parent().prev().css("max-height", "48px");
            }else{
                $(this).text("收起内容");
                $(this).parent().prev().css("max-height", "none");
            }
        });
        /*返回晒单墙按钮事件*/
        $('#backShowTrade').click(function(){
            tool.tradeForUser = null;
            tool.initShowTrade();
            $('#all-orders').removeClass('dn');
            $('#my-orders').addClass('dn');
            $('#myShowTrade').show();
            $('#backShowTrade').hide();
        });
        /*上传晒单图片*/
        $("#flTradeImg").change(function (){
            var _this=$(this);
            var img = this.files[0];
            // 判断是否图片
            if(!img){
                return false;
            }
            // 判断图片格式
            if(!(img.type.indexOf('image')==0 && img.type && /\.(?:jpg|png|gif)$/.test(img.name.toLowerCase())) ){
                alert('目前暂支持jpg,gif,png格式的图片！');
                return false;
            }
            var fileSize=img.size;
            if(fileSize>=1024*512){
                alert('上传的图片大小不要超过512KB.');
                return false ;
            }
            try{
                var formData = new FormData($("#showTradeForm")[0]);
                $.ajax({
                    url: indexJS.apiUrl+'/upload/uploadFile',
                    type: 'POST',
                    data: formData,
                    async: false,
                    cache: false,
                    contentType: false,
                    processData: false,
                    success: function (dataRt) {
                        if(dataRt.result==0){
                            var data=dataRt.data?dataRt.data[0]:null;
                            if(data){
                                $('#tradeImg').val(data.fileDomain+data.filePath);
                                _this.val('');
                            }
                        }else{
                            alert("上传图片失败，请联系在线客服！");
                        }
                    },
                    error: function (result) {
                        console.error("error:",result);
                    }
                });
            }catch(es){
                console.error("上传图片失败",es);
            }
        });
        /*提交晒单数据*/
        $('#tradeSubmit').click(function(){
            tool.showTrade();
        });
        /*继续晒单*/
        $('#showTradeAgain').click(function(){
            $('.pop_addsd input[type="text"],.pop_addsd textarea').val('');
            $('#flTradeImg').val('');
            if(indexJS.userInfo.isSetName) {
                $('#userName').val(indexJS.userInfo.nickname).attr('readonly', 'readonly');
            }
            $('.sd_result').addClass('dn').hide();
        });
        /*我知道了*/
        $('#sdResultClose').click(function(){
            $('.pop_addsd input[type="text"],.pop_addsd textarea').val('');
            $('#flTradeImg').val('');
            if(indexJS.userInfo.isSetName) {
                $('#userName').val(indexJS.userInfo.nickname).attr('readonly', 'readonly');
            }
            $('.sd_result').addClass('dn').hide();
            $('.pop_close').click();
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
            //case 'dropitem dr10':
                //tool.initShowTrade();/*晒单墙*/
                //break;
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
                    pptHtml += pptFormat.formatStr(cls,fileSuffix[suffix],row.title,(row.authorInfo?row.authorInfo.name:''),publishDate,data[i].mediaUrl,name, data[i]._id, '', common.isBlank(data[i].downloads)?0:data[i].downloads);
                }
                $('.dr6 .ppt_list ul').html(pptHtml);
                tool.setDownloads();
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
     * 获取晒单数据
     * @param pageNo
     * @param pageSize
     */
    initShowTrade:function(){
        if(indexJS.userInfo.isLogin) {
            $('#showTradeInfo img').attr('src', $('#avatarInfoId').attr('src'));
            $('#showTradeNk').text(indexJS.userInfo.nickname);
        }else{
            $('#showTradeInfo img').attr('src', $('#visitorListId li .mynk').prev().children('img').attr('src'));
            $('#showTradeNk').text($('#visitorListId li .mynk').text().replace('【我】',''));
        }
        var params = {groupType:indexJS.userInfo.groupType};
        if(common.isValid(tool.tradeForUser)){
            params.userNo = tool.tradeForUser;
        }
        common.getJson('/hxstudio/getShowTrade',{data:JSON.stringify(params)},function(data){
            if(data.isOK && common.isValid(data.data)){
                if(common.isBlank(tool.tradeForUser)) {
                    $('#all-orders .scrollbox').empty();
                }else{
                    $('#my-orders .scrollbox').empty();
                }
                tool.tradeList = data.data.tradeList || [];
                if(indexJS.userInfo.isLogin) {
                    var row = null, num = 0;
                    for(var i = 0, len = tool.tradeList.length; i < len; i++){
                        row = tool.tradeList[i];
                        if(row.user.userNo == indexJS.userInfo.userId){
                            num++;
                        }
                    }
                    $('#sdcount').text(num)
                }
                tool.tradeLoadAll = false;
                tool.setShowTrade();
            }else{

            }
        });
    },
    /**
     * 设置晒单墙数据显示
     * @returns {boolean}
     */
    setShowTrade:function(){
        var start = common.isBlank(tool.tradeForUser) ? $("#all-orders .scrollbox div.show-order-box").size() : $("#my-orders .scrollbox div.show-order-box").size();
        var listData = tool.tradeList;
        var row = null;
        var length = listData.length;
        if(start<length){
            tool.tradeLoadAll = false;
        }
        if(tool.tradeLoadAll){
            return false;
        }
        if(indexJS.userInfo.userId != tool.tradeForUser && common.isValid(tool.tradeForUser)) {
            $('#sdcount').text(common.isValid(tool.tradeForUser) ? length : '0');
        }
        var tradeHtml='',tradeFormat = common.isBlank(tool.tradeForUser) ? tool.formatHtml('showTradeAll') : tool.formatHtml('showTradeUser'),cls;
        for(var i = start; i < length && i < start + 20; i++){
            row = listData[i];
            /*switch (row.status){
                case 1:
                    cls = '';
                    break;
                case 0:
                    cls = ' class="s1"';
                    break;
                case -1:
                    cls = ' class="s2"';
                    break;
            }*/
            var showTradeDate = common.formatterDateTime(row.showDate,'/').substr(0,16);
            if(common.isBlank(tool.tradeForUser)){
                tradeHtml += tradeFormat.formatStr(row.title, row.user.userName, showTradeDate, row.tradeImg, row.remark, row._id, common.isBlank(row.praise)?0:row.praise, row.user.userNo, row.user.avatar);
            }else{
                tradeHtml += tradeFormat.formatStr(row.title, showTradeDate, row.tradeImg, row.remark, row._id, common.isBlank(row.praise)?0:row.praise);
            }
        }
        if(common.isBlank(tool.tradeForUser)) {
            $('#all-orders .scrollbox').append(tradeHtml);
        }else{
            $('#my-orders .scrollbox').append(tradeHtml);
        }
        if(i >= length - 1){
            tool.tradeLoadAll = true;
        }
        tool.setUserShowTrade();
        tool.showTradePraise();
        indexJS.setListScroll($(".all-orders"), {callbacks : {onTotalScroll : function(){tool.setShowTrade();}}});/*设置滚动条*/
    },
    /**
     * 用户晒单数据
     */
    setUserShowTrade:function(){
        $('.all-orders .show-order-box h6 a').click(function(){
            tool.tradeForUser = $(this).attr('userId');
            tool.initShowTrade();
            $('#showTradeInfo img').attr('src',$(this).attr('avatar'));
            $('#showTradeNk').text($(this).text());
            $('#all-orders').addClass('dn');
            $('#my-orders').removeClass('dn');
            $('#myShowTrade').hide();
            $('#backShowTrade').show();
        });
    },
    /**
     * 我要晒单提交
     */
    showTrade:function(){
        var title = $('#title').val();
        var userName = $('#userName').val();
        var tradeImg = $('#tradeImg').val();
        var remark = $('#remark').val();
        if(common.isBlank(title)){
            $('#trade_error').text('请输入标题').show();
        }else if(common.isBlank(userName)){
            $('#trade_error').text('请输入晒单人').show();
        }else if(common.isBlank(tradeImg)){
            $('#trade_error').text('请上传晒单图片').show();
        }else{
            var params = {groupType:indexJS.userInfo.groupType,
                userNo:indexJS.userInfo.userId,
                avatar:$('#avatarInfoId').attr('src'),
                userName:userName,
                tradeImg:tradeImg,
                remark:remark,
                title:title,
                tradeType:2,
                groupId:indexJS.userInfo.groupId,

            };
            common.getJson('/hxstudio/addShowTrade',{data:JSON.stringify(params)},function(data){
                if(data.isOK){
                    $('.sd_result').removeClass('dn').show();
                    if(!indexJS.userInfo.isSetName){
                        $('#setNkForm input[name="nickname"]').val(userName);
                        $('#setNkBtn').click();
                    }
                }else{
                    box.showMsg(data.msg);
                }
            });
        }
    },
    /**
     * 晒单墙点赞事件
     */
    showTradePraise:function(){
        $('.all-orders .scrollbox .show-order-box .support').click(function(){
            var $this = $(this);
            var params = {clientId:indexJS.userInfo.userId, praiseId:$(this).attr('i')};
            common.getJson("/hxstudio/setTradePraise",{data:JSON.stringify(params)},function(result){
                if(result.isOK) {
                    $this.find('i').fadeIn().delay(400).fadeOut();
                    var sp= $this.find("span");
                    sp.text(common.isValid(sp.text())?(parseInt(sp.text())+1):0);
                }else{
                    box.showTipBox('亲，已点赞，当天只能点赞一次！');
                }
                $this.addClass('supported');
                $this.attr('title','已点赞');
            },true);
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
     * 设置下载次数
     */
    setDownloads: function(){
        $('.dr6 .ppt_list ul li a').click(function(){
            var _this = $(this);
            common.getJson(indexJS.apiUrl+ '/common/modifyArticle', {id :_this.attr('i'), 'type':'downloads'}, function(result){
                if(result.isOK){
                    _this.next('.downloads').find('span').text(result.num);
                }
            });
        });
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
                formatHtmlArr.push('       <a href="{5}" target="download" download="{6}" class="downbtn" i="{7}"><i></i><span>下载<b>{8}</b></span></a>');
                formatHtmlArr.push('       <span class="downloads">已下载:<span>{9}</span></span>');
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
            case 'showTradeAll':
                formatHtmlArr.push('<div class="show-order-box">');
                formatHtmlArr.push('    <h5>{0}</h5>');//标题
                formatHtmlArr.push('    <h6>晒单人：<a href="javascript:void(0)" userId="{7}" avatar="{8}">{1}</a></h6>');//晒单人
                formatHtmlArr.push('    <p class="time">{2}</p>');//时间
                formatHtmlArr.push('    <a href="{3}" data-rel="usersd" data-title="{0}" data-lightbox="usersd-all-img">');
                formatHtmlArr.push('        <img src="{3}" alt="{0}" class="mCS_img_loaded">');
                formatHtmlArr.push('    </a>');
                formatHtmlArr.push('    <p class="orders-test">{4}</p>');//晒单内容
                formatHtmlArr.push('    <div class="orders-btn">');
                formatHtmlArr.push('        <a href="javascript:void(0);" class="support" i="{5}"><span>{6}</span><i>+1</i></a>');//id和点赞数
                formatHtmlArr.push('        <a href="javascript:void(0);" class="showMore">查看全部</a>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</div>');
                /*formatHtmlArr.push('<li>');
                formatHtmlArr.push('    <span class="sd_tit" title="{0}">{0}</span>');
                formatHtmlArr.push('    <div class="sdinfo_bar">');
                formatHtmlArr.push('        <span class="fl">晒单人：<a href="javascript:void(0)" userId="{7}" avatar="{8}">{1}</a></span>');
                formatHtmlArr.push('        <span class="sd_date">{2}</span>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('    <a href="{3}" data-rel="usersd" data-title="{0}" class="lightbox" data-lightbox="usersd-all-img"><img src="{3}" alt="{0}"><i></i></a>');
                formatHtmlArr.push('    <p class="sd_skill">{4}</p>');
                formatHtmlArr.push('    <a href="javascript:void(0)" class="support" id="{6}">(<span>{5}</span>)<i>+1</i></a>');
                formatHtmlArr.push('</li>');*/
                break;
            case 'showTradeUser':
                formatHtmlArr.push('<div class="show-order-box">');
                formatHtmlArr.push('    <h5>{0}</h5>');//标题
                formatHtmlArr.push('    <p class="time">{1}</p>');//时间
                formatHtmlArr.push('    <a href="{2}" data-rel="usersd" data-title="{0}" data-lightbox="usersd-mime-img">');
                formatHtmlArr.push('        <img src="{2}" alt="{0}" class="mCS_img_loaded">');
                formatHtmlArr.push('    </a>');
                formatHtmlArr.push('    <p class="orders-test">{3}</p>');//晒单内容
                formatHtmlArr.push('    <div class="orders-btn">');
                formatHtmlArr.push('        <a href="javascript:void(0);" class="support" i="{4}"><span>{5}</span><i>+1</i></a>');//id和点赞数
                formatHtmlArr.push('        <a href="javascript:void(0);" class="showMore">查看全部</a>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</div>');
                /*formatHtmlArr.push('<li{0}>');
                formatHtmlArr.push('    <i class="state"></i>');
                formatHtmlArr.push('    <span class="sd_tit" title="{1}">{1}</span>');
                formatHtmlArr.push('    <a href="{2}" data-rel="usersd" data-title="{1}" class="lightbox" data-lightbox="usersd-mime-img"><img src="{2}" alt="{1}"><i></i></a>');
                formatHtmlArr.push('    <p class="sd_skill">{3}</p>');
                formatHtmlArr.push('    <div class="sdbotbar">');
                formatHtmlArr.push('        <span class="sd_date">{4}</span>');
                formatHtmlArr.push('        <a href="javascript:void(0)" class="support" id="{6}">(<span>{5}</span>)<i>+1</i></a>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</li>');*/
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
    },
    /**
     * 设置晒单墙数据显示
     * @returns {boolean}
     */
    setPushShowTrade:function(data){

        var index=$("#showTrade").index()-1;
        $(".mod_videolist .tabnav a").removeClass("on");
        $(this).addClass("on");
        $(".mod_videolist .listcont .list_tab").removeClass("on").eq(index).addClass("on");

        $('#all-orders').removeClass('dn');
        $('#my-orders').addClass('dn');
        $('#myShowTrade').show();
        $('#backShowTrade').hide();

        tool.initPushShowTrade(function(){
            var row = data;

            var tradeHtml='',tradeFormat = tool.pushShowTradehtml();

            var showTradeDate = common.formatterDateTime(row.showDate,'/').substr(0,16);
            if(common.isBlank(tool.tradeForUser)){
                tradeHtml += tradeFormat.formatStr(row.title, row.boUser.userName, showTradeDate, row.tradeImg, row.remark, row.id, common.isBlank(row.praise)?0:row.praise, row.boUser.userNo, row.boUser.avatar,row.id);
            }else{
                tradeHtml += tradeFormat.formatStr(row.title, showTradeDate, row.tradeImg, row.remark, row.id, common.isBlank(row.praise)?0:row.praise,row.id);
            }

            $('#all-orders .scrollbox').prepend(tradeHtml);

            tool.setUserShowTrade();
            tool.showTradePraise();
            indexJS.setListScroll($(".all-orders"), {callbacks : {onTotalScroll : function(){tool.setShowTrade();}}});/*设置滚动条*/

            tool.setShowTradeStyle(row.id);
        });

    },

    setShowTradeStyle:function(id){
        var i = 0;
        var t = setInterval(function(){
            i++;
            if(i%2==0){
                $("#"+id).css("border","2px solid red");
            }else{
                $("#"+id).css("border","0px");
            }
            if(i == 10){
                clearInterval(t);
                $("#"+id).css("border","0px");
            }
        },500);
    },

    pushShowTradehtml:function(){
        var formatHtmlArr = [];
        formatHtmlArr.push('<div class="show-order-box"  id="{9}">');
        formatHtmlArr.push('    <h5>{0}</h5>');//标题
        formatHtmlArr.push('    <h6>晒单人：<a href="javascript:void(0)" userId="{7}" avatar="{8}">{1}</a></h6>');//晒单人
        formatHtmlArr.push('    <p class="time">{2}</p>');//时间
        formatHtmlArr.push('    <a href="{3}" data-rel="usersd" data-title="{0}" data-lightbox="usersd-all-img">');
        formatHtmlArr.push('        <img src="{3}" alt="{0}" class="mCS_img_loaded">');
        formatHtmlArr.push('    </a>');
        formatHtmlArr.push('    <p class="orders-test">{4}</p>');//晒单内容
        formatHtmlArr.push('    <div class="orders-btn">');
        formatHtmlArr.push('        <a href="javascript:void(0);" class="support" i="{5}"><span>{6}</span><i>+1</i></a>');//id和点赞数
        formatHtmlArr.push('        <a href="javascript:void(0);" class="showMore">查看全部</a>');
        formatHtmlArr.push('    </div>');
        formatHtmlArr.push('</div>');
        return formatHtmlArr.join("");
    },
    /**
     * 晒单数据初始化
     * @param pageNo
     * @param pageSize
     */
    initPushShowTrade:function(callback){
        if(indexJS.userInfo.isLogin) {
            $('#showTradeInfo img').attr('src', $('#avatarInfoId').attr('src'));
            $('#showTradeNk').text(indexJS.userInfo.nickname);
        }else{
            $('#showTradeInfo img').attr('src', $('#visitorListId li .mynk').prev().children('img').attr('src'));
            $('#showTradeNk').text($('#visitorListId li .mynk').text().replace('【我】',''));
        }
        var params = {groupType:indexJS.userInfo.groupType};
        if(common.isValid(tool.tradeForUser)){
            params.userNo = tool.tradeForUser;
        }
        common.getJson('/hxstudio/getShowTrade',{data:JSON.stringify(params)},function(data){
            if(data.isOK && common.isValid(data.data)){
                if(common.isBlank(tool.tradeForUser)) {
                    $('#all-orders .scrollbox').empty();
                }else{
                    $('#my-orders .scrollbox').empty();
                }
                tool.tradeList = data.data.tradeList || [];
                if(indexJS.userInfo.isLogin) {
                    var row = null, num = 0;
                    for(var i = 0, len = tool.tradeList.length; i < len; i++){
                        row = tool.tradeList[i];
                        if(row.user.userNo == indexJS.userInfo.userId){
                            num++;
                        };
                    }
                    $('#sdcount').text(num)
                }
                tool.tradeLoadAll = false;
                tool.setShowTrade();
                callback();
            }else{
                callback();
            }
        });
    }

};