/**
 * 直播间客户端通用操作类
 * @type {{init: Function, setKindEdit: Function, setSocket: Function}}
 * author Alan.wu
 */
var studioChat={
    blwsPlayer:null,//保利威视
    web24kPath:'',
    filePath:'',
    apiUrl:'',
    syllabusData:null,//直播课程对象
    isNeverLogin:false,//是否首次访问
    serverTime:0,//服务器时间
    hasAcLink:false,//是否存在最新的红包连接
    towMinTime:0,//2分钟间隔时间
    verifyCodeIntervalId:null,
    pushObj:{
        whPush : {},   //私聊推送信息
        talkPush : [], //聊推送消息
        talkPushInterval : null
    },
    teachIndex:0,
    //信息类型
    msgType:{
        text:'text' ,
        img:'img',
        file:'file'
    },
    socket:null,
    socketUrl:'',
    userInfo:null,
    initStudio:false,
    init:function(){
        this.serverTimeUp();
        this.setVisitStore();//设置访客存储
        this.setSocket();//设置socket连接
        this.setVideoList();//设置视频列表
        this.setAdvertisement();//设置广告
        this.setEvent();//设置各种事件
        this.setScrollNotice();//设置滚动走马灯
        this.setPrice();//设置行情报价
    },
    /**
     * 服务器时间更新
     */
    serverTimeUp:function(){
        studioChat.setRPacket(true);
        studioChat.clientVideoTask();
        studioChat.towMinTime=studioChat.serverTime;
        setInterval(function(){
            studioChat.serverTime+=1000;
            studioChat.setRPacket(false);
            if(studioChat.serverTime-studioChat.towMinTime>=2*60*1000){
                studioChat.towMinTime=studioChat.serverTime;
                studioChat.clientVideoTask();
            }
        },1000);//每秒一次
    },
    /**
     * 提取时间计算
     * @param i
     * @returns {*}
     */
    getTimeCal:function(i){
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    },
    /**
     * 提取红包连接
     */
    getAcLink:function(callback){
        try{
            common.getJson("/studio/getAcLink",null,function(result){
                if(result){
                    $("body").data("acLink",{url:result.activityUrl,endTime:result.activityEnd,overTime:result.activityOverTime});
                    if(result.activityOverTime && result.activityOverTime>studioChat.serverTime){
                        $('.redbag').show();
                    }else{
                        $('.redbag').hide();
                    }
                    callback(true);
                }
            },true,function(err){
                console.error("getAcLink error,please check it!"+err);
            });
        }catch(e){
            console.error("getAcLink error,please check it!"+e);
        }
    },
    /**
     * 打开红包
     * @param hd
     * @param bm
     */
    openPacket:function(hd,bm){
        $('.redbag').addClass('on');
        $('.redbag_ad').css({width: '0'});
        $("#shinebg").rotate({
            angle:0,
            duration: 5000,
            animateTo: 360,
            easing:0
        });
        hd.text("红包");
        var acLink= $("body").data("acLink");
        bm.removeClass("time").html('<a href="'+(acLink && common.isValid(acLink.url)?acLink.url:'javasrcipt:')+'" target="_blank" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'packet_click\',\'红包点击\']);">&nbsp;&nbsp;拆&nbsp;&nbsp;</a>');
    },
    /**
     * 设置红包
     */
    setRPacket:function(isInit){
        var currDate=new Date(studioChat.serverTime);
        if(currDate.getDay()==0||currDate.getDay()==6){
            return;
        }
        if(isInit){
            //红包事件
            $('.redbag .redbag_cont').hover(function(){
                if(!$(".redbag").hasClass("on")){
                    $('.redbag_ad').animate({width: '199px'},800);
                }
            },function(){
                if(!$(".redbag").hasClass("on")) {
                    $('.redbag_ad').animate({width: '0'}, 800);
                }
            });
            //红包关闭事件
            $(".redbag .rb_close").click(function(){
                $(".redbag").hide();
            });
            //提取链接
            this.getAcLink(function(){
                studioChat.setRPacket(false);
            });
        }else{
            var isStudioTime=common.dateTimeWeekCheck(studioChat.studioDate, true,studioChat.serverTime);//直播时段
            var hms=common.getHHMMSS(studioChat.serverTime),bm=$(".redbag_box .redbag_cont b"),hd=$(".redbag_box .redbag_cont h4");
            var difLen= 0,fiften=(hms>='14:45:00' && hms<'15:15:00'),threeTen=(hms>='20:00:00' && hms<'20:30:00')||(hms>='21:00:00' && hms<'21:30:00');
            if(isStudioTime && ((hms>='09:30:00'&& hms<'10:00:00')||fiften||threeTen)){
                hd.text("红包");
                var sd=new Date(studioChat.serverTime);
                if(fiften){
                    difLen=15;
                }
                if(threeTen){
                    difLen=30;
                }
                var ts = new Date(sd.getFullYear(), sd.getMonth(),sd.getDate(), (sd.getHours()+1),difLen, 0).getTime() - studioChat.serverTime;//计算剩余毫秒数
                var mm = this.getTimeCal(parseInt(ts / 1000 / 60 % 60, 10)),ss = this.getTimeCal(parseInt(ts / 1000 % 60, 10));//计算剩余秒数
                bm.addClass("time").text(mm+":"+ss);
            }else if(isStudioTime && ((hms>='10:00:00' && hms<'10:01:00')||(hms>='15:15:00'&& hms<'15:16:00')||(hms>='20:30:00' && hms<'20:31:00')||(hms>='21:30:00' && hms<'21:31:00'))){
                var acLink= $("body").data("acLink");
                if(!acLink ||common.isBlank(acLink.url)||(common.isValid(acLink.endTime) && Number(acLink.endTime)<=studioChat.serverTime)){
                    if(!studioChat.hasAcLink){//不存在新的红包连接，重新提取
                        studioChat.getAcLink(function(){
                            studioChat.openPacket(hd,bm);
                        });
                        studioChat.hasAcLink=true;
                    }
                }else{
                    studioChat.hasAcLink=true;
                    studioChat.openPacket(hd,bm);
                }
            }else{
                studioChat.hasAcLink=false;
                $("#shinebg").stopRotate();
                $("#shinebg").attr("style","");
                $('.redbag').removeClass('on');
                bm.removeClass("time");
                hd.text("下一轮");
                if(hms>='21:31:00'){
                    bm.text("10:00");
                }else if(hms>='20:31:00'){
                    bm.text("21:30");
                }else if(hms>='15:16:00'){
                    bm.text("20:30");
                }else if(hms>='10:01:00'){
                    bm.text("15:15");
                }else{
                    bm.text("10:00");
                }
            }
        }
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
            $("#contentText").attr("contenteditable",false).append('<span style="margin:15px 5px;">亲，<a href="javascript:;" onclick="studioChat.openLoginBox();" style="text-decoration: underline;color:#3F51B5;cursor: pointer;">登录</a>&nbsp;&nbsp;后可以发言哦~</span>');//设置登录后发言
        }else{
            obj.loginId=this.userInfo.userId;
            store.set(key,obj);
            $("#contentText").html("").attr("contenteditable",true);
        }
        this.isNeverLogin=!common.isValid(obj.loginId);
    },
    /**
     * 显示两个cs用户
     */
    showTwoCS:function(){
        $(".cm_wrap a").each(function(index, domEle){
            if(index<=1){
                $(domEle).show();
            }else{
                $(domEle).hide();
            }
        });
    },
    /**
     *
     * 允许私聊
     * @returns {boolean}
     */
    isAllowWh:function(){
        return "true"==$("#studioListId a[class~=ing]").attr("aw");
    },
    /**
     * 设置客服经理列表
     */
    setCSList:function() {
        if(!this.isAllowWh()){
            return;
        }
        try{
            $.getJSON('/studio/getCS',{groupId:this.userInfo.groupId},function(data){
                if(data && data.length>0){
                    $(".cmtalk").show();
                    $(".cm_wrap").html("");
                    var csHtml='';
                    for(var i in data){
                        csHtml='<a href="javascript:" uid="'+data[i].userNo+'" class="cm_item"><img src="'+(common.isValid(data[i].avatar)?data[i].avatar:'/images/studio/cm.png')+'"><span>'+data[i].userName+'</span></a>';
                        if($("#userListId li[id="+data[i].userNo+"]").length>0){
                            $(".cm_wrap").prepend(csHtml);
                        }else{
                            $(".cm_wrap").append(csHtml);
                            $(".cm_wrap a[uid="+data[i].userNo+"] img").addClass("have_op");
                        }
                    }
                    studioChat.showTwoCS();//只显示两个CS
                    $(".cm_wrap a").click(function(){//点击客户经理
                        var userId=$(this).attr("uid");
                        studioChat.closeWhTipMsg(userId);
                        studioChat.fillWhBox(3,userId,$(this).find("span").text(),false);
                        studioChat.setWhAvatar(3,userId,$(this).find("img").attr("src"));
                        studioChat.getWhBox().show();
                        $('.mult_dialog a[uid='+userId+']').click();
                    });
                }
                if($(".cm_wrap a").length>2){//多于2个，则控制左右切换
                    $(".cm_prev,.cm_next").show().click(function(){
                        if($(this).hasClass("cm_next")){
                            var next=$(".cm_wrap a:not(:hidden):last").next();
                            if(next.length>0){
                                $(".cm_wrap a:not(:hidden):first").hide();
                                next.show();
                            }
                        }else{
                            var first=$(".cm_wrap a:not(:hidden):first").prev();
                            if(first.length>0){
                                $(".cm_wrap a:not(:hidden):last").hide();
                                first.show();
                            }
                        }
                    });
                }else{
                    $(".cmtalk").css({"margin-left":"5px"});
                    $(".cm_prev,.cm_next").hide();
                }
            });
        }catch (e){
            $(".cmtalk").hide();
            console.error("setCSList->"+e);
        }
    },
    /**
     * 客户端视频任务
     */
    clientVideoTask:function(){
        var exSrc=$("#studioVideoDiv embed").attr("src");
        if((exSrc && exSrc.indexOf("yy.com")==-1) && ($("#studioVideoDiv").find("object").length==0)){//如果非主直播的其他直播
            studioChat.playVideoByDate(false);
        }
    },
    /**按直播时间播放
     * @param isBackStudio 返回直播
     * 备注：按时间点播放yy视频,不符合时间点直接播放视频
     */
    playVideoByDate:function(isBackStudio){
       //如果是在看教学视频则直接返回
      if($("#studioTeachId a[class=on]").length>0) {
           return;
      }
      var course=common.getSyllabusPlan(this.syllabusData,this.serverTime);
      if(!course||course.status==0||common.isBlank(course.studioLink)||course.isNext){
          if(isBackStudio){
              alert("目前还没有视频直播，详情请留意直播间课程表！");
          }else{
              this.playMp4Vd();
          }
          return;
      }
      if(course.courseType==1||course.courseType==2){//直播时间段，则播放直播
            this.setStudioVideoDiv(course.studioLink);
      }else{//非直播时段则播放教学视频
            if(!isBackStudio){
                this.playMp4Vd();
                if(course.courseType==0){
                    if(window.SewisePlayer){//停播放教学视频
                        SewisePlayer.doStop();
                        $("#studioTeachId a").removeClass("on");
                    }
                }
            }else{
                this.setStudioVideoDiv(course.studioLink);
            }
      }
    },
    /**
     *随机播放MP4视频
     */
    playMp4Vd:function(){
        if($("#studioTeachId a[class=on]").length<=0){
            var mpDom=$("#studioTeachId li a[t=mp4]");
            if(mpDom.length<=0){
                $("#studioTeachId li:first a").click();
            }else{
                var vdom=$(mpDom.get(common.randomIndex(mpDom.length)));
                vdom.click();
                $(".videolist_box").mCustomScrollbar("scrollTo", "#"+vdom.attr("id"));
            }
        }
    },
    /**
     * 提取embed对应的dom
     * @param url
     */
    getEmbedDom:function(url){
      return '<embed src="'+url+'" autostart="true" wmode="Opaque" quality="high" width="100%" height="100%" align="middle" allowScriptAccess="never" allowFullScreen="true" mode="transparent" type="application/x-shockwave-flash"></embed>';
    },
    /**
     * 设置直播视频
     * @param url
     */
    setStudioVideoDiv:function(url){
        $("#tvDivId").hide();
        if(window.SewisePlayer){//停播放教学视频
            SewisePlayer.doStop();
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
            if($("#stVideoDiv:visible").length>0 &&  $("#studioVideoDiv embed").attr("src")==url){
                return;
            }
            $("#stVideoDiv .img-loading").fadeIn(0).delay(2000).fadeOut(200);
            $("#studioVideoDiv embed").remove();
            $(studioChat.getEmbedDom(url)).appendTo('#studioVideoDiv');
        }
        $("#stVideoDiv").show();
        if(!studioChat.initStudio && studioChat.isNeverLogin){
            $(".guide1").show().find(".gclose").click(function(){
                $(".guide1").hide();
            });
        }
        studioChat.initStudio=true;
    },
    /**
     * 设置视频
     * @param isStudio 是否直播
     * @param thisDom
     * @param studioUrl
     */
    setVideo:function(thisDom){
        try{
            $("#tvDivId").show();
            $("#stVideoDiv").hide();
            $("#studioVideoDiv").html("");
            $("#tVideoDiv .img-loading").fadeIn(0).delay(2000).fadeOut(200);
            var vUrl=thisDom.attr("vUrl"),title=thisDom.text();
            if(vUrl.indexOf(".html")!=-1){
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
            }else{
                $("#tVideoDiv iframe").remove();
                $("#tVideoDiv div").show();
                if(vUrl.indexOf("type=blws")!=-1){
                    var vidParams=vUrl.split("&");
                    if(vidParams.length>1){
                        var vid=vidParams[1].replace(/^vid=/g,'');
                        if(studioChat.blwsPlayer){
                            studioChat.blwsPlayer.changeVid(vid);
                        }else{
                            studioChat.blwsPlayer = polyvObject('#tVideoDiv').videoPlayer({
                                width:'100%',
                                height:'100%',
                                'vid' : vid,
                                'flashvars' : {"autoplay":"0","setScreen":"fill"},
                                onPlayOver:function(id){
                                    $("#tVideoCtrl").show();
                                    $("#tVideoCtrl div.video_ad").show();
                                    var loc_mtop = $("#tVideoCtrl a.ad").is(":hidden") ? "-68px" : "-150px";
                                    $("#tVideoCtrl div.vcenter").css("margin-top", loc_mtop);
                                },
                                onPlayStart:function(){
                                    $("#tVideoCtrl").hide();
                                }
                            });
                        }
                    }
                }else{
                    if(window.SewisePlayer){
                        SewisePlayer.toPlay(vUrl, title, 0, true);
                    }else{
                        var srcPathAr=[];
                        srcPathAr.push("/js/lib/sewise.player.min.js?server=vod");
                        srcPathAr.push("type="+(vUrl.indexOf(".flv")!=-1?'flv':'mp4'));
                        srcPathAr.push("videourl="+vUrl);
                        srcPathAr.push("autostart=true");
                        srcPathAr.push("title="+title);
                        srcPathAr.push("buffer=5");
                        /*srcPathAr.push("skin=vodWhite");*/
                        var srcPath =srcPathAr.join("&") ;
                        var script = document.createElement('script');
                        script.type = "text/javascript";
                        script.src = srcPath;
                        $("#tVideoDiv").get(0).appendChild(script);
                        if(studioChat.isNeverLogin){//游客则弹出注册引导
                            $(".guide2").show().find(".gclose").click(function(){
                                $(".guide2").hide();
                            });
                        }
                        //轮播控制
                        var checkOverFunc = function(){
                            if(!window.SewisePlayer){
                                window.setTimeout(checkOverFunc, 500);
                                return;
                            }
                            SewisePlayer.onPause(function(id){
                                window.setTimeout(function(){
                                    if(SewisePlayer.duration() <= SewisePlayer.playTime()) {
                                        $("#tVideoCtrl").show();
                                        $("#tVideoCtrl div.video_ad").show();
                                        var loc_mtop = $("#tVideoCtrl a.ad").is(":hidden") ? "-68px" : "-150px";
                                        $("#tVideoCtrl div.vcenter").css("margin-top", loc_mtop);
                                    }
                                }, 1000);
                            });
                            SewisePlayer.onStart(function(){
                                $("#tVideoCtrl").hide();
                            });
                        };
                        checkOverFunc();
                    }
                }
            }
            if($(".window-container #studioVideoDiv").length>0){
                $(".vopenbtn[t=v]").click();
            }
        }catch(e){
            console.error("setVideo has error:"+e);
        }
    },
    /**
     * 提取uiId,用于标记记录的id，信息发送成功后取发布日期代替
     */
    getUiId:function(){
        var currentDate=new Date();
        return currentDate.getTime()+"_ms";
    },
    /**
     * 设置价格
     */
    setPrice:function(){
        getAllMarketpriceIndex("ws://kdata.gwfx.com:8087/websocket.do","service=HqDataWebSocketService&method=pushMarketprice&symbol=XAGUSD|XAUUSD|USDX|CLWTI&dataType=simpleMarketPrice","http://kdata.gwfx.com:8099/gateway.do?service=HqDataService&method=getMarkrtPriceDataFromCache", {downCss:"red",upCss:'green'});
        $(".pro_notice").slide({
                titCell: ".num ul",
                mainCell: ".pro_box",
                effect: "fade",
                autoPlay: true,
                delayTime: 800,
                interTime: 5000,
                autoPage: false,
                prevCell: ".pro_prev",
                nextCell: ".pro_next"
        });
    },
    /**
     * 提取咨询信息
     * @param type1
     * @param type2
     * @param pageSize
     */
    getNewsInfoList:function(type1,type2,pageSize,callback){
        try{
            var  pageSizeTmp=pageSize||5;
            //备注 contentType->2:即时资讯;3:专业评论
            $.getJSON(this.apiUrl+'/getNewsInfoList',{pageNo:1,pageSize:pageSizeTmp,lang:'zh',contentType1:type1,contentType2:type2}).done(function(data){
                //console.log("getNewsInfoList->data:"+JSON.stringify(data));
                callback(data);
            });
        }catch (e){
            console.error("getNewsInfoList->"+e);
        }
    },
    /**
     * 设置滚动走马灯
     */
    setScrollNotice:function(){
        this.getNewsInfoList(2,null,3,function(data){
            $(".sro_list").html("");
            var info=null;
            if(data && (info=data.informations).result==0){
                var list=info.informationList,row=null;
                for(var i in list){
                    row=list[i];
                    $(".sro_list").append('<li><i></i><a href="'+studioChat.web24kPath+('/zh/news/'+row.id+'.html')+'" target="_blank" style="color:#ffffff;"><span>'+row.title+'</span></a></li>');
                }
                $(".sro_notice").slide({ mainCell:".sro_list" , effect:"topLoop", autoPlay:true, delayTime:600 ,interTime:3000, autoPage: false});
            }else{
                console.error("提取数据有误！");
            }
        });
    },
    /**
     * 设置资讯或专业评论
     */
    setNewsInfo:function(domId,type1,type2,pageSize){
        $(domId).html("");
        this.getNewsInfoList(type1,type2,pageSize,function(data){
            var info=null;
            if(data && (info=data.informations).result==0){
                var list=info.informationList,row=null;
                for(var i in list){
                    row=list[i];
                    $(domId).append('<li><a href="'+studioChat.web24kPath+'/zh/goldreview/'+row.id+'_'+row.contenttype2+'.html" target="_blank"><span class="ndate">'+row.datestr+'</span>'+row.title+'</a></li>');
                }
                $(domId).append('<li><a href="'+studioChat.web24kPath+'/zh/goldreview/goldreviewlist_'+type2+'.html" target="_blank" class="listmore">更多</a></li>');
            }else{
                console.error("提取数据有误！");
            }
        });
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
            $.getJSON('/studio/getArticleList',{authorId:common.trim(authorId),code:code,platform:platform,hasContent:hasContent,pageNo:curPageNo,pageSize:pageSize,orderByStr:orderByStr},function(data){
                //console.log("getArticleList->data:"+JSON.stringify(data));
                callback(data);
            });
        }catch (e){
            console.error("getArticleList->"+e);
            callback(null);
        }
    },
    /**
     * 设置视频
     */
    setVideoList:function(){
        $(".img-loading[pf=studioTeachId]").show();
        this.getArticleList("teach_video",this.userInfo.groupId,0,1,100,'{"sequence":"desc"}',null,function(dataList){
           $("#studioTeachId").html("");
           $(".img-loading[pf=studioTeachId]").hide();
           if(dataList && dataList.result==0){
               var data=dataList.data;
               var row=null;
               for(var i in data){
                   row=data[i].detailList[0];
                   $("#studioTeachId").append('<li><a title="' + row.title + '" href="javascript:" id="'+data[i]._id+'" t="'+((common.isValid(data[i].mediaUrl) && data[i].mediaUrl.indexOf('.mp4')!=-1)?'mp4':'')+'" vUrl="'+data[i].mediaUrl+'" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'video_play\',$(this).text()]);"><i></i>'+row.title+'</a></li>');
               }
               //播放视频
               $("#studioTeachId li a").click(function(){
                   $("#studioTeachId li a.on").removeClass("on");
                   $(this).addClass("on");
                   studioChat.setVideo($(this));
               });
               studioChat.setListScroll(".videolist_box");
           }
            studioChat.playVideoByDate(false);
       });
    },
    /**
     * 设置广告
     */
    setAdvertisement:function(){
        //设置弹出广告
        if(studioChat.isNeverLogin){
            //设置主页广告
            $(".blackbg").show();
            $("#main_ad_box").css({background:"url(/images/studio/ban_new.jpg) 0 0 no-repeat"}).show();
            $("#main_ad_box .pop_close").click(function(){
                $("#main_ad_box").hide();
                $(".blackbg").hide();
            });
        }else{
            $(".blackbg").show();
            $("#act_ad_box").css({background:"url(/images/studio/ban_act.png) 0 0 no-repeat"}).show();
            $("#act_ad_box .pop_close").click(function(){
                $("#act_ad_box").hide();
                $(".blackbg").hide();
            });
        }
        //设置视频广告
        this.getArticleList("video_advertisement",this.userInfo.groupId,0,1,1,'{"createDate":"desc"}',null,function(dataList){
            var loc_elem = $("#tVideoCtrl a.ad");
            if(dataList && dataList.result==0 && dataList.data && dataList.data.length === 1){
                var loc_ad=dataList.data[0];
                loc_elem.attr("href", loc_ad.linkUrl || "javascript:void(0);");
                loc_elem.find("img").attr("src", loc_ad.mediaUrl);
            }else{
                //每次暂停会show div.video_ad广告块，所以需要设置子块隐藏
                loc_elem.hide();
                loc_elem.next().hide();
            }
        });
    },
    /**
     * 通过默认房间刷新对应页面
     * @param defId
     */
    toRefreshView:function(){
        window.location.reload();
    },
    /**
     *
     * @param tId
     */
    setVerifyCodeTime:function(tId){
        var t=parseInt($(tId).attr("t"))||60;
        if(!studioChat.verifyCodeIntervalId){
            studioChat.verifyCodeIntervalId=setInterval("studioChat.setVerifyCodeTime('"+tId+"')",1000);
        }
        if(t>1){
            $(tId).attr("t",t-1).html((t-1)+"秒后重新获取");
        }else{
            clearInterval(studioChat.verifyCodeIntervalId);
            studioChat.verifyCodeIntervalId="";
            $(tId).attr("t",60).html("获取验证码").addClass("pressed");
        }
    },
    /**
     *
     * 设置视频广告事件
     */
    setVdEvent:function(){
        /**
         * 视频广告关闭
         */
        $("#tVideoCtrl a.close_ad").bind("click", function(){
            $("#tVideoCtrl div.vcenter").css("margin-top", "-68px");
            $("#tVideoCtrl div.video_ad").hide();
        });
        /**
         * 视频广告，重播
         */
        $("#tVideoCtrl div.replay a").bind("click", function(){
            var loc_nextDom = $("#studioTeachId li a.on");
            loc_nextDom.trigger("click");
        });

        /**
         * 视频广告，下一集
         */
        $("#tVideoCtrl div.nextbtn a").bind("click", function(){
            var loc_nextDom = $("#studioTeachId li a.on").parent().next();
            if (loc_nextDom.size() === 0) {
                loc_nextDom = $("#studioTeachId li:first");
            }
            loc_nextDom.find("a").trigger("click");
        });
        //重设返回直播事件
        $(".vbackbtn").click(function(){
            $("#studioTeachId a[class=on]").removeClass("on");
            studioChat.playVideoByDate(true);
            if($(".window-container #tVideoDiv").length>0){//如果教学视频打开弹框切直播
                $(".vopenbtn[t=s]").click();
            }
        });
    },
    /**
     * 播放教学视频
     */
    doPlayTeachVideo:function(){
        if(window.SewisePlayer && SewisePlayer.duration()> SewisePlayer.playTime()) {
            SewisePlayer.doPlay();
        }
    },
    /**
     * 设置私聊框
     * @param isHide
     */
    setWhBox:function(isHide){
        if(isHide){
            $("#newMsgShowBtn").attr("t","hide");
        }
        $("#newMsgTipBtn").click();
    },
    /**
     * 设置私聊提示信息
     * @param userType
     * @param nkLabel
     * @param userId
     */
    setWhTipInfo:function(userType,nkLabel,userId){
        if(userId){
            $("#newMsgTipBtn").attr("uid",userId);
        }
        $(".pletter_hint p span").html((3==userType?"客户经理":"")+nkLabel+"发来了一条私聊信息");
        $(".pletter_hint").show();
    },
    /**
     * 发送私聊信息
     * @param msg
     */
    sendWhMsg:function(txtObj){
        var msg = studioChat.getSendMsg(txtObj);
        if(msg === false){
            return;
        }
        var sendObj={uiId:studioChat.getUiId(),fromUser:studioChat.userInfo,content:{msgType:studioChat.msgType.text,value:msg}};
        var liDom=$('.mult_dialog a[class=on]');
        var uid=liDom.attr("uid");
        sendObj.fromUser.toUser={userId:uid,nickname:liDom.find("label").text(),talkStyle:1,userType:liDom.attr("utype")};
        var diaDom=$('#wh_msg_'+uid+' .dialog:last'),questionDom=diaDom.find(".whblt");
        if(questionDom.length>0){
            sendObj.fromUser.toUser.question=questionDom.html();
            sendObj.fromUser.toUser.questionId=questionDom.attr("rid");
            sendObj.fromUser.toUser.publishTime=diaDom.attr("id");
        }
        studioChat.socket.emit('sendMsg',sendObj);//发送数据
        studioChat.setWhContent(sendObj,true,false);//直接把数据填入内容栏
        txtObj.html("");//清空内容
    },
    /**
     * 设置在线提示
     * @param toUserId
     * @param isOnline
     */
    setWhOnlineTip:function(toUserId,isOnline){
        var liDom=$('#wh_msg_'+toUserId+' .tit strong');
        if(liDom.length==0){
            return;
        }
        $('#wh_msg_'+toUserId+' .tit strong').text(isOnline?"在线":"离线");
        $('.mult_dialog a[uid='+toUserId+']').find("img").css({opacity:isOnline?1:0.5});
    },
    /**
     * 设置私聊访客
     * @param userType
     * @param userId
     * @param nickname
     * @param isOnline
     * @param isShowNum
     */
    setWhVisitors:function(userType,userId,nickname,isOnline,isShowNum){
        if($(".mult_dialog a[uid="+userId+"]").length==0){
            $(".mult_dialog").append('<a href="javascript:" uid="'+userId+'" utype="'+userType+'"><span><img src=""/><label>'+nickname+'</label></span><i class="num dn" t="0"></i><i class="close"></i></a>');
            var liDom=$('.mult_dialog a[uid='+userId+']');
            if(isShowNum) {
                var numDom = liDom.find(".num"), num = parseInt(numDom.attr("t")) + 1;
                numDom.attr("t", num).text(num).show();
            }
            liDom.find('.close').click(function(){
                var pt=$(this).parent();
                pt.remove();
                $('#wh_msg_'+pt.attr("uid")).remove();
                if($(".mult_dialog a").length==0){
                    studioChat.getWhBox().remove();
                }else{
                    $('.mult_dialog a:last').click();
                }
            });
            liDom.click(function(){
                $('.mult_dialog a').removeClass('on');
                $(this).addClass('on');
                $(this).find(".num").attr("t",0).text("").hide();
                var userId=$(this).attr("uid"),whId='wh_msg_'+userId,userType=$(this).attr("utype");
                studioChat.closeWhTipMsg(userId);
                $(".wh-right").children().hide();
                if($("#"+whId).length==0){
                    var msgHtml=[];
                    msgHtml.push('<div class="cont" id="'+whId+'"><div class="tit">'+$(this).find("label").text()+'【<strong></strong>】</div><div class="chat_content"><div class="wh-content" style="height:213px">');
                    msgHtml.push('</div></div><div class="input_box"><div class="toolbar"><a href="javascript:" class="facebtn" title="添加表情">表情</a></div>');
                    msgHtml.push('<div class="input_area"><div class="adiv"><div contenteditable="true" class="ctextarea" id="whTxt_'+userId+'"></div></div>');
                    msgHtml.push('<a href="javascript:" class="sendbtn"><span>发送</span></a></div></div></div>');
                    $(".wh-right").append(msgHtml.join(""));
                    //私聊天内容发送事件
                    $("#"+whId).find(".ctextarea").keydown(function(e){
                        if(e.keyCode==13){//按回车键发送
                            studioChat.sendWhMsg($(this));
                            return false;
                        }
                    });
                    $("#"+whId).find(".sendbtn").click(function(e){
                        studioChat.sendWhMsg($(this).parents('.cont').find(".ctextarea"));
                    });
                    //加载私聊信息
                    studioChat.socket.emit("getWhMsg",{clientStoreId:studioChat.userInfo.clientStoreId,userType:studioChat.userInfo.userType,groupId:studioChat.userInfo.groupId,groupType:studioChat.userInfo.groupType,userId:studioChat.userInfo.userId,toUser:{userId:userId,userType:userType}});
                    //初始化表情事件
                    $("#"+whId).find('.facebtn').qqFace({
                        id:'faceId_'+userId,
                        zIndex:1000000,
                        assign:'whTxt_'+userId, //给控件赋值
                        path:studioChat.filePath+'/face/'//表情存放的路径
                    });
                }else{
                    $("#"+whId).show();
                    studioChat.setTalkListScroll(true,$('#'+whId+' .wh-content'),'dark');
                }
                $("#"+whId).find(".ctextarea").focus();
                //上下线提示
                studioChat.setWhOnlineTip(userId,$("#userListId li[id='"+userId+"']").length>0);
            });
        }
    },
    /**
     * 提取私聊框
     * @returns {*|jQuery|HTMLElement}
     */
    getWhBox:function(){
        return $(".window-container[wid=newMsgShowBtn]");
    },
    /**
     * 关闭私聊提示
     */
    closeWhTipMsg:function(userId){
        $(".pletter_hint").hide();
    },
    /**
     * 填充私聊弹框
     * @param userType
     * @param userId
     * @param nickname
     * @param isTip
     * @param isShowNum
     * @returns {boolean}
     */
    fillWhBox:function(userType,userId,nickname,isTip,isShowNum){
        var whBox=this.getWhBox();
        if(whBox.length==0){//私聊框不存在，则初始化私聊框
            studioChat.setWhBox(true);
            studioChat.setWhVisitors(userType,userId,nickname,true,isShowNum);
            if(isTip){
                studioChat.setWhTipInfo(userType,'<label class="tip_nk">'+nickname+'</label>',userId);
            }
            return false;
        }else{
            var userTab=$('.mult_dialog a[uid='+userId+']');
            if(userTab.length==0){//如果弹框没有对应用户，则先配置该用户tab
                studioChat.setWhVisitors(userType,userId,nickname,true,isShowNum);
                if(isTip) {
                    studioChat.setWhTipInfo(userType,'<label class="tip_nk">' + nickname + '</label>', userId);
                }
                if(whBox.is(':hidden')){
                    return false;
                }
            }else{
                if(isShowNum && !userTab.hasClass("on")){
                    var numDom= userTab.find(".num"),num=parseInt(numDom.attr("t"))+1;
                    numDom.attr("t",num).text(num).show();
                }
                if(whBox.is(':hidden')){//如私聊框隐藏，对应的信息框没有加载数据的则返回
                    var whContent=$('#wh_msg_'+userId+' .wh-content');
                    if(whContent.length==0){
                        return false;
                    }
                }
            }
        }
        return true;
    },
    /**
     * 设置私聊头像
     * @param userType
     * @param userId
     *  @param avatar
     */
    setWhAvatar:function(userType,userId,avatar){
        if(userType=='3'){
            var csAvatar=$(".cm_wrap a[uid="+userId+"] img").attr("src");
            if(common.isValid(csAvatar)){
                avatar=csAvatar;
            }
        }
        $('.mult_dialog a[uid='+userId+'] img').attr("src",common.isValid(avatar)?avatar:'/images/studio/cm.png');
    },
    /**
     * 填充私聊内容框
     * @param data
     * @param isMeSend
     * @param isLoadData
     * @param isOnlyFill
     */
    setWhContent:function(data,isMeSend,isLoadData,isOnlyFill){
        var fromUser=data.fromUser,cls='dialog ',content=data.content,nkTitle='';
        if(data.rule){
            $('#'+data.uiId+' .dcont').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            return;
        }
        if(!isLoadData){
            fromUser.toWhUserId=fromUser.userId;
        }
        if(studioChat.userInfo.userId==fromUser.userId||(studioChat.userInfo.userType=="0" && fromUser.userType=="-1")||(studioChat.userInfo.userType=="-1" && fromUser.userType=="0")){
            if(isMeSend){//发送，并检查状态
                fromUser.publishTime=data.uiId;
                fromUser.toWhUserId=fromUser.toUser.userId;
            }
            if(data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
                $('#'+data.uiId+' .dtime').html(studioChat.formatPublishTime(fromUser.publishTime));
                $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
                return;
            }
            cls+='mine';
            nkTitle='<span class="wh-dia-title"><label class="dtime">'+studioChat.formatPublishTime(fromUser.publishTime,isLoadData,'/')+'</label><label class="wh-nk">我</label></span>';
        }else{
            if(!isLoadData && !isOnlyFill){//如接收他人私信
                var isFillWh=this.fillWhBox(fromUser.userType,fromUser.userId,fromUser.nickname,true,true);
                studioChat.setWhAvatar(fromUser.userType,fromUser.userId,fromUser.avatar);//设置头像
                if(!isFillWh){
                    return;
                }
            }
            nkTitle='<span class="wh-dia-title"><label class="wh-nk">'+fromUser.nickname+'</label><label class="dtime">'+studioChat.formatPublishTime(fromUser.publishTime,isLoadData,'/')+'</label></span>';
        }
        if(common.isBlank(fromUser.toWhUserId)){
            console.error("setWhContent->fromUser toWhUserId is null,please check!");
            return;
        }
        var pHtml='';
        var whContent=$('#wh_msg_'+fromUser.toWhUserId+' .wh-content');
        var scrContent=whContent.find(".mCSB_container");//是否存在滚动
        var html='';
        if(content.msgType==studioChat.msgType.img){
            if(content.needMax){
                pHtml='<p><a href="/studio/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId+'" class="swipebox" ><img src="'+content.value+'" alt="图片"/></a></p>';
            }else{
                pHtml='<p><a href="'+content.value+'" class="swipebox" ><img src="'+content.value+'" alt="图片" /></a></p>';
            }
        }else if(isOnlyFill){
            pHtml='<div class="whblt" rid="'+content.infoId+'">'+content.value+'</div>';
        }else{
            if(!isMeSend && common.isValid(fromUser.toUser.question)) {
                html = '<div class="dialog" id="'+fromUser.toUser.publishTime+'"><div><span class="wh-dia-title"><label class="wh-nk">' + fromUser.toUser.nickname + '</label><label class="dtime">' + studioChat.formatPublishTime(fromUser.toUser.publishTime, isLoadData, '/') + '</label></span></div><div class="whblt">' + fromUser.toUser.question + '</div></div>';
                if (scrContent.length > 0) {
                    scrContent.append(html);
                } else {
                    whContent.append(html);
                }
            }
            pHtml='<p><span class="dcont">'+content.value+'</span></p>';
        }
        html='<div class="'+cls+'" id="'+fromUser.publishTime+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header"><div>'+nkTitle+ '</div>'+pHtml+'</div>';
        if(scrContent.length>0){
            scrContent.append(html);
        }else{
            whContent.append(html);
        }
        this.formatMsgToLink(fromUser.publishTime);//格式链接
        if(!isLoadData){
            studioChat.setTalkListScroll(true,whContent,'dark');
        }
    },
    /**
     * 调整私聊box样式
     */
    adjustWhBoxStyle:function(){
        var whbox=studioChat.getWhBox();
        whbox.css({border:"1px solid #868484",left:($(window).width()-680)+"px",top: ($(".right_row").height()-$(".right_row .chat_input").height()-350)+"px"});
        whbox.find(".window-content").css({"height":"370px","width":"598px","background-color":"#475364"});
        whbox.find(".window-titleBar").css({"background-color": "#858888"});
    },
    /**
     * 事件设置
     */
    setEvent:function(){
        $(".mod_video").hover(function() {
            $(".vopenbtn").show();
        },function(){
            $(".vopenbtn").hide();
        });
        //老师列表滚动
        this.teachSlide();
        /*#################私聊事件#################begin*/
        jqWindowsEngineZIndex=100000;
        $("#newMsgTipBtn").click(function(){
            studioChat.closeWhTipMsg($(this).attr("uid"));
            var wBox=studioChat.getWhBox();
            if(wBox.length>0){
                wBox.show();
                $('.mult_dialog a[uid='+$(this).attr("uid")+']').click();
                return;
            }
            var boxHtml=[];
            boxHtml.push('<div class="pletter_win clearfix mult"><div class="mult_dialog"></div><div class="wh-right"></div></div>');
            $("#newMsgShowBtn").newWindow({
                windowTitle: "私聊",
                content:boxHtml.join(""),
                windowType: "normal",
                minimizeButton: true,
                maximizeButton:false,
                statusBar:false,
                width:600,
                height:396,
                beforeMinimize:function(bx){
                    bx.hide();
                    return false;
                }
            });
            studioChat.adjustWhBoxStyle();
            $("#newMsgShowBtn").click();
        });
        $(".pl_close").click(function(){
             $("."+$(this).attr("t")).hide();
        });
        /*#################私聊事件#################end*/
        $(".point-close").click(function(){
            $("#teacherListId a").removeClass("on");
            $(".pointlist").hide();
        });
        /**
         * 昵称输入事件
         */
        $("#mdr_nk").bind("input propertychange", function() {
            $("#nketip").text("");
        });
        /**
         * 昵称修改
         */
        $("#resetNickname").click(function(){
            return false;//前台暂屏蔽修改昵称，改为后台支持
            var _this=$(this),np=$("#mdr_nk"),val=np.val();
            if(common.isBlank(val) || !(/^.{2,10}$/.test(val))){
                $("#nketip").text("昵称有误，请输入2至10位字符！");
                return;
            }
            if("save"==_this.attr("t")){
                try{
                    common.getJson("/studio/modifyName",{nickname:val},function(result){
                        if(!result || !result.isOK){
                            $("#nketip").text(result.msg?result.msg:"修改失败，请联系客服！");
                            np.focus();
                        }else{
                            _this.attr("t","modify").text("修改昵称");
                            np.attr("t",result.nickname).attr("readonly",true);
                            studioChat.userInfo.nickname=result.nickname;
                            $(".username").text(result.nickname);
                        }
                    },true,function(err){
                        $("#nketip").text("修改失败，请联系客服！");
                    });
                }catch(e){
                    $("#nketip").text("修改失败，请联系客服！");
                }
            }else{
                _this.attr("t","save").text("保存昵称");
                np.attr("readonly",false).focus();
                np.val(val);
            }
        });
        /**
         * 设置弹框显示直播
         */
        $(".vopenbtn").click(function(){
            //设置弹框显示直播
            jqWindowsEngineZIndex=100000;
            var type=$(this).attr("t");
            var windowContainerStyle={};
            if(type=="s") {
                if($(".window-container #tVideoDiv").length>0){
                    $("#tvDivId").get(0).appendChild($("#tVideoDiv").parent().get(0));
                    $(".window-container").remove();
                    if(window.SewisePlayer){
                        SewisePlayer.doStop();
                    }
                    $("#tvDivId .vopenbtn").show();
                    $("#tvDivId .tipMsg").hide();
                }
                $("#showOutSV").newWindow({
                    windowTitle: "视频直播",
                    content:$("#stVideoDiv .tv-div")[0],
                    windowType: "video",
                    minimizeButton: false,
                    resizeIcon: '<= =>',
                    width: 640,
                    height: 540,
                    afterClose: function (content) {
                        $("#stVideoDiv .tipMsg").hide();
                        $("#stVideoDiv").get(0).appendChild(content);
                        $("#stVideoDiv .vopenbtn").show();
                    }
                });
                $("#showOutSV").click();
                $("#stVideoDiv .vopenbtn").hide();
                window.setTimeout(function(){//1秒钟后提示信息
                    $("#stVideoDiv .tipMsg").show();
                },500);
            }else{
                if($(".window-container #studioVideoDiv").length>0){
                    $("#stVideoDiv").get(0).appendChild($("#studioVideoDiv").parent().get(0));
                    $("#studioVideoDiv embed,.window-container").remove();
                    $("#stVideoDiv .vopenbtn").show();
                    $("#stVideoDiv .tipMsg").hide();
                }
                $("#showOutTV").newWindow({
                    windowTitle: "教学视频",
                    content: $("#tvDivId .tv-div")[0],
                    windowType: "video",
                    minimizeButton: false,
                    resizeIcon: '<= =>',
                    width: 640,
                    height: 540,
                    afterClose: function (content) {
                        $("#tvDivId .tipMsg").hide();
                        $("#tvDivId .vopenbtn").show();
                        $("#tvDivId").get(0).appendChild(content);
                        studioChat.doPlayTeachVideo();
                        //重设视频广告事件
                        studioChat.setVdEvent();
                    }
                });
                $("#showOutTV").click();
                $("#tvDivId .vopenbtn").hide();
                window.setTimeout(function(){//1秒钟后提示信息
                    $("#tvDivId .tipMsg").show();
                    studioChat.doPlayTeachVideo();
                },500);
            }
        });
        //设置视频广告事件
        this.setVdEvent();
        /*咨询对象*/
        $('.te_ctrl .show_btn').click(function(){
            $(".te_list").animate({
                height: "53px"
            }, "slow" );
            $('.te_ctrl a').removeClass('show');
            $('.te_ctrl .hide_btn').addClass('show');

        });
        $('.te_ctrl .hide_btn').click(function(){
            $(".te_list").animate({
                height: 0
            }, "slow" );
            $('.te_ctrl a').removeClass('show');
            $('.te_ctrl .show_btn').addClass('show');
        });
        //初始化表情事件
        $('#msgFaceBtn').qqFace({
            id:'faceId',
            assign:'contentText', //给控件赋值
            path:studioChat.filePath+'/face/'//表情存放的路径
        });
        //点击document,关闭dom
        $(document).click(function(e){
            $('div[id^=faceId]').hide();
            if(!$(e.target).hasClass("headimg") && !$(e.target).parents().hasClass("headimg") && $(e.target).parent().attr("t")!="header" && !$(e.target).hasClass("uname")&& !$(e.target).parents().hasClass("te_ul")){
                $('.dialogbtn').hide();
            }
        });
        /**
         * 切换房间
         */
        $("#studioListId a").click(function(){
            if($(this).hasClass("ing")){
                return false;
            }
            if($(this).hasClass("locked")){
                alert("您没有访问该直播间的权限，如需进入请升级直播间等级或联系客服！");
                return false;
            }
            common.getJson("/studio/checkGroupAuth",{groupId:this.id},function(result){
                if(!result.isOK){
                    alert("您没有访问该直播间的权限，如需进入请升级直播间等级或联系客服！");
                }else{
                    studioChat.toRefreshView();
                }
            },true,function(err){
                if("success"!=err) {
                    alert("操作失败，请联系客服！" );
                }
            });
        });
        /**
         * 用户信息链接
         */
        $(".username").click(function(){
            $(".blackbg").children("div").hide();
            $("#mdr_nk").val($("#mdr_nk").attr("t"));
            $("#userInfoBox,.blackbg").show();
        });
        $(".upg_btn").click(function(){
            try{
                $(".upg_list").show();
                $("#up_loading").show();
                $.getJSON('/studio/getClientGroupList',null,function(data){
                    $("#up_loading").hide();
                    if(data){
                        $("#upg_tbody_id").html("");
                        var currLevel='',seq=0,rowTmp=null;
                        for(var t in data){//找出对应排序号，按排序号分等级
                            if(data[t]._id==studioChat.userInfo.clientGroup){
                                seq=data[t].sequence;
                            }
                        }
                        for(var i in data){
                            rowTmp=data[i];
                            if(rowTmp._id==studioChat.userInfo.clientGroup){
                                currLevel="当前级别";
                            }else if(rowTmp._id!="visitor" && seq<rowTmp.sequence){
                                currLevel=rowTmp._id=='vip'?'联系客服升级':'<a href="javascript:" t="' + rowTmp._id + '">升级</a>';
                            }else{
                                currLevel='---';
                            }
                            var trDomArr=[];
                            trDomArr.push('<tr><td align="center" valign="middle">'+studioChat.getUserLevelShortName(rowTmp._id)+'</td>');
                            trDomArr.push('<td align="center" valign="middle">'+common.trim(rowTmp.remark)+'</td>');
                            trDomArr.push('<td align="center" valign="middle">'+common.trim(rowTmp.authorityDes)+'</td>');
                            trDomArr.push('<td align="center" valign="middle">'+currLevel+'</td></tr>');
                            $("#upg_tbody_id").append(trDomArr.join(""));
                        }
                        //点击事件
                        $("#upg_tbody_id a").click(function(){
                            var _this=$(this);
                            var loc_upLevel = _this.attr("t");
                            common.getJson("/studio/upgrade",{clientGroup : loc_upLevel},function(result){
                                _this.attr('disabled',false);
                                if(result.isOK){
                                    $(".upg_succ").show();
                                }else{
                                    var loc_msg = "";
                                    if("real" === loc_upLevel){
                                        loc_msg = "很遗憾，您未开通金道真实交易账户，升级失败！<br>如有疑问请联系客服！";
                                    }else if("simulate" === loc_upLevel){
                                        loc_msg = "很遗憾，您未开通金道模拟交易账户，升级失败！<br>如有疑问请联系客服！";
                                    }
                                    $("#upg_fail span:first").html(loc_msg);
                                    $("#upg_fail").show();
                                }
                            },true,function(err){
                                _this.attr('disabled',false);
                            });
                        });
                    }
                });
            }catch (e){
                $("#up_loading").hide();
                console.error("getClientGroupList->"+e);
            }
        });
        /*弹出框 - 升级提示*/
        $('.in_rbtn .qu_btn').hover(function(){
            $('.upg_tip').addClass('show');
        },function(){
            $('.upg_tip').removeClass('show');
        });
        /**
         * 转到金道用户登录
         */
        $("#toPmLogin").click(function(){
             $("#loginComBox").hide();
             $("#loginPmBox").show();
        });
        /*tab切换*/
        $('.mod_tab .tab_nav a').click(function(){
            $('.mod_tab .tab_nav a').removeClass('on');
            $('.mod_tab .tab_box').removeClass('on');
            $(this).addClass('on');
            $($('.mod_tab .tab_box')[$(this).index()]).addClass('on');
            var t=$(this).attr("t");
            if(t=='tradeInfoTab'){
                studioChat.setNewsInfo("#tradeInfoTab",3,5);
            }else if(t=='commentTab'){
                studioChat.setNewsInfo("#commentTab",3,3);
            }else if(t=='studioPlanTab'){
                if(!studioChat.syllabusData){
                    return;
                }
                var syllabusView=common.formatSyllabus(studioChat.syllabusData.courses, studioChat.serverTime, 1);
                var loc_panel = $("#studioPlanTab");
                loc_panel.html(syllabusView);
                loc_panel.find(".sy_nav a").bind("click", function(){
                    var loc_this = $(this);
                    $(this).parent().find(".dir").hide();
                    $(this).find(".dir").show();
                    loc_this.siblings(".active").removeClass("active");
                    loc_this.addClass("active");
                    var loc_day = loc_this.attr("d");
                    var loc_panel = loc_this.parent().next();
                    loc_panel.find("tbody:visible").hide();
                    loc_panel.find("tbody[d='" + loc_day + "']").show();
                });
                loc_panel.find(".sy_nav a.active").trigger("click");
                studioChat.setListScroll($("#studioPlanTab").parent()[0]);
            }else if(t=='bulletinTab'){
                studioChat.getArticleList("bulletin_system",studioChat.userInfo.groupId,1,1,1,'{"sequence":"asc"}',null,function(dataList){
                    $("#bulletinTab").html("");
                    if(dataList && dataList.result==0){
                        var data=dataList.data;
                        if(data && data.length > 0){
                            $("#bulletinTab").html(data[0].detailList[0].content);
                            studioChat.setListScroll($("#bulletinTab").parent()[0]);
                        }
                    }
                });
            }else if(t=='downloadTab'){
                studioChat.getArticleList("download",studioChat.userInfo.groupId,1,1,100,'{"sequence":"asc"}',null,function(dataList){
                    $("#downloadTab").html("");
                    if(dataList && dataList.result==0){
                        var data=dataList.data,row=null;
                        for(var i in data){
                            row=data[i].detailList[0];
                            $("#downloadTab").append('<li><span>'+row.title+'</span><a href="'+data[i].mediaUrl+'" target="_blank" class="downbtn" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'file_download\',$(this).prev().text()]);" >下载</a></li>');
                        }
                        studioChat.setListScroll($("#downloadTab").parent()[0]);
                    }
                });
            }
        });
        $(".mod_tab .tab_nav a[t='studioPlanTab']").click();
        /**
         * 转到登录页面
         */
        $('#login_a,#login_b,#login_c,#lrtip_l').click(function(){
            $("#main_ad_box").hide();
            studioChat.openLoginBox();
            if(common.isValid($(this).attr("tp"))){
                _gaq.push(['_trackEvent', 'pmchat_studio', 'login', $(this).attr("tp"),1,true]);
            }
        });
        /**
         * 转到注册页面
         */
        $('#register_a,#register_b,#toRegister,#lrtip_r').click(function(){
            $("#main_ad_box").hide();
            studioChat.openRegistBox();
            if(common.isValid($(this).attr("tp"))){
                _gaq.push(['_trackEvent', 'pmchat_studio', 'register', $(this).attr("tp"),1,true]);
            }
        });
        //手机号码输入控制验证码样式
        $.each(["#loginPmForm input[name=mobilePhone]","#mobileCheckForm input[name=mobilePhone]","#registFrom input[name=mobilePhone]"],function(i,obj){
            $(obj).bind("input propertychange", function() {
                var domBtn=$(this).parents("form").find(".rbtn");
                if(parseInt(domBtn.attr("t")) < 60 && domBtn.is(".pressed") == false)
                {
                    //倒计时状态不修改样式
                    return;
                }
                if(common.isMobilePhone(this.value)){
                    domBtn.addClass("pressed");
                }else{
                    domBtn.removeClass("pressed");
                }
            });
        });
        //验证码事件
        $('.rbtn').click(function(){
            if(!$(this).hasClass("pressed")){
                return;
            }
            $(this).removeClass("pressed").html("发送中...");
            var pf=$(this).attr("pf");
            var useType = $(this).attr("ut");
            var mobile=$("#"+pf+" input[name=mobilePhone]").val();
            try{
                $.getJSON('/studio/getMobileVerifyCode?t=' + new Date().getTime(),{mobilePhone:mobile, useType:useType},function(data){
                    if(!data || data.result != 0){
                        if(data.errcode == "1005"){
                            alert(data.errmsg);
                        }else{
                            console.error("提取数据有误！");
                        }
                        studioChat.resetVerifyCode("#" + pf);
                    }else{
                        studioChat.setVerifyCodeTime('.rbtn[pf='+pf+']');
                    }
                });
            }catch (e){
                studioChat.resetVerifyCode("#" + pf);
                console.error("setMobileVerifyCode->"+e);
            }
        });
        /*弹出框关闭按钮*/
        $('.popup_box .pop_close,.formbtn[t=close]').click(function(){
            if("userInfo"==$(this).attr("t")){
                //$("#resetNickname").attr("t","modify").text("修改昵称");
                $("#mdr_nk").attr("readonly",true);
                $("#nketip").text("");
            }else{
                $(".blackbg form").each(function(){
                    this.reset();
                });
                $(".wrong-info").html("").attr("tId","");
            }
            var parentDom=$(this).parent().parent(),pId=parentDom.parent().attr("id"),curPId=parentDom.attr("id");
            parentDom.hide();
            if(("loginBox"==pId||"registBox"==pId||parentDom.parent().hasClass("blackbg")) && "modifyPwdBox"!=curPId){
                $(".blackbg").hide().children().hide();
            }
            //$(".blackbg").hide().children().hide();
        });
         /**
         * 输入框blur事件
         */
        $("#loginForm input[type=text]").blur(function(){
            if(common.isValid(this.value)){
                $('#loginForm .wrong-info[tId='+this.name+']').html("");
            }
        });

        /**
         * 控制密码输入框不允许黏贴
         */
        $("input[type='password']").bind("paste", function(){
            return false;
        });

        /**
         * 按回车键登录
         */
        $("#loginComForm input[name='pwd']").keydown(function(e){
            if(e.keyCode==13){
                $("#loginComForm a[tn='loginBtn']").trigger("click");
                return false;
            }
        });
        /**
         * 按回车键登录
         */
        $("#loginPmForm input[name='verifyCode']").keydown(function(e){
            if(e.keyCode==13){
                $("#loginPmForm a[tn='loginBtn']").trigger("click");
                return false;
            }
        });
        /**
         * 金道用户验证手机号后，设置昵称等信息
         */
        $("#pmInfoSetBtn").click(function(){
            $("#pmInfoSetForm input[name=clientStoreId]").val(studioChat.userInfo.clientStoreId);
            if(!studioChat.checkFormInput("#pmInfoSetForm")){
                return;
            }
            $(this).attr('disabled',true);
            var _this=this;
            $('#pmInfoSetLoad').show();
            common.getJson("/studio/reg",$("#pmInfoSetForm").serialize(),function(result){
                $("#pmInfoSetForm .wrong-info").html("");
                $(_this).attr('disabled',false);
                $('#pmInfoSetLoad').hide();
                if(!result.isOK){
                    $("#pmInfoSetForm .wrong-info").html(result.error.errmsg);
                    return false;
                }else{
                    $("#pmInfoSetBox").hide();
                    studioChat.toRefreshView();
                }
            },true,function(err){
                $(_this).attr('disabled',false);
                $('#pmInfoSetLoad').hide();
            });
        });
        /**
         * 登录按钮事件
         */
        $("#loginComForm a[tn=loginBtn],#loginPmForm a[tn=loginBtn]").click(function(){
            var thisFormId=$(this).parents("form").attr("id");
            $("#"+thisFormId+' input[name=clientStoreId]').val(studioChat.userInfo.clientStoreId);
            if(!studioChat.checkFormInput("#"+thisFormId)){
                return;
            }
            $(this).attr('disabled',true);
            var _this=this;
            $('#formBtnLoad').show();
            common.getJson("/studio/login",$("#"+thisFormId).serialize(),function(result){
                $("#"+thisFormId+" .wrong-info").html("");
                $(_this).attr('disabled',false);
                $('#formBtnLoad').hide();
                if(!result.isOK){
                    if(result.hasPM){//转到注册设计页面
                        $("#pmInfoSetForm input[name=mobilePhone]").val(result.mobilePhone);
                        $("#pmInfoSetForm input[name=clientGroup]").val(result.clientGroup);
                        $("#pmInfoSetForm input[name=verifyCode]").val(result.verifyCode);
                        $("#loginBox").hide();
                        $("#pmInfoSetBox").show();
                        return false;
                    }
                    $("#"+thisFormId+" input[name=verifyCode],#loginForm input[name=pwd]").val("");
                    $("#"+thisFormId+" .wrong-info").html(result.error.errmsg);
                    return false;
                }else{
                    $(".blackbg,#loginBox").hide();
                    studioChat.toRefreshView();
                }
            },true,function(err){
                $("#"+thisFormId+" input[name=pwd]").val("");
                $(_this).attr('disabled',false);
                $('#formBtnLoad').hide();
            });
        });

        /**
         * 注册按钮事件
         */
        $("#registBtn").click(function(){
            $("#registFrom input[name=clientStoreId]").val(studioChat.userInfo.clientStoreId);
            if(!studioChat.checkFormInput("#registFrom")){
                return;
            }
            $(this).attr('disabled',true);
            var _this=this;
            $('#registLoad').show();
            common.getJson("/studio/reg",$("#registFrom").serialize(),function(result){
                $("#registFrom .wrong-info").html("");
                $(_this).attr('disabled',false);
                $('#registLoad').hide();
                if(!result.isOK){
                    $("#registFrom .wrong-info").html(result.error.errmsg);
                    return false;
                }else{
                   $("#registTipBox").show();
                   $("#registFromBox").hide();
                   studioChat.toRefreshView();
                }
            },true,function(err){
                $(_this).attr('disabled',false);
                $('#registLoad').hide();
            });
        });
        //找回密码
        $(".frbtn,#toGetPwd").click(function(){
            $(".blackbg").children("div").hide();
            studioChat.resetVerifyCode("#mobileCheckBox");
            $("#mobileCheckBox").show();
        });
        //验证手机号码
        $("#mobileCheckBtn,#getPwdBtn").click(function(){
            var thisFormId="#"+$(this).attr("pf"),loadDiv=$('.img-loading[pf='+$(this).attr("pf")+']');
            if(!studioChat.checkFormInput(thisFormId)){
                return;
            }
            $(this).attr('disabled',true);
            var _this=this;
            loadDiv.show();
            common.getJson("/studio/getPwd",$(thisFormId).serialize(),function(result){
                $(thisFormId+" .wrong-info").html("");
                $(_this).attr('disabled',false);
                loadDiv.hide();
                if(!result.isOK){
                    $(thisFormId+" .wrong-info").html(result.error.errmsg);
                    return false;
                }else{
                    if(thisFormId=="#mobileCheckForm"){
                        $("#getPwdForm input[name=mobilePhone]").val($("#mobileCheckForm input[name=mobilePhone]").val());
                        $("#getPwdForm input[name=verifyCode]").val($("#mobileCheckForm input[name=verifyCode]").val());
                        $("#getPwdBox").show();
                        $("#mobileCheckBox").hide();
                    }else{
                        $("#getPwdBox").hide();
                        $("#getPwdTipBox").show();
                    }
                }
            },true,function(err){
                $(_this).attr('disabled',false);
                loadDiv.hide();
            });
        });

        /**
         * 修改密码链接
         */
        $("#resetPwdLink").click(function(){
            $("#modifyPwdForm")[0].reset();
            $(".blackbg").children().not("#userInfoBox").hide();
            $(".blackbg,#modifyPwdBox").show();
        });
        /**
         * 修改密码
         */
        $("#modifyPwdBtn").click(function(){
            var loadDiv=$('.img-loading[pf='+$(this).attr("pf")+']');
            if(!studioChat.checkFormInput("#modifyPwdForm")){
                return;
            }
            $(this).attr('disabled',true);
            var _this=this;
            loadDiv.show();
            common.getJson("/studio/resetPwd",$("#modifyPwdForm").serialize(),function(result){
                $("#modifyPwdForm .wrong-info").html("");
                $(_this).attr('disabled',false);
                loadDiv.hide();
                if(!result.isOK){
                    $("#modifyPwdForm .wrong-info").html(result.error.errmsg);
                    return false;
                }else{
                    $("#modifyPwdBox,#userInfoBox").hide();
                    $("#modifyPwdTipBox").show();
                }
            },true,function(err){
                $(_this).attr('disabled',false);
                loadDiv.hide();
            });
        });
        //回复对话
        $(".replybtn").click(function(){
            studioChat.setDialog($(this).attr("uId"),$(".sender").html(),$(this).attr("ts"),$(this).attr("futype"));//设置对话
            $(".mymsg em").show();
        });
        //关闭对话
        $(".closebtn").click(function(){
           $(".mymsg,.mymsg em").hide();//设置对话
        });
        //清屏
        $(".clearbtn").click(function(){
            $("#dialog_list").html("");//设置对话
            studioChat.setTalkListScroll();
        });
        //滚动设置
        $(".scrollbtn").click(function(){
            if($(this).hasClass("on")){
                $(this).removeClass("on");
            }else{
                $(this).addClass("on");
                studioChat.setTalkListScroll(true);
            }
        });
        /*聊天屏蔽下拉框、定向聊天下拉框*/
        $('.view_select').hover(function() {
            $(this).addClass('dw');
        },function(){
            $(this).removeClass('dw');
        }).find(".selectlist a").click(function(){
            if($(this).is(".on")){
                return;
            }
            $('.view_select .selectlist a').removeClass("on");
            $('.view_select .selected').text($(this).text());
            $(this).addClass("on");
            studioChat.showViewSelect($(this).attr("t"));
            studioChat.setTalkListScroll(true);
        });
        /**
         * contentText键盘事件
         */
        $("#contentText").keydown(function(e){
            var val=$(this).html();
            if(e.keyCode==13){//按回车键发送
                if(common.isValid(val)){
                    $(this).html(val.replace(/<div>|<\/div>/g,""));
                    $("#sendBtn").click();
                }
                return false;
            }
            if(e.keyCode==8){//按退格键发送
                var txtDom=$(this).find(".txt_dia");
                if($.trim($(this).text())==txtDom.text()){
                    txtDom.remove();
                    $(this).html("");
                    return true;
                }
            }
        }).autocomplete({//输入@自动提示
            source: function(request, response ){
                if (/^@.*$/g.test(request.term)) {
                    response(studioChat.searchUserList(request.term.substring(1, request.term.length)));
                }
            },
            delay: 500,
            minLength:2,
            position: {
                my: "left bottom",
                at: "left top"
            },
            select: function(event,ui) {
                $("#contentText").html("").append('&nbsp;<span class="txt_dia" contenteditable="false" uid="'+ui.item.value+'" utype="'+ui.item.userType+'">@<label>'+ui.item.label+'</label></span>&nbsp;').focusEnd();
                return false;
            }
        }).autocomplete("instance")._renderItem = function(ul, item ) {
            return $("<li>").append("<a>" + item.label +"</a>").appendTo(ul);
        };
        //聊天内容发送事件
        $("#sendBtn").click(function(){
            if(studioChat.userInfo.clientGroup=='visitor'){
                studioChat.openLoginBox();
                return;
            }
            var toUser=studioChat.getToUser();
            var msg = studioChat.getSendMsg();
            if(msg === false){
                return;
            }
            var sendObj={uiId:studioChat.getUiId(),fromUser:studioChat.userInfo,content:{msgType:studioChat.msgType.text,value:msg}};
            var replyDom=$(".replybtn");
            if(toUser && toUser.userId==replyDom.attr("uid") && toUser.talkStyle==replyDom.attr("ts")){//如果对话userId匹配则表示当前回复结束
                $(".mymsg,.mymsg em").hide();
            }
            sendObj.fromUser.toUser = toUser;
            studioChat.socket.emit('sendMsg',sendObj);//发送数据
            studioChat.setContent(sendObj,true,false);//直接把数据填入内容栏
            //清空输入框
            $("#contentText").html("");//清空内容
        });
        this.placeholderSupport();//ie下输入框显示文字提示
    },
    /**
     * 查询UI在线用户
     */
    searchUserList:function(val){
        var userArr=$("#userListId li[t!=14][t!=0]").map(function () {
            var name = $(this).find(".uname").text();
            return name.indexOf(val)!=-1?{value:this.id,label:name,userType: $(this).attr("utype")}:null;
        }).get();
        var teacherArr=$("#teacherListId li").map(function () {
            var name = $(this).find("strong").text();
            return name.indexOf(val)!=-1?{value:this.id,label:name,userType: $(this).attr("utype")}:null;
        }).get();
        return userArr.concat(teacherArr);
    },
    /**
     * 显示过滤的聊天记录
     * @param t
     */
    showViewSelect:function(t){
        if(t=='analyst'){
            $("#dialog_list").children("[utype!=2]").hide();
            $("#dialog_list").children("[utype=2]").show();
        }else if(t=='me'){
            $("#dialog_list").children("[isMe=false]").hide();
            $("#dialog_list").children("[isMe=true]").show();
        }else{
            $("#dialog_list").children().show();
        }
    },
    /**
     * 过滤发送消息：过滤一些特殊字符等。
     * 如果返回值为false,则终止发送消息。
     */
    getSendMsg : function(dom){
        var dom=dom?dom:$("#contentText");
        //校验聊天内容长度
        if(dom.text().length + dom.find("img").size() > 140){
            alert("消息内容超过最大长度限制（140字以内）！");
            return false;
        }
        if(dom.find(".txt_dia").length>0){
            dom.find(".txt_dia").remove();
        }
        var msg =common.clearMsgHtml(dom.html());
        if(common.isBlank(msg)){
            dom.html("");
            return false;
        }
        return msg;
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
     * 设置列表滚动条
     */
    setListScroll:function(domClass){
        if($(domClass).hasClass("mCustomScrollbar")){
            $(domClass).mCustomScrollbar("update");
        }else{
            $(domClass).mCustomScrollbar({theme:"minimal-dark"});
        }
    },
    /**
     * 设置聊天列表滚动条
     * @param toBottom
     */
    setTalkListScroll:function(toBottom,dom,theme) {
        var obj=dom?dom:$("#chatMsgContentDiv");
        if(obj.hasClass("mCustomScrollbar")){
            obj.mCustomScrollbar("update");
            if(toBottom) {
                obj.mCustomScrollbar("scrollTo", "bottom");
            }
        }else{
            obj.mCustomScrollbar({scrollInertia:1,scrollButtons:{enable:true},theme:(theme?theme:"light-2")});
            obj.mCustomScrollbar("scrollTo", "bottom");
        }
    },
    /**
     * 提取@对话html
     */
    getToUser:function(){
      var curDom=$('#contentText .txt_dia');
      if(curDom.length>0){
          return {userId:curDom.attr("uid"),nickname:curDom.find("label").text(),talkStyle:0,userType:curDom.attr("utype")};
      }
      return null;
    },
    /**
     * 检查页面输入
     */
    checkFormInput:function(formDom){
        var isTrue=true;
        var errorDom=$(formDom+" .wrong-info");
        errorDom.attr("tId","").html("");
       $(formDom+" input").each(function(){
           if(common.isBlank($(this).val())){
               if(this.name=='mobilePhone'){
                   errorDom.attr("tId",this.name).html("手机号码不能为空！");
               }
               if(this.name=='pwd'|| this.name=='firstPwd'){
                   errorDom.attr("tId",this.name).html("密码不能为空！");
               }
               if(this.name=='verifyCode'){
                   errorDom.attr("tId",this.name).html("验证码不能为空！");
               }
               if(this.name=='oldPwd'){
                   errorDom.attr("tId",this.name).html("原密码不能为空！");
               }
               isTrue=false;
               return isTrue;
           }else{
               if(this.name=='mobilePhone') {
                   $(this).val($.trim($(this).val()));
                   if(!common.isMobilePhone(this.value)){
                       errorDom.attr("tId",this.name).html("手机号码输入有误！");
                       isTrue=false;
                       return isTrue;
                   }
               }
               if(this.name=='nickname'&& !common.isRightName(this.value)) {
                   errorDom.attr("tId",this.name).html("昵称为2至10位字符(数字、英文、中文、下划线),不能全是数字");
                   isTrue=false;
                   return isTrue;
               }
               if(this.name=='pwd'){
                   if(!(/^[A-Za-z0-9]{6,16}$/.test(this.value))) {
                       errorDom.attr("tId",this.name).html("密码输入有误，请输入6至16位字母或数字组合！");
                       isTrue=false;
                       return isTrue;
                   }
                   var firstPwdDom=$(formDom).find("input[name=firstPwd]");
                   if(firstPwdDom.length>0){
                       if(firstPwdDom.val()!=this.value){
                           errorDom.attr("tId",this.name).html("两次密码不一致！");
                           isTrue=false;
                           return isTrue;
                       }
                   }
               }
           }
       });
       return isTrue;
    },

    /**
     * 重置验证码
     * @param dom
     */
    resetVerifyCode:function(dom){
        if(studioChat.verifyCodeIntervalId) {
            clearInterval(studioChat.verifyCodeIntervalId);
            studioChat.verifyCodeIntervalId='';
        }
        $(dom + " .rbtn").attr("t",60).html("获取验证码");
        $(dom + " input[name=mobilePhone]").trigger("input");
    },
    /**
     * 打开登录框
     */
    openLoginBox:function(){
        $("#loginBox form").each(function(){//清空数据
            this.reset();
        });
        this.resetVerifyCode("#loginPmBox");
        $(".blackbg").children().hide();
        $("#loginPmBox").hide();
        $("#loginBox,#loginComBox,.blackbg").show();
    },
    /**
     * 打开注册框
     */
    openRegistBox:function(){
        $("#registFrom")[0].reset();
        this.resetVerifyCode("#registFrom");
        $(".blackbg").children().hide();
        $("#registBox,#registFromBox,.blackbg").show();
    },

    /**
     * 格式发布日期
     */
    formatPublishTime:function(time,isfull,splitChar){
        var nb=Number(time.replace(/_.+/g,""));
        return common.isBlank(time)?'':isfull?common.formatterDateTime(nb,splitChar):common.getHHMM(nb);
    },
    /**
     * 设置对话
     * @param userId
     * @param nickname
     * @param talkStyle聊天方式（0对话，1私聊）
     * @param userType 用户类别(0客户；1管理员；2分析师；3客服）
     * @param avatar
     */
    setDialog:function(userId,nickname,talkStyle,userType,avatar){
        if(talkStyle==1){//私聊,则直接弹私聊框
            studioChat.fillWhBox(userType,userId,nickname,false);
            studioChat.getWhBox().show();
            var ms=$('.mult_dialog a[uid='+userId+']');
            ms.click();
            if(common.isValid(avatar)){
                ms.find("img").attr("src",avatar);
            }
        }else{
            $("#contentText .txt_dia").remove();
            $("#contentText").html($("#contentText").html().replace(/^((&nbsp;)+)/g,''));
            $("#contentText").prepend('&nbsp;<span class="txt_dia" contenteditable="false" uid="'+userId+'" utype="'+userType+'">@<label>'+nickname+'</label></span>&nbsp;').focusEnd();
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
            studioChat.openLoginBox();
            return;
        }
        if(isLoadData && $("#"+fromUser.publishTime).length>0){
            $("#"+fromUser.publishTime+" .dcont em[class=ruleTipStyle]").remove();
            $("#"+fromUser.publishTime+" input").remove();
            return;
        }
        if(data.rule){
            if(data.value && data.value.needApproval){
                $('#'+data.uiId).attr("id",fromUser.publishTime);
            }else{
                $('#'+data.uiId+' .dcont').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            }
            return;
        }
        if(!isMeSend && studioChat.userInfo.userId==fromUser.userId && data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
            $('#'+data.uiId+' .dtime').html(studioChat.formatPublishTime(fromUser.publishTime));
            $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
            return;
        }
        var dialog=studioChat.formatContentHtml(data,isMeSend,isLoadData);
        var list=$("#dialog_list");
        list.append(dialog);
        this.formatMsgToLink(fromUser.publishTime);//格式链接
        var vst=$('.view_select .selectlist a[class=on]').attr("t");//按右上角下拉框过滤内容
        if(vst!='all'){
            studioChat.showViewSelect(vst);
        }
        if(!isLoadData && $(".scrollbtn").hasClass("on")) {
            studioChat.setTalkListScroll(true);
        }
        //对话事件
        $('#'+fromUser.publishTime+' .headimg').click(function(){
            studioChat.openDiaLog($('#'+fromUser.publishTime+' .dialogbtn').attr("avs",$(this).find("img").attr("src")));
        });
       $('#'+fromUser.publishTime+' .txt_dia').click(function(){
           if(studioChat.userInfo.clientGroup=='visitor'){
               return;
           }
           studioChat.setDialog($(this).attr("uid"),$(this).find("label").text(),0,$(this).attr("utype"));
        });
        //昵称点击
        $('#'+fromUser.publishTime+' .uname').click(function(){
            var diaDom=$('#'+fromUser.publishTime+' .dialogbtn');
            diaDom.attr("avs",$(this).parent().parent().find('.headimg img').attr("src"));
            studioChat.openDiaLog(diaDom);
            diaDom.css('left','62px');
            diaDom.css('top','30px');
        });
    },
    /**
     * 打开对话框
     */
     openDiaLog:function(diaDom){
        $('.dialogbtn').not(diaDom).hide();
        if(!diaDom.is(':hidden')){
            diaDom.hide();
            return false;
        }
        diaDom.css('left','0');
        var dp=diaDom.parent();
        if(common.isValid(dp.attr("utype"))){
            if(dp.next().size() === 0){
                diaDom.css('top', (-11 - diaDom.height()) + "px");
            }else{
                diaDom.css('top', dp.hasClass("analyst") ? '53px' : '39px');
            }
        }
        diaDom.show();
        var am=diaDom.find("a"),dsrc=diaDom.attr("avs");
        if(common.isValid(dsrc)){
            am.attr("avs",dsrc);
            diaDom.attr("avs",'');
        }else{
            am.attr("avs",'');
        }
        am.click(function(){
             var tp=$(this).parent();
             studioChat.setDialog(tp.attr("uid"),tp.attr("nk"),$(this).attr("t"),tp.attr("utype"),$(this).attr("avs"));//设置对话
             tp.hide();
        });
     },
    /**
     * 格式内容栏
     */
    formatContentHtml:function(data,isMeSend,isLoadData){
        var cls='dialog ',pHtml='',dtHtml='',loadHtml='',dialog='',uName='uname ',isMe='false',
            fromUser=data.fromUser,
            content=data.content,
            nickname=fromUser.nickname;
        var toUser=fromUser.toUser,toUserHtml='';
        if(toUser && common.isValid(toUser.userId)){
            toUserHtml='<span class="txt_dia" uid="'+toUser.userId+'" utype="'+toUser.userType+'">@<label>'+toUser.nickname+'</label></span>';
            if(studioChat.userInfo.userId==toUser.userId){
                isMe='true';
            }
        }
        pHtml=content.value;
        if(studioChat.userInfo.userId==fromUser.userId){
            cls+='mine';
            nickname='我';
            isMe='true';
        }else{
            if(fromUser.userType==2){
                cls+='analyst';
            }
            if(fromUser.userType==1){
                cls+='admin';
            }
            dialog=studioChat.getDialogHtml(fromUser.userId,nickname,fromUser.userType);
            if(!isLoadData && toUser){
                if(studioChat.userInfo.userId==toUser.userId){
                    $(".mymsg").show();
                    $(".mymsg em").hide();
                    $(".replybtn").attr("uid",fromUser.userId);
                    $(".replybtn").attr("ts",toUser.talkStyle);
                    $(".replybtn").attr("futype",fromUser.userType);
                    $(".sender").html(fromUser.nickname);
                    $(".xcont").html(pHtml);
                }
            }
        }
        var html='<div class="'+cls+'" id="'+fromUser.publishTime+'" isMe="'+isMe+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header"><a href="javascript:" class="headimg" uid="'+fromUser.userId+'">'+studioChat.getUserAImgCls(fromUser.clientGroup,fromUser.userType,fromUser.avatar)+'</a><i></i>'+
        '<p><a href="javascript:"  class="'+uName+'">'+nickname+'</a><span class="dtime">'+studioChat.formatPublishTime(fromUser.publishTime)+'</span><span class="dcont">'+toUserHtml+pHtml+'</span></p>' +dialog+'</div>';
        return html;
    },
    /**
     * 格式链接
     * @param ptime
     */
    formatMsgToLink:function(ptime){
        $('#'+ptime+' .dcont:contains("http:"),#'+ptime+' .dcont:contains("https:")').each(function (index,el){
            var elHtml=$(el).html(),elArr=elHtml.split(/<img src="\S+">/g);
            var linkTxt='';
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
     * 移除加载提示的dom
     * @param uiId
     */
    removeLoadDom:function(uiId){
        $('#'+uiId+' .img-loading,#'+uiId+' .img-load-gan,#'+uiId+' .shadow-box,#'+uiId+' .shadow-conut').remove();
    },
    /**
     * 提取头像样式
     * @param clientGroup
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
     * 提取用户等级简称
     * @param clientGroup
     */
    getUserLevelShortName:function(clientGroup){
        var levelShortName='';
        switch(clientGroup){
            case "vip":
                levelShortName = "[V]";
                break;
            case "real":
                levelShortName = "[R]";
                break;
            case "simulate":
                levelShortName = "[D]";
                break;
            case "register":
                levelShortName = "[M]";
                break;
            default:
                levelShortName = "游客";
        }
        return levelShortName;
    },
    /**
     * 提取对话html
     * @param userId
     * @param nickname
     * @param userType
     * @returns {string}
     */
    getDialogHtml:function(userId,nickname,userType){
        if(userId && studioChat.userInfo.userId!=userId){
            var hasMainDiv=false,gIdDom=$("#studioListId a[class~=ing]"),mainDiv='<div class="dialogbtn" style="display:none;" nk="'+nickname+'" uid="'+userId+'" utype="'+userType+'">';
            if(studioChat.userInfo.userId.indexOf('visitor_')==-1 && userId.indexOf('visitor_')==-1){
                mainDiv+='<a href="javascript:" class="d1" t="0"><span>@TA</span></a>';
                hasMainDiv=true;
            }
            if(gIdDom.attr("aw")=="true"&& common.containSplitStr(gIdDom.attr("awr"),userType)){
                mainDiv+='<a href="javascript:" class="d2" t="1"><span>私聊</span></a>';
                hasMainDiv=true;
            }
            return hasMainDiv?mainDiv+"</div>":'';
        }else{
            return '';
        }
    },
    /**
     * 老师列表滚动
     */
    teachSlide:function(){
        studioChat.teachIndex = 0;
        $("#teacherListId").width(0);
        $('.te_next').click(function(){
            var itemW = $('.te_ul li:first').width();
            if($('.te_ul').width()-studioChat.teachIndex*itemW -$('.te_list .tempwrap').width()>0){
                $(".pointlist").hide();
                $("#teacherListId a.on").removeClass("on");
                studioChat.teachIndex ++;
                $('.te_ul').animate({left: -studioChat.teachIndex*itemW}, "slow");
            }
        });
        $('.te_prev').click(function(){
            if(studioChat.teachIndex!=0){
                $(".pointlist").hide();
                $("#teacherListId a.on").removeClass("on");
                studioChat.teachIndex --;
                var itemW = $('.te_ul li:first').width();
                $('.te_ul').animate({left: -studioChat.teachIndex*itemW}, "slow");
            }
        });
    },
    /**
     * 设置在线用户
     * @param row
     * @returns {boolean}
     */
    setOnlineUser:function(row){
        if(row.userType==2){
            $("#teacherListId li[uid='"+row.userId+"']").remove();//存在则移除旧的记录
            var tSize=$("#teacherListId li").length;
            var loc_teElem = $('<li uid="'+row.userId+'" utype="'+row.userType+'" t="'+tSize+'"><a title="' + (row.introduction||"") + '" href="javascript:" class="te_btn"><img class="headimg" src="'+row.avatar+'"><span><strong>'+row.nickname+'</strong><i>'+(row.position||'')+'</i></span><div class="mp"><b></b>老师<br>观点</div></a></li>');
            $("#teacherListId").append(loc_teElem);
            $("#teacherListId").width($("#teacherListId").width() + loc_teElem.width());
            $(".te_dialoglist").append(studioChat.getDialogHtml(row.userId,row.nickname,row.userType));
            loc_teElem.click(function(){
                if($(".te_dialoglist div").length>0){
                    var mydialog = $('.te_dialoglist .dialogbtn').eq($(this).index());
                    mydialog.attr("avs",$(this).find(".headimg").attr("src"));
                    studioChat.openDiaLog(mydialog);
                    mydialog.css('left',$(this).offset().left-$('.chat').offset().left+5);
                }
            }).find(".mp").click(function(e){
                if (window.event){
                    window.event.cancelBubble=true;
                }else{
                    if(e){
                        e.stopPropagation();
                    }
                }
                var pdom=$(this).parent();
                if(pdom.hasClass("on")){
                    return;
                }
                $("#teacherListId a").removeClass("on");
                pdom.addClass("on");
                var wd=$('.te_ul li:first').width(),pd=pdom.parent();
                var dt=(parseInt(pd.attr("t"))-Math.abs(studioChat.teachIndex))*wd+38,pw=$(".pointlist").width(),ct=$(".chat").width();
                if(dt+pw>=ct){
                    dt=ct-pw;
                }
                var uid=pd.attr("uid");
                studioChat.getArticleList("trade_strategy_article",studioChat.userInfo.groupId,1,1,1,'{"createDate":"desc"}',uid,function(dataList){
                    $(".pointlist").attr("uid",uid);
                    if(dataList && dataList.result==0 && dataList.data && dataList.data.length>0) {
                        var data = dataList.data[0],row = data.detailList[0];
                        $(".pointlist .tit label").text(row.title);
                        $(".pointlist .te-txt").html(row.content);
                    }else{
                        $(".pointlist .tit label").text("亲，老师还未发布观点哦");
                        $(".pointlist .te-txt").html("");
                    }
                });
                $(".pointlist").css({left:dt+'px'}).show();
            });
        }else{
            $("#userListId li[id='"+row.userId+"']").remove();//存在则移除旧的记录
            var dialogHtml=studioChat.getDialogHtml(row.userId,row.nickname,row.userType),isMeHtml="",unameCls = "uname",seq=row.sequence;
            if(studioChat.userInfo.userId==row.userId){
                isMeHtml = "【我】";
                unameCls += " ume";
                seq = "0";
            }
            var lis=$("#userListId li"),
                liDom='<li id="'+row.userId+'" t="'+seq+'" utype="'+row.userType+'">'+dialogHtml+'<a href="javascript:" t="header" class="' + unameCls + '"><div class="headimg">'+studioChat.getUserAImgCls(row.clientGroup,row.userType,row.avatar)+'</div>'+row.nickname+isMeHtml+'</a></li>';
            if(lis.length==0){
                $("#userListId").append(liDom);
            }else if(isMeHtml!=""){
                lis.first().before(liDom);
            }else{
                var isInsert=false,seqTmp= 0,nickTmp='';//按用户级别顺序插入
                lis.each(function(){
                   seqTmp=parseInt($(this).attr("t"));
                   if(row.sequence<seqTmp){
                       $(this).before(liDom);
                       isInsert=true;
                       return false;
                   }else if(row.sequence==seqTmp){
                       nickTmp=$(this).find("a").text();
                       if(row.nickname<=nickTmp){
                           $(this).before(liDom);
                           isInsert=true;
                           return false;
                       }
                   }
                });
                if(!isInsert){
                    $("#userListId").append(liDom);
                }
            }
            if(common.isValid(dialogHtml)){
                $("#userListId li[id="+row.userId+"] a[t=header]").click(function(){
                    $('.user_box li').removeClass('zin');
                    $(this).parent().addClass('zin');
                    var pv=$(this).prev();
                    pv.attr("avs",$(this).find(".headimg img").attr("src"));
                    studioChat.openDiaLog(pv);
                    $('.dialogbtn',$(this).parent()).css('left','7px');
                });
            }
        }
        return true;
    },
    /**
     * 离开房间提示
     */
    leaveRoomTip:function(flag,userIds){
        if(flag=="forcedOut"){//强制下线分析师
            if(userIds){
                for(var i in userIds){
                    $("#teacherListId li[uid='"+userIds[i]+ "']").remove();
                    $(".pointlist[uid='"+userIds[i] + "']").hide();
                }
            }
            return;
        }
        if("visitor"==studioChat.userInfo.clientGroup){
             return;
        }
        var txt='';
        if(flag=="roomClose"){
            txt='房间已停用，';
        }
        if(flag=="otherLogin"){
            txt='您的账号已在其他地方登陆，';
        }
        $(".blackbg").show();
        $("#tipMsgBox").fadeIn(0).delay(6000).fadeOut(200).find("span").text("注意："+txt+"正自动登出.....");
        window.setTimeout(function(){//3秒钟后登出
            window.location.href="/studio/logout";
        },3000);
    },
     /*
     * 设置socket
     */
    setSocket:function(){
        this.socket = common.getSocket(io,this.socketUrl,this.userInfo.groupType);
        //建立连接
        this.socket.on('connect',function(){
            console.log('connected to server!');
            studioChat.userInfo.socketId=studioChat.socket.id;
            var currTab=$("#studioListId a[class~=ing]");
            studioChat.socket.emit('login',{userInfo:studioChat.userInfo,lastPublishTime:$("#dialog_list>div:last").attr("id"),fUserTypeStr:currTab.attr("awr"), allowWhisper : currTab.attr("aw")});
            $(".img-loading[pf=chatMessage]").show();
        });
        //进入聊天室加载的在线用户
        this.socket.on('onlineUserList',function(data,dataLength){
            $('#userListId').html("");
            //如客户数小于200，则追加额外游客数
            if($("#studioListId a[class~=ing]").attr("av")=="true" && dataLength<=200){
                var randId= 0,size=dataLength<=10?60:(200/dataLength)*3+10;
                for(var i=0;i<size;i++){
                    randId=common.randomNumber(6);
                    data[("visitor_"+randId)]=({userId:("visitor_"+randId),clientGroup:'visitor',nickname:('游客_'+randId),sequence:14,userType:-1});
                }
            }
            var row=null;
            for(var i in data){
                row=data[i];
                studioChat.setOnlineUser(row);
            }
            studioChat.setCSList();//设置客户经理列表
            studioChat.setListScroll(".user_box");
        });
        //断开连接
        this.socket.on('disconnect',function(e){
            console.log('disconnect');
            //studioChat.socket.emit('login',studioChat.userInfo);//重新链接
        });
        //出现异常
        this.socket.on("error",function(e){
            console.error('e:'+e);
        });
        //信息传输
        this.socket.on('sendMsg',function(data){
            if(data.fromUser.toUser && data.fromUser.toUser.talkStyle==1){//如果是私聊则转到私聊框处理
                studioChat.setWhContent(data,false,false);
            }else{
                studioChat.setContent(data,false,false);
            }
        });
        //通知信息
        this.socket.on('notice',function(result){
            switch (result.type)
            {
                case 'onlineNum':{
                    var data=result.data,userInfoTmp=data.onlineUserInfo;
                    if(data.online){
                        studioChat.setOnlineUser(userInfoTmp);
                        if(userInfoTmp.userType==3 && studioChat.isAllowWh()) {//客户经理上线
                            var onlineCs=$(".cm_wrap a[uid=" + userInfoTmp.userId + "]");
                            onlineCs.find("img").removeClass("have_op");
                            $(".cm_wrap").prepend(onlineCs);
                            studioChat.showTwoCS();//只显示两个CS
                        }
                    }else{
                        if(userInfoTmp.userType==2){
                            $("#teacherListId li[uid='"+userInfoTmp.userId + "']").remove();
                            $(".pointlist[uid='"+userInfoTmp.userId + "']").hide();
                        }else{
                            if(studioChat.userInfo.userId!=userInfoTmp.userId){
                                $("#userListId #"+userInfoTmp.userId).remove();
                                studioChat.setListScroll(".user_box");
                            }
                            if(userInfoTmp.userType==3 && studioChat.isAllowWh()) {//客户经理下线
                                var onlineCs=$(".cm_wrap a[uid=" + userInfoTmp.userId + "]");
                                onlineCs.find("img").addClass("have_op");
                                $(".cm_wrap").append(onlineCs);
                                if($(".cm_wrap a:not(:hidden)").length>0){
                                    studioChat.showTwoCS();//只显示两个CS
                                }
                            }
                        }
                    }
                    //设置私聊在线情况
                    studioChat.setWhOnlineTip(userInfoTmp.userId,data.online);
                    break;
                }
                case 'removeMsg':
                    $("#"+result.data.replace(/,/g,",#")).remove();
                    studioChat.setTalkListScroll();
                    break;
                case 'leaveRoom':{
                    studioChat.leaveRoomTip(result.flag,result.userIds);
                    break;
                }
                case 'pushInfo':{
                    var data=result.data;
                    if(data.position==1){//私聊框
                        studioChat.pushObj.whPush={info:data.content,publishTime:data.publishTime,infoId:data.contentId};
                        window.setTimeout(function(){//按推送结果提示私聊
                            var aDom = $(".cm_wrap a");
                            if(studioChat.getWhBox().length==0 && aDom.length>0){//没有私聊框，则弹出提示
                                var lps=aDom.find("img:not(.have_op)"),ckDom=null;
                                if(lps.length>0){
                                    ckDom=$(lps.get(common.randomIndex(lps.length))).parent();
                                }else{
                                    ckDom=$(aDom.get(common.randomIndex(aDom.length)));
                                }
                                ckDom.click();
                            }
                        },data.timeOut*60*1000);
                    }else if(data.position==3){ //公聊框
                        studioChat.talkBoxPush.initTBP(data.infos);
                    }
                    break;
                }
                case 'approvalResult':
                {
                    var data=result.data;
                    if(data.refuseMsg){
                        var publishTimeArr=data.publishTimeArr;
                        for(var i in publishTimeArr){
                            $("#"+publishTimeArr[i]+" .dcont em[class=ruleTipStyle]").html("已拒绝");
                        }
                    }else{
                        for (var i in data) {
                            studioChat.formatUserToContent(data[i]);
                        }
                        studioChat.setTalkListScroll(true);
                    }
                    break;
                }
            }
        });
        //信息传输
        this.socket.on('loadMsg',function(data){
            $(".img-loading[pf=chatMessage]").hide();
            var msgData=data.msgData,isAdd=data.isAdd;
            if(!isAdd) {
                $("#content_ul").html("");
            }
            if(msgData && $.isArray(msgData)) {
                msgData.reverse();
                for (var i in msgData) {
                    studioChat.formatUserToContent(msgData[i]);
                }
            }
            studioChat.setTalkListScroll(true);
        });
        //加载私聊信息
        this.socket.on('loadWhMsg',function(result){
            var data=result.data;
            if(result.type=='offline'){//离线提示信息
                if(data && !$.isEmptyObject(data)){
                    studioChat.setWhBox(true);
                    var k=0,userId='',lb='',userType;
                    for(var index in data){
                        if(k==0){
                            lb='<label class="tip_nk">'+data[index].nickname+'</label>';
                            userId=index;
                            userType=data[index].userType;
                        }
                        studioChat.setWhVisitors(data[index].userType,index,data[index].nickname,$("#userListId li[id='"+index+"']").length>0);
                        studioChat.setWhAvatar(data[index].userType,index,data[index].avatar);
                    }
                    studioChat.setWhTipInfo(userType,lb,userId);
                }
            }else{//私聊框中每个用户tab对应的私聊信息
                if(data && $.isArray(data)) {
                    var hasImg= 0,row=null;
                    data.reverse();
                    var hasPushInfo=0;
                    var targetDom=$('.mult_dialog a[uid='+result.toUserId+']');
                    for (var i in data) {
                        row = data[i];
                        if(row.userType==3 && studioChat.setWhPushInfo(targetDom,row.publishTime)){
                            hasPushInfo++;
                        }
                        studioChat.formatUserToContent(row,true,result.toUserId);
                        if(row.content.msgType==studioChat.msgType.img){
                            hasImg++;
                        }
                    }
                    if(hasPushInfo==0){
                        studioChat.setWhPushInfo(targetDom,null);
                    }
                    if(hasImg>0){
                        $('.swipebox').swipebox();
                    }
                    studioChat.setTalkListScroll(true,$('#wh_msg_'+result.toUserId+' .wh-content'),'dark');
                }
            }
        });
    },
    /**
     * 设置私聊推送信息
     * @param dom
     */
    setWhPushInfo:function(dom,publishTime){
        if($.isEmptyObject(studioChat.pushObj.whPush)){
            return false;
        }
        if(publishTime && publishTime<studioChat.pushObj.whPush.publishTime){
            return false;
        }
        var uid=dom.attr("uid"),nk=dom.find("span").text();
        if($('#wh_msg_'+uid+' div[id='+studioChat.pushObj.whPush.publishTime+']').length>0){
            return false;
        }
        var sendObj={fromUser:{publishTime:studioChat.pushObj.whPush.publishTime,userId:uid,nickname:nk,userType:3},content:{msgType:studioChat.msgType.text,value:studioChat.pushObj.whPush.info,infoId:studioChat.pushObj.whPush.infoId}};
        studioChat.setWhContent(sendObj,false,false,true);//直接把数据填入内容栏
        return true;
    },
    /**
     * 聊天记录数据转换
     * @param row
     * @param isWh
     * @param toWhUserId
     */
    formatUserToContent:function(row,isWh,toWhUserId){
        var fromUser = {
            userId: row.userId,
            nickname: row.nickname,
            avatar: row.avatar,
            userType: row.userType,
            groupId: row.groupId,
            clientGroup:row.clientGroup,
            publishTime: row.publishTime,
            toUser:row.toUser,
            avatar:row.avatar,
            position:row.position
        };
        if(isWh){
            fromUser.toWhUserId=toWhUserId;
            studioChat.setWhContent({fromUser: fromUser,content:row.content},false,true);
        }else{
            studioChat.setContent({fromUser: fromUser,content:row.content},false,true);
        }
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
            studioChat.pushObj.talkPush = infos;
            this.start();
        },

        /**
         * 清空定时器，在服务器重启的时候，会重新触发notice，此时需要清空之前所有的定时器
         */
        clear : function(){
            if(studioChat.pushObj.talkPushInterval){
                window.clearInterval(studioChat.pushObj.talkPushInterval);
                studioChat.pushObj.talkPushInterval = null;
            }
            var loc_infos = studioChat.pushObj.talkPush;
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
            var loc_infos = studioChat.pushObj.talkPush;
            if(loc_infos && loc_infos.length > 0){
                studioChat.pushObj.talkPushInterval = window.setInterval(function(){
                    studioChat.talkBoxPush.check();
                }, 10000);
            }
        },

        /**
         * 检查所有推送任务
         */
        check : function(){
            var loc_infos = studioChat.pushObj.talkPush;
            var loc_info = null;
            for(var i = 0, lenI = loc_infos.length; i < lenI; i++){
                loc_info = loc_infos[i];
                if(loc_info.startFlag){
                    continue;
                }
                if(common.dateTimeWeekCheck(loc_info.pushDate, false, studioChat.serverTime)){
                    loc_info.startFlag = true;
                    loc_info.timeoutId = window.setTimeout(studioChat.talkBoxPush.delayStartTask(loc_info), (loc_info.onlineMin || 0) * 60 * 1000);
                }
            }
        },

        /**
         * 延迟启动单个定时任务
         * @param info
         */
        delayStartTask : function(info){
            return function(){
                studioChat.talkBoxPush.showMsg(info);
                if(info.intervalMin && info.intervalMin > 0){
                    info.intervalId = window.setInterval(studioChat.talkBoxPush.startTask(info), info.intervalMin * 60 * 1000);
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
                if(common.dateTimeWeekCheck(info.pushDate, false, studioChat.serverTime)){
                    studioChat.talkBoxPush.showMsg(info);
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
            if($(".scrollbtn").hasClass("on")) {
                studioChat.setTalkListScroll(true);
            }
        }
    }
};
// 初始化
$(function() {
    studioChat.init();
});