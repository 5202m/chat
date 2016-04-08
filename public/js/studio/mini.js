/**
 * 直播间客户端通用操作类
 * @type {{init: Function, setKindEdit: Function, setSocket: Function}}
 * author Alan.wu
 */
var studioChat = {
    blwsPlayer: null,//保利威视
    web24kPath: '',
    filePath: '',
    apiUrl: '',
    studioInfo: null,
    exStudioStr: '',//外接直播JSON字符串
    studioDate: '',//直播时间点
    serverTime: 0,//服务器时间
    hasAcLink: false,//是否存在最新的红包连接
    towMinTime: 0,//2分钟间隔时间
    verifyCodeIntervalId: null,
    teachIndex: 0,
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
        list: [],
        index: -1
    },
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
        studioChat.clientVideoTask();
        studioChat.towMinTime = studioChat.serverTime;
        setInterval(function () {
            studioChat.serverTime += 1000;
            if (studioChat.serverTime - studioChat.towMinTime >= 2 * 60 * 1000) {
                studioChat.towMinTime = studioChat.serverTime;
                studioChat.clientVideoTask();
            }
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
        var exSrc = $("#studioVideoDiv embed").attr("src");
        if (exSrc && exSrc.indexOf("yy.com") == -1) {//如果非yy直播的其他直播
            studioChat.playVideoByDate(false);
        }
    },
    /**按直播时间播放
     * @param isBackStudio 返回直播
     * 备注：按时间点播放yy视频,不符合时间点直接播放视频
     */
    playVideoByDate: function (isBackStudio) {
        //如果是在看教学视频则直接返回
        if (studioChat.video.index > 0) {
            return;
        }
        if (common.dateTimeWeekCheck(this.studioDate, true, studioChat.serverTime)) {//直播时间段，则播放直播
            this.setVideo(true);
        } else {//非直播时段，检查是否有其他直播，有则播放其他直播，没有则播放教学视频
            var hasExStudio = false;
            if (common.isValid(this.exStudioStr)) {
                var exObj = JSON.parse(this.exStudioStr), row = null;
                for (var index in exObj) {
                    row = exObj[index];
                    if (common.dateTimeWeekCheck(row.studioDate, true, studioChat.serverTime) && common.isValid(row.srcUrl)) {
                        studioChat.setStudioVideoDiv(row.srcUrl);
                        hasExStudio = true;
                        break;
                    }
                }
            }
            if (!hasExStudio) {//非返回直播以及不存在外接直播则播放教学视频
                if (!isBackStudio) {
                    studioChat.video.index = common.randomIndex(studioChat.video.list.length);
                    studioChat.setVideo(false,studioChat.video.list[studioChat.video.index]);
                } else {
                    this.setVideo(true);
                }
            }
        }
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
     */
    setStudioVideoDiv: function (url) {
        if (window.SewisePlayer) {//停播放教学视频
            SewisePlayer.doStop();
            $("#tvDivId").hide();
            $("#studioTeachId a").removeClass("on");
        }
        //已经是直播相同内容无需切换
        if ($("#stVideoDiv:visible").length > 0 && $("#studioVideoDiv embed").attr("src") == url) {
            return;
        }
        $("#stVideoDiv .img-loading").fadeIn(0).delay(2000).fadeOut(200);
        $("#studioVideoDiv embed").remove();
        $(studioChat.getEmbedDom(url)).appendTo('#studioVideoDiv');
        $("#stVideoDiv").show();
        studioChat.initStudio = true;
    },
    /**
     * 设置视频
     * @param isYy
     * @param video
     */
    setVideo: function (isYy, video) {
        try {
            if (isYy) {
                if(!this.studioInfo.url){
                    var yc = this.studioInfo.yyChannel, mc = this.studioInfo.minChannel;
                    this.studioInfo.url = 'http://yy.com/s' + (common.isValid(yc) ? '/' + yc : '') + (common.isValid(mc) ? '/' + mc : '') + '/yyscene.swf';
                }
                studioChat.setStudioVideoDiv(this.studioInfo.url);
            } else {
                $("#tvDivId").show();
                $("#stVideoDiv").hide();
                $("#studioVideoDiv embed").remove();
                $("#tVideoDiv .img-loading").fadeIn(0).delay(2000).fadeOut(200);
                var vUrl = video.url, title = video.title;
                if (vUrl.indexOf(".html") != -1) {
                    $("#tVideoDiv").append('<iframe frameborder=0 width="100%" src="' + vUrl + '" allowfullscreen></iframe>');
                } else {
                    if (vUrl.indexOf("type=blws") != -1) {
                        var vidParams = vUrl.split("&");
                        if (vidParams.length > 1) {
                            var vid = vidParams[1].replace(/^vid=/g, '');
                            if (studioChat.blwsPlayer) {
                                studioChat.blwsPlayer.changeVid(vid);
                            } else {
                                studioChat.blwsPlayer = polyvObject('#tVideoDiv').videoPlayer({
                                    width: '100%',
                                    height: '100%',
                                    'vid': vid,
                                    'flashvars': {"autoplay": "0", "setScreen": "fill"},
                                    onPlayOver: function (id) {
                                        $("#tVideoCtrl").show();
                                        $("#tVideoCtrl div.video_ad").show();
                                        var loc_mtop = $("#tVideoCtrl a.ad").is(":hidden") ? "-68px" : "-150px";
                                        $("#tVideoCtrl div.vcenter").css("margin-top", loc_mtop);
                                    },
                                    onPlayStart: function () {
                                        $("#tVideoCtrl").hide();
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
                            var checkOverFunc = function () {
                                if (!window.SewisePlayer) {
                                    window.setTimeout(checkOverFunc, 500);
                                    return;
                                }
                                SewisePlayer.onPause(function (id) {
                                    window.setTimeout(function () {
                                        if (SewisePlayer.duration() <= SewisePlayer.playTime()) {
                                            $("#tVideoCtrl").show();
                                        }
                                    }, 1000);
                                });
                                SewisePlayer.onStart(function () {
                                    $("#tVideoCtrl").hide();
                                });
                            };
                            checkOverFunc();
                        }
                    }
                }
                if ($(".window-container #studioVideoDiv").length > 0) {
                    $(".vopenbtn[t=v]").click();
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
                for (var i in data) {
                    row = data[i];
                    if(row.mediaUrl){
                        studioChat.video.list.push({
                            title : row.detailList[0].title,
                            id : row._id,
                            type : ((common.isValid(row.mediaUrl) && row.mediaUrl.indexOf('.mp4') != -1) ? 'mp4' : ''),
                            url : row.mediaUrl
                        });
                    }
                }
            }
            studioChat.playVideoByDate(false);
        });
    },
    /**
     * 事件设置
     */
    setEvent: function () {
        /**
         * 返回直播
         */
        $(".vbackbtn").click(function () {
            studioChat.playVideoByDate(true);
            if ($(".window-container #tVideoDiv").length > 0) {//如果教学视频打开弹框切直播
                $(".vopenbtn[t=s]").click();
            }
        });
    },
    /**
     * 设置列表滚动条
     */
    setListScroll: function (domClass) {
        if ($(domClass).hasClass("mCustomScrollbar")) {
            $(domClass).mCustomScrollbar("update");
        } else {
            $(domClass).mCustomScrollbar({theme: "minimal-dark"});
        }
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
            obj.mCustomScrollbar({scrollInertia: 1, scrollButtons: {enable: true}, theme: "light-2"});
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
            $("#" + data.uiId).remove();
            studioChat.openLoginBox();
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
        if (!isMeSend && studioChat.userInfo.userId == fromUser.userId && data.serverSuccess) {//发送成功，则去掉加载框，清除原始数据。
            $('#' + data.uiId + ' .dtime').html(studioChat.formatPublishTime(fromUser.publishTime));
            $('#' + data.uiId).attr("id", fromUser.publishTime);//发布成功id同步成服务器发布日期
            return;
        }
        var dialog = studioChat.formatContentHtml(data, isMeSend, isLoadData);
        var list = $("#dialog_list");
        list.append(dialog);
        this.formatMsgToLink(fromUser.publishTime);//格式链接
        if (!isLoadData) {
            studioChat.setTalkListScroll(true);
        }
    },
    /**
     * 格式内容栏
     */
    formatContentHtml: function (data, isMeSend, isLoadData) {
        var cls = 'dialog ', pHtml = '', dtHtml = '', loadHtml = '', dialog = '', uName = 'uname ', isMe = 'false',
            fromUser = data.fromUser,
            content = data.content,
            nickname = fromUser.nickname;
        var toUser = fromUser.toUser, toUserHtml = '';
        if (toUser && common.isValid(toUser.userId)) {
            toUserHtml = '<span class="txt_dia" uid="' + toUser.userId + '" utype="' + toUser.userType + '">@<label>' + toUser.nickname + '</label></span>';
            if (studioChat.userInfo.userId == toUser.userId) {
                isMe = 'true';
            }
        }
        pHtml = content.value;
        if (studioChat.userInfo.userId == fromUser.userId) {
            cls += 'mine';
            nickname = '我';
            isMe = 'true';
        } else {
            if (fromUser.userType == 2) {
                cls += 'analyst';
            }
            if (fromUser.userType == 1) {
                cls += 'admin';
            }
            dialog = studioChat.getDialogHtml(fromUser.userId, nickname, fromUser.userType);
            if (!isLoadData && toUser) {
                if (studioChat.userInfo.userId == toUser.userId) {
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
        var html = '<div class="' + cls + '" id="' + fromUser.publishTime + '" isMe="' + isMe + '" utype="' + fromUser.userType + '" mType="' + content.msgType + '" t="header"><a href="javascript:" class="headimg" uid="' + fromUser.userId + '">' + studioChat.getUserAImgCls(fromUser.clientGroup, fromUser.userType, fromUser.avatar) + '</a><i></i>' +
            '<p><a href="javascript:"  class="' + uName + '">' + nickname + '</a><span class="dtime">' + studioChat.formatPublishTime(fromUser.publishTime) + '</span><span class="dcont">' + toUserHtml + pHtml + '</span></p>' + dialog + '</div>';
        return html;
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
     * @param clientGroup
     */
    getUserAImgCls: function (clientGroup, userType, avatar) {
        var aImgCls = '';
        if (userType && userType != 0 && common.isValid(avatar)) {
            return '<img src="' + avatar + '">';
        } else if ("vip" == clientGroup) {
            aImgCls = "user_v";
        } else if ("real" == clientGroup) {
            aImgCls = "user_r";
        } else if ("simulate" == clientGroup) {
            aImgCls = "user_d";
        } else if ("register" == clientGroup) {
            aImgCls = "user_m";
        } else {
            aImgCls = "user_c";
        }
        return '<img src="images/studio/' + aImgCls + '.png">';
    },
    /**
     * 提取对话html
     * @param userId
     * @param nickname
     * @param userType
     * @returns {string}
     */
    getDialogHtml: function (userId, nickname, userType) {
        if (userId && studioChat.userInfo.userId != userId) {
            var hasMainDiv = false, gIdDom = $("#studioListId a[class~=ing]"), mainDiv = '<div class="dialogbtn" style="display:none;" nk="' + nickname + '" uid="' + userId + '" utype="' + userType + '">';
            if (studioChat.userInfo.userId.indexOf('visitor_') == -1 && userId.indexOf('visitor_') == -1) {
                mainDiv += '<a href="javascript:" class="d1" t="0"><span>@TA</span></a>';
                hasMainDiv = true;
            }
            if (gIdDom.attr("aw") == "true" && common.containSplitStr(gIdDom.attr("awr"), userType)) {
                mainDiv += '<a href="javascript:" class="d2" t="1"><span>私聊</span></a>';
                hasMainDiv = true;
            }
            return hasMainDiv ? mainDiv + "</div>" : '';
        } else {
            return '';
        }
    },
    /**
     * 设置socket
     */
    setSocket: function () {
        this.socket = common.getSocket(io, this.socketUrl, this.userInfo.groupType);
        //建立连接
        this.socket.on('connect', function () {
            console.log('connected to server!');
            studioChat.userInfo.socketId = studioChat.socket.id;
            var currTab = $("#studioListId a[class~=ing]");
            studioChat.socket.emit('login', {
                userInfo: studioChat.userInfo,
                lastPublishTime: $("#dialog_list>div:last").attr("id"),
                fUserTypeStr: currTab.attr("awr"),
                allowWhisper: currTab.attr("aw")
            });
            $(".img-loading[pf=chatMessage]").show();
        });
        //断开连接
        this.socket.on('disconnect', function (e) {
            console.log('disconnect');
            //studioChat.socket.emit('login',studioChat.userInfo);//重新链接
        });
        //出现异常
        this.socket.on("error", function (e) {
            console.error('e:' + e);
        });
        //信息传输
        this.socket.on('sendMsg', function (data) {
            if (!data.fromUser.toUser || data.fromUser.toUser.talkStyle != 1) {
                studioChat.setContent(data, false, false);
            }
        });
        //通知信息
        this.socket.on('notice', function (result) {
            switch (result.type) {
                case 'removeMsg':
                    $("#" + result.data.replace(/,/g, ",#")).remove();
                    studioChat.setTalkListScroll(false);
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
                    studioChat.formatUserToContent(msgData[i]);
                }
            }
            studioChat.setTalkListScroll(true);
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
        studioChat.setContent({fromUser: fromUser, content: row.content}, false, true);
    }
};
// 初始化
$(function () {
    studioChat.init();
});