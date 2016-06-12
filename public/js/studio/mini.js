/**
 * 直播间客户端通用操作类
 * @type {{init: Function, setKindEdit: Function, setSocket: Function}}
 * author Alan.wu
 */
var StudioChatMini = {
    apiUrl:'',
    filePath:'',
    currStudioAuth:false,//当前房间是否授权
    fromPlatform:null,//来源平台
    blwsPlayer: null,//保利威视
    syllabusData:null,//课程数据
    serverTime: 0,//服务器时间
    pushObj:{
        whPush : {},   //私聊推送信息
        talkPush : [], //聊推送消息
        talkPushInterval : null
    },
    //信息类型
    msgType: {
        text: 'text',
        img: 'img',
        file: 'file'
    },
    socket: null,
    socketUrl: '',
    userInfo: null,
    initStudio: false,
    video: {
        type: "mp4",
        list: [],
        listMp4Index: [],
        index: -1
    },
    courses : null, //课程安排
    init: function () {
        this.serverTimeUp();
        this.setVisitStore();//设置访客存储
        this.setSocket();//设置socket连接
        this.setVideoList();//设置视频列表
        this.setEvent();//设置各种事件
    },
    /**
     * 服务器时间更新
     */
    serverTimeUp: function () {
        StudioChatMini.clientVideoTask();
        setInterval(function () {
            StudioChatMini.serverTime += 1000;
            StudioChatMini.clientVideoTask();
        }, 1000);//每秒一次
    },
    /**
     * 设置访客存储信息
     * @param userInfo
     */
    setVisitStore: function () {
        if (!store.enabled) {
            console.log('Local storage is not supported by your browser.');
            return;
        }
        var key = 'storeInfo_' + this.userInfo.groupType, keyVal = store.get(key);
        var obj = {};
        if (common.isBlank(keyVal)) {
            var randId = common.randomNumber(6);
            obj.clientStoreId = new Date().getTime() + "_" + randId;
            obj.userId = "visitor_" + randId;
            obj.nickname = '游客_' + randId;
            obj.userType = -1;
            store.set(key, obj);
        } else {
            obj = keyVal;
        }
        this.userInfo.clientStoreId = obj.clientStoreId;
        this.userInfo.visitorId = obj.userId;
        this.userInfo.loginId = obj.loginId;
        if (this.userInfo.clientGroup && this.userInfo.clientGroup == 'visitor') {
            this.userInfo.nickname = obj.nickname;
            this.userInfo.userId = obj.userId;
        } else {
            obj.loginId = this.userInfo.userId;
            store.set(key, obj);
        }
    },
    /**
     * 客户端视频任务
     */
    clientVideoTask: function () {
        var course=common.getSyllabusPlan(this.syllabusData,this.serverTime);
        var hasLive=course && course.status!=0 && common.isValid(course.studioLink) && course.courseType==1 && !course.isNext;
        if($("#studioVideoDiv embed").size() < 1 && hasLive){
            $("#vbackbtn_live").show();
        }
    },
    /**按直播时间播放
     * @param type 视频类型
     * 'mp4'-随机播放MP4教学视频
     * 'video'-随机播放所有教学视频
     * 'live'-yy直播时间，播放yy视频，否则播放MP4教学视频
     * @param isBackStudio 返回直播
     */
    playVideo: function (type,isBackStudio) {
        //如果是在看教学视频则直接返回
        StudioChatMini.video.type = type;
        if(type == "mp4" || type == "video"){
            StudioChatMini.setVideo(StudioChatMini.changeVideoIndex(type));
        }else{
            var course=common.getSyllabusPlan(this.syllabusData,this.serverTime);
            if(!course||(course.courseType!=0 && common.isBlank(course.studioLink))||course.isNext||course.courseType==0||course.courseType==2){
                if(isBackStudio){
                    alert("目前还没有视频直播，详情请留意直播间的课程安排！");
                }else{
                    StudioChatMini.playVideo('mp4');
                    if(course && !course.isNext && course.courseType==0){
                        setTimeout(function(){
                            if(window.SewisePlayer){//停播放教学视频
                                SewisePlayer.doStop();
                            }
                        },1500);
                    }
                }
            }else{//直播时间段，则播放直播
                $("#vbackbtn_live").hide();
                this.setStudioVideoDiv(course.studioLink,course.title);
            }
        }
    },
    /**切换视频*/
    changeVideoIndex : function(type){
        var loc_index = -1;
        var len = StudioChatMini.video.listMp4Index.length;
        if(type != "mp4" || len == 0){
            //随机播放所有视频
            len = StudioChatMini.video.list.length;
            if(len == 0){
                loc_index = -1;
            }else if(len == 1){
                loc_index = 0;
            }else if(StudioChatMini.video.index == -1){
                loc_index = common.randomIndex(len);
            }else{
                loc_index = common.randomIndex(len - 1);
                if(loc_index >= StudioChatMini.video.index){
                    loc_index ++;
                }
            }
        }else if(len == 1){
            loc_index = StudioChatMini.video.listMp4Index[0];
        }else{
            if(StudioChatMini.video.index == -1){
                loc_index = common.randomIndex(len);
            }else{
                loc_index = common.randomIndex(len - 1);
                if(StudioChatMini.video.listMp4Index[loc_index] >= StudioChatMini.video.index){
                    loc_index ++;
                }
            }
            loc_index = StudioChatMini.video.listMp4Index[loc_index];
        }
        StudioChatMini.video.index = loc_index;
        return loc_index == -1 ? null : StudioChatMini.video.list[loc_index];
    },
    /**
     * 提取embed对应的dom
     * @param url
     */
    getEmbedDom: function (url) {
        return '<embed src="' + url + '" autostart="true" wmode="Opaque" quality="high" width="100%" height="100%" align="middle" allowScriptAccess="never" allowFullScreen="true" mode="transparent" type="application/x-shockwave-flash"></embed>';
    },
    /**
     * 设置直播视频
     * @param url
     * @param title
     */
    setStudioVideoDiv: function (url, title) {
        if (window.SewisePlayer) {//停播放教学视频
            SewisePlayer.doStop();
            $("#tvDivId").hide();
            $("#studioTeachId a").removeClass("on");
        }
        $("#tVideoDiv iframe").remove();
        if(url.indexOf("rtmp")!=-1){
            var sdHtml='<div style="position: relative; width: 100%; height: 100%; left: 0px; top: 0px;">'+
                '<object type="application/x-shockwave-flash" id="sewise_player" name="sewise_player" data="/js/lib/flash/SewisePlayer.swf" width="100%" height="100%">'+
                '<param name="allowfullscreen" value="true">'+
                '<param name="wmode" value="transparent">'+
                '<param name="allowscriptaccess" value="always">'+
                '<param name="flashvars" value="autoStart=true&amp;programId=&amp;shiftTime=&amp;lang=zh_CN&amp;type=rtmp&amp;serverApi=ServerApi.execute&amp;skin=/js/lib/flash/skins/liveOrange.swf&amp;title=&amp;draggable=true&amp;published=0&amp;streamUrl='+url+'&amp;duration=3600&amp;poster=&amp;flagDatas=&amp;videosJsonUrl=&amp;adsJsonData=&amp;statistics=&amp;customDatas=&amp;playerName=Sewise Player&amp;clarityButton=enable&amp;timeDisplay=disable&amp;controlBarDisplay=enable&amp;topBarDisplay=disable&amp;customStrings=&amp;volume=0.6&amp;key=&amp;trackCallback=">'+
                '</object>'+
                '</div>';
            $("#studioVideoDiv").html(sdHtml);
        }else{
            //已经是直播相同内容无需切换
            if ($("#stVideoDiv:visible").length > 0 && $("#studioVideoDiv embed").attr("src") == url) {
                return;
            }
            $("#stVideoDiv .img-loading").fadeIn(0).delay(2000).fadeOut(200);
            $("#studioVideoDiv embed").remove();
            $(StudioChatMini.getEmbedDom(url)).appendTo('#studioVideoDiv');
        }

        $("#stVideoDiv").show();
        $("#stVideoDiv .vtitle span").text(title);
        StudioChatMini.initStudio = true;
    },
    /**
     * 设置视频
     * @param isYy
     * @param video
     */
    setVideo: function (video) {
        try {
            $("#tvDivId").show();
            $("#stVideoDiv").hide();
            $("#studioVideoDiv embed").remove();
            $("#tVideoDiv .img-loading").fadeIn(0).delay(2000).fadeOut(200);
            var vUrl = video.url, title = video.title;
            $("#tvDivId .vtitle span").text(title);
            if (vUrl.indexOf(".html") != -1) {
                if(window.SewisePlayer){//停播放教学视频
                    SewisePlayer.doStop();
                    $("#tVideoDiv div").hide();
                }
                var iframeDom = $("#tVideoDiv iframe");
                var isAppend = true;
                if(iframeDom.size() > 0){
                    if(iframeDom.attr("src") == vUrl){
                        isAppend = false;
                    }else{
                        iframeDom.remove();
                    }
                }
                if(isAppend){
                    $("#tVideoDiv").append('<iframe frameborder=0 width="100%" height="100%" src="'+vUrl+'" allowfullscreen></iframe>');
                }
            } else {
                $("#tVideoDiv iframe").remove();
                $("#tVideoDiv div").show();
                if (vUrl.indexOf("type=blws") != -1) {
                    var vidParams = vUrl.split("&");
                    if (vidParams.length > 1) {
                        var vid = vidParams[1].replace(/^vid=/g, '');
                        if (StudioChatMini.blwsPlayer) {
                            StudioChatMini.blwsPlayer.changeVid(vid);
                        } else {
                            StudioChatMini.blwsPlayer = polyvObject('#tVideoDiv').videoPlayer({
                                width: '100%',
                                height: '100%',
                                'vid': vid,
                                'flashvars': {"autoplay": "0", "setScreen": "fill"},
                                onPlayOver:function(id){
                                    StudioChatMini.playVideo(StudioChatMini.video.type);
                                }
                            });
                        }
                    }
                } else {
                    if (window.SewisePlayer) {
                        SewisePlayer.toPlay(vUrl, title, 0, true);
                    } else {
                        var srcPathAr = [];
                        srcPathAr.push("/js/lib/sewise.player.min.js?server=vod");
                        srcPathAr.push("type=" + (vUrl.indexOf(".flv") != -1 ? 'flv' : 'mp4'));
                        srcPathAr.push("videourl=" + vUrl);
                        srcPathAr.push("autostart=true");
                        srcPathAr.push("logo=");
                        srcPathAr.push("title=VodVideo");
                        srcPathAr.push("buffer=5");
                        //srcPathAr.push("skin=vodWhite");
                        var srcPath = srcPathAr.join("&");
                        var script = document.createElement('script');
                        script.type = "text/javascript";
                        script.src = srcPath;
                        $("#tVideoDiv").get(0).appendChild(script);
                        //轮播控制
                        var checkOverFunc = function(){
                            if(!window.SewisePlayer){
                                window.setTimeout(checkOverFunc, 500);
                                return;
                            }
                            SewisePlayer.onPause(function(id){
                                window.setTimeout(function(){
                                    if(SewisePlayer.duration() <= SewisePlayer.playTime()) {
                                        StudioChatMini.playVideo(StudioChatMini.video.type);
                                    }
                                }, 1000);
                            });
                        };
                        checkOverFunc();
                    }
                }
            }
        } catch (e) {
            console.error("setVideo has error:" + e);
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
    getArticleList: function (code, platform, hasContent, curPageNo, pageSize, orderByStr, authorId, callback) {
        try {
            $.getJSON('/studio/getArticleList', {
                authorId: common.trim(authorId),
                code: code,
                platform: platform,
                hasContent: hasContent,
                pageNo: curPageNo,
                pageSize: pageSize,
                orderByStr: orderByStr
            }, function (data) {
                //console.log("getArticleList->data:"+JSON.stringify(data));
                callback(data);
            });
        } catch (e) {
            console.error("getArticleList->" + e);
            callback(null);
        }
    },
    /**
     * 设置视频
     */
    setVideoList: function () {
        this.getArticleList("teach_video", this.userInfo.groupId, 0, 1, 100, '{"sequence":"desc"}', null, function (dataList) {
            if (dataList && dataList.result == 0) {
                var data = dataList.data;
                var row = null;
                var video = null;
                for (var i in data) {
                    row = data[i];
                    if(row.mediaUrl){
                        video = {
                            title : row.detailList[0].title,
                            id : row._id,
                            type : ((common.isValid(row.mediaUrl) && row.mediaUrl.indexOf('.mp4') != -1) ? 'mp4' : ''),
                            url : row.mediaUrl
                        };
                        StudioChatMini.video.list.push(video);
                        if(video.type === "mp4"){
                            StudioChatMini.video.listMp4Index.push(i);
                        }
                    }
                }
            }
            StudioChatMini.playVideo("live");
        });
    },
    /**
     * 事件设置
     */
    setEvent: function () {
        /**
         * 返回直播
         */
        $("#vbackbtn_live").click(function () {
            StudioChatMini.playVideo("live",true);
        });
        /**
         * 换一换
         */
        $("#vbackbtn_chg").click(function () {
            StudioChatMini.playVideo("video");
        });
        /**
         * 观看教学视频
         */
        $("#vbackbtn_video").click(function () {
            StudioChatMini.playVideo("mp4");
        });
    },
    /**
     * 设置聊天列表滚动条
     * @param toBottom
     */
    setTalkListScroll: function (toBottom) {
        var obj = $("#chatMsgContentDiv");
        if (obj.hasClass("mCustomScrollbar")) {
            obj.mCustomScrollbar("update");
            if (toBottom) {
                obj.mCustomScrollbar("scrollTo", "bottom");
            }
        } else {
            obj.mCustomScrollbar({scrollInertia: 1, scrollButtons: {enable: false}, theme: "light-2"});
            obj.mCustomScrollbar("scrollTo", "bottom");
        }
    },
    /**
     * 格式发布日期
     */
    formatPublishTime: function (time, isfull, splitChar) {
        var nb = Number(time.replace(/_.+/g, ""));
        return common.isBlank(time) ? '' : isfull ? common.formatterDateTime(nb, splitChar) : common.getHHMM(nb);
    },
    /**
     * 填充内容
     * @param data
     */
    setContent: function (data, isMeSend, isLoadData) {
        var fromUser = data.fromUser;
        if (isMeSend) {//发送，并检查状态
            fromUser.publishTime = data.uiId;
        }
        if (data.isVisitor) {
            return;
        }
        if (isLoadData && $("#" + fromUser.publishTime).length > 0) {
            $("#" + fromUser.publishTime + " .dcont em[class=ruleTipStyle]").remove();
            $("#" + fromUser.publishTime + " input").remove();
            return;
        }
        if (data.rule) {
            if (data.value && data.value.needApproval) {
                $('#' + data.uiId).attr("id", fromUser.publishTime);
            } else {
                $('#' + data.uiId + ' .dcont').append('<em class="ruleTipStyle">' + (data.value.tip) + '</em>');
            }
            return;
        }
        if (!isMeSend && StudioChatMini.userInfo.userId == fromUser.userId && data.serverSuccess) {//发送成功，则去掉加载框，清除原始数据。
            $('#' + data.uiId + ' .dtime').html(StudioChatMini.formatPublishTime(fromUser.publishTime));
            $('#' + data.uiId).attr("id", fromUser.publishTime);//发布成功id同步成服务器发布日期
            return;
        }
        var dialog = StudioChatMini.formatContentHtml(data, isMeSend, isLoadData);
        var list = $("#dialog_list");
        list.append(dialog);
        this.formatMsgToLink(fromUser.publishTime);//格式链接
        if (!isLoadData) {
            StudioChatMini.setTalkListScroll(true);
        }
    },
    /**
     * 格式内容栏
     */
    formatContentHtml: function (data, isMeSend, isLoadData) {
        var cls = 'dialog ', pHtml = '', dtHtml = '', loadHtml = '', uName = 'uname ', isMe = 'false',
            fromUser = data.fromUser,
            content = data.content,
            nickname = fromUser.nickname;
        var toUser = fromUser.toUser, toUserHtml = '';
        if (toUser && common.isValid(toUser.userId)) {
            toUserHtml = '<span class="txt_dia" uid="' + toUser.userId + '" utype="' + toUser.userType + '">@<label>' + toUser.nickname + '</label></span>';
            if (StudioChatMini.userInfo.userId == toUser.userId) {
                isMe = 'true';
            }
        }
        pHtml = content.value;
        if (StudioChatMini.userInfo.userId == fromUser.userId) {
            cls += 'mine';
            nickname = '我';
            isMe = 'true';
        } else {
            if(fromUser.userType==3){
                nickname += "&nbsp;（助理）";
            }else if(fromUser.userType==2){
                cls+='analyst';
            }else if(fromUser.userType==1){
                cls+='admin';
            }
            if (!isLoadData && toUser) {
                if (StudioChatMini.userInfo.userId == toUser.userId) {
                    $(".mymsg").show();
                    $(".mymsg em").hide();
                    $(".replybtn").attr("uid", fromUser.userId);
                    $(".replybtn").attr("ts", toUser.talkStyle);
                    $(".replybtn").attr("futype", fromUser.userType);
                    $(".sender").html(fromUser.nickname);
                    $(".xcont").html(pHtml);
                }
            }
        }
        var html = [];
        html.push('<div class="' + cls + '" id="' + fromUser.publishTime + '" isMe="' + isMe + '" utype="' + fromUser.userType + '" mType="' + content.msgType + '" t="header">');
        html.push('<a href="javascript:" class="headimg" uid="' + fromUser.userId + '">' + StudioChatMini.getUserAImgCls(fromUser.userId, fromUser.clientGroup, fromUser.userType, fromUser.avatar) + '</a>');
        html.push('<div class="duser">');
        if(isMe == 'true'){
            html.push('<span class="dtime">' + StudioChatMini.formatPublishTime(fromUser.publishTime) + '</span>');
            html.push('<a href="javascript:"  class="' + uName + '">' + nickname + '</a>');
        }else{
            html.push('<a href="javascript:"  class="' + uName + '">' + nickname + '</a>');
            html.push('<span class="dtime">' + StudioChatMini.formatPublishTime(fromUser.publishTime) + '</span>');
        }
        html.push('</div>');
        html.push('<p><span class="dcont">' + toUserHtml + pHtml + '</span></p>');
        html.push('</div>');
        return html.join("");
    },
    /**
     * 格式链接
     * @param ptime
     */
    formatMsgToLink: function (ptime) {
        $('#' + ptime + ' .dcont:contains("http:"),#' + ptime + ' .dcont:contains("https:")').each(function (index, el) {
            var elHtml = $(el).html(), elArr = elHtml.split(/<img src="\S+">/g);
            var linkTxt = '';
            for (var i in elArr) {
                linkTxt = elArr[i];
                if (common.isBlank(linkTxt)) {
                    continue;
                }
                var newTest = linkTxt.replace(/(http:\/\/|https:\/\/)((\w|=|\?|\.|\/|\\&|-)+)(:\d+)?(\/|\S)+/g, function (m) {
                    return '<a href="' + m + '" target="_blank" style="color:#3181c6;">' + m + '</a>';
                });
                el.innerHTML = el.innerHTML.replace(linkTxt, newTest);
            }
        });
    },
    /**
     * 移除加载提示的dom
     * @param uiId
     */
    removeLoadDom: function (uiId) {
        $('#' + uiId + ' .img-loading,#' + uiId + ' .img-load-gan,#' + uiId + ' .shadow-box,#' + uiId + ' .shadow-conut').remove();
    },
    /**
     * 提取头像样式
     * @param userId
     * @param clientGroup
     */
    getUserAImgCls: function (userId, clientGroup, userType, avatar) {
        var aImgCls = '';
        if (userType && userType != 0 && common.isValid(avatar)) {
            return '<img src="' + avatar + '">';
        } else if ("vip" == clientGroup) {
            aImgCls = "user_v";
        } else if ("active" == clientGroup || "notActive" == clientGroup) {
            aImgCls = "user_r";
        } else if ("simulate" == clientGroup) {
            aImgCls = "user_d";
        } else if ("register" == clientGroup) {
            aImgCls = "user_m";
        } else if ("visitor"==clientGroup || userType == -1) {
            userId = userId || "";
            var idTmp = parseInt(userId.substring(userId.length - 2), 10);
            if(isNaN(idTmp)){
                idTmp = 100;
            }
            idTmp = (idTmp + 17) % 39;
            return '<img src="' + StudioChatMini.filePath + '/upload/pic/header/chat/visitor/' + idTmp + '.png">';
        } else {
            aImgCls = "user_c";
        }
        return '<img src="images/studio_mini/' + aImgCls + '.png">';
    },
    /**
     * 设置socket
     */
    setSocket: function () {
        this.socket = common.getSocket(io, this.socketUrl, this.userInfo.groupType);
        //建立连接
        this.socket.on('connect', function () {
            console.log('connected to server!');
            StudioChatMini.userInfo.socketId = StudioChatMini.socket.id;
            var currTab = $("#studioListId a[class~=ing]");
            StudioChatMini.socket.emit('login', {
                userInfo: StudioChatMini.userInfo,
                fromPlatform : StudioChatMini.fromPlatform,
                lastPublishTime: $("#dialog_list>div:last").attr("id"),
                fUserTypeStr: currTab.attr("awr"),
                allowWhisper: currTab.attr("aw")
            });
            $(".img-loading[pf=chatMessage]").show();
        });
        //断开连接
        this.socket.on('disconnect', function (e) {
            console.log('disconnect');
            //StudioChatMini.socket.emit('login',StudioChatMini.userInfo);//重新链接
        });
        //出现异常
        this.socket.on("error", function (e) {
            console.error('e:' + e);
        });
        //信息传输
        this.socket.on('sendMsg', function (data) {
            if (!data.fromUser.toUser || data.fromUser.toUser.talkStyle != 1) {
                StudioChatMini.setContent(data, false, false);
            }
        });
        //通知信息
        this.socket.on('notice', function (result) {
            switch (result.type) {
                case 'removeMsg':
                    $("#" + result.data.replace(/,/g, ",#")).remove();
                    StudioChatMini.setTalkListScroll(false);
                    break;
                case 'pushInfo':
                    var data=result.data;
                    if(data.position==3){ //公聊框
                        StudioChatMini.talkBoxPush.initTBP(data.infos);
                    }
                    break;
            }
        });
        //信息传输
        this.socket.on('loadMsg', function (data) {
            $(".img-loading[pf=chatMessage]").hide();
            var msgData = data.msgData, isAdd = data.isAdd;
            if (!isAdd) {
                $("#content_ul").html("");
            }
            if (msgData && $.isArray(msgData)) {
                msgData.reverse();
                for (var i in msgData) {
                    StudioChatMini.formatUserToContent(msgData[i]);
                }
            }
            StudioChatMini.setTalkListScroll(true);
        });
    },
    /**
     * 聊天记录数据转换
     * @param row
     */
    formatUserToContent: function (row) {
        var fromUser = {
            userId: row.userId,
            nickname: row.nickname,
            avatar: row.avatar,
            userType: row.userType,
            groupId: row.groupId,
            clientGroup: row.clientGroup,
            publishTime: row.publishTime,
            toUser: row.toUser,
            avatar: row.avatar,
            position: row.position
        };
        StudioChatMini.setContent({fromUser: fromUser, content: row.content}, false, true);
    },

    /**
     * 公聊推送
     */
    talkBoxPush : {
        /**
         * 初始化
         * @param infos
         */
        initTBP : function(infos){
            this.clear();
            StudioChatMini.pushObj.talkPush = infos;
            this.start();
        },

        /**
         * 清空定时器，在服务器重启的时候，会重新触发notice，此时需要清空之前所有的定时器
         */
        clear : function(){
            if(StudioChatMini.pushObj.talkPushInterval){
                window.clearInterval(StudioChatMini.pushObj.talkPushInterval);
                StudioChatMini.pushObj.talkPushInterval = null;
            }
            var loc_infos = StudioChatMini.pushObj.talkPush;
            var loc_info = null;
            for(var i = 0, lenI = loc_infos.length; i < lenI; i++){
                loc_info = loc_infos[i];
                if(loc_info.timeoutId){
                    window.clearTimeout(loc_info.timeoutId);
                }
                if(loc_info.intervalId){
                    window.clearInterval(loc_info.intervalId);
                }
            }
        },

        /**
         * 启动检查定时器
         */
        start : function(){
            var loc_infos = StudioChatMini.pushObj.talkPush;
            if(loc_infos && loc_infos.length > 0){
                window.setInterval(function(){
                    StudioChatMini.talkBoxPush.check();
                },10000);
            }
        },

        /**
         * 检查所有推送任务
         */
        check : function(){
            var loc_infos = StudioChatMini.pushObj.talkPush;
            var loc_info = null;
            for(var i = 0, lenI = loc_infos.length; i < lenI; i++){
                loc_info = loc_infos[i];
                if(loc_info.startFlag){
                    continue;
                }
                if(common.dateTimeWeekCheck(loc_info.pushDate, false, StudioChatMini.serverTime)){
                    loc_info.startFlag = true;
                    window.setTimeout(StudioChatMini.talkBoxPush.delayStartTask(loc_info), (loc_info.onlineMin || 0) * 60 * 1000);
                }
            }
        },

        /**
         * 延迟启动单个定时任务
         * @param info
         */
        delayStartTask : function(info){
            return function(){
                StudioChatMini.talkBoxPush.showMsg(info);
                if(info.intervalMin && info.intervalMin > 0){
                    info.intervalId = window.setInterval(StudioChatMini.talkBoxPush.startTask(info), info.intervalMin * 60 * 1000);
                }
            };
        },

        /**
         * 启动单个推送任务
         * @param info
         * @returns {Function}
         */
        startTask : function(info){
            return function(){
                if(common.dateTimeWeekCheck(info.pushDate, false, StudioChatMini.serverTime)){
                    StudioChatMini.talkBoxPush.showMsg(info);
                }else{
                    window.clearInterval(info.intervalId);
                    info.startFlag = false;
                }
            };
        },

        /**
         * 将消息显示在公聊框
         * @param info
         */
        showMsg : function(info){
            var html = [];
            html.push('<div class="dialog push">');
            html.push(info.content);
            html.push('</div>');
            $("#dialog_list").append(html.join(""));
            StudioChatMini.setTalkListScroll(true);
        }
    }
};
// 初始化
$(function () {
    StudioChatMini.init();
});
