/**
 * 直播间前台客户端入口
 * author Alan.wu
 */
var indexJS ={
    options:null,//附加参数
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
    init:function(){
        this.serverTimeUp();
        this.setVisitStore();//设置访客存储
        this.setEvent();//设置各种事件
        this.setTradeStrategyNote(null, true);
        this.setAdvertisement();
    },
    /**
     * 事件控制
     */
    setEvent:function(){
        //创建专场房间快速入口
        var vipRoom = $(".rooms .rname:contains('专场')");
        if(vipRoom.size() == 1){
            $(".roomctrl i").addClass("hot");
            $(".roomctrl span").text(vipRoom.text());
        }
        //隐藏广告
        /*if($("#roomInfoId").attr("av")=='true'){
            $(".mod_menu .menu_ad").show();
        }else{
            $(".mod_menu .menu_ad").hide();
        }*/
        //头部框事件
        $(".header-right li").hover(function(){
            $(this).find(".dropcont").show();
            //课程显示
            if($(this).is(".cursor")){
                _gaq.push(['_trackEvent', 'pmchat_studio','header_course','content_top',1,true]);
                if($(this).attr("ck")==1){
                    return;
                }
                indexJS.fillCourse();
            }
            //公告显示
            if($(this).is(".notice")){
                indexJS.getArticleList("bulletin_system",indexJS.userInfo.groupId,1,1,1,'{"sequence":"desc","publishStartDate":"desc"}',null,function(dataList){
                    if(dataList && dataList.result==0){
                        var data=dataList.data;
                        if(data && data.length > 0){
                            var result=data[0].detailList[0];
                            $("#bulletinTab").find("strong").text(result.title);
                            $("#bulletinTab").find("p").html(result.content);
                        }
                    }
                });
                _gaq.push(['_trackEvent', 'pmchat_studio','header_bulletin','content_top',1,true]);
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
                var tm=pdom.attr("tm");
                if(common.isBlank(tm) || (indexJS.serverTime-Number(tm)>=1*60*1000)){
                    pdom.attr("tm",indexJS.serverTime);
                }else{
                    return;
                }
                try{
                    $.getJSON('/studio/getRmCourseList',{roomIds:$(".rooms .rbox[rid]").map(function(){return $(this).attr("rid");}).get().join(",")},function(result){
                        if(result && result.isOK){
                            var data=result.data;
                            var rms=$(".rooms .rbox[rid]");
                            rms.each(function(index){
                                if(index==rms.length-1){
                                    $(this).addClass("last");
                                }
                                var roomId=$(this).attr("rid");
                                if(data.hasOwnProperty(roomId)){
                                    var rda=data[roomId];
                                    var size = 0;
                                    if($(this).find(".enterbtn").attr("av")=="true"){
                                        if(rda.onlineNum>100){
                                            size=Math.ceil(Math.random()*50)+275;
                                        }else{
                                            size=rda.onlineNum<=10?60:(200/rda.onlineNum)*3+10;
                                            size=Math.round(size);
                                        }
                                    }
                                    $(this).find(".peo_num label").text(rda.onlineNum + size);
                                    if(common.isValid(rda.name)){
                                        $(this).find(".info .nk").text(rda.name);
                                        if(!rda.isNext){
                                            $(this).addClass("on");
                                        }
                                        if(rda.day){
                                            $(this).find(".info .st").text(common.daysCN[rda.day]+' '+rda.startTime+' - '+rda.endTime);
                                        }
                                    }
                                }
                            });
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
                if(indexJS.checkClientGroup("vip")){
                    alert("该房间仅对新客户开放，如有疑问，请联系老师助理。");
                }else{
                    alert("已有真实账户并激活的客户方可进入【特别专场】，您还不满足条件。如有疑问，请联系老师助理。");
                }
                return false;
            }
            common.getJson("/studio/checkGroupAuth",{groupId:thiz.attr("rid")},function(result){
                if(!result.isOK){
                    if(indexJS.checkClientGroup("vip")){
                        alert("该房间仅对新客户开放，如有疑问，请联系老师助理。");
                    }else{
                        alert("已有真实账户并激活的客户方可进入【特别专场】，您还不满足条件。如有疑问，请联系老师助理。");
                    }
                }else{
                    indexJS.toRefreshView();
                }
            },true,function(err){
                if("success"!=err) {
                    alert("操作失败，请联系客服！" );
                }
            });
        });
        //聊天框切换事件
        $(".mod_main .tabnav a").click(function(){
            var index=$(this).index();
            var currDom = $(".mod_main .tabcont .main_tab").eq(index);
            $(".mod_main .tabnav a").removeClass("on");
            $(this).addClass("on");
            $(".mod_main .tabcont .main_tab").removeClass("on").eq(index).addClass("on");
            if(index==0){//课堂笔记
                $("#textLiveCount").data("cnt", 0).html("").hide();
            }else if(index==1){//聊天
                chat.showChatMsgNumTip(true);
                chat.setTalkListScroll(true);
            }else if(index==2){//快讯
                indexJS.setInformation();
            }else if(index==3){//实盘策略
                indexJS.setTradeStrategy(currDom.find('.scrollbox'));
            }
        });

        /**课堂笔记加载更多*/
        $("#textliveMore").bind("click", function(){
            if(!$(this).is(".all")){
                var lastId = $("#textlivePanel li[aid]:last").attr("aid");
                indexJS.setTradeStrategyNote(lastId, false);
            }
        });
        /*QQ客服按钮事件*/
        $('#qqcs').click(function(){
            openQQChatByCommonv3('','800018282');
        });
        /**添加到桌面*/
        $("#saveToDesktop").click(function(){
            if(common.saveToDesktop(window.location.href, "视频直播间-金道贵金属")){
                box.showMsg("直播间快捷方式已成功添加到桌面");
            }else{
                window.location.href = "/studio/getShortCut?t=" + new Date().getTime();
            }
        });
        /*修改头像按钮事件*/
        $("#modifyAvatar").click(function(){
            var fFrom=$("#fileForm");
            var file=fFrom.find("input[type=file]");
            if("true"!=fFrom.attr("hasEv")){
                fFrom.attr("hasEv","true");
                file.change(function (){
                    var _this=$(this);
                    var img = this.files[0];
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
                                        common.getJson("/studio/modifyAvatar",{avatar:(data.fileDomain+data.filePath)}, function(result){
                                            if(!result.isOK){
                                                console.error("上传头像失败，请联系在线客服！");
                                            }else{
                                              $("#avatarInfoId").attr("src",result.avatar);
                                              $("#userListId li .mynk").prev().find("img").attr("src",result.avatar);
                                              indexJS.userInfo.avatar=result.avatar;
                                                _this.val('');
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
        //修改密码
        $("#resetPasswordBtn").bind("click", function(){
            box.openSettingBox("password1");
        });
        //placeholder IE支持
        this.placeholderSupport();//ie下输入框显示文字提示
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
                nva.append('<a href="javascript:" class="'+als+ons+'" t="'+i+'" d="'+days[i].day+'" style="width:'+awidth+'%;"><span>'+common.daysCN[days[i].day+""]+'<b>' + dateStr + '</b></span><i></i></a>');
                $(".cursor .dropcont .cont").append('<div class="course_tab'+ons+'" t="'+i+'" d="'+days[i].day+'"><ul></ul></div>');
                als='';
                var lsTab=$(".cursor .course_tab:last ul"),courseObj=null;
                if(days[i].status != 1){
                    lsTab.append('<li class="fir"><a href="javascript:"><span><lable>休市</lable></span></a></li>');
                }else{
                    als = 'fir';
                    for(var k= 0,tklen=tmk.length;k<tklen;k++){
                        courseObj=tmk[k].course[i];
                        if(courseObj.status != 0 && courseObj.lecturer){
                            lsTab.append('<li class="'+als+'"><a href="javascript:" st="'+tmk[k].startTime+'" et="'+tmk[k].endTime+'"><i></i><span><lable>'+tmk[k].startTime+'- '+tmk[k].endTime+'　</lable><lable>'+courseType[courseObj.courseType]+'　</lable><lable>'+courseObj.lecturer+'</lable></span><p>'+courseObj.title+'</p></a></li>');
                            als = '';
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
        indexJS.courseTick.tick();
        videos.init().clientVideoTask();
        indexJS.setInformation();
        this.towMinTime=this.serverTime;
        setInterval(function(){
            indexJS.serverTime+=1000;
            if(indexJS.serverTime-indexJS.towMinTime>=2*60*1000){
                indexJS.towMinTime=indexJS.serverTime;
                indexJS.setInformation();
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
    setListScroll:function(domClass,options){
        var dom=(typeof domClass=='object')?domClass:$(domClass);
        if(dom.hasClass("mCustomScrollbar")){
            dom.mCustomScrollbar("update");
        }else{
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
     * 设置广告
     */
    setAdvertisement:function(){
        this.getArticleList("advertisement",indexJS.userInfo.groupId,"0",1,5,'{"sequence":"desc","publishStartDate":"desc"}',null,function(dataList){
            if(dataList && dataList.result==0){
                var data=dataList.data;
                for(var i in data){
                    $(".ban_ul").append('<li class="swiper-slide"><a href="'+(common.isBlank(data[i].linkUrl)?"javascript:":data[i].linkUrl)+'" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'banner_img\', \''+data[i].detailList[0].title+'\']);" target="_blank"><img width="100%" alt="" src="'+data[i].mediaUrl+'"></a></li>');
                    if(data.length>1){
                        $("#mod_position").append('<span class="'+(parseInt(i)==0?'p-click':'')+'"></span>');
                    }
                }
                if(data && data.length>1){
                    new Swiper('.mod_banner', {
                        pagination: '#mod_position',
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
     * 加载快讯数据
     */
    setInformation: function(){
        var scrollDom = $(".mod_main .tabcont .main_tab:eq(2)").find('.scrollbox'), intervalTime = $('#newInfoCount').attr('t');
        if(!common.isBlank(intervalTime) && indexJS.serverTime - intervalTime < 2*60*1000){
            return;
        }
        $.getJSON(indexJS.apiUrl+ '/common/getInformation?t='+indexJS.serverTime, null, function(result){
            if(result){
                if(result.isOK) {
                    var pt = $('#newInfoCount').attr('pt'), pubDateTime = null,newsHtml = '', newsFormatHtml = indexJS.formatHtml('news');
                    $.each(result.data.news.item, function(key, row){
                        if (pt == row.pubDate  && common.isValid(pt)) {
                            indexJS.infoNewCount++;
                            $('#newInfoCount').text(indexJS.infoNewCount).show();
                        }
                        if(key < 1){
                            pubDateTime = row.pubDate;
                        }
                        if(row.pubDate > pt || common.isBlank(pt)) {
                            newsHtml += newsFormatHtml.formatStr(row.pubDate.substring(10), row.title);
                        }
                    });
                    if(common.isValid(newsHtml)) {
                        $('.mod_main .message_list .scrollbox ul').prepend(newsHtml);
                    }
                    if(common.isBlank(pt)){
                        $('#newInfoCount').attr('pt', pubDateTime);
                    }
                    indexJS.setListScroll(scrollDom);//设置滚动
                    $('#newInfoCount').attr('pt', pubDateTime);
                    if($(".mod_main .tabcont .main_tab:eq(2)").hasClass('on')){
                        indexJS.infoNewCount = 0;
                        $('#newInfoCount').attr({'pt':pubDateTime,'t':indexJS.serverTime}).text(indexJS.infoNewCount).hide();
                    }
                }
            }
        });
    },
    /**
     * 加载课堂笔记
     */
    setTradeStrategyNote : function(noteId, isLoad){
        if(!isLoad || !$("#textlivePanel").data("loaded")){
            if(isLoad){
                $("#textlivePanel").data("loaded", true);
                if(!noteId){
                    noteId = $("#textlivePanel li[aid]:last").attr("aid");
                }
            }
            var params = {
                isAll : 1,
                pageKey : noteId || "",
                pageLess : 1
            };
            this.getArticleList("class_note",indexJS.userInfo.groupId,1,1,30,'{"publishStartDate":"desc","createDate":"desc"}',params,function(dataList){
                if(dataList && dataList.result==0){
                    var data=dataList.data;
                    for(var i in data){
                        indexJS.appendTradeStrategyNote(data[i], false, false);
                    }
                    if(data.length < dataList.pageSize){
                        $("#textliveMore").addClass("all").html("已加载全部");
                    }
                }
                indexJS.setListScroll($(".textlivelist>.scrollbox"));//设置滚动
            });
        }
    },
    /**
     * 追加课堂笔记
     */
    appendTradeStrategyNote : function(articleInfo, isPrepend, showNum){
        var articleDetail,publishTime
            , $panel = $("#textlivePanel"),$panelUL,html,$li;
        var format1 = indexJS.formatHtml('tradestrategynote1'); //课程信息
        var format2 = indexJS.formatHtml('tradestrategynote2'); //文档信息
        var format3 = indexJS.formatHtml('tradestrategynote3'); //图片信息
        var imgReg = /<img\s+[^>]*src=['"]([^'"]+)['"][^>]*>/,matches;
        articleDetail=articleInfo.detailList && articleInfo.detailList[0];
        publishTime = new Date(articleInfo.publishStartDate).getTime();
        //课程信息
        var aid = articleInfo._id || articleInfo.id;
        if($panel.find("li[aid='" + aid + "']").size() > 0){
            return;
        }
        $panelUL = $panel.find(".textlive[pt='" + publishTime + "']>ul");
        if($panelUL.size() == 0){
            var author = '',avatar = '';
            if(articleDetail.authorInfo){
                author = articleDetail.authorInfo.name || "";
                avatar = articleDetail.authorInfo.avatar || "";
                avatar = avatar.replace(/,.*$/, "");
            }
            var publishTimeStr = common.formatterDateTime(publishTime, '-').substring(0, 16)
                + "-" + common.formatterDateTime(articleInfo.publishEndDate, '-').substring(11, 16);
            var cls = articleDetail.title ? "" : " dn";
            html = format1.formatStr(
                publishTime,
                avatar,
                author,
                publishTimeStr,
                cls,
                articleDetail.title || ""
            );
            if(isPrepend){
                $panel.prepend(html);
            }else{
                $panel.append(html);
            }
            $panelUL = $panel.find(".textlive[pt='" + publishTime + "']>ul");
        }
        //文档信息
        html = articleDetail.content;
        matches = imgReg.exec(html);
        while(matches){
            html = html.replace(imgReg, format3.formatStr(matches[1]));
            matches = imgReg.exec(html);
        }
        publishTimeStr = common.formatterDateTime(articleInfo.createDate, '-').substring(11);
        $li = $(format2.formatStr(aid, publishTimeStr, html));
        $li.find(".picpart>.imgdiv").each(function(){
            $(this).children("img").attr("src", $(this).attr("url"));
            $(this).bind("click", function(){
                $(this).parent().toggleClass("zoom");
            });
        });
        if(isPrepend){
            $panelUL.prepend($li);
        }else{
            $panelUL.append($li);
        }
        if(showNum){
            var $cnt = $("#textLiveCount");
            if(!$cnt.parent().is(".on")){
                var cnt = ($cnt.data("cnt") || 0) + 1;
                $cnt.data("cnt", cnt).html(cnt).show();
            }
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
            case 'tradestrategynote1':
                formatHtmlArr.push('<div class="textlive" pt="{0}">');
                formatHtmlArr.push('<div class="liveinfo">');
                formatHtmlArr.push('<div class="himg"><img src="{1}" alt="{2}"></div>');
                formatHtmlArr.push('<div class="infocont">');
                formatHtmlArr.push('<span class="tname">{2}</span>');
                formatHtmlArr.push('<span class="livetime">{3}</span>');
                formatHtmlArr.push('<p class="livetit{4}">直播主题 - {5}</p>');
                formatHtmlArr.push('</div>');
                formatHtmlArr.push('</div>');
                formatHtmlArr.push('<ul></ul>');
                formatHtmlArr.push('</div>');
                break;
            case 'tradestrategynote2':
                formatHtmlArr.push('<li aid="{0}">');
                formatHtmlArr.push('<div class="cont">');
                formatHtmlArr.push('<i class="dot"></i>');
                formatHtmlArr.push('<b>{1}</b>');
                formatHtmlArr.push('<span>{2}</span>');
                formatHtmlArr.push('</div>');
                formatHtmlArr.push('</li>');
                break;
            case 'tradestrategynote3':
                formatHtmlArr.push('<div class="picpart">');
                formatHtmlArr.push('<div class="imgdiv" url="{0}"><i></i><img alt="">');
                formatHtmlArr.push('</div>');
                formatHtmlArr.push('<a href="{0}" data-lightbox="liveinfo-img">点击查看大图</a>');
                formatHtmlArr.push('</div>');
                break;
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
            if(currCourse.isNext){ //下次课程开始作为下一次tick时间
                //"17:51" eval("17*60*51")*60*1000
                nextTime = eval(currCourse.startTime.replace(":", "*60+"))*60000 + indexJS.serverTime - indexJS.serverTime % 86400000 - 28800000;
            }else{//本次课程结束后作为下一次tick时间
                nextTime = eval(currCourse.endTime.replace(":", "*60+"))*60000 + indexJS.serverTime - indexJS.serverTime % 86400000 - 28800000 + 60000;
            }
            this.course = currCourse;
            this.nextTickTime = nextTime;

            //更新课程表样式
            this.chgSyllabusCls(currCourse);
            //更新视频
            videos.clientVideoTask();
            //更新晒单
            videos.sd.initSD();
        },

        /**
         * 调整课程表样式
         * */
        chgSyllabusCls : function(currCourse){
            $('.course_tab li a.on').removeClass("on");
            if(!currCourse.isNext){
                $(".course_nav a[d='" + currCourse.day + "']").trigger("click");
                $('.course_tab[d='+currCourse.day+']').find('li a[st="'+currCourse.startTime+'"][et="'+currCourse.endTime+'"]').addClass("on");
            }
        }
    }
};
// 初始化
$(function() {
    indexJS.init();
});