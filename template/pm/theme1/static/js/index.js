/**
 * 直播间前台客户端入口
 * author Alan.wu
 */
var indexJS ={
    fromPlatform:null,//来源平台
    isNeverLogin:false,//是否首次访问
    serverTime:0,//服务器时间
    towMinTime:0,//2分钟间隔时间
    socketUrl:'',//socket路径
    userInfo:null,
    filePath:'',//文件路径
    apiUrl:'',//api路径
    currStudioAuth:false,//当前房间是否授权
    visitorSpeak:false,//游客是否允许发言
    syllabusData:null,//课程数据
    infoNewCount:0,//快讯新条数
    onlineCsStatus:0,//在线客服链接状态：0-未连接 1-正在连接 2-已连接
    pointLevel: [{points:0, name:'L1'},
        {points:10000, name:'L2'},
        {points:30000, name:'L3'},
        {points:50000, name:'L4'},
        {points:100000, name:'L5'},
        {points:300000, name:'L6'},
        {points:500000, name:'L7'},
        {points:1000000,name:'L8'},
        {points:2000000,name:'L9'},
        {points:400000000000,name:'L10'}],
    init:function(){
        this.widthCheck();
        this.heightCalcu();
        this.serverTimeUp();
        this.setVisitStore();//设置访客存储
        this.setEvent();//设置各种事件
        //this.setTradeStrategyNote(null, true);
        box.init();
        videosTeach.init();
        videos.init();
        videosLive.init();
        videosSubscribe.init();
        videosTrain.init();
        chatPride.init();
        chat.init();
        chatTeacher.init();
        chatShowTrade.init();
    },
    /**
     * 事件控制
     */
    setEvent:function(){
        $(window).resize(function (e) {
            indexJS.widthCheck();
            indexJS.heightCalcu();
        });
        lightbox.option({
            'resizeDuration': 200,
            'wrapAround': true,
            'disableScrolling':true,
            'positionFromTop':50,
            'albumLabel':"%1 of %2"
        });
        $('#register_a').click(function(){
            common.openPopup('.blackbg,.register');
        });
        /**
         * 我的帐户按钮事件
         */
        $('#personal_center').click(function(){
            if(indexJS.userInfo.isLogin) {
                chatShowTrade.getPointsInfo();
                common.openPopup('.blackbg,.personal_center');
                $('#infotab a[t="accountInfo"]').click();
            }else{
                common.openPopup('.blackbg,.login');
            }
        });
        /**
         * 会员权益按钮事件
         */
        $('#vipbenefit').click(function(){
            $('.vipbenefit .main_tabnav a:first').click();
            common.openPopup('.blackbg,.vipbenefit');
        });
        /**
         * 资料下载按钮事件
         */
        $('#infodown').click(function(){
            if(indexJS.userInfo.isLogin) {
                box.setDownloadPPT(1, box.getDownloadSort());
                common.openPopup('.blackbg,.infodown');
            }else{
                common.openPopup('.blackbg,.login');
            }
        });
        /**
         * 直播预告按钮事件
         */
        $('#live_preview').click(function(){
            /*if($(this).attr("ck")==1||!indexJS.syllabusData){
                return;
            }
            indexJS.fillCourse();*/
            common.openPopup('.blackbg,.live_preview');
            //$(this).attr("ck",1);
        });
        /*QQ客服按钮事件*/
        $('#qqcs').click(function(){
            openQQChatByCommonv3('','800018282');
        });
        /*聊天及我的账户弹框tab切换*/
        $('.main_tabnav a').click(function () {
            var t = $(this).attr('t');
            switch(t){
                case 'livepride':
                    chatPride.setTradeStrategyNote(null, false);
                    break;
                case 'teacher':
                    chatTeacher.getShowTeacher(null);
                    break;
                case 'showtrade':
                    chatShowTrade.initShowTrade();/*晒单墙*/
                    break;
                case 'mySubscribe':
                    chatShowTrade.getPointsInfo();
                    videosSubscribe.setSubscribeType();
                    break;
                case 'myPoint':
                    chatShowTrade.getPointsInfo();
                    break;
            }
            if($(this).parent().hasClass('vipbene')){
                box.setVipBeneFit(t);
            }
            $(this).parent().find('a').removeClass('on');
            $(this).parent().parent().find('.tabcont .main_tab').removeClass('on');
            $(this).addClass('on');
            $('div[t='+ t +']').addClass('on');
            indexJS.heightCalcu();
            if(t == 'chat'){
                chat.showChatMsgNumTip(true);
                chat.setTalkListScroll(true);
            }
        });
        /*视频框下tab切换*/
        $('.tabnav a.tablink').click(function () {
            if($(this).hasClass('on')){
                return;
            }
            $(this).parent().find('.tablink').removeClass('on');
            $(this).parent().parent().find('.tabcont .main_tab').removeClass('on');
            $(this).addClass('on');
            if($(this).hasClass('live')){
                $(this).addClass('initEasyPieChart');
                videos.playAuto(true);
            }else if($(this).hasClass('teach')){
                if($("#teachVideoPanel .sub_tab .numbox .inner").children().size() == 0){
                    videosTeach.playRandomTeach(false);
                }
            }
            $($(this).parent().parent().find('.tabcont .main_tab')[$(this).index()]).addClass('on');
        });
        /*滚动条*/
        if ($(window).width() > 768) {
            indexJS.setListScroll($(".tabcont .main_tab .teacherlist .scrollbox"));//直播老师
            indexJS.setListScroll($(".pop_train .cont .scrollbox"));//培训班
            indexJS.setListScroll($(".train_detail .cont .scrollbox"));//培训班详情
            indexJS.setListScroll('#teachVideoPanel .scrollbox');//教学列表
        }
        /**
         * 联系助理按钮事件
         */
        $('.mod_infotab .tabnav .myaid').click(function(){
            if($('#roomInfoId').attr('rt')=='vip'){
                indexJS.connectOnlineCs();
            }else {
                if ($(".pletter_win .mult_dialog a[utype=3]").length == 0) {
                    chat.getCSList();//设置所有客服
                }
                if ($(this).hasClass('nocs')) {
                    box.showTipBox('助理失联中');
                } else {
                    common.openPopup('.blackbg,.pletter_win');
                }
            }
        });
        /*兼容提示*/
        $('.ietip .iewhybtn').click(function(){
            $('.ietip').hide();
            $('.iestory').show();
        });
        $('.iestory .closebtn').click(function(){
            $('.iestory').hide();
            $('.ietip').show();
        });
        common.placeholderSupport(".formcont .in_line input[placeholder]");//ie下输入框显示文字提示
    },
    /**
     * 显示欢迎语
     */
    showWelcomeMsg:function(){
        //创建专场房间快速入口
        var vipRoom = $(".mod_infotab .sub-tabnav a:contains('专场')");
        if(vipRoom.size() == 1){
            var cgs = vipRoom.siblings(".enterbtn").attr("cgs");
            var roomName = vipRoom.text();
            if(common.containSplitStr(cgs,indexJS.userInfo.clientGroup)){
                alert("您已具备进入“" + roomName + "”的条件，请关注" + roomName + "的课程安排。");
            }
        }
    },
    /**
     * 填充课程，直播预告
     */
    fillCourse:function(){
        var courses=indexJS.syllabusData && indexJS.syllabusData.courses;
        if(courses){
            var courseType = {'0':'文字直播','1':'视频直播','2':'oneTV直播'};
            var days=courses.days,tmk=courses.timeBuckets;
            var nva=$(".live_preview .main_tabnav").html("");
            var als='',ons='',curDay=new Date(indexJS.serverTime).getDay();
            var startDateTime = indexJS.serverTime - 86400000 * ((curDay + 6) % 7),dateStr;
            var awidth = 100 / days.length; //默认宽度20%
            for(var i= 0,len=days.length;i<len;i++){
                if(i==0){
                    als='fir';
                }else if(i==len-1){
                    als='last';
                }else{
                    als='nct';
                }
                if(days[i].day==curDay){
                    ons=' on';
                }else{
                    ons='';
                }
                dateStr = common.formatterDate(new Date(startDateTime + ((days[i].day + 6) % 7) * 86400000)).substring(5);
                nva.append('<a href="javascript:" class="'+ons+'" t="'+i+'" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'header_yg_' + i + '\', \'content_top\', 1, true]);"><span>'+common.daysCN[days[i].day+""]+'<b>' + dateStr + '</b></span><i></i></a>');
                $(".live_preview .tabcont").append('<div class="main_tab'+ons+'" t="'+i+'" d="'+days[i].day+'"><ul class="live_prevlist"></ul></div>');
                als='';
                var lsTab=$(".live_preview .tabcont .main_tab:last ul"),courseObj=null;
                if(days[i].status != 1){
                    lsTab.append('<li><a href="javascript:"><span><lable>休市</lable></span></a></li>');
                }else{
                    als = 'on';
                    for(var k= 0,tklen=tmk.length;k<tklen;k++){
                        courseObj=tmk[k].course[i];
                        if(courseObj.status != 0 && courseObj.lecturer){
                            lsTab.append('<li class="'+als+'"><a href="javascript:" st="'+tmk[k].startTime+'" et="'+tmk[k].endTime+'" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'header_yg_course\', \'' + courseObj.title + '\', 1, true]);"><i></i><div class="c_name">'+courseObj.title+'<span>'+courseObj.lecturer+'</span><span class="time">'+tmk[k].startTime+'- '+tmk[k].endTime+'　</span><span>'+courseType[courseObj.courseType]+'　</span></div></a></li>');
                            als = '';
                        }
                    }
                }
            }
            $(".live_preview .main_tabnav a").click(function(){
                $(".live_preview .main_tabnav a").removeClass("on");
                $('.live_preview .tabcont .main_tab').removeClass("on");
                $(this).addClass("on");
                $('.live_preview .tabcont .main_tab[t='+$(this).attr("t")+']').addClass("on");
            });
            $('.live_preview .tabcont').css('height','200px');
            indexJS.setListScroll('.live_preview .tabcont');
        }
    },
    /**
     * 通过默认房间刷新对应页面
     */
    toRefreshView:function(){
        window.location.reload();
    },
    /**
     * 检查客户组别
     * @param type
     *  visitor-visitor
     *  vip-vip || active
     *  new-非vip && 非active
     */
    checkClientGroup : function(type){
        var currClientGroup = this.userInfo.clientGroup;
        var chkResult = false;
        switch(type){
            case "visitor":
                chkResult = (currClientGroup == "visitor");
                break;
            case "vip":
                chkResult = (currClientGroup == "vip" || currClientGroup == "active");
                break;
            case "new":
                chkResult = (currClientGroup != "vip" && currClientGroup != "active");
                break;
        }
        return chkResult;
    },
    /**
     * 服务器时间更新
     */
    serverTimeUp:function(){
        indexJS.fillCourse();//填充课程
        indexJS.courseTick.tick();
        this.towMinTime=this.serverTime;
        setInterval(function(){
            indexJS.serverTime+=1000;
            if(indexJS.serverTime-indexJS.towMinTime>=2*60*1000){
                indexJS.towMinTime=indexJS.serverTime;
                //indexJS.setInformation();
            }
            chat.setPushInfo();
            indexJS.courseTick.tick();
        },1000);//每秒一次
    },
    /**
     * 刷新昵称
     * @param isSetName
     * @param nickname
     */
    refreshNickname : function(isSetName, nickname){
        this.userInfo.isSetName=isSetName;
        this.userInfo.nickname=nickname;
        //头部
        $(".personal_info .username,.header-right .welcome span").text(nickname);
        //在线列表
        //$("#userListId li .mynk").text(nickname + "【我】");
    },
    /**
     * 设置访客存储信息
     * @param userInfo
     */
    setVisitStore:function(){
        if (!store.enabled){
            console.log('Local storage is not supported by your browser.');
            return;
        }
        var key='storeInfo_'+this.userInfo.groupType,keyVal=store.get(key);
        var obj={};
        if(common.isBlank(keyVal)){
            var randId=common.randomNumber(6);
            obj.clientStoreId=new Date().getTime()+"_"+randId;
            obj.userId="visitor_"+randId;
            obj.nickname='游客_'+randId;
            obj.userType=-1;
            store.set(key,obj);
        }else{
            obj=keyVal;
        }
        this.userInfo.clientStoreId= obj.clientStoreId;
        this.userInfo.visitorId=obj.userId;
        this.userInfo.loginId=obj.loginId;
        if(this.userInfo.clientGroup && this.userInfo.clientGroup=='visitor'){
            this.userInfo.nickname=obj.nickname;
            this.userInfo.userId=obj.userId;
            if(!this.visitorSpeak){
                $("#contentText").attr("contenteditable",false).append('<div class="lgtip">亲，<a href="javascript:box.openLgBox();">登录</a> 后可以发言哦~</div>');//设置登录后发言
            }
        }else{
            obj.loginId=this.userInfo.userId;
            store.set(key,obj);
            //$("#contentText").html("").attr("contenteditable",true);
        }
        this.isNeverLogin=!common.isValid(obj.loginId);
        //如果非游客没有昵称，自动设置一个昵称
        if(common.isBlank(this.userInfo.nickname) && this.userInfo.clientGroup!='visitor'){
            this.refreshNickname(false, "匿名_" + this.userInfo.userId.substring(8,12));
        }
    },
    /**
     * 设置滚动条样式
     * @param dom
     */
    setScrollStyle:function(dom){
        dom.find(".mCSB_dragger_bar").css({background: "url(/pm/theme1/img/scroll.png) -10px 50% repeat-y",width: "6px","-webkit-border-radius": "3px", "-moz-border-radius": "3px", "border-radius": "3px"});
    },
    /**
     * 设置列表滚动条
     * @param domClass
     * @param options
     */
    setListScroll:function(domClass, scrollTo, options){
        //滚动条
        var dom=(typeof domClass=='object')?domClass:$(domClass);
        if(dom.hasClass("mCustomScrollbar")){
            dom.mCustomScrollbar("update");
            if(common.isValid(scrollTo)){
                dom.mCustomScrollbar("scrollTo", scrollTo);
            }
        }else {
            options = $.extend({scrollButtons: {enable: true},theme: "light-thick",scrollbarPosition: "outside",scrollButtons: false}, options);
            dom.mCustomScrollbar(options);
            if(options.isCustom){
                this.setScrollStyle(dom);
            }
        }
    },
    /**
     * 文档信息(视频,公告，直播安排
     * @param code
     * @param platform
     * @param hasContent
     * @param curPageNo
     * @param pageSize
     * @param orderByStr
     * @param params {{authorId, pageKey, pageLess, isAll}}
     * @param callback
     */
    getArticleList:function(code,platform,hasContent,curPageNo,pageSize,orderByStr,params,callback){
        params = params || {};
        try{
            $.getJSON('/studio/getArticleList',{
                authorId:common.trim(params.authorId),
                code:code,
                platform:platform,
                hasContent:hasContent,
                pageNo:curPageNo,
                pageKey:common.trim(params.pageKey),
                pageLess:common.trim(params.pageLess),
                isAll:common.trim(params.isAll),
                pageSize:pageSize,
                orderByStr:orderByStr
            },function(data){
                //console.log("getArticleList->data:"+JSON.stringify(data));
                callback(data);
            });
        }catch (e){
            console.error("getArticleList->"+e);
            callback(null);
        }
    },
    /**
     * 文档信息
     * @param id
     * @param callback
     */
    getArticleInfo:function(id,callback){
        try{
            $.getJSON('/studio/getArticleInfo',{id:id},function(data){
                //console.log("getArticleList->data:"+JSON.stringify(data));
                callback(data);
            });
        }catch (e){
            console.error("getArticleInfo->"+e);
            callback(null);
        }
    },
    /**
     * 加载实盘策略
     */
    setTradeStrategy: function(scrollDom){
        this.getArticleList("trade_strategy_article",indexJS.userInfo.groupId,1,1,100,'{"sequence":"asc","createDate":"desc"}',null,function(dataList){
            if(dataList && dataList.result==0){
                var data=dataList.data,row=null;
                var tradeStrategyHtml = '';
                var tradeStrategyFormat = indexJS.formatHtml('tradestrategy');
                for(var i in data){
                    row=data[i].detailList[0];
                    var author = '',avatar = '';
                    if(!common.isBlank(row.author)){
                        var authors = row.author.split(';');
                        author = authors[0];
                        avatar = authors[1];
                    }
                    else {
                        author = row.authorInfo.name;
                        avatar = row.authorInfo.avatar
                    }
                    var publishDate = common.formatterDateTime(data[i].publishStartDate, '-').substring(0, 16);
                    tradeStrategyHtml += tradeStrategyFormat.formatStr(avatar,
                        author,
                        publishDate,
                        row.tag,
                        row.title,
                        row.content
                    );
                }
                $('#guidelist ul').html(tradeStrategyHtml);
            }
            else{
                $('#guidelist ul').html('');
            }
            indexJS.setListScroll(scrollDom);//设置滚动
        });
    },
    /**
     * 链接客服系统
     * */
    connectOnlineCs : function(){
        switch (indexJS.onlineCsStatus){
            case 0:
                indexJS.onlineCsStatus = 1;
                var csScriptUrl = 'http://jms.phgsa.cn/chat.php?pid=PM01&tln=' + indexJS.userInfo.userId + '&tnn=' + indexJS.userInfo.nickname + '&tul=' + indexJS.userInfo.clientGroup + '&tp=' + $("#myMobilePhone").attr('t')+ '&ta=' + $("#myMobilePhone").attr("ta");
                LazyLoad.js(csScriptUrl, function(){
                    indexJS.onlineCsStatus = 2;
                    $("#welive_info").trigger("click");
                });
                break;

            case 2:
                $("#welive_info").trigger("click");
                break;
            case 1:
            default :
                break;
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
            case 'tradestrategy':
                formatHtmlArr.push('<li class="guideli">');
                formatHtmlArr.push('    <div class="line1 clearfix">');
                formatHtmlArr.push('        <img class="himg" src="{0}" alt="{1}">');
                formatHtmlArr.push('        <h4 class="name">{1}<span class="timespan">{2}</span></h4>');
                formatHtmlArr.push('        <span class="tag"><i></i>{3}</span>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('    <h4 class="gtit"><strong><a href="" target="_blank" class="taglink"></a></strong>{4}</h4>');
                formatHtmlArr.push('    <div class="g_cont">');
                formatHtmlArr.push('    <p>{5}</p>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</li>');
                break;
            case 'news':
                formatHtmlArr.push('<li><span><i></i><b>{0} </b>{1}</span></li>');
                break;
        }
        return formatHtmlArr.join("");
    },
    /**
     * 课程表定时器
     */
    courseTick : {
        //当前课程或下次课程
        course : null,
        //下次校验时间
        nextTickTime : 0,
        //初始化或者重新校验
        tick : function(){
            if(indexJS.serverTime <= this.nextTickTime){
                return;
            }
            var currCourse = common.getSyllabusPlan(indexJS.syllabusData,indexJS.serverTime);
            if(!currCourse){
                return;
            }
            var nextTime = 0;
            var timezoneOffset = new Date().getTimezoneOffset() * 60000;
            if(currCourse.isNext){ //下次课程开始作为下一次tick时间
                //"17:51" eval("17*60+51")*60*1000
                nextTime = eval(currCourse.startTime.replace(":", "*60+"))*60000 + indexJS.serverTime - indexJS.serverTime % 86400000 + timezoneOffset;
            }else{//本次课程结束后作为下一次tick时间
                nextTime = eval(currCourse.endTime.replace(":", "*60+"))*60000 + indexJS.serverTime - indexJS.serverTime % 86400000 + timezoneOffset + 60000;
            }
            this.course = currCourse;
            this.nextTickTime = nextTime;

            //更新视频
            videos.refreshVideo();
            //更新晒单
            //videos.sd.initSD();
        }
    },
    /**
     * 自动计算宽度
     */
    widthCheck: function() {
        var ww = $(window).width();
        if (ww <= 1680) {
            $('body').addClass('wid1');
            if (ww < 1440) {
                $('body').addClass('wid2');
                if (ww < 1281) {
                    $('body').addClass('wid3');
                }
            }
        }
        if (ww > 1680) {
            $('body').removeClass('wid1');
            $('body').removeClass('wid2');
            $('body').removeClass('wid3');
        }
    },
    /**
     * 自动计算高度
     */
     heightCalcu: function() {
        var hh = $(window).height();
        var hh_header = $('.box-header').height();
        $('.mod_video').height(hh - $('.mod_infotab').height() - hh_header - 5);
        $('.mod_main .tabcont .scrollbox').height(hh - $('.main_tabnav').height() - hh_header - 16);
        $('.chat_content .scrollbox').height(hh - $('.main_tabnav').height() - 201 - hh_header - 6);
        $('.sd_list .scrollbox').height(hh - $('.main_tabnav').height() - $('.sdbtn_bar').height() - hh_header - 6);
        $('.pop_mysd .sd_list .scrollbox').height(340);
    }
};
