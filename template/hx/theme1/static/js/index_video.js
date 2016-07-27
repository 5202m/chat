/**
 * 直播间视频通用操作类
 * author Alan.wu
 */
var videos={
    blwsPlayer:null,//保利威视
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
                    cateDiv.append('<li title="'+row.title+'"><a href="javascript:" ct="'+data[i].categoryId+'" id="'+data[i]._id+'" t="'+((common.isValid(data[i].mediaUrl) && data[i].mediaUrl.indexOf('.mp4')!=-1)?'mp4':'')+'" vUrl="'+data[i].mediaUrl+'" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'video_play\',$(this).text()]);"><i></i>'+row.title+'</a></li>');
                }
                indexJS.setListScroll(cateDiv,{isCustom:false,theme:"minimal-dark"});
                //播放视频
                $("#teachVideoId li a").click(function(){
                    $("#teachVideoId li a.on").removeClass("on");
                    $(this).addClass("on");
                    $(".max_box").show();
                    //var minBox=$(".min_box").attr("vid",this.id).hide();
                    //minBox.find(".v_cate").text($(this).parents('.cate_box').find(".cate_name").text());
                    $("#video_content .video-name").text($(this).text());
                    videos.setVideo($(this));
                    //显示课程简述
                    /*var vdId=$(this).attr("id");
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
                    indexJS.setListScroll('#tvInfoId');//设置滚动*/
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
            $("#lvDivId").show();
            this.selectVdType("lv");
        }else{
            $("#tvDivId").show();
            $("#lvDivId").hide();
            this.selectVdType("tv");
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
                $('#teachVideoId ul').mCustomScrollbar("scrollTo", "#"+vdom.attr("id"));
            }
            $("#teachVideoId .cate_box").removeClass("show");
            $('div[t='+vdom.attr('ct')+']').addClass('show');
            vdom.click();
        }else{
            currVdDom.click();
        }
    },
    /**
     * 选择视频种类
     * @param t
     */
    selectVdType:function(t){
        if(t=='lv'){
            if(window.SewisePlayer){//停播放教学视频
                SewisePlayer.doStop();
            }
            $('.mod_video .classmore').hide();
            $("#tvDivId").hide().find("iframe").remove();
            $("#lvDivId").show();
            $('.video-checkbox').text("直播视频").attr("t",'lv');
            $(".video-checkbox-list").prepend($('.video-checkbox-list a[t=lv]'));
        }else{
            $('.mod_video .classmore').show();
            $('.video-checkbox').text("教学视频").attr("t",'tv');
            $(".video-checkbox-list").prepend($('.video-checkbox-list a[t=tv]'));
            $("#tvDivId").show();
            $("#lvDivId").hide();
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
            //videos.setVdMaxBox();
        });
        /**
         * 视频切换事件
         */
        $('.video-checkbox-list a').click(function () {
            var t=$(this).attr("t");
            videos.selectVdType(t);
            $('.video-checkbox-list').hide();
            if(t == 'lv'){
                videos.playVideoByDate(false);
                $('.mod_video .classmore').hide();
            }else {
                videos.playMp4Vd();
                $('.mod_video .classmore').show();
            }
        });
        $('.mod_video .classmore').hover(function () {
            $(this).find('ul').show();
        },function() {
            $(this).find('ul').hide();
        });
        $('#video_content').hover(function (e) {
            $(this).children('.video-class').removeClass('dn');
            if($('#tvDivId').is(':visible')) {
                $('#teachVideoId,#video_content .video-name,.classmore').show();
            }
        },function(e) {
            if(!$(e.target).hasClass('video-class') && !$(e.target).hasClass('mod_video')){
                $(this).children('.video-class').addClass('dn');
                if($('#tvDivId').is(':visible')) {
                    $('#teachVideoId,#video_content .video-name,.classmore').hide();
                }
            }
        });
        $('.video-checkbox-list').mouseleave(function () {
            $(this).hide();
        });
        $('.video-class-checked').click(function(){
            $(".video-checkbox-list").toggle();
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
         * 教学视频列表切换
         */
        $("#teachVideoId .cate_name").click(function(){
            $("#teachVideoId .cate_box").removeClass("show");
            videos.setVideoList($(this).parent().addClass("show").attr("t"));
        });
        /**
         *  教学视频视频框鼠标移入移出事件
         */
        /*$("#tvDivId").hover(function() {
            if($(".max_box").is(':hidden')) {
                $(".min_box,.v_cate,.v_name").show();
            }
        },function(){
            $(".max_box,.min_box").hide();
        });*/
    },
    /**
     * 客户端视频任务
     */
    clientVideoTask:function(){
        var exSrc=$("#lvDivId embed").attr("src");
        if($("#lvVideoId").is(":visible")&&(exSrc && exSrc.indexOf("yy.com")==-1) && ($("#lvVideoId").find("object").length==0)){//如果非主直播的其他直播
            videos.playVideoByDate(false);
        }
    },
    /**按直播时间播放
     * @param isInit
     * 备注：按时间点播放yy视频,不符合时间点直接播放视频
     */
    playVideoByDate:function(isInit){
        var course=common.getSyllabusPlan(indexJS.syllabusData,indexJS.serverTime);
        if(!course||(course.courseType!=0 && common.isBlank(course.studioLink))||course.isNext|| course.courseType==0){
            if(isInit){
                if(course && !course.isNext /*&& course.courseType==0*/){
                    this.setVdTab(true);
                    this.setStudioInfo(course);
                    this.setStudioTip(true);
                }else{
                    this.setVdTab(false);
                    this.playMp4Vd();
                    this.synCourseStyle(null);
                }
            }else{
                this.setStudioInfo(course);
            }
        }else{//直播时间段，则播放直播
            this.setVdTab(true);
            this.setStudioVideoDiv(course.studioLink);
            this.synCourseStyle(course);
        }
    },
    /**
     * 同步课程样式
     * @param course
     */
    synCourseStyle:function(course){
        $('.course_tab li a').removeClass("on");
        if(course){
            $('.course_tab[d='+course.day+']').find('li a[st="'+course.startTime+'"][et="'+course.endTime+'"]').addClass("on");
        }
    },
    /**
     * 设置直播提示
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
            var txt='当前暂无直播，请关注下节课';
            if(!course.isNext && course.courseType==0){
                //txt='当前正在文字直播';
                var  url='';
                var row=null;
                for(var i in indexJS.syllabusData.studioLink){
                    row=indexJS.syllabusData.studioLink[i];
                    if(row.code=='1'){
                        url=row.url;
                        break;
                    }
                }
                this.setStudioVideoDiv(url);
                return;
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
     * 设置直播视频
     * @param url
     */
    setStudioVideoDiv:function(url){
        $("#nextCourse").hide();
        $("#lvVideoId").show().html("");
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
                        url: '/base/lib/flowplayer/flowplayer.rtmp.swf',
                        netConnectionUrl: urlGroupArr[1]
                    }
                },
                onError:function(e){
                }
            });
        }else{
            $("#lvVideoId .img-loading").fadeIn(0).delay(2000).fadeOut(200);
            $(videos.getEmbedDom(url)).appendTo('#lvVideoId');
        }
    },
    /**
     * 设置直播信息
     */
    setStudioInfo:function(course){
        if(!course){
            $("#nextCourse").find(".ntext").text("当前暂无直播");
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
        //提取客户信息
        $.getJSON('/hxstudio/getCourseInfo',{day:course.day,startTime:course.startTime,endTime:course.endTime,authorId:course.lecturerId},function(data){
            $("#lvInfoId").attr("dy",course.day).attr("st",course.startTime).attr("et",course.endTime);
            $("#lvInfoId .intro p").text(data.remark);
            indexJS.setListScroll('#lvInfoId .intro p');//设置滚动
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
                        common.getJson("/hxstudio/setUserPraise",{clientId:indexJS.userInfo.userId,praiseId:_this.attr("uid")},function(result){
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
    },
    /**
     *
     * @param isStudio 是否直播设置视频
     * @param thisDom
     * @param studioUrl
     */
    setVideo:function(thisDom){
        try{
            this.setStudioTip(false);
            $("#lvVideoId").html("");//播放教学视频则移除直播元素
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
    }
};