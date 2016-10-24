/**
 * 直播间聊天区直播精华选项卡操作类
 * author Jade.zhu
 */
var chatPride = {
    classNoteInfo:[],//直播精华非交易策略数据
    /**
     * 初始化
     */
    init: function(){
        this.setTradeStrategyNote(null, true);
        this.setEvent();
    },
    /**
     * 设置各种事件
     */
    setEvent: function(){
        /**课堂笔记加载更多*/
        $("#textliveMore").bind("click", function(){
            if(!$(this).is(".all")){
                var lastId = $("#textlivePanel li[aid]:last").attr("aid");
                indexJS.setTradeStrategyNote(lastId, false);
            }
        });
    },
    /**
     * 设置广告
     */
    setAdvertisement:function(){
        if(!$(".live_banner").hasClass('loaded')) {
            indexJS.getArticleList("advertisement", indexJS.userInfo.groupId, "0", 1, 5, '{"sequence":"desc","publishStartDate":"desc"}', null, function (dataList) {
                if (dataList && dataList.result == 0) {
                    var data = dataList.data;
                    for (var i in data) {
                        $(".ban_ul:first").append('<li><a href="' + (common.isBlank(data[i].linkUrl) ? "javascript:" : data[i].linkUrl) + '" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'banner_img\', \'' + data[i].detailList[0].title + '\']);" target="_blank"><img width="100%" alt="" src="' + data[i].mediaUrl + '"></a></li>');
                    }
                    /**
                     * 图片幻灯片广告
                     */
                    $(".live_banner").slide({
                        titCell: ".num ul",
                        mainCell: ".ban_ul",
                        effect: "left",
                        autoPlay: true,
                        delayTime: 300,
                        interTime: 4000,
                        autoPage: true
                    });
                    $(".live_banner").addClass('loaded');
                }
            });
        }
    },
    /**
     * 加载直播精华
     */
    setTradeStrategyNote : function(noteId, isLoad){
        if(!isLoad || !$("#textlivePanel").data("loaded")){
            if(isLoad){
                $("#textlivePanel").data("loaded", true);
                if(!noteId){
                    noteId = $("#textlivePanel li[aid]:last").attr("aid");
                }
            }
            var params = {
                isAll : 1,
                pageKey : noteId || "",
                pageLess : 1
            };
            indexJS.getArticleList("class_note",indexJS.userInfo.groupId,1,1,30,'{"publishStartDate":"desc","createDate":"desc"}',params,function(dataList){
                if(dataList && dataList.result==0){
                    var data=dataList.data;
                    for(var i in data){
                        chatPride.appendTradeStrategyNote(data[i], false, false, false);
                    }
                    for(var i in chatPride.classNoteInfo){
                        chatPride.appendClassNoteInfo(chatPride.classNoteInfo[i], false, false, false);
                    }
                    chatPride.classNoteInfo = [];//完成后清空数据
                    if(data.length < dataList.pageSize){
                        $("#textliveMore").addClass("all").html("已加载全部");
                    }
                }
                chatPride.setAdvertisement();
                indexJS.setListScroll($(".tabcont .main_tab .livebrief_list .scrollbox"));//直播精华
            });
        }
    },
    /**
     * 追加直播精华
     */
    appendTradeStrategyNote : function(articleInfo, isPrepend, showNum, isPush){
        var articleDetail,publishTime, $panel = $("#textlivePanel"),$panelUL,tradeStrategyLiveBriefHtml='';
        var tradeStrategyLiveBrief = chatPride.formatHtml('tradeStrategyLiveBrief'); //课程老师信息
        var tradeStrategySupport = chatPride.formatHtml('tradeStrategySupport'); //交易支撑位信息
        var tradeStrategySupportDiv = chatPride.formatHtml('tradeStrategySupportDiv');//交易支撑位支撑值
        var tagFormat = chatPride.formatHtml('tag');//分析师标签
        var tradeStrategyNoteImg = chatPride.formatHtml('tradeStrategyNoteImg'); //图片信息
        var imgReg = /<img\s+[^>]*src=['"]([^'"]+)['"][^>]*>/,matches;
        articleDetail=articleInfo.detailList && articleInfo.detailList[0];
        var aid = articleInfo._id || articleInfo.id;
        if (common.isValid(articleDetail.tag) && articleDetail.tag == 'trading_strategy') {
            publishTime = new Date(articleInfo.publishStartDate).getTime();
            //课程信息
            $panelUL = $panel.find(".livebrief[pt='" + publishTime + "']>div.te_info");
            if ($panelUL.size() == 0) {
                var author = '', avatar = '', style = '', tag = [], tagHtml = [];
                if (articleDetail.authorInfo) {
                    author = articleDetail.authorInfo.name || "";
                    avatar = articleDetail.authorInfo.avatar || "";
                    tag = common.isValid(articleDetail.authorInfo.tag) ? articleDetail.authorInfo.tag.replace(/\s*，\s*/g,',').split(',') : [];
                    $.each(tag, function (key, val) {
                        tagHtml.push(tagFormat.formatStr(val));
                    });
                }
                var publishTimeStr = common.formatterDateTime(publishTime, '-').substring(0, 16)
                    + "-" + common.formatterDateTime(articleInfo.publishEndDate, '-').substring(11, 16);
                var tradeStrategySupportHtml = [];
                if (common.isValid(articleDetail.tag) && articleDetail.tag == 'trading_strategy') {
                    var remarkArr = common.isValid(articleDetail.remark) ? JSON.parse(articleDetail.remark) : [];
                    var remarkMap = {};
                    $.each(remarkArr, function(i, row){
                        if(remarkMap.hasOwnProperty(row.symbol)){
                            remarkMap[row.symbol].push(row);
                        }else{
                            remarkMap[row.symbol] = [row];
                        }
                    });
                    if (indexJS.userInfo.isLogin && indexJS.userInfo.clientGroup == 'vip') {
                        style = ' style="display:none;"';
                        var idx = 0;
                        $.each(remarkMap, function (i, row) {
                            var tradeStrategySupportDivHtml = [];
                            $.each(row, function(j, r){
                                tradeStrategySupportDivHtml.push(tradeStrategySupportDiv.formatStr((j + 1), r.support_level, ''));
                            });
                            tradeStrategySupportHtml.push(tradeStrategySupport.formatStr(row[0].name,tradeStrategySupportDivHtml.join(''), (idx==0?'<a href="javascript:void(0);" class="viewdata"'+style+' _id="'+aid+'" item="prerogative_strategy">查看数据</a>':'')));
                            idx++;
                        });
                    } else {
                        if (remarkArr.length == 0) {
                            style = ' style="display:none;"';
                        }
                        var idx = 0;console.log(remarkMap);
                        $.each(remarkMap, function (i, row) {
                            var tradeStrategySupportDivHtml = [];
                            $.each(row, function(j, r){
                                tradeStrategySupportDivHtml.push(tradeStrategySupportDiv.formatStr((j + 1), r.support_level, 'dim'));
                            });
                            tradeStrategySupportHtml.push(tradeStrategySupport.formatStr(row[0].name,tradeStrategySupportDivHtml.join(''), (idx==0?'<a href="javascript:void(0);" class="viewdata"'+style+' _id="'+aid+'" item="prerogative_strategy">查看数据</a>':'')));
                            idx++;
                        });
                    }
                } else {
                    style = ' style="display:none;"';
                }
                var contentHtml = (articleDetail.tag == 'trading_strategy' ? articleDetail.content : '');
                if (common.isValid(contentHtml)) {
                    matches = imgReg.exec(contentHtml);
                    while (matches) {
                        contentHtml = contentHtml.replace(imgReg, tradeStrategyNoteImg.formatStr(matches[1]));
                        matches = imgReg.exec(contentHtml);
                    }
                }
                tradeStrategyLiveBriefHtml = tradeStrategyLiveBrief.formatStr(avatar, author, publishTimeStr, (articleDetail.title || ""), contentHtml, tradeStrategySupportHtml.join(''), publishTime, style, tagHtml.join(''), aid);
                if (isPrepend) {
                    $panel.prepend(tradeStrategyLiveBriefHtml);
                } else {
                    $panel.append(tradeStrategyLiveBriefHtml);
                }
                $panel.find(".picpart>.imgbox").each(function () {
                    var $this = $(this);
                    $this.find("a>img").attr("src", $this.attr("url"));
                });
            }else if($panelUL.size() > 0 && isPush){
                 var author = '', avatar = '',style = '',tag =[], tagHtml = [];
                 if (articleDetail.authorInfo) {
                     author = articleDetail.authorInfo.name || "";
                     avatar = articleDetail.authorInfo.avatar || "";
                     tag = common.isValid(articleDetail.authorInfo.tag)? articleDetail.authorInfo.tag.replace(/\s*，\s*/g,',').split(',') : [];
                     $.each(tag, function(key, val){
                        tagHtml.push(tagFormat.formatStr(val));
                     });
                 }
                 var publishTimeStr = common.formatterDateTime(publishTime, '-').substring(0, 16)
                    + "-" + common.formatterDateTime(articleInfo.publishEndDate, '-').substring(11, 16);
                 var tradeStrategySupportHtml = [];
                 var remarkArr = common.isValid(articleDetail.remark) ? JSON.parse(articleDetail.remark) : [];
                 var remarkMap = {};
                 $.each(remarkArr, function(i, row){
                     if(remarkMap.hasOwnProperty(row.symbol)){
                         remarkMap[row.symbol].push(row);
                     }else{
                         remarkMap[row.symbol] = [row];
                     }
                 });
                 if (common.isValid(articleDetail.tag) && articleDetail.tag == 'trading_strategy') {
                     if (indexJS.userInfo.isLogin && indexJS.userInfo.clientGroup == 'vip') {
                         var idx = 0;
                         $.each(remarkMap, function (i, row) {
                             var tradeStrategySupportDivHtml = [];
                             $.each(row, function(j, r){
                                 tradeStrategySupportDivHtml.push(tradeStrategySupportDiv.formatStr((j + 1), r.support_level, ''));
                             });
                             tradeStrategySupportHtml.push(tradeStrategySupport.formatStr(row[0].name,tradeStrategySupportDivHtml.join(''), (idx==0?'<a href="javascript:void(0);" class="viewdata"'+style+' _id="'+aid+'" item="prerogative_strategy">查看数据</a>':'')));
                             idx++;
                         });
                     } else {
                         if (remarkArr.length == 0) {
                             style = ' style="display:none;"';
                         }
                         var idx = 0;
                         $.each(remarkMap, function (i, row) {
                             var tradeStrategySupportDivHtml = [];
                             $.each(row, function(j, r){
                                 tradeStrategySupportDivHtml.push(tradeStrategySupportDiv.formatStr((j + 1), r.support_level, 'dim'));
                             });
                             tradeStrategySupportHtml.push(tradeStrategySupport.formatStr(row[0].name,tradeStrategySupportDivHtml.join(''), (idx==0?'<a href="javascript:void(0);" class="viewdata"'+style+' _id="'+aid+'" item="prerogative_strategy">查看数据</a>':'')));
                             idx++;
                         });
                     }
                 }
                var contentHtml = (articleDetail.tag == 'trading_strategy' ? articleDetail.content : '');
                if (common.isValid(contentHtml)) {
                    matches = imgReg.exec(contentHtml);
                    while (matches) {
                        contentHtml = contentHtml.replace(imgReg, tradeStrategyNoteImg.formatStr(matches[1]));
                        matches = imgReg.exec(contentHtml);
                    }
                }
                 $panelUL = $panel.find(".livebrief[_aid='" + aid + "']");
                 $panelUL.find('div.te_info>div.himg>img').attr('src',avatar);
                 $panelUL.find('div.te_info>div.teinfo1>span.te_name').text(author);
                 $panelUL.find('div.te_info>div.teinfo1>span.livetime').text(publishTimeStr);
                 $panelUL.find('div.te_info>div.teinfo1>span.brieftit').text(articleDetail.title || "");
                 $panelUL.find('div.te_info>div.teinfo>div.taglist').html(tagHtml.join(''));
                 $panelUL.find('div.hdbox>div.skill').html('<span><i class="dot"></i>当前交易策略：</span>'+contentHtml);
                 $panelUL.find('div.hdbox>div.skilldata').html(tradeStrategySupportHtml.join(''));
                 if(remarkArr.length>0 && indexJS.userInfo.isLogin){
                    $panelUL.find('div.hdbox>div.skilldata>a').hide();
                 }else{
                    $panelUL.find('div.hdbox>div.skilldata>a').show();
                 }
             }
        } else {
            chatPride.classNoteInfo.push(articleInfo);
        }

        if(showNum){
            var $cnt = $('.main_tabnav a[t="livepride"] .num');
            if(!$cnt.parent().parent().parent().parent().is(".on")){
                var cnt = ($cnt.data("cnt") || 0) + 1;
                $cnt.data("cnt", cnt).html(cnt).show();
            }else{
                $cnt.data("cnt", cnt).html(cnt).hide();
            }
        }else{
            $('.main_tabnav a[t="livepride"] .num').hide();
        }
        //查看数据
        $('.viewdata,.viewdata2').unbind('click');
        $('.viewdata,.viewdata2').click(function(){
            if(!indexJS.userInfo.isLogin){
                $('#login_a').click();
            }else{
                chatPride.viewData($(this));
            }
        });
    },
    /**
     * 加载直播精华交易策略下的内容
     * @param articleInfo
     * @param isPrepend
     * @param showNum
     * @param isPush
     */
    appendClassNoteInfo:function(articleInfo, isPrepend, showNum, isPush){
        var articleDetail,publishTime, $panel = $("#textlivePanel"),html,$li,publishTimeStr;
        var tradeStrategyNote = chatPride.formatHtml('tradeStrategyNote'); //文档信息
        var tradeStrategyHd = chatPride.formatHtml('tradeStrategyHd'); //文档信息喊单
        var tradeStrategyHdDetail = chatPride.formatHtml('tradeStrategyHdDetail'); //文档信息喊单内容
        var tradeStrategyNoteDetail = chatPride.formatHtml('tradeStrategyNoteDetail'); //文档信息内容
        var tradeStrategyNoteImg = chatPride.formatHtml('tradeStrategyNoteImg'); //图片信息
        var imgReg = /<img\s+[^>]*src=['"]([^'"]+)['"][^>]*>/,matches;
        articleDetail=articleInfo.detailList && articleInfo.detailList[0];
        publishTime = new Date(articleInfo.publishStartDate).getTime();
        //课程信息
        var aid = articleInfo._id || articleInfo.id;
        if(isPush){
            $panel.find("li[aid='" + aid + "']").remove();
        }
        if ($panel.find("li[aid='" + aid + "']").size() > 0) {
            return;
        }
        html = articleDetail.content;
        matches = imgReg.exec(html);
        while (matches) {
            html = html.replace(imgReg, tradeStrategyNoteImg.formatStr(matches[1]));
            matches = imgReg.exec(html);
        }
        if (common.isValid(articleDetail.tag) && common.isValid(articleDetail.remark) && articleDetail.tag == 'shout_single') {
            var tradeStrategyHdDetailHtml = [], remarkArr = JSON.parse(articleDetail.remark),style='';
            if (indexJS.userInfo.isLogin && indexJS.userInfo.clientGroup == 'vip') {
                style=' style="display:none;"';
                $.each(remarkArr, function (i, row) {
                    tradeStrategyHdDetailHtml.push(tradeStrategyHdDetail.formatStr(row.name, (row.longshort == 'long' ? '看涨' : '看跌'), row.point, row.profit, row.loss,''));
                });
            } else {
                $.each(remarkArr, function (i, row) {
                    tradeStrategyHdDetailHtml.push(tradeStrategyHdDetail.formatStr(row.name, (row.longshort == 'long' ? '看涨' : '看跌'), '***', '***', '***','dim'));
                });
            }
            html = tradeStrategyHd.formatStr(articleDetail.content||'&nbsp;', tradeStrategyHdDetailHtml.join(''), style, aid);
        }
        publishTimeStr = common.formatterDateTime(articleInfo.createDate, '-').substring(11);
        if(articleDetail.tag == 'trading_strategy'){
            return;
        }
        $li = $(tradeStrategyNote.formatStr(publishTimeStr, html, aid));
        $li.find(".picpart>.imgbox").each(function () {
            $(this).find("a>img").attr("src", $(this).attr("url"));
        });
        if (isPrepend) {
            $panel.find(".livebrief[pt='" + publishTime + "']>div.brieflist ul").prepend($li);
        } else {
            $panel.find(".livebrief[pt='" + publishTime + "']>div.brieflist ul").append($li);
        }

        if(showNum){
            var $cnt = $('.main_tabnav a[t="livepride"] .num');
            if(!$cnt.parent().parent().parent().parent().is(".on")){
                var cnt = ($cnt.data("cnt") || 0) + 1;
                $cnt.data("cnt", cnt).html(cnt).show();
            }else{
                $cnt.data("cnt", cnt).html(cnt).hide();
            }
        }else{
            $('.main_tabnav a[t="livepride"] .num').hide();
        }
        //查看数据
        $('.viewdata,.viewdata2').unbind('click');
        $('.viewdata,.viewdata2').click(function(){
            if(!indexJS.userInfo.isLogin){
                $('#login_a').click();
            }else{
                chatPride.viewData($(this));
            }
        });
    },
    /**
     * 老师喊单后推送消息提醒
     */
    pushShoutSingleInfo:function(articleInfo){
        var infoPushHtml = chatPride.formatHtml('pushShortSingle');
        var articleDetail=articleInfo.detailList && articleInfo.detailList[0];
        var aid = articleInfo._id || articleInfo.id;
        if (common.isValid(articleDetail.tag) && common.isValid(articleDetail.remark) && articleDetail.tag == 'shout_single') {
            $('#chatMsgContentDiv .dialoglist').append(infoPushHtml.formatStr((common.isBlank(articleDetail.content) ? articleDetail.authorInfo.userName+'老师喊单啦' : articleDetail.content.replace('<p>','').replace('</p>','')), aid));
            $('#chatMsgContentDiv .dialoglist .pushclose').unbind('click');
            $('#chatMsgContentDiv .dialoglist .pushclose').click(function () {
                $(this).parent().hide();
            });
            $('#chatMsgContentDiv .dialoglist .shoutsingle').unbind('click');
            $('#chatMsgContentDiv .dialoglist .shoutsingle').click(function () {
                $('.main_tabnav a[t="livepride"]').click();
                //$('html,body').animate({scrollTop: $('.livebrief_list .livebrief .brieflist ul li[aid="' + $(this).attr('_id') + '"]').offset().top}, 800);
                indexJS.setListScroll($(".tabcont .main_tab .livebrief_list .scrollbox"), $('.livebrief_list .livebrief .brieflist ul li[aid="' + $(this).attr('_id') + '"]').offset().top);/*滚动到指定位置*/
            });
        }
    },
    /**
     * 扣积分查看数据
     * @param dom
     */
    viewData:function(dom){
        var params = {groupType:indexJS.userInfo.groupType,item:dom.attr('item'),tag:'viewdata_'+dom.attr('_id')};
        common.getJson('/studio/addPointsInfo',{params:JSON.stringify(params)}, function(result) {
            if (result.isOK) {
                indexJS.getArticleInfo(dom.attr('_id'), function (data) {
                    if (data) {
                        var articleInfo = data.detailList && data.detailList[0];
                        var remarkArr = JSON.parse(articleInfo.remark),tradeStrategyHdDetailHtml = [],tradeStrategySupportHtml = [], tradeStrategyHdDetail = chatPride.formatHtml('tradeStrategyHdDetail');
                        if(articleInfo.tag == 'shout_single'){
                            $.each(remarkArr, function (i, row) {
                                tradeStrategyHdDetailHtml.push(tradeStrategyHdDetail.formatStr(row.name, (row.longshort == 'long' ? '看涨' : '看跌'), row.point, row.profit, row.loss,''));
                            });
                            dom.next('table').children('tbody').html(tradeStrategyHdDetailHtml.join(''));
                            dom.hide();
                        }else if(articleInfo.tag == 'trading_strategy'){
                            var tradeStrategySupport = chatPride.formatHtml('tradeStrategySupport'); //交易支撑位信息
                            var tradeStrategySupportDiv = chatPride.formatHtml('tradeStrategySupportDiv');//交易支撑位支撑值
                            var remarkMap = {};
                            $.each(remarkArr, function(i, row){
                                if(remarkMap.hasOwnProperty(row.symbol)){
                                    remarkMap[row.symbol].push(row);
                                }else{
                                    remarkMap[row.symbol] = [row];
                                }
                            });
                            var idx = 0;
                            $.each(remarkMap, function (i, row) {
                                var tradeStrategySupportDivHtml = [];
                                $.each(row, function(j, r){
                                    tradeStrategySupportDivHtml.push(tradeStrategySupportDiv.formatStr((j + 1), r.support_level, ''));
                                });
                                tradeStrategySupportHtml.push(tradeStrategySupport.formatStr(row[0].name,tradeStrategySupportDivHtml.join(''), (idx==0?'<a href="javascript:void(0);" class="viewdata" style="display:none;" _id="'+data._id+'" item="prerogative_strategy">查看数据</a>':'')));
                                idx++;
                            });
                            dom.parent('div.skilldata').prev('div.skill').after(tradeStrategySupportHtml.join(''));
                            dom.parent('div.skilldata').remove();
                        }
                    }
                });
            }
        });
    },
    /**
     * 根据内容域模块名返回内容模板
     * @param region 内容域模块名
     * @returns {string}
     */
    formatHtml:function(region){
        var formatHtmlArr = [];
        switch(region) {
            case 'tradeStrategyLiveBrief'://课程信息，直播老师
                formatHtmlArr.push('<div class="livebrief" pt="{6}" _aid="{9}">');
                formatHtmlArr.push('    <div class="te_info">');
                formatHtmlArr.push('        <div class="himg"><img src="{0}" alt="" width="120" height="120"></div>');
                formatHtmlArr.push('        <div class="teinfo1">');
                formatHtmlArr.push('            <span class="te_name">{1}</span>');
                formatHtmlArr.push('            <span class="livetime">{2}</span>');
                formatHtmlArr.push('        </div>');
                formatHtmlArr.push('        <span class="brieftit">{3}</span>');
                formatHtmlArr.push('        <div class="taglist">');
                formatHtmlArr.push('            {8}');
                formatHtmlArr.push('        </div>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('    <div class="hdbox">');
                formatHtmlArr.push('        <div class="skill">');
                formatHtmlArr.push('            <span><i class="dot"></i>当前交易策略：</span>');
                formatHtmlArr.push('            <p>{4}</p>');
                formatHtmlArr.push('        </div>');
                formatHtmlArr.push('        {5}');
                formatHtmlArr.push('        <i class="hdbox-i"></i>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('    <div class="live_banner">');
                formatHtmlArr.push('        <ul class="ban_ul"></ul>');
                formatHtmlArr.push('        <div class="num">');
                formatHtmlArr.push('            <ul></ul>');
                formatHtmlArr.push('        </div>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('    <div class="brieflist">');
                formatHtmlArr.push('        <ul></ul>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</div>');
                break;
            case 'tradeStrategySupport':
                formatHtmlArr.push('<div class="skilldata clearfix">');
                formatHtmlArr.push('    <div class="pdname"><span>{0}</span><i></i></div>');
                formatHtmlArr.push('    {2}');
                formatHtmlArr.push('    <div class="data_cont">');
                formatHtmlArr.push('        {1}');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</div>');
                break;
            case 'tradeStrategySupportDiv':
                formatHtmlArr.push('<div class="support"><i class="dot"></i><b>第{0}支撑：</b><span class="{2}">{1}</span></div>');
                break;
            case 'tradeStrategyNote':
                formatHtmlArr.push('<li aid="{2}">');
                formatHtmlArr.push('    <i class="dot"></i>');
                formatHtmlArr.push('    <span class="ltime">{0}</span>');
                formatHtmlArr.push('    <div class="textcont">');
                formatHtmlArr.push('    {1}');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</li>');
                break;
            case 'tradeStrategyHd':
                formatHtmlArr.push('<div class="hdbox2">');
                formatHtmlArr.push('    <span class="hdtit">{0}</span>');
                formatHtmlArr.push('    <a href="javascript:void(0);" class="viewdata2"{2} _id="{3}" item="prerogative_callTrade">查看数据</a>');
                formatHtmlArr.push('    <table width="100%" border="0" cellspacing="0" cellpadding="0">');
                formatHtmlArr.push('        <thead>');
                formatHtmlArr.push('            <tr>');
                formatHtmlArr.push('                <th>品种</th>');
                formatHtmlArr.push('                <th width="21%">方向</th>');
                formatHtmlArr.push('                <th width="21%">进场点位</th>');
                formatHtmlArr.push('                <th width="21%">止盈</th>');
                formatHtmlArr.push('                <th width="21%">止损</th>');
                formatHtmlArr.push('            </tr>');
                formatHtmlArr.push('        </thead>');
                formatHtmlArr.push('        <tbody>');
                formatHtmlArr.push('            {1}');
                formatHtmlArr.push('        </tbody>');
                formatHtmlArr.push('    </table>');
                formatHtmlArr.push('</div>');
                break;
            case 'tradeStrategyHdDetail':
                formatHtmlArr.push('<tr>');
                formatHtmlArr.push('    <td>{0}</td>');
                formatHtmlArr.push('    <td>{1}</td>');
                formatHtmlArr.push('    <td><span class="{5}">{2}</span></td>');
                formatHtmlArr.push('    <td><span class="{5}">{3}</span></td>');
                formatHtmlArr.push('    <td><span class="{5}">{4}</span></td>');
                formatHtmlArr.push('</tr>');
                break;
            case 'tradeStrategyNoteDetail':
                formatHtmlArr.push('<div class="textcont">{0}</div>');
                break;
            case 'tradeStrategyNoteImg':
                formatHtmlArr.push('<div class="picpart">');
                formatHtmlArr.push('    <div class="imgbox" url="{0}">');
                formatHtmlArr.push('        <a href="{0}" data-lightbox="liveinfo-img"><i></i><img alt="" /></a>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</div>');
                break;
            case 'tag':
                formatHtmlArr.push('<a href="javascript:void(0);" class="tag"><span>{0}</span><i></i></a>');
                break;
            case 'pushShortSingle':
                formatHtmlArr.push('<div class="info_push">');
                formatHtmlArr.push('    <div class="pushcont">系统：{0}</div>');
                formatHtmlArr.push('    <a href="javascript:void(0);" class="detailbtn shoutsingle" _id="{1}">去看看</a>');
                formatHtmlArr.push('    <a href="javascript:void(0);" class="pushclose"><i></i></a>');
                formatHtmlArr.push('</div>');
                break;
        }
        return formatHtmlArr.join("");
    }
};