/**
 * 直播间聊天区直播精华选项卡操作类
 * author Jade.zhu
 */
var chatPride = {
    classNoteInfo:[],//直播精华非交易策略数据
    strategyIsNotAuth:0,//查看交易策略是否授权
    callTradeIsNotAuth:0,//查看喊单/挂单是否授权
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
                chatPride.setTradeStrategyNote(lastId, false);
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
                    $(".ban_ul").empty();
                    var html = [],dataTmp=null,url=null,target=null;
                    for (var i in data) {
                        dataTmp = data[i];
                        if(common.isBlank(dataTmp.linkUrl)){
                            switch (dataTmp.detailList[0].tag){
                                case "live800":
                                    url = "javascript:openLive800Chat(null)";
                                    break;
                                case "qq":
                                    url = "javascript:openQQChatByCommonv3('','800018282');";
                                    break;
                                default :
                                    url = "javascript:";
                            }
                            target = '';
                        }else{
                            url = dataTmp.linkUrl;
                            target = ' target="_blank"';
                        }
                        html.push('<li><a href="'
                            + url
                            + '" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_zb_banner\', \'' + dataTmp.detailList[0].title + '\', 1, true]);"'
                            + target
                            + '><img width="100%" alt="" src="'
                            + dataTmp.mediaUrl
                            + '"></a></li>');
                    }
                    $(".ban_ul:first").html(html.join(""));
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
            var data = {type:"prerogative",item:["prerogative_strategy",'prerogative_callTrade']};
            common.getJson('/studio/getChatPointsConfig',{data:JSON.stringify(data)}, function(result) {
                if (result) {
                    $.each(result,function(i,row) {
                        var clientGroups = row.clientGroup;
                        for (var i = 0, lenI = !clientGroups ? 0 : clientGroups.length; i < lenI; i++) {
                            var clientGroup = clientGroups[i];
                            if (clientGroup == indexJS.userInfo.clientGroup) {
                                if(row.item == 'prerogative_callTrade'){
                                    chatPride.callTradeIsNotAuth = 1;
                                }else if(row.item == 'prerogative_strategy'){
                                    chatPride.strategyIsNotAuth = 1;
                                }
                            }
                        }
                    });
                }
                var storeViewData = chatPride.getStoreViewData() || [];
                var params = {
                    isAll: 1,
                    pageKey: noteId || "",
                    pageLess: 1,
                    ids: storeViewData.join(','),
                    callTradeIsNotAuth:chatPride.callTradeIsNotAuth,
                    strategyIsNotAuth:chatPride.strategyIsNotAuth
                };
                indexJS.getArticleList("class_note", indexJS.userInfo.groupId, 1, 1, 30, '{"publishStartDate":"desc","createDate":"desc"}', params, function (dataList) {
                    if (dataList && dataList.result == 0) {
                        var data = dataList.data;
                        for (var i in data) {
                            chatPride.appendTradeStrategyNote(data[i], false, false, false);
                        }
                        for (var i in chatPride.classNoteInfo) {
                            chatPride.appendClassNoteInfo(chatPride.classNoteInfo[i], false, false, false);
                        }
                        chatPride.classNoteInfo = [];//完成后清空数据
                        if (data.length < dataList.pageSize) {
                            $("#textliveMore").addClass("all").html("已加载全部");
                        }
                    }
                    chatPride.setAdvertisement();
                    indexJS.setListScroll($(".tabcont .main_tab .livebrief_list .scrollbox"));//直播精华
                });
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
        var storeViewData = chatPride.getStoreViewData()||[];
        if (common.isValid(articleDetail.tag) && articleDetail.tag == 'trading_strategy') {
            publishTime = new Date(articleInfo.publishStartDate).getTime();
            //课程信息
            $panelUL = $panel.find(".livebrief[pt='" + publishTime + "']>div.te_info");
            if ($panelUL.size() == 0) {
                var author = '', avatar = '', style = '', tag = [], tagHtml = [], tUserId = '';
                if (articleDetail.authorInfo) {
                    author = articleDetail.authorInfo.name || "";
                    avatar = articleDetail.authorInfo.avatar || "";
                    tUserId = articleDetail.authorInfo.userId || "";
                    tag = common.isValid(articleDetail.authorInfo.tag) ? articleDetail.authorInfo.tag.replace(/\s*，\s*/g, ',').split(',') : [];
                    $.each(tag, function (key, val) {
                        if (common.isValid(val)) {
                            tagHtml.push(tagFormat.formatStr(val));
                        }
                    });
                }
                var publishTimeStr = common.formatterDateTime(publishTime, '-').substring(0, 16)
                    + "-" + common.formatterDateTime(articleInfo.publishEndDate, '-').substring(11, 16);
                var tradeStrategySupportHtml = [];
                if (common.isValid(articleDetail.tag) && articleDetail.tag == 'trading_strategy') {
                    var remarkArr = common.isValid(articleDetail.remark) ? JSON.parse(articleDetail.remark) : [];
                    var remarkMap = {};
                    $.each(remarkArr, function (i, row) {
                        if (remarkMap.hasOwnProperty(row.symbol)) {
                            remarkMap[row.symbol].push(row);
                        } else {
                            remarkMap[row.symbol] = [row];
                        }
                    });
                    if (indexJS.userInfo.isLogin && !chatPride.strategyIsNotAuth || $.inArray(aid, storeViewData) > -1) {
                        style = ' style="display:none;"';
                        var idx = 0, lenI = Object.keys(remarkMap).length - 1;
                        $.each(remarkMap, function (i, row) {
                            var tradeStrategySupportDivHtml = [];
                            $.each(row, function (j, r) {
                                tradeStrategySupportDivHtml.push(tradeStrategySupportDiv.formatStr((j + 1), r.support_level, r.drag_level, ''));
                            });
                            tradeStrategySupportHtml.push(tradeStrategySupport.formatStr(row[0].name, tradeStrategySupportDivHtml.join(''), (idx == 0 ? '<a href="javascript:void(0);" class="viewdata"' + style + ' _id="' + aid + '" item="prerogative_strategy" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_zb_cl_ChaKanShuJu\', \'content_right\', 1, true]);">查看数据</a>' : '')));
                            idx++;
                        });
                    } else {
                        if (remarkArr.length == 0) {
                            style = ' style="display:none;"';
                        }
                        var idx = 0, lenI = Object.keys(remarkMap).length - 1;
                        $.each(remarkMap, function (i, row) {
                            var tradeStrategySupportDivHtml = [];
                            $.each(row, function (j, r) {
                                tradeStrategySupportDivHtml.push(tradeStrategySupportDiv.formatStr((j + 1), '****', '****', 'dim'));
                            });
                            tradeStrategySupportHtml.push(tradeStrategySupport.formatStr(row[0].name, tradeStrategySupportDivHtml.join(''), (idx == 0 ? '<a href="javascript:void(0);" class="viewdata"' + style + ' _id="' + aid + '" item="prerogative_strategy" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_zb_cl_ChaKanShuJu\', \'content_right\', 1, true]);">查看数据</a>' : '')));
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
                tradeStrategyLiveBriefHtml = tradeStrategyLiveBrief.formatStr(avatar, author, publishTimeStr, (articleDetail.title || ""), contentHtml, tradeStrategySupportHtml.join(''), publishTime, style, tagHtml.join(''), aid, tUserId);
                if (isPrepend) {
                    $panel.prepend(tradeStrategyLiveBriefHtml);
                } else {
                    $panel.append(tradeStrategyLiveBriefHtml);
                }
                $panel.find(".picpart>.imgbox").each(function () {
                    var $this = $(this);
                    $this.find("a>img").attr("src", $this.attr("url"));
                });
            } else if ($panelUL.size() > 0 && isPush) {
                var author = '', avatar = '', style = '', tag = [], tagHtml = [], tUserId = '';
                if (articleDetail.authorInfo) {
                    author = articleDetail.authorInfo.name || "";
                    avatar = articleDetail.authorInfo.avatar || "";
                    tUserId = articleDetail.authorInfo.userId || "";
                    tag = common.isValid(articleDetail.authorInfo.tag) ? articleDetail.authorInfo.tag.replace(/\s*，\s*/g, ',').split(',') : [];
                    $.each(tag, function (key, val) {
                        tagHtml.push(tagFormat.formatStr(val));
                    });
                }
                var publishTimeStr = common.formatterDateTime(publishTime, '-').substring(0, 16)
                    + "-" + common.formatterDateTime(articleInfo.publishEndDate, '-').substring(11, 16);
                var tradeStrategySupportHtml = [];
                var remarkArr = common.isValid(articleDetail.remark) ? JSON.parse(articleDetail.remark) : [];
                var remarkMap = {};
                $.each(remarkArr, function (i, row) {
                    if (remarkMap.hasOwnProperty(row.symbol)) {
                        remarkMap[row.symbol].push(row);
                    } else {
                        remarkMap[row.symbol] = [row];
                    }
                });
                if (common.isValid(articleDetail.tag) && articleDetail.tag == 'trading_strategy') {
                    if (indexJS.userInfo.isLogin && !chatPride.strategyIsNotAuth || $.inArray(aid, storeViewData) > -1) {
                        style = ' style="display:none;"';
                        var idx = 0, lenI = Object.keys(remarkMap).length - 1;
                        $.each(remarkMap, function (i, row) {
                            var tradeStrategySupportDivHtml = [];
                            $.each(row, function (j, r) {
                                tradeStrategySupportDivHtml.push(tradeStrategySupportDiv.formatStr((j + 1), r.support_level, r.drag_level, ''));
                            });
                            tradeStrategySupportHtml.push(tradeStrategySupport.formatStr(row[0].name, tradeStrategySupportDivHtml.join(''), (idx == 0 ? '<a href="javascript:void(0);" class="viewdata"' + style + ' _id="' + aid + '" item="prerogative_strategy" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_zb_cl_ChaKanShuJu\', \'content_right\', 1, true]);">查看数据</a>' : '')));
                            idx++;
                        });
                    } else {
                        if (remarkArr.length == 0) {
                            style = ' style="display:none;"';
                        }
                        var idx = 0, lenI = Object.keys(remarkMap).length - 1;
                        $.each(remarkMap, function (i, row) {
                            var tradeStrategySupportDivHtml = [];
                            $.each(row, function (j, r) {
                                tradeStrategySupportDivHtml.push(tradeStrategySupportDiv.formatStr((j + 1), '****', '****', 'dim'));
                            });
                            tradeStrategySupportHtml.push(tradeStrategySupport.formatStr(row[0].name, tradeStrategySupportDivHtml.join(''), (idx == 0 ? '<a href="javascript:void(0);" class="viewdata"' + style + ' _id="' + aid + '" item="prerogative_strategy" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_zb_cl_ChaKanShuJu\', \'content_right\', 1, true]);">查看数据</a>' : '')));
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
                $panelUL.find("div.te_info").attr("tid", tUserId);
                $panelUL.find('div.te_info>div.himg>img').attr('src', avatar);
                $panelUL.find('div.te_info>div.teinfo1>span.te_name').text(author);
                $panelUL.find('div.te_info>div.teinfo1>span.livetime').text(publishTimeStr);
                $panelUL.find('div.te_info>div.teinfo1>span.brieftit').text(articleDetail.title || "");
                $panelUL.find('div.te_info>div.teinfo>div.taglist').html(tagHtml.join(''));
                $panelUL.find('div.hdbox>div.skill').html('<span><i class="dot"></i>当前交易策略：</span>' + contentHtml);
                $panelUL.find('div.hdbox>div.skilldata').remove();
                $panelUL.find('div.hdbox>div.skill').after(tradeStrategySupportHtml.join(''));
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
        $('.viewdata').unbind('click');
        $('.viewdata').click(function(){
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
        var storeViewData = chatPride.getStoreViewData()||[];
        if(isPush){
            $panel.find("li[aid='" + aid + "']").remove();
        }
        if ($panel.find("li[aid='" + aid + "']").size() > 0) {
            return;
        }
        var author = '';
        if (articleDetail.authorInfo) {
            author = articleDetail.authorInfo.name.substring(0,1) || "";
        }
        html = articleDetail.content;
        matches = imgReg.exec(html);
        while (matches) {
            html = html.replace(imgReg, tradeStrategyNoteImg.formatStr(matches[1]));
            matches = imgReg.exec(html);
        }
        if (common.isValid(articleDetail.tag) && common.isValid(articleDetail.remark) && (articleDetail.tag == 'shout_single' || articleDetail.tag == 'resting_order')) {
            var tradeStrategyHdDetailHtml = [], remarkArr = JSON.parse(articleDetail.remark), style = '';
            if (indexJS.userInfo.isLogin && !chatPride.callTradeIsNotAuth || $.inArray(aid, storeViewData) > -1) {
                style = ' style="display:none;"';
                $.each(remarkArr, function (i, row) {
                    tradeStrategyHdDetailHtml.push(tradeStrategyHdDetail.formatStr(row.name, (row.longshort == 'long' ? '看涨' : '看跌'), row.point, row.profit, row.loss, ''));
                });
            } else {
                $.each(remarkArr, function (i, row) {
                    tradeStrategyHdDetailHtml.push(tradeStrategyHdDetail.formatStr(row.name, (row.longshort == 'long' ? '看涨' : '看跌'), '***', '***', '***', 'dim'));
                });
            }
            var contentHtml = articleDetail.content || '';
            matches = imgReg.exec(contentHtml);
            while (matches) {
                contentHtml = html.replace(imgReg, tradeStrategyNoteImg.formatStr(matches[1]));
                matches = imgReg.exec(contentHtml);
            }
            var label = "喊单",item = 'prerogative_callTrade';
            if (articleDetail.tag == 'resting_order') {
                label = "挂单";
                item = 'prerogative_callTrade';
            }
            html = tradeStrategyHd.formatStr(contentHtml, tradeStrategyHdDetailHtml.join(''), style, aid, author, label, item);
        }
        publishTimeStr = common.formatterDateTime(articleInfo.createDate, '-').substring(11);
        if(articleDetail.tag == 'trading_strategy'){
            return;
        }
        $li = $(tradeStrategyNote.formatStr(publishTimeStr, html, aid));
        $li.find(".imgbox").each(function () {
            $(this).find("img").attr("src", $(this).attr("url"));
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
        $('.viewdata2').unbind('click');
        $('.viewdata2').click(function(){
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
        var txt = null;
        if (common.isValid(articleDetail.tag) && common.isValid(articleDetail.remark) && (articleDetail.tag == 'shout_single' || articleDetail.tag == 'resting_order')) {
            var label = "老师喊单啦";
            if(articleDetail.tag == 'resting_order'){
                label = "老师挂单啦";
            }
            txt = (common.isBlank(articleDetail.content) ? (articleDetail.authorInfo.userName||'')+label : articleDetail.content.replace('<p>','').replace('</p>',''));
            $('#chatMsgContentDiv .dialoglist').append(infoPushHtml.formatStr(txt, aid));
            chat.showSystemTopInfo("class_note", aid, txt);
            $('#chatMsgContentDiv .dialoglist .pushclose').unbind('click');
            $('#chatMsgContentDiv .dialoglist .pushclose').click(function () {
                $(this).parent().hide();
            });
            $('#chatMsgContentDiv .dialoglist .shoutsingle').unbind('click');
            $('#chatMsgContentDiv .dialoglist .shoutsingle').click(function () {
                chatPride.gotoLook($(this).attr('_id'));
            });
        }
    },
    /**去看看-策略、喊单、挂单*/
    gotoLook : function(articleId){
        $('.main_tabnav a[t="livepride"]').click();
        indexJS.setListScroll($(".tabcont .main_tab .livebrief_list .scrollbox"), $('.livebrief_list .livebrief .brieflist ul li[aid="' + articleId + '"]').offset().top);/*滚动到指定位置*/
    },
    /**
     * 获取交易策略或喊单store数据
     * @returns {*}
     */
    getStoreViewData:function(){
        if (!store.enabled){
            console.log('Local storage is not supported by your browser.');
            return;
        }
        return store.get('point_'+indexJS.userInfo.userId);
    },
    /**
     * 扣积分查看数据
     * @param dom
     */
    viewData:function(dom){
        var storeData = chatPride.getStoreViewData()||[];
        var params = {groupType: indexJS.userInfo.groupType,item: dom.attr('item'),tag: 'viewdata_' + dom.attr('_id')};
        common.getJson('/studio/addPointsInfo', {params: JSON.stringify(params)}, function (result) {
            if (result.isOK) {
                indexJS.getArticleInfo(dom.attr('_id'), function (data) {
                    if (data) {
                        if(common.isValid(result.msg) && typeof result.msg.change == 'number') {
                            box.showMsg('消费' + Math.abs(result.msg.change) + '积分');
                        }
                        chatPride.setViewDataHtml(dom, data);
                        if($.inArray(dom.attr('_id'), storeData)<0) {
                            storeData.push(dom.attr('_id'));
                        }
                        store.set('point_'+indexJS.userInfo.userId, storeData);
                    }
                });
            }else{
                box.showMsg(result.msg);
            }
        });
    },
    /**
     * 设置查看数据的html
     * @param dom
     * @param data
     */
    setViewDataHtml:function(dom, data){
        var articleInfo = data.detailList && data.detailList[0];
        var remarkArr = JSON.parse(articleInfo.remark),tradeStrategyHdDetailHtml = [],tradeStrategySupportHtml = [], tradeStrategyHdDetail = chatPride.formatHtml('tradeStrategyHdDetail');
        if(articleInfo.tag == 'shout_single' || articleInfo.tag == 'resting_order'){
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
            var idx = 0, lenI = Object.keys(remarkMap).length-1;
            $.each(remarkMap, function (i, row) {
                var tradeStrategySupportDivHtml = [];
                $.each(row, function(j, r){
                    tradeStrategySupportDivHtml.push(tradeStrategySupportDiv.formatStr((j + 1), r.support_level, r.drag_level, ''));
                });
                tradeStrategySupportHtml.push(tradeStrategySupport.formatStr(row[0].name,tradeStrategySupportDivHtml.join(''), (idx==0?'<a href="javascript:void(0);" class="viewdata" style="display:none;" _id="'+data._id+'" item="prerogative_strategy" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_zb_cl_ChaKanShuJu\', \'content_right\', 1, true]);">查看数据</a>':'')));
                idx++;
            });
            var hdBoxDom = dom.parent('div.skilldata').parent('div.hdbox');
            hdBoxDom.find('div.skilldata').remove();
            hdBoxDom.children('div.skill').after(tradeStrategySupportHtml.join(''));
        }
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
                formatHtmlArr.push('    <div class="te_info" tid="{10}">');
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
                formatHtmlArr.push('   {2}');
                formatHtmlArr.push('    <div class="data_cont">');
                formatHtmlArr.push('        <div class="pdname"><span>{0}</span><i></i></div>');
                formatHtmlArr.push('        <b class="br-ctrl"></b>');
                formatHtmlArr.push('        {1}');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</div>');
                break;
            case 'tradeStrategySupportDiv':
                formatHtmlArr.push('<div class="support"><i class="dot"></i><b>第{0}支撑位/阻力位：</b><span class="{3}">{1}/{2}</span></div>');
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
                formatHtmlArr.push('{0}');
                formatHtmlArr.push('<div class="hdbox2 clearfix">');
                formatHtmlArr.push('    <span class="hdtit">【{5}】{4}老师{5}了，快来围观！</span>');
                formatHtmlArr.push('    <a href="javascript:void(0);" class="viewdata2"{2} _id="{3}" item="{6}" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_zb_hd_ChaKanShuJu\', \'content_right\', 1, true]);">查看数据</a>');
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
                formatHtmlArr.push('        <a href="{0}" data-lightbox="liveinfo-img" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_zb_ChaKanTu\', \'content_right\', 1, true]);"><i></i><img alt="" /></a>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</div>');
                break;
            case 'tag':
                formatHtmlArr.push('<a href="javascript:void(0);" class="tag"><span>{0}</span><i></i></a>');
                break;
            case 'pushShortSingle':
                formatHtmlArr.push('<div class="info_push">');
                formatHtmlArr.push('    <div class="pushcont">系统：{0}</div>');
                formatHtmlArr.push('    <a href="javascript:void(0);" class="detailbtn shoutsingle" _id="{1}" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_lts_QuKankan\', \'content_right\', 1, true]);">去看看</a>');
                formatHtmlArr.push('    <a href="javascript:void(0);" class="pushclose"><i></i></a>');
                formatHtmlArr.push('</div>');
                break;
        }
        return formatHtmlArr.join("");
    }
};