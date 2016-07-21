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
    onlineCsStatus:0,//在线客服链接状态：0-未连接 1-正在连接 2-已连接
    init:function(){
        this.serverTimeUp();
        this.setVisitStore();//设置访客存储
        this.setEvent();//设置各种事件
        this.setAdvertisement();
    },
    /**
     * 设置滚动条样式
     * @param dom
     */
    setScrollStyle:function(dom){
        dom.find(".mCSB_dragger_bar").css({background: "url(/hx/theme1/img/scroll.jpg) 5px 50% repeat-y",width: "12px"});
    },
    /**
     * 事件控制
     */
    setEvent:function(){
        $(".ul-info li").hover(function(){
            $('.u-info').show();
        },function(){
            $('.u-info').hide();
        });
        //头部框事件
        $(".header-right li").hover(function(){
            $(this).find(".dropcont").show();
            //课程显示
            if($(this).is(".cursor")){
                if($(this).attr("ck")==1||!indexJS.syllabusData){
                    return;
                }
                indexJS.fillCourse();
            }
            if($(this).is(".room_rule")){
                if(!$(this).hasClass('hover-in')) {
                    indexJS.getArticleList("bulletin_room_rule", indexJS.userInfo.groupId, 1, 1, 1, '{"sequence":"desc"}', null, function (dataList) {
                        if (dataList && dataList.result == 0) {
                            var data = dataList.data;
                            if (data && data.length > 0) {
                                var result = data[0].detailList[0];
                                $("#bulletinRoomRule").find("strong").text(result.title);
                                $("#bulletinRoomRule").find("p").html(result.content);
                            }
                        }
                    });
                    $(this).addClass('hover-in');
                }
            }
            //公告显示
            if($(this).is(".notice")){
                if($('.header-right ul li.user').length==0) {
                    $('.notice .dropcont').css('width', '450px');
                }
                if(!$(this).hasClass('hover-in')) {
                    indexJS.getArticleList("bulletin_system",indexJS.userInfo.groupId,1,1,1,'{"sequence":"desc"}',null,function(dataList){
                        if(dataList && dataList.result==0){
                            var data=dataList.data;
                            if(data && data.length > 0){
                                var result=data[0].detailList[0];
                                $("#bulletinTab").find("strong").text(result.title);
                                $("#bulletinTab").find("p").html(result.content);
                            }
                        }
                    });
                    $(this).addClass('hover-in');
                }
            }
        },function(){
            $(this).find(".dropcont").hide();
        });
        if($('.rooms .rbox').length==0){
            $('.changeroom').hide();
        }
        //房间切换事件
        $(".changeroom").click(function(){
            var pdom=$(this);
            if(pdom.hasClass("open")){
                pdom.removeClass("open");
            }else{
                pdom.addClass("open");
                pdom.find('rooms').removeClass('dn');
                var tm=pdom.attr("tm");
                if(common.isBlank(tm) || (indexJS.serverTime-Number(tm)>=1*60*1000)){
                    pdom.attr("tm",indexJS.serverTime);
                }else{
                    return;
                }
                try{
                    $.getJSON('/hxstudio/getRmCourseList',{roomIds:$(".rooms .rbox[rid]").map(function(){return $(this).attr("rid");}).get().join(",")},function(result){
                        var rms=$(".rooms .rbox[rid]");
                        if(result && result.isOK){
                            var data=result.data;
                            rms.each(function(index){
                                if(index==rms.length-1){
                                    $(this).addClass("last");
                                }
                                var roomId=$(this).attr("rid");
                                if(data.hasOwnProperty(roomId)){
                                    var rda=data[roomId];
                                    var size = 0;
                                    if($(this).find(".enterbtn").attr("av")=="true" && rda.onlineNum<=200){
                                        size=rda.onlineNum<=10?60:(200/rda.onlineNum)*3+10;
                                        size=Math.round(size);
                                    }
                                    $(this).find(".peo_num label").text(rda.onlineNum + size);
                                    $(this).find(".info .nk").text(rda.name);
                                    if(!rda.isNext){
                                        $(this).addClass("on");
                                    }
                                    if(rda.day){
                                        $(this).find(".info .st").text(common.daysCN[rda.day]+' '+rda.startTime+' - '+rda.endTime);
                                    }
                                }
                            });
                        }else{
                            if(rms.length==1){
                                rms.addClass("last");
                            }
                        }
                    });
                }catch (e){
                    console.error("getRmCourseList->"+e);
                    callback(null);
                }
            }
        });
        //设置房间滚动条
        indexJS.setListScroll('.mod_room .cont');
        //点击document,关闭dom
        $(document).click(function(e){
            if (!$(e.target).parent().hasClass('roomctrl') && !$(e.target).parents().parents().hasClass('rbox') || $(e.target).hasClass('enterbtn')){
                $('.changeroom').removeClass('open');
            }
        });
        /**
         * 切换房间
         */
        $(".rooms .rbox[rid] .enterbtn").click(function(){
            var thiz = $(this);
            var cgs=$(this).attr("cgs");
            if(thiz.attr("av") == "false" && indexJS.checkClientGroup('visitor')){
                //不允许游客进入，但当前是游客，直接要求登录，且登录框不允许关闭
                $("#login_a").trigger("click", {groupId : thiz.attr("rid")});
                return false;
            }
            if(!common.containSplitStr(cgs,indexJS.userInfo.clientGroup)){
                alert("您没有进入该房间的权限，如有疑问，请联系客服。");
                /*if(indexJS.checkClientGroup("vip")){
                    alert("该房间仅对新客户开放，如有疑问，请联系客服。");
                }else{
                    alert("已有真实账户并激活的客户才可进入Vip专场，您还不满足条件。如有疑问，请联系客服。");
                }*/
                return false;
            }
            common.getJson("/hxstudio/checkGroupAuth",{groupId:thiz.attr("rid")},function(result){
                if(!result.isOK){
                    alert("您没有进入该房间的权限，如有疑问，请联系客服。");
                    /*if(indexJS.checkClientGroup("vip")){
                        alert("该房间仅对新客户开放，如有疑问，请联系客服。");
                    }else{
                        alert("已有真实账户并激活的客户才可进入Vip专场，您还不满足条件。如有疑问，请联系客服。");
                    }*/
                }else{
                    indexJS.toRefreshView();
                }
            },true,function(err){
                if("success"!=err) {
                    alert("操作失败，请联系客服！" );
                }
            });
        });
        //行情快讯切换事件
        $(".mod_videolist .tabnav a").click(function(){
            var index=$(this).index()-1;
            $(".mod_videolist .tabnav a").removeClass("on");
            $(this).addClass("on");
            $(".mod_videolist .listcont .list_tab").removeClass("on").eq(index).addClass("on");
            if(index==0){
                var wsUrl = "ws://kdata.gwfx.com:8087/websocket.do",
                    wsData = "service=HqDataWebSocketService&method=pushMarketprice&symbol=XAGUSD|XAUUSD|USDX|CLWTI&dataType=simpleMarketPrice",
                    httpUrl = "http://kdata.gwfx.com:8099/gateway.do?service=HqDataService&method=getMarkrtPriceDataFromCache",
                    option = {downCss:'hq-down',upCss:'hq-up',down:'down'};
                getAllMarketpriceIndex(wsUrl ,wsData, httpUrl, option);/*行情数据*/
                indexJS.setListScroll('#hangqing');
            }
            if(index==1){
                indexJS.setInformation();
            }
        });
        $(".mod_videolist .tabnav a.on").trigger("click");
        /**QQ客服按钮事件*/
        $('#qqcs').click(function(){
            openQQChatByCommonv3('&utm_source=studio&utm_medium=yy&utm_content=TOP&utm_campaign=qqzx_pm');
        });
        /**设置客服系统*/
        $('#onlineCs').click(box.openCSBox);
        /**添加到桌面*/
        $("#saveToDesktop").click(function(){
            if(common.saveToDesktop(window.location.href, "视频直播间-恒信贵金属")){
                box.showMsg("直播间快捷方式已成功添加到桌面");
            }else{
                window.location.href = "/hxstudio/getHxShortCut?t=" + new Date().getTime();
            }
        });
        /*修改头像按钮事件*/
        $("#modifyNickName").click(function(){
            box.openSetNameBox(false);
        });
        /*修改头像按钮事件*/
        $("#modifyAvatar").click(function(){
            var fFrom=$("#fileForm");
            var file=fFrom.find("input[type=file]");
            if("true"!=fFrom.attr("hasEv")){
                fFrom.attr("hasEv","true");
                file.change(function (){
                    var _this=this;
                    var img = _this.files[0];
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
                        var formData = new FormData($("#fileForm")[0]);
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
                                        common.getJson("/hxstudio/modifyAvatar",{avatar:(data.fileDomain+data.filePath)}, function(result){
                                            if(!result.isOK){
                                                console.error("上传头像失败，请联系在线客服！");
                                            }else{
                                              $("#avatarInfoId").attr("src",result.avatar);
                                              $("#userListId li .mynk").prev().find("img").attr("src",result.avatar);
                                              indexJS.userInfo.avatar=result.avatar;
                                            }
                                        },true,function(){
                                           alert("上传头像失败，请联系在线客服！");
                                        });
                                    }
                                }else{
                                    alert("上传头像失败，请联系在线客服！");
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
            }
            file.click();
        });
        this.placeholderSupport();//ie下输入框显示文字提示
        this.setBulletinSlide();
    },
    /**
     * 填充课程
     */
    fillCourse:function(){
        var courses=indexJS.syllabusData && indexJS.syllabusData.courses;
        if(courses){
            var courseType = {'0':'文字直播','1':'视频直播','2':'oneTV直播'};
            var days=courses.days,tmk=courses.timeBuckets;
            var nva=$(".course_nav").html("");
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
                nva.append('<a href="javascript:" class="'+als+ons+'" t="'+i+'" style="width:'+awidth+'%;"><span>'+common.daysCN[days[i].day+""]+'<b>' + dateStr + '</b></span><i></i></a>');
                $(".cursor .dropcont .cont").append('<div class="course_tab'+ons+'" t="'+i+'" d="'+days[i].day+'"><ul></ul></div>');
                als='';
                var lsTab=$(".cursor .course_tab:last ul"),courseObj=null;
                if(days[i].status != 1){
                    lsTab.append('<li class="fir"><a href="javascript:"><span><lable>休市</lable></span></a></li>');
                }else{
                    for(var k= 0,tklen=tmk.length;k<tklen;k++){
                        als=(k==0) ? 'fir' : "";
                        courseObj=tmk[k].course[i];
                        if(courseObj.status != 0 && courseObj.lecturer){
                            lsTab.append('<li class="'+als+'"><a href="javascript:" st="'+tmk[k].startTime+'" et="'+tmk[k].endTime+'"><i></i><span><lable>'+tmk[k].startTime+'- '+tmk[k].endTime+'　</lable><lable>'+courseType[courseObj.courseType]+'　</lable><lable>'+courseObj.lecturer+'</lable></span><p>'+courseObj.title+'</p></a></li>');
                        }
                    }
                }
            }
            $(".course_nav a").click(function(){
                $(".course_nav a").removeClass("on");
                $('.course_tab').removeClass("on");
                $(this).addClass("on");
                $('.course_tab[t='+$(this).attr("t")+']').addClass("on");
            });
            $(".header-right li.cursor").attr("ck",1);
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
        videos.init().clientVideoTask();
        indexJS.setInformation();
        this.towMinTime=this.serverTime;
        setInterval(function(){
            indexJS.serverTime+=1000;
            if(indexJS.serverTime-indexJS.towMinTime>=2*60*1000){
                indexJS.towMinTime=indexJS.serverTime;
                videos.clientVideoTask();
                indexJS.setInformation();
            }
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
        $(".username").text(nickname);
        //在线列表
        $("#userListId li .mynk").text(nickname + "【我】");
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
                $("#contentText").attr("contenteditable",false).append('<div class="lgtip d n">亲，<a href="javascript:box.openLgBox();">登录</a> 后可以发言哦~</div>');//设置登录后发言
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
     * 设置列表滚动条
     * @param domClass
     * @param options
     */
    setListScroll:function(domClass,options){
        var dom=(typeof domClass=='object')?domClass:$(domClass);
        if(dom.hasClass("mCustomScrollbar")){
            dom.mCustomScrollbar("update");
        }else {
            options = $.extend({scrollButtons:{enable:false},theme:"light-2",isCustom:true}, options);
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
     * @param authorId
     * @param callback
     */
    getArticleList:function(code,platform,hasContent,curPageNo,pageSize,orderByStr,authorId,callback){
        try{
            $.getJSON('/hxstudio/getArticleList',{authorId:common.trim(authorId),code:code,platform:platform,hasContent:hasContent,pageNo:curPageNo,pageSize:pageSize,orderByStr:orderByStr},function(data){
                console.log("getArticleList->data:"+JSON.stringify(data));
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
            $.getJSON('/hxstudio/getArticleInfo',{id:id},function(data){
                //console.log("getArticleList->data:"+JSON.stringify(data));
                callback(data);
            });
        }catch (e){
            console.error("getArticleInfo->"+e);
            callback(null);
        }
    },
    /**
     * 设置广告
     */
    setAdvertisement:function(){
        this.getArticleList("advertisement",indexJS.userInfo.groupId,"0",1,5,'{"sequence":"desc"}',null,function(dataList){
            if(dataList && dataList.result==0){
                var data=dataList.data;
                for(var i in data){
                    $(".ban_ul").append('<li class="swiper-slide"><a href="'+(common.isBlank(data[i].linkUrl)?"javascript:":data[i].linkUrl)+'" target="_blank"><img width="100%" alt="" src="'+data[i].mediaUrl+'"></a></li>');
                    if(data.length>1){
                        $("#mod_position").append('<span class="'+(parseInt(i)==0?'p-click':'')+'"></span>');
                    }
                }
                if(data && data.length>1){
                    if (!Array.prototype.indexOf) {
                        Array.prototype.indexOf = function(obj, start) {
                            for (var i = (start || 0), j = this.length; i < j; i++) {
                                if (this[i] === obj) { return i; }
                            }
                            return -1;
                        }
                    }
                    /**
                    new Swiper('.mod_banner', {
                        pagination: '#mod_position',
                        paginationClickable: true,
                        loop: true,
                        autoplay : 5000,
                        autoplayDisableOnInteraction : false
                    });
                     **/
                }
            }
        });
    },
    /**
     * 加载快讯数据
     */
    setInformation: function(){
        var intervalTime = $('#newInfoCount').attr('t');
        if(!common.isBlank(intervalTime) && indexJS.serverTime - intervalTime < 2*60*1000){
            return;
        }
        $.getJSON(indexJS.apiUrl+ '/common/getInformation?t='+indexJS.serverTime, null, function(result){
            if(result){
                if(result.isOK) {
                    var itemLenth = result.data.news.item.length, pt = $('#newInfoCount').attr('pt');
                    if(!common.isBlank(pt)){
                        $('#newInfoCount').text(itemLenth);
                        $('#newInfoCount').hide();
                    }
                    var pubDateTime = null,newsHtml = '', newsFormatHtml = indexJS.formatHtml('news');
                    $.each(result.data.news.item, function(key, row){
                        if (pt == row.pubDate  && !common.isBlank(pt)) {
                            if (key > 0) {
                                $('#newInfoCount').text(key);
                                $('#newInfoCount').show();
                            }
                            else {
                                $('#newInfoCount').hide();
                            }
                        }
                        else if(row.pubDate > pt && (key+1) == itemLenth  && !common.isBlank(pt)){
                            $('#newInfoCount').text(itemLenth);
                            $('#newInfoCount').show();
                        }
                        if(key < 1){
                            pubDateTime = row.pubDate;
                        }
                        if(row.pubDate > pt || common.isBlank(pt)) {
                            newsHtml += newsFormatHtml.formatStr(row.pubDate.substring(10), row.title);
                        }
                    });
                    if(common.isValid(newsHtml)) {
                        $('.mod_videolist .message_list .scrollbox ul.news').prepend(newsHtml);
                    }
                    if(pt == pubDateTime) {
                        $('#newInfoCount').hide();
                    }
                    indexJS.setListScroll($(".mod_videolist .message_list .scrollbox"));//设置滚动
                    $('#newInfoCount').attr('pt', pubDateTime);
                    if($(".mod_videolist .list_tab").eq(1).hasClass('on')){
                        $('#newInfoCount').attr('t', indexJS.serverTime);
                    }
                }
            }
        });
    },
    /**
     * 加载实盘策略
     */
    setTradeStrategy: function(scrollDom){
        this.getArticleList("trade_strategy_article",indexJS.userInfo.groupId,1,1,100,'{"sequence":"desc"}',null,function(dataList){
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
     * 公告，滚动
     */
    setBulletinSlide:function(){
        indexJS.getArticleList("bulletin_slide_info",indexJS.userInfo.groupId,1,1,1,'{"createDate":"desc"}', '',function(dataList) {
            if(dataList && dataList.result==0 && dataList.data && dataList.data.length>0) {
                var bulletinSlideHtml = '',bulletinSlideFormat = indexJS.formatHtml('bulletinSlide');
                $.each(dataList.data, function(key, row){
                    var detail = row.detailList[0];
                    bulletinSlideHtml += bulletinSlideFormat.formatStr(detail.title, detail.content);
                });
                $('#bulletinDomId').html(bulletinSlideHtml);
                $('#bulletinDomId li a').each(function(){
                    var aDom = $(this);
                    aDom.text(aDom.next().text());
                    aDom.parent().width(aDom.width());
                    aDom.click(function(){
                        $("#popAnnTit").text($(this).attr("title"));
                        $("#popAnnTxt").html($(this).next('div').html());
                        $("#popAnnBox,.blackbg").show();
                        indexJS.setListScroll(".popAnnCont");
                    });
                });
                $("#bulletinPanel").slide({mainCell:".anouncelist" ,effect:"leftMarquee", autoPlay:true, interTime:50});
            }
        });
    },
    /**
     * 链接客服系统
     * */
    connectOnlineCs : function(){
        switch (indexJS.onlineCsStatus){
            case 0:
                indexJS.onlineCsStatus = 1;
                var csScriptUrl = 'http://jms.phgsa.cn/chat.php?pid=P001&tln=' + indexJS.userInfo.userId + '&tnn=' + indexJS.userInfo.nickname + '&tul=' + indexJS.userInfo.clientGroup;
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
     * placeholder IE支持
     */
    placeholderSupport : function(){
        var supportPlaceholder = 'placeholder' in document.createElement('input');
        if(!supportPlaceholder){
            $(".formcont .in_line input[placeholder]").each(function(){
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
                /*formatHtmlArr.push('    <p>');
                formatHtmlArr.push('    	<div class="clearfix">');
                formatHtmlArr.push('        	<a href="http://img.kgold852.com/upload/201505/20150513135855.png" class="orlink">查看原图</a>');
                formatHtmlArr.push('        	<a class="support supported" href="javascript:">(158)</a>');
                formatHtmlArr.push('     	</div>');
                formatHtmlArr.push('        <img src="http://img.kgold852.com/upload/201505/20150513135855.png" width="650" height="380" alt="" class="cursor_zoom cursor_minify" >');
                formatHtmlArr.push('    </p>');*/
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</li>');
                break;
            case 'bulletinSlide':
                formatHtmlArr.push('<li><a href="javascript:void(0);" title="{0}"></a><div class="dn">{1}</div></li>');
                break;
            case 'news':
                formatHtmlArr.push('<li><spana><i></i><em>{0} </em>{1}</span></li>');
                break;
        }
        return formatHtmlArr.join("");
    }
};
// 初始化
$(function() {
    indexJS.init();
});