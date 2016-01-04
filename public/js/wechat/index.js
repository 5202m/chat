/**
 * 微信聊天室客户端操作类
 * author Alan.wu
 */
var wechat={
    userInfo:null,
    socketUrl:'',
    socket:null,
    onlineNumArr:{},//在线人数统计
    tabSwiper:null,
    init:function(){
        this.setEvent();
        this.setRoomList(0);
        this.setAdvertisement();
        this.setBulletin();
        this.setSocket();
    },
    /**
     * 请求发送房间外的信息，获取在线人数或进入房间的人数
     */
    getOutRoomOnline:function(){
        var groupIds= $(".expert-ul li .enter-on").map(function(){
            return $(this).attr("rId");
        }).get();
        wechat.socket.emit('outRoomGet',{groupIds:groupIds,groupType:wechat.userInfo.groupType});
    },
    /**
     * 建立socket
     */
    setSocket:function(){
        this.socket = common.getSocket(io,this.socketUrl,this.userInfo.groupType);
        //建立连接
        this.socket.on('connect',function(){
            wechat.socket.emit('outRoomLogin',{groupType:wechat.userInfo.groupType});
            console.log('connected to server!');
        });
        this.socket.on('disconnect',function(e){
            console.log('disconnect');
        });
        //出现异常
        this.socket.on("error",function(e){
            console.error('e:'+e);
        });
        //通知信息
        this.socket.on('notice',function(result){
            switch (result.type)
            {
                case 'onlineNum':
                {
                    var data=result.data;
                    if(data.rOnlineSizeArr){
                        var onlineSize=0,fo=null;
                        for(var gId in data.rOnlineSizeArr){
                            onlineSize=data.rOnlineSizeArr[gId];
                            wechat.onlineNumArr[gId]=onlineSize;
                            fo=$('.expert-ul li .fj-rens[rId='+gId+']');
                            fo.html(onlineSize);
                            var aDom=$('.expert-ul li .fxs-btn a[rId='+gId+']');
                            if(aDom.attr("dw")=="true"){//开放日期允许的前提下，判断人数切换样式
                                if(parseInt(fo.next("label").text())<=onlineSize){//最大人数小于等于当前人数，不能进入
                                    aDom.removeClass("enter-on").addClass("enter-off");
                                }else{
                                    aDom.removeClass("enter-ff").addClass("enter-on");
                                }
                            }
                        }
                        wechat.calOnlineTotalNum();
                    }
                    if(data.groupId){
                        wechat.onlineNumArr[data.groupId]=data.onlineUserNum;
                        if(data.groupId.indexOf("oRoomId")==-1){
                            var fj=$('.expert-ul li .fj-rens[rId='+data.groupId+']'),aDom=$('.expert-ul li .fxs-btn a[rId='+data.groupId+']');
                            fj.html(data.onlineUserNum);
                            if(aDom.attr("dw")=="true"){//开放日期允许的前提下，判断人数切换样式
                                if(parseInt(fj.next("label").text())<=data.onlineUserNum){//最大人数小于等于当前人数，不能进入
                                    aDom.removeClass("enter-on").addClass("enter-off");
                                }else{
                                    aDom.removeClass("enter-ff").addClass("enter-on");
                                }
                            }
                        }
                        wechat.calOnlineTotalNum();
                    }
                    break;
                }
            }
        });
    },
    /**
     * 计算总在线人数
     */
    calOnlineTotalNum:function(){
        var totalNum=0;
        for(var i in wechat.onlineNumArr){
            totalNum+=wechat.onlineNumArr[i];
        }
        $("#onlineUserNum").html(totalNum);
    },
    setEvent : function(){
        /*tab滑动*/
        this.tabSwiper = new Swiper('.cen-qhbox', {
            loop: false,
            autoplay : false,
            onSlideChangeStart: function(mySwiper){
                $('.cen-ulist li').removeClass('on');
                $($('.cen-ulist li')[mySwiper.activeIndex]).addClass('on');
                if(mySwiper.activeIndex==0){
                    $(".expert-ul").html("");
                    wechat.setRoomList(mySwiper.activeIndex);
                }else{
                    $(".tactics-ul").html("");
                    wechat.setTradeInfo(1);
                }
            },
            onInit: function(mySwiper){
                $('.cen-qhcon').height(function(){
                    return $($('.cen-pubox')[mySwiper.activeIndex]).find('.boxcont').height();
                });
            }
        });
        /*tab切换*/
        $('.cen-ulist li').click(function(){
            if($(this).hasClass('on')){
                return false;
            }
            $('.cen-ulist li').removeClass('on');
            $(this).addClass('on');
            wechat.tabSwiper.slideTo($(this).index(), 300, true);
        });
        /*弹出框关闭*/
        $('.pop-close').click(function(){
            $(".videobox iframe,.videobox video").remove();
            wechat.hideBox();
        });
        /*点赞+1*/
        $('.expert-intro .conut-on').click(function(){
            wechat.setPraise($(this));
        });
        /*交易策略更多操作*/
        $(".moreitem").click(function(){
            var pageNo=$(this).attr("pageNo"),totalR=$(this).attr("totalR");
            if(common.isBlank(pageNo)||common.isBlank(totalR)){
                return false;
            }
            pageNo=parseInt(pageNo);
            if(pageNo*3>=parseInt(totalR)){
                $(this).html("已加载全部策略");
                return false;
            }
            $(this).html("加载中...");
            wechat.setTradeInfo(pageNo+1);
        });
    },
    /**
     * 格式开放日期
     * @param openDate
     * @param openDateAllow
     * @param serverDate
     * @returns {string}
     */
    formatOpenDate:function(openDate,openDateAllow,serverDate){
        var dateStrArr=[];
        serverDate=serverDate?new Date(serverDate):new Date();
        if(common.isValid(openDate)){
            openDate=JSON.parse(openDate);
            var weekTime=openDate.weekTime;
            if(common.isValid(weekTime)){
                var row=null;
                for(var i in weekTime){
                    row=weekTime[i];
                    var timeStr='';
                    if(common.isValid(row.beginTime)){
                        timeStr+=row.beginTime.substr(0,5);
                    }
                    if(common.isValid(row.endTime)){
                        if(row.endTime!=row.beginTime) {
                            timeStr+="-" + row.endTime.substr(0,5);
                        }
                    }
                    if(row.week && serverDate.getDay()!=row.week){
                        continue;
                    }
                    if(row.week && serverDate.getDay()==row.week && common.isBlank(timeStr)){
                        timeStr="不限";
                    }
                    dateStrArr.push(timeStr);
                }
            }
            return dateStrArr.length>0?common.arrayUnique(dateStrArr).join(" "):(openDateAllow?'不限':'不开放');
        }else{
            return "不限";
        }
    },
    /**
     * 隐藏box
     */
    hideBox:function(){
        $('.popupbox').hide();
        $('.popupbg').fadeOut();
    },
    /**
     * 显示box
     * @param dom
     */
    showBox:function(dom,isHideBg){
        $('.popupbox').hide();
        dom.show();
        if(isHideBg){
            return;
        }
        $('.popupbg').fadeIn();
    },

    /**
     * 设置加载框
     * @param dom
     * @param isShow
     */
    setLoadImg:function(dom,isShow){
        if(isShow){
            dom.parent().find(".loading-box").show();
        }else{
            dom.parent().find(".loading-box").hide();
        }
    },
    /**
     * 提取头像
     * @param avatar
     */
    getBackUserAvatar:function(avatar){
      return common.isValid(avatar)?avatar:'/images/wechat/def_b_user.png';
    },

    /**
     * 设置房间列表
     * @param activeIndex tab滑动的index
     */
    setRoomList:function(activeIndex){
        try{
            this.setLoadImg($(".expert-ul"),true);
            $.getJSON('/wechat/getRoomList',function(dataResult){
                wechat.setLoadImg($(".expert-ul"),false);
                var data=dataResult.rList,serverDate=dataResult.serverDate;
                if(data){
                    var domArr=[],row=null,defAnalyst=null,analystIdArr=[],openDateAllow=false,openTimeStr='';
                    for(var i in data){
                        row=data[i];
                        defAnalyst=row.defaultAnalyst;
                        if(!defAnalyst){
                            continue;
                        }
                        openDateAllow=common.dateTimeWeekCheck(row.openDate,true,serverDate);
                        domArr.push('<li><aside class="fangj-ac clearfix">');
                        domArr.push('<p>'+row.name+'</p>');
                        domArr.push('<p>开放时间：'+wechat.formatOpenDate(row.openDate,openDateAllow,serverDate)+'</p>');
                        domArr.push('<p>房间人数：<span class="fj-rens" rId="'+row._id+'">0</span>/<label>'+row.maxCount+'</label></p>');
                        domArr.push('</aside>');
                        domArr.push('<article class="fangj-space clearfix" rId="'+row._id+'" uid="'+defAnalyst._id+'">');
                        domArr.push('<figure class="fxs-img fl"><img src="'+wechat.getBackUserAvatar(defAnalyst.avatar)+'" width="100%" alt="" /></figure>');
                        domArr.push('<aside class="fxs-name fl">');
                        domArr.push('<h3>'+defAnalyst.userName+'</h3>');
                        domArr.push('<p>'+defAnalyst.position+'</p>');
                        domArr.push('</aside>');
                        domArr.push('<nav class="fxs-btn fr"><a href="javascript://" class="conut-on" uid="'+defAnalyst._id+'"><i></i><span></span><b>+1</b></a><a href="javascript:" dw="'+openDateAllow+'" class="'+(openDateAllow?'enter-on':'enter-off')+'" rId="'+row._id+'">进入</a></nav>');
                        domArr.push('</article></li>');
                        analystIdArr.push(defAnalyst._id);
                    }
                   $(".expert-ul").html(domArr.join(""));
                    wechat.getOutRoomOnline();//页面元素生成则提取在线人数
                    if(analystIdArr.length>0){
                        $.getJSON('/wechat/getUserPraiseNum',{praiseId:analystIdArr.join(",")},function(data){
                            if(data){
                                for(var i in data){
                                    $('.expert-ul li .conut-on[uid='+data[i].praiseId+'] span').html(data[i].praiseNum);
                                }
                            }
                        });
                    }
                    /*分析师简介*/
                    $('.fxs-img,.fxs-name h3').click(function(){
                        var spaceDom=$(this).parents(".fangj-space");
                        $('.expert-intro .conut-on').attr("uid",spaceDom.attr("uid")).find("span").html(spaceDom.find(".conut-on span").html());
                        $.getJSON('/wechat/getUserInfo',{id:spaceDom.attr("uid")},function(user){
                              if(common.isValid(user)){
                                 $(".expert-intro img").attr("src",user.descImg).attr("alt",user.name);
                                 $(".expert-intro .zw").html(user.desc);
                              }
                        });
                        wechat.showBox($('.expert-intro'));
                    });
                    /*点赞+1*/
                    $('.expert-ul .conut-on').click(function(){
                        wechat.setPraise($(this));
                    });
                    //进入房间
                    $(".expert-ul .enter-on").click(function(){
                         wechat.joinRooms($(this));
                    });
                    $('.cen-qhcon').height(function(){
                        return $($('.cen-pubox')[activeIndex]).find('.boxcont').height();
                    });
                }
            });
        }catch (e){
            console.error("setRoomList->"+e);
        }
    },
    /**
     * 设置点赞
     * @param dom
     */
    setPraise:function(dom){
       try{
           common.getJson("/wechat/setUserPraise",{clientId:wechat.userInfo.userId,praiseId:dom.attr("uid")},function(result){
               var pBoxDom=dom.parents(".expert-intro");
               if(result.isOK) {
                   if(dom.hasClass('conut-on')){
                       dom.find('b').fadeIn().delay(400).fadeOut();
                       var span=dom.find('span'),val=span.html();
                       span.html(parseInt(common.isBlank(val)?0:val)+1);
                       dom.removeClass('conut-on').addClass('conut-off');
                       if(pBoxDom.length>0){
                           $('.expert-ul .conut-on[uid='+dom.attr("uid")+'] span').html(span.html());
                       }
                   }
               }else{
                   wechat.showTipBox("亲，已点赞，当天只能点赞一次！");
               }
           },true);
       }catch(e){
           console.error("setPraise->"+e);
       }
    },
    /**
     * 进入房间
     */
    joinRooms:function(dom){
        var li=dom.parents("li"),fens=li.find(".fj-rens"),ft=fens.text(),lb=fens.parent().find("label").text();
        if(parseInt(ft)>=parseInt(lb)){
            wechat.showTipBox('亲，已满员，换个房间吧');
        }else{
            window.location.href="/wechat/room?groupId="+dom.attr("rId");
        }
    },
    /**
     * 显示提示框
     */
    showTipBox:function(text){
        $(".errorbox").hide().find("div").html(text);
        $(".errorbox").fadeIn().delay(1000).fadeOut(200);
    },
    /**
     * 文档信息(广告,公告)
     * @param code
     * @param curPageNo
     * @param pageSize
     * @param orderByStr
     * @param callback
     */
    getArticleList:function(code,platform,hasContent,curPageNo,pageSize,orderByStr,callback){
        try{
            $.getJSON('/wechat/getArticleList',{code:code,platform:platform,hasContent:hasContent,pageNo:curPageNo,pageSize:pageSize,orderByStr:orderByStr},function(data){
                /*console.log("getArticleList->data:"+JSON.stringify(data));*/
                callback(data);
            });
        }catch (e){
            console.error("getArticleList->"+e);
            callback(null);
        }
    },
    /**
     * 查询课程表信息
     * @param groupType
     * @param groupId
     * @param callback (html)
     */
    getSyllabus : function(groupType, groupId, callback){
        try{
            $.getJSON('/wechat/getSyllabus?t=' + new Date().getTime(),{groupType:groupType,groupId:groupId},function(data){
                var loc_html = "";
                try
                {
                    if(data && data.courses)
                    {
                        loc_html = common.formatSyllabus(data.courses, data.currTime, 2);
                    }
                }
                catch(e1)
                {
                    console.error("getSyllabus->"+e1);
                    loc_html = "";
                }
                var loc_result = "";
                if(loc_html.length > 0)
                {
                    loc_result = '<li class="swiper-slide"><span txt="txt" style="display:none;">'+loc_html+'</span><a href="javascript:">'+data.title+'</a><i>'+ common.formatterDate(data.updateDate,'.')+'</i></li>';
                }
                callback(loc_result);
            });
        }catch (e){
            console.error("getSyllabus->"+e);
            callback("");
        }
    },
    /**
     * 设置公告
     */
    setBulletin:function(){
        //获取课表
        wechat.getSyllabus(wechat.userInfo.groupType, '', function(syllabusHtml){
            $("#bulletinDomId").html(syllabusHtml);
            //获取公告
            wechat.getArticleList("bulletin_system",'wechat_home',"1",1,5,'',function(dataList){
                if(dataList.result==0){
                    $.each(dataList.data,function(i,obj){
                        if(obj != null){
                            var row=obj.detailList[0];
                            $("#bulletinDomId").append('<li class="swiper-slide"><span txt="txt" style="display:none;">'+row.content+'</span><a href="javascript:">'+row.title+'</a><i>'+ common.formatterDate(obj.publishStartDate,'.')+'</i></li>');
                        }
                    });
                }
                $("#bulletinDomId li").click(function(){
                    wechat.showBulletin($(this).children("a").text(),$(this).children("i").text(),$(this).children("span[txt]").html());
                });
                $(".anounce").slide({ mainCell:".anouncelist" , effect:"topLoop", autoPlay:true, delayTime:600 ,interTime:3000, autoPage: false});
            });
        });
    },
    /**
     * 设置广告
     */
    setAdvertisement:function(){
        this.getArticleList("advertisement","wechat_home","0",1,3,'{"sequence":"asc"}',function(dataList){
            if(dataList.result==0){
                var data=dataList.data;
                for(var i in data){
                    $("#slider ul").append('<li class="swiper-slide"><a href="'+(common.isBlank(data[i].linkUrl)?"javascript:":data[i].linkUrl)+'" target="_blank"><img width="100%" alt="" src="'+data[i].mediaUrl+'"></a></li>');
                    if(data.length>1){
                        $("#position").append('<span class="'+(parseInt(i)==0?'p-click':'')+'"></span>');
                    }
                }
                if(data && data.length>1){
                    new Swiper('.scroll-imbd', {
                        pagination: '.dot-infobox',
                        paginationClickable: true,
                        loop: true,
                        autoplay : 5000,
                        autoplayDisableOnInteraction : false
                    });
                }
            }
        });
    },
    /**
     * 提取交易策略dom
     * @param code
     * @param id
     * @param createDate
     * @param row
     */
    getTradeInfoDom:function(data){
        var domArr=[],code=data.categoryId,id=data._id,createDate=data.publishStartDate,row=data.detailList[0];
        if(!row){
            return;
        }
        if(code.indexOf('video')!=-1){
            domArr.push('<li id="'+id+'"><a href="javascript:" class="ali video-li"><dl class="trade-cl clearfix">');
            domArr.push('<dt class="dt-fon fl"><img src="images/wechat/cate2.jpg" width="100%" alt="" /></dt>');
            domArr.push('<dd><p class="trade-time"><i>'+row.tag+'</i>'+common.formatterDateTime(createDate)+'</p>');
            //domArr.push('<h3>'+row.title+'</h3>');
            domArr.push('<h3>'+(common.isValid(row.author)?'<span>【'+row.author+'】</span>':'')+row.title+'</h3>');
            domArr.push('<div class="thumb"><img src="'+data.mediaImgUrl+'"><div class="iplay"><i></i></div></div>');
            domArr.push('<span class="morelink">详情 &gt;</span>');
            domArr.push('</dd></dl></a></li>');
        }else if(code.indexOf('audio')!=-1){
            domArr.push('<li id="'+id+'"><dl class="trade-cl clearfix voice-li"><dt class="dt-fon fl"><img src="images/wechat/cate3.jpg" width="100%" alt="" /></dt><dd>');
            domArr.push('<p class="trade-time"><i>'+row.tag+'</i>'+common.formatterDateTime(createDate)+'</p>');
            //domArr.push('<h3>'+row.title+'</h3>');
            domArr.push('<h3>'+(common.isValid(row.author)?'<span>【'+row.author+'】</span>':'')+row.title+'</h3>');
            domArr.push('<a class="voicebar"><i></i><span>00:00</span><audio style="display:none;" src="'+data.mediaUrl+'"></audio></a>');
            //domArr.push('<a><audio src="'+data.mediaUrl+'" controls="controls" style="width:250px;"></audio><i></i><span></span></a>');
            domArr.push('</dd></dl></li>');
        }else{
            var author=row.author,avatar='images/wechat/cate1.jpg';
            if(common.isValid(row.author)){
                if(row.author.indexOf(";")!=-1){
                    var authorAvatarArr=row.author.split(";");
                    author=authorAvatarArr[0];
                    if(common.isValid(authorAvatarArr[1])){
                        avatar=authorAvatarArr[1];
                    }
                }
            }
            domArr.push('<li id="'+id+'"><a href="javascript:" class="ali text-li"><dl class="trade-cl clearfix">');
            domArr.push('<dt class="dt-fon fxs-img fl"><img src="'+avatar+'" width="100%" alt="" /></dt>');
            domArr.push('<dd><p class="trade-time"><i>'+row.tag+'</i>'+common.formatterDateTime(createDate)+'</p>');
            domArr.push('<h3>'+(common.isValid(author)?'<span>【'+author+'】</span>':'')+row.title+'</h3>');
            domArr.push('<p class="miaox-p">'+(common.isValid(row.remark) && row.remark.length>40?row.remark.substr(0,40)+' ....':row.remark)+'<span>详情 &gt;</span></p>');
            domArr.push('</dd></dl></a></li>');
        }
        return domArr.join("");
    },
    /**
     * 提取文章信息
     * @param id
     */
    getArticleInfo:function(id,callback){
        try{
            $.getJSON('/wechat/getArticleInfo',{id:id},function(data){
                /*console.log("getArticleList->data:"+JSON.stringify(data));*/
                callback(data);
            });
        }catch (e){
            console.error("getArticleInfo->"+e);
            callback(null);
        }
    },
    /**
     * 格式音频播放时间
     * @param time
     * @returns {string}
     */
    formatAudioPlayTime:function(timeTmp) {
        if(!timeTmp){
            return "00:00";
        }
        var time=parseInt(timeTmp),minute = parseInt(time / 60);
        if (minute < 10) {
            minute = "0" + minute;
        }
        var second = parseInt(time % 60);
        if (second < 10) {
            second = "0" + second;
        }
        return minute + ":" +second;
    },

    /**
     * 交易策略
     * @param pageNo
     */
    setTradeInfo:function(pageNo){
        this.setLoadImg($(".tactics-ul"),true);
        this.getArticleList("trade_strategy","wechat_home","0",(pageNo||1),3,'',function(dataList){
            wechat.setLoadImg($(".tactics-ul"),false);
            $(".moreitem").html("更多交易策略...");
            if(dataList.result==0){
                var data=dataList.data;
                for(var i in data){
                    $(".tactics-ul").append(wechat.getTradeInfoDom(data[i]));
                }
                $('.cen-qhcon').height(function(){
                    return $($('.cen-pubox')[1]).find('.boxcont').height();
                });
                $(".voicebar").click(function(){
                    var audioDom=$(this).find("audio"),audio=audioDom[0];
                    /*audioDom.bind("progress",function(){
                        $(this).parent().find("span").html(wechat.formatAudioPlayTime(this.currentTime));
                    });*/
                    $(this).addClass("read");
                    if(audio.paused){
                        $(this).addClass("on");
                        audio.play();
                        $(this).find("span").html(wechat.formatAudioPlayTime(audio.duration));
                    }else{
                        audio.pause();
                        $(this).removeClass("on");
                    }
                });
                $(".moreitem").attr("pageNo",dataList.pageNo).attr("totalR",dataList.totalRecords);
                /*文本信息详细*/
                $('.text-li').click(function(){
                    wechat.showBox($('.text-info'));
                    var id=$(this).parent().attr("id");
                    if(id==$(".text-info").attr("id")){
                        return false;
                    }
                    wechat.getArticleInfo(id,function(result){
                        if(common.isValid(result)){
                            var row=result.detailList[0];
                            $(".text-info").attr("id",result._id);
                            $(".text-info .titlebar2 h3").html(row.title);
                            $(".text-info .titlebar2 label").html(common.formatterDateTime(result.publishStartDate));
                            $(".text-info .zw").html(row.content||'');
                            $(".text-info .zw img").width("100%").height("auto");
                        }
                    });
                });
                /*视频详细*/
                $('.video-li').click(function(){
                    wechat.showBox($('.video-info'));
                   var id=$(this).parent().attr("id");
                     /* if(id==$(".video-info").attr("id")){
                        return false;
                    }*/
                    wechat.getArticleInfo(id,function(result){
                        $(".videobox").html("");
                        if(common.isValid(result)){
                            var row=result.detailList[0];
                            $(".video-info").attr("id",result._id);
                            $(".video-info .titlebar2 h3").html(row.title||'');
                            $(".video-info .titlebar2 label").html(common.formatterDateTime(result.publishStartDate));
                            $(".video-info .brief").html('<i>摘要</i>'+(row.remark||''));
                            if(common.isValid(result.mediaUrl)){
                                if(result.mediaUrl.indexOf(".html")!=-1){
                                    $(".videobox").append('<iframe frameborder=0 width="100%" src="'+result.mediaUrl+'" allowfullscreen></iframe>');
                                }else{
                                    $(".videobox").append('<video poster="'+result.mediaImgUrl+'" src="'+result.mediaUrl+'" controls="controls">您的浏览器不支持video标签。</video>');
                                }
                            }
                        }
                    });
                });
            }
        });
    },
    /**
     * 设置文档中的图片
     * @param imgObj
     */
    setImgSwipBox:function(imgObj){
        if(imgObj.length>0) {
            imgObj.width("100%").height("auto");
            imgObj.click(function (e) {
                e.preventDefault();
                var _thisImg = $(this);
                $.swipebox([
                    {href: _thisImg.attr("src")}
                ]);
            });
        }
    },
    /**
     * 功能：显示公告
     */
    showBulletin : function(title,date,content){
        $(".anounce-info .titlebar2 h3").html(title);
        $(".anounce-info .titlebar2 span").html(date);
        $(".anounce-info .zw").html(content);
        wechat.showBox($('.anounce-info'));
        $(".anounce-info img").width("100%").height("auto");
    }
};
// 初始化
$(function() {
    wechat.init();
});

 