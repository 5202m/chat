/**
 * 视频通用操作类
 * author Alan.wu
 */
var videos={
    blwsPlayer:null,//保利威视
    newMarIntervalId:0,//新闻滚动
    init:function(){
        this.setEvent();//设置各种事件
        this.setVideoList(null,true);//设置视频列表
        return this;
    },
    /**
     * 设置视频
     * @param categoryId
     */
    setVideoList:function(categoryId,isInit){
        if(isInit){
            var teachTypeArr=$("#teachVideoId").children().map(function(){return $(this).attr("t");}).get();
            categoryId=teachTypeArr[common.randomIndex(teachTypeArr.length)];
        }
        var cateDiv=$('#teachVideoId div[t='+categoryId+'] ul');
        if(cateDiv.find("li").length>0){
            return;
        }
        cateDiv.html("");
        indexJS.getArticleList(categoryId,indexJS.userInfo.groupId,0,1,100,'{"sequence":"desc","publishStartDate":"desc"}',null,function(dataList){
            if(dataList && dataList.result==0){
                var data=dataList.data;
                var row=null;
                for(var i in data){
                    row=data[i].detailList[0];
                    cateDiv.append('<li title="'+row.title+'"><a href="javascript:" ct="'+data[i].categoryId+'" id="'+data[i]._id+'" t="'+((common.isValid(data[i].mediaUrl) && data[i].mediaUrl.indexOf('.mp4')!=-1)?'mp4':'')+'" vUrl="'+data[i].mediaUrl+'" onclick="_gaq.push([\'_trackEvent\', \'fx_studio\', \'video_play\',$(this).text()]);"><i></i>'+row.title+'</a></li>');
                }
                indexJS.setListScroll(cateDiv,{isCustom:false,theme:"minimal-dark"});
                //播放视频
                $("#teachVideoId li a").click(function(){
                    $("#teachVideoId li a.on").removeClass("on");
                    $(this).addClass("on");
                    $(".max_box").show();
                    var minBox=$(".min_box").attr("vid",this.id).hide();
                    minBox.find(".v_cate").text($(this).parents('.cate_box').find(".cate_name").text());
                    minBox.find(".v_name label").text($(this).text());
                    videos.setVideo($(this));
                    //显示课程简述
                    var vdId=$(this).attr("id");
                    if($("#tvInfoId").attr("tid")==vdId){
                        return;
                    }
                    indexJS.getArticleInfo(vdId,function(row){
                        if(row){
                            $("#tvInfoId").attr("tid",row._id);
                            var detail=row.detailList[0];
                            $("#tvInfoId p.remark").text(detail.remark);
                            $("#tvInfoId p.content").text(detail.seoDescription);
                            var pd=$("#tvInfoId .te_detail");
                            var info=detail.authorInfo;
                            if(info){
                                pd.find("strong").attr("uid",info.userId).text(info.name);
                                pd.find(".rcont i").text(info.position);
                                pd.find("img").attr("src",info.avatar);
                                pd.find("img").attr("src",info.avatar);
                            }
                        }
                    });
                    indexJS.setListScroll('#tvInfoId');//设置滚动
                    chatAnalyze.setUTM(false,{courseId:vdId});//统计教学视频点击数
                });
            }
            if(isInit){
                videos.playVideoByDate(true);
            }
        });
    },
    /**
     * 设置视频tab的可见
     * @param isStudio
     */
    setVdTab:function(isStudio){
        if(isStudio){
            if(window.SewisePlayer){//停播放教学视频
                SewisePlayer.doStop();
            }
            $("#tvDivId").hide().find("iframe").remove();
            if($("#vdTabId a:eq(1)").is(".on")) {
                $(".listcont .list_tab:first,#vdTabId a:first").addClass("on");
                $(".listcont .list_tab:eq(1),#vdTabId a:eq(1)").removeClass("on");
            }
            $("#lvDivId").show();
        }else{
            if($("#vdTabId a:first").is(".on")) {
                $(".listcont .list_tab:first,#vdTabId a:first").removeClass("on");
                $(".listcont .list_tab:eq(1),#vdTabId a:eq(1)").addClass("on");
            }
            $("#tvDivId").show();
            $("#lvDivId").hide();
        }
    },
    /**
     *随机播放MP4视频
     * mustRand 强制随机
     */
    playMp4Vd:function(mustRand){
        var currVdDom=$("#teachVideoId a[class=on]");
        if(mustRand||currVdDom.length<=0){
            var mpDom=$("#teachVideoId li a[t=mp4]");
            var vdom=null;
            if(mpDom.length<=0){
                vdom=$("#teachVideoId li:first a");
            }else{
                vdom=$(mpDom.get(common.randomIndex(mpDom.length)));
                $('#teachVideoId div[t='+vdom.attr("ct")+'] ul').mCustomScrollbar("scrollTo", "#"+vdom.attr("id"));
            }
            vdom.click();
            $("#teachVideoId .cate_box").removeClass("show");
            vdom.parents(".cate_box").addClass("show");
        }else{
            currVdDom.click();
        }
    },
    /**
     * 设置教学视频列表的显隐
     */
    setVdMaxBox:function(){
        if($(".max_box").is(':hidden')){
           return;
        }
        $(".max_box").slideUp(1000,function(e){
            $(".min_box").fadeIn("fast");
        });
    },
    /**
     * 设置各种事件
     */
    setEvent:function(){
        //maxbox控制
        $(".max_box").hover(function() {
        },function(){
            videos.setVdMaxBox();
        });
        /**
         * 在线视频与教学视频切换事件
         */
        $("#vdTabId a").click(function(){
            $("#vdTabId a").removeClass("on");
            $(this).addClass("on");
            var idx=$(this).index();
            $(".listcont .list_tab").removeClass("on").eq(idx).addClass("on");
            if(idx != 2){//非晒单
                var currDom=$(".mod_video").hide().eq(idx);
                currDom.show();
                if(idx==0){//在线视频
                    videos.playVideoByDate(false);
                }else{//教学视频
                    videos.playMp4Vd();
                    videos.setVdMaxBox();
                }
            }
        });
        /**
         * 教学视频列表可视事件
         */
        $("#vdLs_min,#vdLs_max").click(function(){
            if(this.id=="vdLs_min"){
                $(".min_box").hide();
                $(".max_box").show();
            }else{
                $(".max_box").hide();
                $(".min_box").show();
            }
        });

        /**
         *  教学视频视频框鼠标移入移出事件
         */
        $("#tvDivId").hover(function() {
            if($(".max_box").is(':hidden')) {
                $(".min_box,.v_cate,.v_name").show();
            }
        },function(){
            $(".max_box,.min_box").hide();
        });
        /**
         * 教学视频列表切换
         */
        $("#teachVideoId .cate_name").click(function(){
            $("#teachVideoId .cate_box").removeClass("show");
            videos.setVideoList($(this).parent().addClass("show").attr("t"));
        });

        /**绑定晒单相关事件*/
        videos.sd.setSDEvent();

        /**滚动字幕事件*/
        this.bindEventRollNews();
        
        /**天使计划广告
        $('.video_ad .ad_closebtn').click(function() {
            $('.video_ad').hide();
        });*/
    },
    /**
     * 客户端视频任务
     */
    clientVideoTask:function(){
        var exSrc=$("#lvDivId embed").attr("src");
        if($("#nextCourse").is(":visible") //显示下次课程介绍
            || $("#lvVideoId").is(":visible")&&(exSrc && exSrc.indexOf("yy.com")==-1) && ($("#lvVideoId").find("object").length==0))//如果非主在线视频的其他在线视频
        {
            videos.playVideoByDate(false);
        }
    },
    /**按时间播放
     * @param isInit
     * 备注：按时间点播放yy视频,不符合时间点直接播放视频
     */
    playVideoByDate:function(isInit){
        var course=indexJS.courseTick.course;
        if(!course||(course.courseType!=0 && common.isBlank(course.studioLink))||course.isNext|| course.courseType==0){
            if(isInit){
                if(course && !course.isNext && course.courseType==0){
                    this.setVdTab(true);
                    this.setStudioInfo(course);
                    this.setStudioTip(true);
                }else{
                    this.setVdTab(false);
                    this.playMp4Vd();
                }
            }else{
                this.setStudioInfo(course);
            }
            //新闻滚动
            this.newsMarquee(false);
        }else{
            this.setVdTab(true);
            this.setStudioVideoDiv(course.studioLink,course.courseType);
            this.setStudioInfo(course);
            this.setStudioTip(course.courseType!=2);
            //新闻滚动
            this.newsMarquee(1==course.courseType);
        }
    },
    /**
     * 设置提示
     * @param isLive
     */
    setStudioTip:function(isLive){
        if(isLive){
            $(".mod_room .titbar > span i").removeClass("off").addClass("on");
        }else{
            $(".mod_room .titbar > span i").removeClass("on").addClass("off");
        }
    },
    /**
     * 设置下个课程
     * @param course
     */
    setNextCourse:function(course,data){
        if(course){
            var txt='当前暂无在线视频，请关注下节课';
            if(!course.isNext && course.courseType==0){
                txt='文字在线时间';
            }
            $("#nextCourse").find(".ntext").text(txt);
            $("#nextCourse .nextbox").show();
            $("#nextCourse").find("img").attr("src",data.avatar);
            $("#nextCourse").find(".t_name").text(data.name);
            $("#nextCourse").find(".live_name").text(course.title);
            $("#nextCourse").find(".time").text(common.daysCN[course.day]+' '+course.startTime+' - '+course.endTime);
        }
        $("#lvVideoId").hide();
        $("#nextCourse").show();
    },
    /**
     * 提取embed对应的dom
     * @param url
     */
    getEmbedDom:function(url){
        return '<embed src="'+url+'" autostart="true" wmode="Opaque" quality="high" width="100%" height="100%" align="middle" allowScriptAccess="never" allowFullScreen="true" mode="transparent" type="application/x-shockwave-flash"></embed>';
    },
    /**
     * 设置在线视频
     * @param url
     * @param courseType
     */
    setStudioVideoDiv:function(url,courseType){
        if($("#lvVideoId").is(":visible") && $("#lvVideoId").data("url") == url){
            return;
        }
        $("#nextCourse").hide();
        $("#lvVideoId").show().data("url", url).html("");
        if(url.indexOf("rtmp")!=-1){
            var urlGroupArr=/(.*)\/([0-9]+)$/g.exec(url);
            if(!urlGroupArr || urlGroupArr.length<3){
                return;
            }
            flowplayer("lvVideoId", "/base/lib/flowplayer/flowplayer.swf",{
                clip: {
                    url: urlGroupArr[2],
                    provider: 'rtmp',
                    live: true
                },
                plugins: {
                    rtmp: {
                        proxyType: 'best',
                        url: '/base/lib/flowplayer/flowplayer.rtmp.swf',
                        netConnectionUrl: urlGroupArr[1]
                    }
                },
                onError:function(e){
                }
            });
            /*var sdHtml='<div style="position: relative; width: 100%; height: 100%; left: 0px; top: 0px;">'+
                '<object type="application/x-shockwave-flash" id="sewise_player" name="sewise_player" data="/js/lib/flash/SewisePlayer.swf" width="100%" height="100%">'+
                '<param name="allowfullscreen" value="true">'+
                '<param name="wmode" value="transparent">'+
                '<param name="allowscriptaccess" value="always">'+
                '<param name="flashvars" value="autoStart=true&amp;programId=&amp;shiftTime=&amp;lang=zh_CN&amp;type=rtmp&amp;serverApi=ServerApi.execute&amp;skin=/js/lib/flash/skins/liveOrange.swf&amp;title=&amp;draggable=true&amp;published=0&amp;streamUrl='+url+'&amp;duration=3600&amp;poster=&amp;flagDatas=&amp;videosJsonUrl=&amp;adsJsonData=&amp;statistics=&amp;customDatas=&amp;playerName=Sewise Player&amp;clarityButton=enable&amp;timeDisplay=disable&amp;controlBarDisplay=enable&amp;topBarDisplay=disable&amp;customStrings=&amp;volume=0.6&amp;key=&amp;trackCallback=">'+
                '</object>'+
                '</div>';
            $("#lvVideoId").html(sdHtml);*/
        }else{
            $("#lvVideoId .img-loading").fadeIn(0).delay(2000).fadeOut(200);
            $(videos.getEmbedDom(url)).appendTo('#lvVideoId');
        }
    },
    /**
     * 滚动新闻事件
     */
    bindEventRollNews : function(){
        /**
         * 隐藏滚动文字
         */
        $('.mod_scrollnews .newsclose').click(function(){
            $('.mod_scrollnews .newslist').hide();
            $('.mod_scrollnews .newsbtn').show();
            clearInterval(videos.newMarIntervalId);
            videos.newMarIntervalId=null;
        });

        /**
         * 显示滚动文字
         */
        $('.mod_scrollnews .newsbtn').click(function(){
            $(this).hide();
            $('.mod_scrollnews .newslist').slideDown();
            videos.newsMarquee(true);
        });

        /**
         * 点击显示详细内容
         */
        $("#newscont1 a").live("click", function(){
            if($(this).attr('url')==='false') {
                $("#popMsgTit").text($(this).attr("title"));
                $("#popMsgTxt").html($(this).data("content") || "没有内容");
                $("#popMsgBox,.blackbg").show();
                indexJS.setListScroll(".popMsgBox");
                return false;
            }
        });

        /**
         * 点击显示详细内容
         */
        $("#newscont2 a").live("click", function(){
            if($(this).attr('url')==='false') {
                $("#newscont1 a[tid='" + $(this).attr('tid') + "']").trigger("click");
                return false;
            }
        });
    },
    /**
     * 滚动新闻
     * @param data
     */
    rollNews : function(data){
        var newsPanel = $('#newscont1');
        if(data["delete"]){
            var ids = data.ids.split(',');
            if(ids.length>0){
                for(var i=0;i<ids.length;i++){
                    newsPanel.find('a[tid="' +ids[i]+'"]').remove();
                }
            }
        }else if(data.edit){
            data.isValid = data.isValid  == "true" ? true  : false ;
            //如果不在该组，remove元素；该处不判断房间，修改房间后只能推送到新房间，老房间不remove
            if(data.isValid && (!indexJS.userInfo.clientGroup || ! data.clientGroup ||  $.inArray(indexJS.userInfo.clientGroup, data.clientGroup) == -1)) {
                data.isValid = false ;
            }
            var tids = newsPanel.find('a[tid="' + data.id+'"]');
            if(data.isValid){
                if(tids.size()>0){ //修改
                    if(common.isValid(data.url)){
                        tids.attr({'title': data.title, 'href':data.url,'url':'true'})
                            .html('<i></i><span>' + data.title + '</span>');
                    }else {
                        tids.attr({'title': data.title,'url':'false'})
                            .html('<i></i><span>' + data.title + '</span>')
                            .data('content', data.content);
                    }
                }else{  //新增
                    var title = $('<a href="javascript:void(0);" tid="' + data.id + '" title="' + data.title + '" target="_blank" onclick="_gaq.push([\'_trackEvent\', \'fx_studio\', \'zimu_txt\', \'' + data.title + '\']);"><i></i><span>' + data.title + '</span></a>');
                    if(common.isValid(data.url)) {
                        title.attr({'href':data.url,'url':'true'});
                    }else{
                        title.attr({'url':'false'}).data('content', data.content);
                    }
                    newsPanel.append(title);
                }
            }else{
                if(tids.size()>0) {
                    tids.remove();
                }
            }
        }else{
            if(data.infos){
                var count = data.infos.length,title=null,contents='';
                if(count>0){
                    for(var i = 0 ;i<count ; i++){
                        if(indexJS.userInfo.clientGroup && data.infos[i].clientGroup && $.inArray(indexJS.userInfo.clientGroup, data.infos[i].clientGroup)>-1){
                            if(data.infos[i].pushType == 1 && data.infos[i].contentId && data.infos[i].title){
                                if(common.isValid(data.infos[i].url)){
                                    title = $('<a href="'+data.infos[i].url+'" url="true" tid="' + data.infos[i].contentId + '" title="' + data.infos[i].title + '" target="_blank" onclick="_gaq.push([\'_trackEvent\', \'fx_studio\', \'zimu_txt\', \'' + data.infos[i].title + '\']);"><i></i><span>' + data.infos[i].title + '</span></a>');
                                }else {
                                    title = $('<a href="javascript:void(0);" url="false" tid="' + data.infos[i].contentId + '" title="' + data.infos[i].title + '" target="_blank" onclick="_gaq.push([\'_trackEvent\', \'fx_studio\', \'zimu_txt\', \'' + data.infos[i].title + '\']);"><i></i><span>' + data.infos[i].title + '</span></a>');
                                    title.data('content', data.infos[i].content);
                                }
                                newsPanel.append(title);
                            }
                        }
                    }
                }
            }
        }
        this.newsMarquee(true);
    },
    /**
     * 新闻滚动
     */
    newsMarquee:function (isShow){
        if(videos.newMarIntervalId){
            clearInterval(videos.newMarIntervalId);
            videos.newMarIntervalId=null;
        }
        var speed=30;
        var newsPanel = $(".mod_scrollnews");
        var tab=$("#scrollnews_demo")[0];
        var tab1=$("#newscont1");
        var tab2=$("#newscont2");
        if(isShow && tab1.children().size() > 0){
            newsPanel.show();
        }else{
            newsPanel.hide();
        }
        tab2.html("");
        $(tab).unbind("mouseover mouseout");
        if(isShow){
            tab1.css("width", "auto");
            tab2.css("width", "auto");
            var widthTmp = newsPanel.width() - 27;
            if(tab1.width() < widthTmp){
                tab1.css("width", widthTmp);
                tab2.css("width", widthTmp);
            }
            //需要滚动
            tab2.html(tab1.html());
            /**滚动*/
            var marqueeFunc = function(){
                if(tab1.width()-tab.scrollLeft<=0) {
                    tab.scrollLeft -= tab1.width();
                }else{
                    tab.scrollLeft++;
                }
            };
            videos.newMarIntervalId=window.setInterval(marqueeFunc,speed);
            $(tab).bind("mouseover", function() {
                window.clearInterval(videos.newMarIntervalId);
                videos.newMarIntervalId=null;
            }).bind("mouseout", function() {
                if(videos.newMarIntervalId){
                    window.clearInterval(videos.newMarIntervalId);
                    videos.newMarIntervalId=null;
                }
                videos.newMarIntervalId=window.setInterval(marqueeFunc,speed);
            });
        }
    },
    /**
     * 设置在线视频信息
     */
    setStudioInfo:function(course){
        if(!course){
            $("#nextCourse").find(".ntext").text("当前暂无在线视频");
            $("#nextCourse .nextbox").hide();
            return;
        }
        var dy=$("#lvInfoId").attr("dy"),startTime=$("#lvInfoId").attr("st"),endTime=$("#lvInfoId").attr("et");
        if(dy==course.day && startTime==course.startTime && endTime==course.endTime){
            if(course.isNext||course.courseType==0){
                videos.setNextCourse(null);
            }
            return;
        }
        //提取课程信息
        $.getJSON('/fxstudio/getCourseInfo',{day:course.day,startTime:course.startTime,endTime:course.endTime,authorId:course.lecturerId},function(data){
            $("#lvInfoId").attr("dy",course.day).attr("st",course.startTime).attr("et",course.endTime);
            $("#lvInfoId .intro p").text(data.remark);
            indexJS.setListScroll('#lvInfoId');//设置滚动
            var pd=$("#lvInfoId .te_list").html("");
            var authorArr=data.authors;
            var authorObj=null;
            for(var i in authorArr){
                authorObj=authorArr[i];
                pd.append('<div class="te_detail" uid="'+authorObj.userId+'"><img src="'+authorObj.avatar+'" alt=""><div class="rcont"><span><strong>'+authorObj.name+'</strong><i>'+authorObj.position+'</i></span> <a href="javascript:" class="support" uid="'+authorObj.userId+'"><label>'+authorObj.praiseNum+'</label><i>+1</i></a> </div> </div>')
            }
            //设置点赞事件
            var supClick=$(".te_detail .support");
            if('true'!=supClick.attr('initEvent')){
                supClick.attr('initEvent','true').click(function(){
                    var _this=$(this);
                    try{
                        common.getJson("/fxstudio/setUserPraise",{clientId:indexJS.userInfo.userId,praiseId:_this.attr("uid")},function(result){
                            if(result.isOK) {
                                _this.find('i').fadeIn().delay(400).fadeOut();
                                var lb= _this.find("label");
                                lb.text(common.isValid(lb.text())?(parseInt(lb.text())+1):0);
                            }else{
                                box.showTipBox('亲，已点赞，当天只能点赞一次！');
                            }
                            _this.addClass('supported');
                            _this.attr('title','已点赞');
                        },true);
                    }catch(e){
                        console.error("setPraise->"+e);
                    }
                });
            }
            if(course.isNext || course.courseType==0){
                videos.setNextCourse(course,(authorArr&&authorArr.length>0?authorArr[0]:{avatar:'',name:''}));
            }
        });
        indexJS.getArticleList("trade_strategy_article",indexJS.userInfo.groupId,1,1,1,'{"createDate":"desc"}', null,function(dataList) {
        	if(dataList && dataList.result==0 && dataList.data && dataList.data.length>0) {
                var data = dataList.data[0],row = data.detailList[0];
                $("#lvInfoId p.content").html(row.content);
                indexJS.setListScroll('#lvInfoId');//设置滚动
            }else{
            	$('#lvInfoId p.content').html('亲，老师还未发布观点哦');
            }
        });
    },
    /**
     *
     * @param thisDom
     */
    setVideo:function(thisDom){
        try{
            this.setStudioTip(false);
            $("#lvVideoId").html("");//播放教学视频则移除在线视频元素
            var vUrl=thisDom.attr("vUrl"),title=thisDom.text();
            if(vUrl.indexOf(".html")!=-1){
                if(window.SewisePlayer){//停播放教学视频
                    SewisePlayer.doStop();
                }
                var iframeDom = $("#tVideoId iframe");
                var isAppend = true;
                if(iframeDom.size() > 0){
                    if(iframeDom.attr("src") == vUrl){
                        isAppend = false;
                    }else{
                        iframeDom.remove();
                    }
                }
                if(isAppend){
                    $("#tVideoId").append('<iframe frameborder=0 width="100%" height="100%" src="'+vUrl+'" allowfullscreen></iframe>');
                }
            }else{
                $("#tVideoId iframe").remove();
                if(vUrl.indexOf("type=blws")!=-1){
                    var vidParams=vUrl.split("&");
                    if(vidParams.length>1){
                        var vid=vidParams[1].replace(/^vid=/g,'');
                        if(videos.blwsPlayer){
                            videos.blwsPlayer.changeVid(vid);
                        }else{
                            videos.blwsPlayer = polyvObject('#tVideoId').videoPlayer({
                                width:'100%',
                                height:'100%',
                                'vid' : vid,
                                'flashvars' : {"autoplay":"0","setScreen":"fill"},
                                onPlayOver:function(id){
                                }
                            });
                        }
                    }
                }else{
                    if(window.SewisePlayer){
                        SewisePlayer.toPlay(vUrl, title, 0, true);
                    }else{
                        var srcPathAr=[];
                        srcPathAr.push("/base/lib/sewise.player.min.js?server=vod");
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
                        $("#tVideoId").get(0).appendChild(script);
                        //轮播控制
                        var checkOverFunc = function(){
                            if(!window.SewisePlayer){
                                window.setTimeout(checkOverFunc, 500);
                                return;
                            }
                            SewisePlayer.onPause(function(id){
                                //播放下一节
                                if(SewisePlayer.duration()<= SewisePlayer.playTime()) {
                                    var currDom=$("#teachVideoId li a.on");
                                    var nextA=currDom.parent().next().find("a");
                                    if(nextA.length<=0){//没有则随机播放mp4
                                       videos.playMp4Vd(true);
                                    }else{
                                        nextA.click();
                                    }
                                }
                            });
                        };
                        checkOverFunc();
                    }
                }
            }
        }catch(e){
            console.error("setVideo has error:"+e);
        }
    },
    /**
     * 晒单功能
     * */
    sd : {
        analyst : null, //分析师信息
        tradeList : [], //晒单交易列表
        loadAll : false,
        /**绑定事件*/
        setSDEvent : function(){
            $("#sdNoAuthBox .aid_chat span").bind("click", function(){
                $("#sdNoAuthBox .pop_close").trigger("click");
                var uid = $(this).attr("uid");
                var cs = $("#userListId li[id='"+uid+"']");
                if(cs.size() == 0){
                    cs = $("#userListId li[utype='3']:first");
                }
                cs.find("em").trigger("click");
            });
        },
        /**初始化晒单*/
        initSD : function(){
            var course=indexJS.courseTick.course;
            if(course && course.lecturerId && (!videos.sd.analyst || course.lecturerId.indexOf(videos.sd.analyst.userNo) == -1)){
                $.getJSON('/fxstudio/getShowTradeInfo',{userNo: course.lecturerId},function(data){
                    if(data && data.analyst){
                        videos.sd.analyst = data.analyst;
                        videos.sd.tradeList = data.tradeList || [];
                        videos.sd.loadAll = false;
                        $("#sdInfoId .nosd_tip").hide();
                        videos.sd.showPraiseInfo();
                        videos.sd.showSDInfo();
                    }else{
                        $("#sdInfoId .nosd_tip").show();
                        $("#sdInfoId .te_info").empty();
                        $("#sdInfoId .sd_show .sd_ul").empty();
                    }
                });
            }
        },
        /**点赞事件*/
        showPraiseInfo : function(){
            $("#sdInfoId .te_info").empty();
            var userInfo = this.analyst;
            $("#sdInfoId .te_info").append('<div class="te_detail sd" uid="'+userInfo.userNo+'"><img src="'+userInfo.avatar+'" alt=""><div class="rcont"><span><strong>'+userInfo.userName+'</strong><i class="suc">TA的胜率：<b>'+(userInfo.winRate || '--')+'</b></i></span> <a href="javascript:" class="support" uid="'+userInfo.userNo+'"><label>'+userInfo.praiseNum+'</label><i>+1</i></a> </div> </div>');
            $("#sdInfoId .te_detail .support").click(function(){
                var _this=$(this);
                try{
                    common.getJson("/fxstudio/setUserPraise",{clientId:indexJS.userInfo.userId,praiseId:_this.attr("uid")},function(result){
                        if(result.isOK) {
                            _this.find('i').fadeIn().delay(400).fadeOut();
                            var lb= _this.find("label");
                            lb.text(common.isValid(lb.text())?(parseInt(lb.text())+1):0);
                        }else{
                            box.showTipBox('亲，已点赞，当天只能点赞一次！');
                        }
                        _this.addClass('supported');
                        _this.attr('title','已点赞');
                        //同步在线视频老师中的点赞信息
                        var _that = $("#lvInfoId .te_detail .support[uid='" + videos.sd.analyst.userNo + "']");
                        _that.find("label").text(_this.find("label").text());
                        _that.addClass('supported');
                        _that.attr('title','已点赞');
                    },true);
                }catch(e){
                    console.error("setPraise->"+e);
                }
            });
        },
        /**显示晒单信息*/
        showSDInfo : function(){
            this.showWXInfo();
            $("#sdInfoId .sd_ul").empty();
            this.showTradeList();
        },
        /**显示微信信息*/
        showWXInfo: function(){
            var html = [];
            if(this.analyst.wechatCode){
                html.push('<div class="te_wx">');
                html.push('<div class="wx-qrcode">');
                if(this.analyst.wechatCodeImg){
                    html.push('<img src="' + this.analyst.wechatCodeImg + '" alt="' + this.analyst.wechatCode + '">');
                }
                html.push('</div>');
                html.push('<span class="wx-num">老师微信号: <b>' + this.analyst.wechatCode + '</b></span>');
                html.push('</div>');
                $("#sdInfoId .te_info").append(html.join(""));
            }
        },
        /**显示晒单交易列表*/
        showTradeList : function(){
            if(videos.sd.loadAll){
                return false;
            }
            var start = $("#sdInfoId .sd_ul li").size();
            var listData = videos.sd.tradeList;
            var lenI = !listData ? 0 : listData.length;
            var trade = null;
            var html = [];
            var isNotAuth = indexJS.checkClientGroup("new"), isPos = false;
            for(var i = start; i < lenI && i < start + 6; i++){
                trade = listData[i];
                isPos = !trade.profit;
                html.push('<li><div class="cont">');
                html.push('<div class="sd_tit">');
                html.push('<span class="dep">');
                if(isPos){
                    html.push('持仓中');
                }else{
                    html.push('获利：');
                    html.push('<b' + (/^-/.test(trade.profit) ? ' class="fall"' : '') + '>' + trade.profit + '</b>');
                }
                html.push('</span>');
                html.push('<span class="sdtime">晒单时间: ' + common.formatterDateTime(trade.showDate).substring(5, 16) + '</span>');
                html.push('</div>');
                if(isNotAuth && isPos){
                    html.push('<a href="javascript:videos.sd.showAuthBox()">');
                    html.push('<img src="/fx/theme1/img/sd_default.png"></a>');
                }else{
                    html.push('<a href="' + trade.tradeImg + '" data-lightbox="sd-img" data-title="' + (isPos ? "持仓中" : "获利：" + trade.profit) + '">');
                    html.push('<img src="' + trade.tradeImg + '"></a>');
                }
                html.push('<i></i></div></li>');
            }
            if(i >= lenI - 1){
                videos.sd.loadAll = true;
            }
            $("#sdInfoId .sd_ul").append(html.join(""));
            indexJS.setListScroll($("#sdInfoId .sd_show"), {callbacks : {onTotalScroll : videos.sd.showTradeList}});
        },
        /**显示未授权弹框*/
        showAuthBox:function(){
            var csDom = $("#userListId li[utype='3']:first");
            if(csDom.size() == 0){//没有老师助理在线
                $("#sdNoAuthBox .sdzl").hide();
            }else{
                $("#sdNoAuthBox .sdzl").show();
                $("#sdNoAuthBox .aid_chat img").attr("src", csDom.find(".headimg img").attr("src"));
                $("#sdNoAuthBox .aid_chat span").attr("uid", csDom.attr("id")).text(csDom.find(".uname span:first").text());
            }
            $("#sdNoAuthBox,.blackbg").show();
        }
    }
};