/**
 * 直播间客户端通用操作类
 * author Dick.guo
 */
var studioChatMb={
    initSewise:false,//是否初始化视频插件
    web24kPath:'',
    filePath:'',
    apiUrl:'',
    exStudioStr:'',//外接直播JSON字符串
    studioDate:'',//直播时间点
    //信息类型
    msgType:{
        text:'text' ,
        img:'img',
        file:'file'
    },
    socket:null,
    socketUrl:'',
    liveUrl:'',
    userInfo:null,
    init:function(){
        this.setVisitStore();
        this.setSocket();//设置socket连接
        this.setVideoList();
        this.setEvent();//设置各种事件
        studioMbPop.load(this.userInfo, {
            onShow : function(){
                $("#tVideoDiv video").hide();
            },
            onHide : function(){
                $("#tVideoDiv video").show();
            }
        });
    },
    /**
     * 设置访客存储信息
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
            //首次显示收藏提示
            $(".collect-tip").fadeIn().delay(60000).fadeOut();
        }else{
            obj=keyVal;
        }
        this.userInfo.clientStoreId= obj.clientStoreId;
        this.userInfo.visitorId=obj.userId;
        if(this.userInfo.clientGroup && this.userInfo.clientGroup=='visitor'){
            this.userInfo.nickname=obj.nickname;
            this.userInfo.userId=obj.userId;
        }
    },
    /**
     * 设置socket
     */
    setSocket:function(){
        this.socket = common.getSocket(io,this.socketUrl,this.userInfo.groupType);
        //建立连接
        this.socket.on('connect',function(){
            console.log('connected to server!');
            studioChatMb.userInfo.socketId=studioChatMb.socket.id;
            studioChatMb.socket.emit('login',{userInfo:studioChatMb.userInfo,lastPublishTime:$("#dialog_list>li:last").attr("id")});
        });
        //断开连接
        this.socket.on('disconnect',function(){
            console.log('disconnect');
        });
        //出现异常
        this.socket.on("error",function(e){
            console.error('e:'+e);
        });
        //信息传输
        this.socket.on('sendMsg',function(data){
            if(!data.fromUser.toUser || data.fromUser.toUser.talkStyle!=1){//如果是私聊则丢弃消息
                studioChatMb.setContent(data,false,false);
            }
        });
        //通知信息
        this.socket.on('notice',function(result){
            switch (result.type)
            {
                case 'removeMsg':
                    $("#"+result.data.replace(/,/g,",#")).remove();
                    studioChatMb.setTalkListScroll();
                    break;
                case 'leaveRoom':{
                    studioChatMb.leaveRoomTip(result.flag);
                    break;
                }
                case 'approvalResult':
                {
                    var data=result.data;
                    var i = 0;
                    if(data.refuseMsg){
                        var publishTimeArr=data.publishTimeArr;
                        for(i in publishTimeArr){
                            $("#"+publishTimeArr[i]+" .dialog em[class=ruleTipStyle]").html("已拒绝");
                        }
                    }else{
                        for (i in data) {
                            studioChatMb.formatUserToContent(data[i]);
                        }
                        studioChatMb.setTalkListScroll();
                    }
                    break;
                }
            }
        });
        //信息传输
        this.socket.on('loadMsg',function(data){
            var msgData=data.msgData,isAdd=data.isAdd;
            if(!isAdd) {
                $("#content_ul").html("");
            }
            studioMbPop.loadingBlock($("#talkBoxTab"));
            if(msgData && $.isArray(msgData)) {
                msgData.reverse();
                for (var i in msgData) {
                    studioChatMb.formatUserToContent(msgData[i]);
                }
                studioMbPop.loadingBlock($("#talkBoxTab"), true);
            }
        });
    },
    /**
     * 教学视频列表
     */
    setVideoList:function(){
        studioMbPop.loadingBlock($("#videosTab"));
        this.getArticleList("teach_video",this.userInfo.groupId,0,1,100,'{"sequence":"asc"}',null,function(dataList){
            var loc_panel = $("#videosTab .boxcont");
            loc_panel.html("");
            if(dataList && dataList.result==0){
                var data=dataList.data;
                var loc_html = [];
                var row=null;
                for(var i = 0, lenI = !data ? 0 : data.length; i < lenI; i++){
                    if(i % 5 == 0){
                        loc_html.push('<ul class="teach-ul">');
                    }
                    row=data[i].detailList[0];
                    loc_html.push('<li><a title="' + row.title + '" href="javascript:void(0)" id="'+data[i]._id+'" vUrl="'+data[i].mediaUrl+'"><i></i><span>'+row.title+'</span></a></li>');
                    if(i % 5 == 4 || i == lenI - 1){
                        loc_html.push('</ul>');
                    }
                    loc_panel.html(loc_html.join(""));
                }
                //播放视频
                loc_panel.find("li a").click(function(){
                    if(!$(this).is(".on")){
                        $("#videosTab .boxcont li a.on").removeClass("on");
                        $(this).addClass("on");
                    }
                    studioChatMb.video.play("studio", "mp4", $(this).attr("vUrl"), $(this).text());
                });
            }
            studioChatMb.video.start();
            studioMbPop.loadingBlock($("#videosTab"), true);
        });
    },
    /**
     * 事件设置
     */
    setEvent:function(){
        this.setEventCen();
        this.video.init();
        this.setEventChat();
    },
    /**
     * 设置页面tab事件等
     */
    setEventCen:function(){
        var cenTab = new Swiper('.cen-qhbox', {
            loop: false,
            autoplay : false,
            onSlideChangeStart: function(mySwiper){
                $('.cen-ulist li').eq(mySwiper.activeIndex).trigger("click");
            }
        });

        /*tab切换*/
        $('.cen-ulist li').click(function(){
            $('.cen-ulist li.on').removeClass('on');
            $(this).addClass('on');
            var type = $(this).attr("t");
            if(type=="talkBoxTab"){
                studioChatMb.view.boardCtrl(1);
            }else{
                studioChatMb.view.boardCtrl(0);
                if(type=='bulletinTab'){
                    studioChatMb.setBulletin();
                }else if(type=='TradeArticleTab'){
                    studioChatMb.setTradeArticle();
                }
            }
            cenTab.slideTo($(this).index(), 300, false);
        });

        /**
         * 页面排版控制 resize
         */
        $(window).resize(function(){
            var loc_amount = 0;
            if(!$(".videopart").is(":hidden")){
                loc_amount = $(".videopart").width() * 0.47;
                $(".videopart").height(loc_amount);
            }
            loc_amount += $(".float-box").is(":hidden") ? 0 : $(".float-box").height();
            loc_amount += $(".cen-ulist").is(":hidden") ? 0 : $(".cen-ulist").height();
            loc_amount += $("#header").is(":hidden") ? 0 : $("#header").height();
            $('.cen-pubox .boxcont').height($(window).height() - loc_amount);
            if(!$(".float-box").is(":hidden")){
                studioChatMb.setTalkListScroll();
            }
        });
        $(window).trigger("resize");

        //主页按钮
        $("#header_hb").bind("click", function(){
            window.location.reload();
        });

        //登录、显示用户信息
        $("#header_ui").bind("click", function(){
            if(studioChatMb.userInfo && studioChatMb.userInfo.isLogin){
                //已登录，显示用户信息
                studioMbPop.popBox("person");
            }else{
                //未登录，弹出登录框
                studioMbPop.popBox("login", {groupId : studioChatMb.userInfo.groupId, clientStoreId : studioChatMb.userInfo.clientStoreId});
            }
        });
    },
    /**
     * 设置聊天相关事件
     */
    setEventChat:function(){
        //表情输入控制
        $('#msgFaceBtn').bind("click", function(){
            $(this).blur();
            if($("#facePanel").is(":hidden")){
                studioChatMb.view.boardCtrl(2);
            }else{
                studioChatMb.view.boardCtrl(1);
            }
            //初始化标签
            studioChatMb.face.init($("#facePanel"), $("#contentText"), studioChatMb.filePath+'/face/', "visitor"==studioChatMb.userInfo.clientGroup);
        });

        /*聊天屏蔽下拉框*/
        $('.view_select').click(function() {
            var loc_this = $(this);
            if(loc_this.is(".dw")){
                loc_this.removeClass("dw");
                studioChatMb.view.viewSelect = false;
            }else{
                loc_this.addClass("dw");
                studioChatMb.view.viewSelect = true;
            }
        }).find(".selectlist a").click(function(){
            if(!$(this).is(".on")){
                $('.view_select .selectlist a').removeClass("on");
                $('.view_select .selected').text($(this).text());
                $(this).addClass("on");
                studioChatMb.showViewSelect($(this).attr("t"));
            }
        });

        //手势控制
        $(document).bind("touchstart", function(e) {
            if(studioChatMb.view.viewSelect){
                var viewSelect = $(".view_select");
                if(!viewSelect.is(e.target) && viewSelect.find(e.target).length == 0){
                    viewSelect.trigger('click');
                }
            }
            if(studioChatMb.view.viewBoard == 2 && $(".float-box").find(e.target).length == 0){
                $("#contentText").trigger("blur");
            }
        });

        /**
         * contentText键盘事件
         */
        if(studioChatMb.userInfo.clientGroup == "visitor"){
            $("#contentText").attr("contenteditable", "false");
            $("#contentText").html('<span style="margin:15px 5px;">亲，<a id="contentText_login" href="javascript:void(0);" onclick="studioChatMb.preLogin();" style="text-decoration: underline;color:#3F51B5;cursor: pointer;">登录</a>&nbsp;&nbsp;后可以发言哦~</span>');
            $("#contentText_login").click(function(){
                $("#header_ui").trigger("click");
            });
        }
        $("#contentText").keydown(function(e){
            var val=$(this).html();
            if(e.keyCode==13){//按回车键发送
                if(common.isValid(val)){
                    $(this).html(val.replace(/<div>|<\/div>/g,""));
                    $("#sendBtn").click();
                }
                return false;
            }
        }).keyup(function(e){
            if(e.keyCode==8){//按回车键发送
                var txtDom=$(this).find(".txt_dia");
                if($.trim($(this).text())==txtDom.text() && $(this).find("img").length==0){
                    txtDom.remove();
                    $(this).html("").trigger("input");
                    return true;
                }
            }
        }).focus(function(){
            studioChatMb.view.boardCtrl(3);
        }).blur(function(){
            studioChatMb.view.boardCtrl(1);
        }).bind("input", function(){
            var isOk = studioChatMb.userInfo.clientGroup!='visitor'
                && ($.trim($(this).text())!=$(this).find(".txt_dia").text() || $(this).find("img").size() > 0);
            if(isOk){
                $("#sendBtn").addClass("pressed");
            }else{
                $("#sendBtn").removeClass("pressed");
            }
        });

        //聊天内容发送事件
        $("#sendBtn").click(function(){
            $(this).blur();
            studioChatMb.view.boardCtrl(1);
            if(studioChatMb.userInfo.clientGroup=='visitor'){
                return;
            }
            var toUser=studioChatMb.getToUser();
            var msg = studioChatMb.getSendMsg();
            if(msg === false){
                return;
            }
            var sendObj={uiId:studioChatMb.getUiId(),fromUser:studioChatMb.userInfo,content:{msgType:studioChatMb.msgType.text,value:msg}};
            sendObj.fromUser.toUser = toUser;
            studioChatMb.socket.emit('sendMsg',sendObj);//发送数据
            studioChatMb.setContent(sendObj,true,false);//直接把数据填入内容栏
            //清空输入框
            $("#contentText").html("").trigger("input");//清空内容
        });

        /**
         * top信息点击
         */
        $("#top_msg").click(function(){
            var loc_label = $(this).find("label");
            studioChatMb.setDialog(loc_label.attr("fuserId"), loc_label.attr("fnickname"), 0, loc_label.attr("fuType"), null, $(this).find("span").text());
            $(this).slideUp();
        });
        $("#top_msg i").click(function(){
            $("#top_msg").slideUp();
            return false;
        });
    },
    /**
     * 页面控制
     */
    view : {
        viewSelect : false,
        viewBoard : 1, //0-不显示输入框 1-仅显示输入框 2-显示表情 3-显示键盘
        boardCtrl : function(type){
            if(this.viewBoard == type){
                return;
            }
            this.viewBoard = type;
            var blocks = {
                header : $("#header"),
                backToLive : $("#backToLive"),
                facePanel : $("#facePanel"),
                floatBox : $(".float-box")
            };
            switch(type){
                case 0:
                    blocks.header.show();
                    blocks.backToLive.show();
                    blocks.floatBox.hide();
                    break;
                case 1:
                    blocks.header.show();
                    blocks.backToLive.show();
                    blocks.floatBox.show();
                    blocks.facePanel.hide();
                    break;
                case 2:
                    blocks.header.hide();
                    blocks.backToLive.hide();
                    blocks.floatBox.show();
                    blocks.facePanel.show();
                    break;
                case 3:
                    blocks.header.hide();
                    blocks.backToLive.hide();
                    blocks.floatBox.show();
                    blocks.facePanel.hide();
                    break;
            }
            $(window).trigger("resize");
        }
    },
    /**
     * 视频控制
     */
    video : {
        initPlayer : false,//播放器是否初始化
        playerType :  '',  //播放器类别: video、sewise
        videoType : '',    //视频类别: mp4、m3u8...
        studioType : '',   //直播类别: studio、yy、oneTV
        liveUrl : '',        //yy直播URL
        $panel : null,     //播放器容器
        backToLivePos : {  //返回直播按钮位置
            x : 0,
            y : 0
        },
        /**
         * 初始化
         */
        init : function(){
            if(navigator.userAgent.match(/Android/i)||(navigator.userAgent.indexOf('iPhone') != -1) || (navigator.userAgent.indexOf('iPod') != -1) || (navigator.userAgent.indexOf('iPad') != -1)){
                this.playerType = 'video';
            }else{
                this.playerType = 'sewise';
            }
            var yyDom=$(".videopart input:first"),yc=yyDom.attr("yc"),mc=yyDom.attr("mc");
            this.liveUrl = studioChatMb.liveUrl;
            this.$panel = $("#tVideoDiv");
            this.setEvent();
        },
        /**
         * 启动，只能选择播放
         */
        start : function(){
            if(common.dateTimeWeekCheck(studioChatMb.studioDate, true)){
                this.play("yy", "", this.liveUrl, "");
            }else{
                $("#videosTab li:first a").click();
            }
        },
        /**
         * 播放
         * @param studioType
         * @param videoType
         * @param url
         * @param title
         */
        play : function(studioType, videoType, url, title){
            this.studioType = studioType;
            if(studioType == "studio"){
                $(".vbackbtn").show();
            }else{
                $(".vbackbtn").hide();
            }
            if(this.playerType == 'video'){
                if(this.initPlayer) {
                    var loc_item = this.$panel.find("video");
                    loc_item.attr("src", url);
                    loc_item[0].play();
                }else {
                    this.$panel.append('<video src="' + url + '" controls="true" autoplay="true" style="width: 100%; height: 100%; background-color: rgb(0, 0, 0);z-index: 1; position: relative;"></video>')
                    this.initPlayer = true;
                    this.setEventAd();
                }
            }else{
                if(this.initPlayer){
                    if(videoType == this.videoType){
                        SewisePlayer.toPlay(url, title, 0, true);
                    }else{
                        SewisePlayer.doStop();
                        SewisePlayer.setup({
                            server : "vod",
                            type : videoType,
                            videourl : url,
                            autostart : true,
                            logo : "",
                            title : title,
                            buffer : 5
                        }, this.$panel);
                        this.videoType = videoType;
                    }
                }else{
                    var srcPathAr=[];
                    srcPathAr.push("/js/lib/sewise.player.min.js?server=vod");
                    srcPathAr.push("type="+videoType);
                    srcPathAr.push("videourl="+url);
                    srcPathAr.push("autostart=true");
                    srcPathAr.push("logo=");
                    srcPathAr.push("title="+title);
                    srcPathAr.push("buffer=5");
                    var srcPath =srcPathAr.join("&") ;
                    var script = document.createElement('script');
                    script.type = "text/javascript";
                    script.src = srcPath;
                    this.initPlayer = true;
                    this.videoType = videoType;
                    this.$panel.append(script);
                    this.setEventAd();
                }
            }
        },
        /**
         * 设置事件
         */
        setEvent : function(){
            /**
             * 视频广告，重播
             */
            $(".ctrlblock div.replay a").bind("click", function(){
                var loc_nextDom = $("#videosTab li a.on");
                loc_nextDom.trigger("click");
            });

            /**
             * 视频广告，下一集
             */
            $(".ctrlblock div.nextbtn a").bind("click", function(){
                var loc_items = $("#videosTab li a");
                for(var i = 0, lenI = loc_items.size(); i < lenI; i++){
                    if(loc_items.eq(i).is(".on")){
                        loc_items.eq(i < lenI - 1 ? i + 1 : 0).trigger("click");
                        break;
                    }
                }
            });

            /**
             * 返回直播初始位置
             */
            $('#backToLive').css({
                left:function(){
                    return $(window).width() - $(this).width() - 10;
                },
                top:function(){
                    return $(window).height() - $('#header').height() - 70;
                }
            });

            /**
             * 返回直播拖动控制
             */
            var rangeControl = function(num,max){
                num = Math.max(num,10);//10代表可拖放范围的边距
                return Math.min(num,max-10);
            };

            /**
             * 返回直播
             */
            util.toucher($("#backToLive")[0])
                .on('singleTap',function(){
                    //点击返回直播
                    studioChatMb.video.play("yy", "", studioChatMb.video.liveUrl, "");
                })
                .on('swipeStart',function(){
                    studioChatMb.video.backToLivePos.x = parseInt(this.style.left) || 0;
                    studioChatMb.video.backToLivePos.y = parseInt(this.style.top) || 0;
                    this.style.transition = 'none';
                    this.style.background = ' rgba(181,144,48,0.8)';
                }).on('swipe',function(e){
                    this.style.left = rangeControl(studioChatMb.video.backToLivePos.x + e.moveX, $(window).width() - this.clientWidth) + 'px';
                    this.style.top = rangeControl(studioChatMb.video.backToLivePos.y + e.moveY, $(window).height() - this.clientHeight) + 'px';
                    return false;
                }).on('swipeEnd',function(){
                    this.style.background = ' rgba(181,144,48,.6)';
                    return false;
                });
        },
        /**
         * 设置视频控制块事件
         */
        setEventAd : function(){
            if(this.playerType == "sewise"){
                //轮播控制
                var checkOverFunc = function(){
                    if(!window.SewisePlayer){
                        window.setTimeout(checkOverFunc, 500);
                        return;
                    }
                    SewisePlayer.onPause(function(){
                        if(studioChatMb.video.studioType == "studio"){
                            window.setTimeout(function(){
                                if(SewisePlayer.duration() <= SewisePlayer.playTime()) {
                                    $(".ctrlblock").show();
                                }
                            }, 1000);
                        }
                    });
                    SewisePlayer.onStart(function(){
                        $(".ctrlblock").hide();
                    });
                };
                checkOverFunc();
            }else if(this.playerType == "video"){
                var loc_item = this.$panel.find("video");
                loc_item.bind("ended", function(){
                    if(studioChatMb.video.studioType == "studio"){
                        $(".ctrlblock").show();
                    }
                }).bind("loadstart", function(){
                    $(".ctrlblock").hide();
                });
            }
        }
    },
    /**
     * 表情控制
     */
    face:{
        initFace : false,

        /**
         * 初始化
         */
        init : function($panel, $assign, path, disabled){
            if(this.initFace){
                return;
            }
            this.build($panel, path);

            /**表情分页滑动*/
            new Swiper($panel, {
                pagination: '.swiper-pagination',
                paginationClickable: true
            });

            /**
             * 表情选择事件
             */
            $panel.find("img").bind("click", {
                panel : $panel,
                assign : $assign,
                disabled : disabled
            }, function(e){
                if(!e.data.disabled){
                    e.data.assign.append($(this).clone()).trigger("input");
                }
            });
            this.initFace = true;
        },
        /**
         * 构建表情
         * @param $panel
         * @param path
         */
        build : function($panel, path){
            var loc_face = [];
            var step = 7;
            for(var i = 1; i <= 75; i+=21){
                loc_face.push('<div class="swiper-slide"><table border="0" cellspacing="0" cellpadding="0">');
                for(var j = i, lenJ = Math.min(i + 20, 75); j <= lenJ; j++){
                    if(j % step == 1){
                        loc_face.push('<tr>');
                    }
                    loc_face.push('<td><img src="' + path + j + '.gif"/></td>');
                    if(j % step == 0 || j == lenJ){
                        loc_face.push('</tr>');
                    }
                }
                loc_face.push('</table></div>');
            }
            $panel.find("div.face").html(loc_face.join(""));
            $(window).trigger("resize");
        }
    },
    /**
     * 设置聊天列表滚动条
     */
    setTalkListScroll:function(){
        $("#talkPanel").scrollTop($('#talkPanel')[0].scrollHeight);
    },
    /**
     * 提取uiId,用于标记记录的id，信息发送成功后取发布日期代替
     */
    getUiId:function(){
        var currentDate=new Date();
        return currentDate.getTime()+"_ms";
    },
    /**
     * 文档信息(视频,公告,直播安排
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
            var query = {
                code: code,
                platform: platform,
                hasContent: hasContent,
                pageNo: curPageNo,
                pageSize: pageSize,
                orderByStr: orderByStr
            };
            if(authorId){
                query.authorId = common.trim(authorId);
            }
            $.getJSON('/studio/getArticleList',query,function(data){
                //console.log("getArticleList->data:"+JSON.stringify(data));
                callback(data);
            });
        }catch (e){
            console.error("getArticleList->"+e);
            callback(null);
        }
    },
    /**
     * 设置公告
     */
    setBulletin : function(){
        studioMbPop.loadingBlock($("#bulletinTab"));
        studioChatMb.getArticleList("bulletin_system",studioChatMb.userInfo.groupId,1,1,1,'{"sequence":"asc"}',null,function(dataList){
            var loc_panel = $("#bulletinTab .notice_cont");
            loc_panel.html("");
            if(dataList && dataList.result==0){
                var data=dataList.data;
                if(data && data.length > 0){
                    loc_panel.html(data[0].detailList[0].content);
                }
            }
            studioMbPop.loadingBlock($("#bulletinTab"), true);
        });
    },
    /**
     * 设置老师观点
     */
    setTradeArticle : function(){
        studioMbPop.loadingBlock($("#TradeArticleTab"));
        studioChatMb.getArticleList("trade_strategy_article",studioChatMb.userInfo.groupId,1,1,5,'{"createDate":"desc"}',null,function(dataList){
            var loc_panel = $("#TradeArticleTab .boxcont");
            var loc_html = [];
            if(dataList && dataList.result==0){
                var data=dataList.data;
                if(data && data.length > 0){
                    var detail = null;
                    var tmp = null;
                    for(var i = 0, lenI = data.length; i < lenI; i++){
                        detail = data[i].detailList[0];
                        tmp = detail.author.split(";");
                        loc_html.push('<img src="' + tmp[1] + '">');
                        loc_html.push('<br>');
                        loc_html.push(detail.title);
                        loc_html.push('<br>');
                        loc_html.push(tmp[0]);
                        loc_html.push('<br>');
                        loc_html.push(data[i].publishStartDate ? common.longMsTimeToDateTime(data[i].publishStartDate) : "");
                        loc_html.push('<br>');
                        loc_html.push(detail.content);
                        loc_html.push('<hr>');
                    }
                }
            }
            loc_panel.html(loc_html.join(""));
            studioMbPop.loadingBlock($("#TradeArticleTab"), true);
        });
    },
    /**
     * 显示过滤的聊天记录
     * @param t
     */
    showViewSelect:function(t){
        var loc_panel = $("#dialog_list");
        if(t=='analyst'){
            loc_panel.children("[utype!=2]").hide();
            loc_panel.children("[utype=2]").show();
        }else if(t=='me'){
            loc_panel.children("[isMe=false]").hide();
            loc_panel.children("[isMe=true]").show();
        }else{
            loc_panel.children().show();
        }
        studioChatMb.setTalkListScroll();
    },
    /**
     * 过滤发送消息：过滤一些特殊字符等。
     * 如果返回值为false,则终止发送消息。
     */
    getSendMsg : function(dom){
        dom = dom || $("#contentText");
        //校验聊天内容长度
        if(dom.text().length + dom.find("img").size() > 140){
            studioMbPop.showMessage("消息内容超过最大长度限制（140字以内）！");
            return false;
        }

        var msg = dom.html();
        msg =common.clearMsgHtml(msg);
        if(common.isBlank(msg)){
            dom.html("");
            return false;
        }
        if(dom.find(".txt_dia").length>0){
            dom.find(".txt_dia").remove();
            msg=dom.html();
        }
        return msg;
    },
    /**
     * 提取@对话html
     */
    getToUser:function(){
      var curDom=$('#contentText .txt_dia');
      if(curDom.length>0){
          var obj = {userId:curDom.attr("uid"),nickname:curDom.find("label").text(),talkStyle:0,userType:curDom.attr("utype")};
          var sp = curDom.find("input");
          if(sp.length>0){
              obj.question=sp.val();
          }
          return obj;
      }
      return null;
    },
    /**
     * 格式发布日期
     */
    formatPublishTime:function(time){
        return common.isBlank(time)?'':common.getHHMM(Number(time.replace(/_.+/g,"")));
    },
    /**
     * 设置对话
     * @param userId
     * @param nickname
     * @param talkStyle 聊天方式（0对话，1私聊）
     * @param userType 用户类别(0客户；1管理员；2分析师；3客服）
     * @param [avatar]
     * @param [txt]
     */
    setDialog:function(userId,nickname,talkStyle,userType,avatar,txt){
        if(userType==2){
            $("#teacherListId li[uid='" + userId + "'] a.te_btn").addClass("on");
        }
        if(talkStyle==1){//私聊,则直接弹私聊框
            studioChat.fillWhBox(userType,userId,nickname,false);
            studioChat.getWhBox().show();
            var ms=$('.mult_dialog a[uid='+userId+']');
            ms.click();
            if(common.isValid(avatar)){
                ms.find("img").attr("src",avatar);
            }
        }else{
            if("visitor"==studioChatMb.userInfo.clientGroup){
                return;
            }
            $("#contentText .txt_dia").remove();
            $("#contentText").html($("#contentText").html().replace(/^((&nbsp;)+)/g,''));
            var loc_txt = txt ? ('<input type="hidden" value="' + txt + '">') : '';
            $("#contentText").prepend('&nbsp;<span class="txt_dia" contenteditable="false" uid="'+userId+'" utype="'+userType+'">' + loc_txt + '@<label>'+nickname+'</label></span>&nbsp;').focusEnd();
        }
    },
    /**
     * 填充内容
     * @param data
     */
    setContent:function(data,isMeSend,isLoadData){
        var fromUser=data.fromUser;
        if(isMeSend){//发送，并检查状态
            fromUser.publishTime=data.uiId;
        }
        if(data.isVisitor){
            $("#"+data.uiId).remove();
            return;
        }
        if(isLoadData && $("#"+fromUser.publishTime).length>0){
            $("#"+fromUser.publishTime+" .dialog em[class=ruleTipStyle]").remove();
            $("#"+fromUser.publishTime+" input").remove();
            return;
        }
        if(data.rule){
            if(data.value && data.value.needApproval){
                $('#'+data.uiId).attr("id",fromUser.publishTime);
            }else{
                $('#'+data.uiId+' .dialog').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            }
            return;
        }
        if(!isMeSend && studioChatMb.userInfo.userId==fromUser.userId && data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
            $('#'+data.uiId+' .uname span').html(studioChatMb.formatPublishTime(fromUser.publishTime));
            $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
            return;
        }
        var dialog=studioChatMb.formatContentHtml(data,isMeSend,isLoadData);
        var list=$("#dialog_list");
        var talkPanel = $("#talkPanel");
        //如果本身就在最底端显示，则自动滚动，否则不滚动
        var isScroll = talkPanel.scrollTop() + talkPanel.height() + 30 >= talkPanel.get(0).scrollHeight;
        list.append(dialog);
        if(isScroll){
            studioChatMb.setTalkListScroll();
        }
        this.formatMsgToLink(fromUser.publishTime);//格式链接
        var vst=$('.view_select .selectlist a[class=on]').attr("t");//按右上角下拉框过滤内容
        if(vst!='all'){
            studioChatMb.showViewSelect(vst);
        }
        //对话、私聊事件
        $('#' + fromUser.publishTime + ' .c-menu a').click(function(){
            var tp=$(this).parents(".c-menu");
            studioChatMb.setDialog(tp.attr("uid"),tp.attr("nk"),$(this).attr("t"),tp.attr("utype"));//设置对话
        });
        //对话事件
        $('#'+fromUser.publishTime+' .headimg').click(function(){
            $('#' + fromUser.publishTime + ' .c-menu a[t=0]').trigger("click");
        });
        $('#' + fromUser.publishTime + ' .txt_dia').click(function () {
            studioChatMb.setDialog($(this).attr("uid"),$(this).find("label").text(),0,$(this).attr("utype"));
        });
        //昵称点击
        $('#'+fromUser.publishTime+' .uname').click(function(){
            $('#' + fromUser.publishTime + ' .c-menu a[t=0]').trigger("click");
        });
    },
    /**
     * 格式内容栏
     */
    formatContentHtml:function(data,isMeSend,isLoadData){
        var cls='clearfix ',dialog='',isMe='false',
            fromUser=data.fromUser,
            content=data.content,
            nickname=fromUser.nickname;
        var toUser=fromUser.toUser,pHtml=[];
        if(toUser && common.isValid(toUser.userId)){
            if(common.isValid(toUser.question)){//对话模式
                pHtml.push('<p class="question"><em>');
                pHtml.push('<strong class="asker" uid="'+toUser.userId+'" utype="'+toUser.userType+'">'+toUser.nickname+'</strong>');
                pHtml.push('提问：</em>');
                pHtml.push('<span>' + toUser.question + '</span>');
                pHtml.push('</p>');
                pHtml.push('<p class="reply"><span>回复：</span>');
                pHtml.push(content.value);
                pHtml.push('</p>');
            }else{
                pHtml.push('<span class="txt_dia" uid="'+toUser.userId+'" utype="'+toUser.userType+'">');
                pHtml.push('@<label>'+toUser.nickname+'</label>');
                pHtml.push('</span>');
                pHtml.push(content.value);
            }
            if(studioChatMb.userInfo.userId==toUser.userId){
                isMe='true';
            }
        }else{
            pHtml.push(content.value);
        }
        if(studioChatMb.userInfo.userId==fromUser.userId){
            cls+='me-li';
            nickname='我';
            isMe='true';
        }else{
            if(fromUser.userType==2){
                cls+='expert-li';
            }
            if(fromUser.userType==1){
                cls+='visitor-li';
            }
            dialog=studioChatMb.getDialogHtml(fromUser.userId,nickname,fromUser.userType);
            if(!isLoadData && toUser){
                if(studioChatMb.userInfo.userId==toUser.userId){
                    $("#top_msg label").html(fromUser.nickname+':@'+toUser.nickname)
                        .attr("tId",toUser.userId)
                        .attr("fuType",fromUser.userType)
                        .attr("fnickname",fromUser.nickname)
                        .attr("fuserId",fromUser.userId);
                    $("#top_msg span").html(content.value);
                    $("#top_msg").slideDown();
                }
            }
        }
        var loc_html = [];
        loc_html.push('<li class="'+cls+'" id="'+fromUser.publishTime+'" isMe="'+isMe+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header">');
        loc_html.push('<div class="headimg" uid="'+fromUser.userId+'">');
        loc_html.push(studioChatMb.getUserAImgCls(fromUser.clientGroup,fromUser.userType,fromUser.avatar));
        loc_html.push('</div>');
        loc_html.push('<div class="detail">');
        loc_html.push('<span class="uname">');
        if(studioChatMb.userInfo.userId==fromUser.userId){
            loc_html.push('<span>' + studioChatMb.formatPublishTime(fromUser.publishTime) + '</span>');
            loc_html.push('<strong>' + nickname + '</strong>');
        }else{
            loc_html.push('<strong>' + nickname + '</strong>');
            loc_html.push('<span>' + studioChatMb.formatPublishTime(fromUser.publishTime) + '</span>');
        }
        loc_html.push('</span>');
        loc_html.push('<div class="dialog">' + pHtml.join("") + '</div>');
        loc_html.push('</div>');
        loc_html.push(dialog);
        loc_html.push('</li>');
        return loc_html.join("");
    },
    /**
     * 格式链接
     * @param ptime
     */
    formatMsgToLink:function(ptime){
        $('#'+ptime+' .dcont:contains("http:"),#'+ptime+' .dcont:contains("https:")').each(function (index,el){
            var elHtml=$(el).html(),elArr=elHtml.split(/<img src="\S+">/g);
            var linkTxt;
            for(var i in elArr){
                linkTxt=elArr[i];
                if(common.isBlank(linkTxt)){
                    continue;
                }
                var newTest=linkTxt.replace(/(http:\/\/|https:\/\/)((\w|=|\?|\.|\/|\\&|-)+)(:\d+)?(\/|\S)+/g,function(m){
                    return '<a href="'+m+'" target="_blank" style="color:#3181c6;">'+m+'</a>';
                });
                el.innerHTML = el.innerHTML.replace(linkTxt,newTest);
            }
        });
    },
    /**
     * 提取头像样式
     * @param clientGroup
     * @param userType
     * @param avatar
     * @returns {string}
     */
    getUserAImgCls:function(clientGroup,userType,avatar){
        var aImgCls='';
        if(userType && userType!=0 && common.isValid(avatar)){
            return '<img src="'+avatar+'">';
        }else if("vip"==clientGroup){
            aImgCls="user_v";
        }else if("real"==clientGroup){
            aImgCls="user_r";
        }else if("simulate"==clientGroup){
            aImgCls="user_d";
        }else if("register"==clientGroup){
            aImgCls="user_m";
        }else{
            aImgCls="user_c";
        }
        return '<img src="images/studio/'+aImgCls+'.png">';
    },
    /**
     * 离开房间提示
     */
    leaveRoomTip:function(flag){
        if("visitor"==studioChatMb.userInfo.clientGroup){
             return;
        }
        var txt='';
        if(flag=="roomClose"){
            txt='房间已停用，';
        }
        if(flag=="otherLogin"){
            txt='您的账号已在其他地方登陆，';
        }
        studioMbPop.showMessage("注意："+txt+"正自动登出.....");
        window.setTimeout(function(){//3秒钟后登出
            window.location.href="/studio/logout";
        },3000);
    },
    /**
     * 提取对话html
     * @param userId
     * @param nickname
     * @param userType
     * @returns {string}
     */
    getDialogHtml:function(userId,nickname,userType){
        if(studioChatMb.userInfo.userId!=userId){
            var hasMainDiv=false,gIdDom=$("#studioListId a[class~=ing]"),mainDiv='<div class="c-menu" style="display:none;" nk="'+nickname+'" uid="'+userId+'" utype="'+userType+'">';
            mainDiv += "<ul>";
            if(studioChatMb.userInfo.userId.indexOf('visitor_')==-1 && userId.indexOf('visitor_')==-1){
                mainDiv+='<li><a href="javascript:void(0)" t="0"><i></i>@TA</a></li>';
                hasMainDiv=true;
            }
            if(gIdDom.attr("aw")=="true"&& common.containSplitStr(gIdDom.attr("awr"),userType)){
                mainDiv+='<li><a href="javascript:void(0)" t="1"><i></i>私信</a></li>';
                hasMainDiv=true;
            }
            mainDiv += "</ul>";
            return hasMainDiv?mainDiv+"</div>":'';
        }else{
            return '';
        }
    },
    /**
     * 格式化用户信息
     * @param row
     */
    formatUserToContent:function(row){
        var fromUser = {
            userId: row.userId,
            nickname: row.nickname,
            avatar: row.avatar,
            userType: row.userType,
            groupId: row.groupId,
            clientGroup:row.clientGroup,
            publishTime: row.publishTime,
            toUser:row.toUser,
            position:row.position
        };
        studioChatMb.setContent({fromUser: fromUser,content:row.content},false,true);
    }
};