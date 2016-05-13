/**
 * 微信聊天室客户端操作类
 * author Dick.guo
 */
var studioChatMbIdx={
    userInfo:null,
    mobile24kPath:'',
    apiUrl:'',
    init:function(){
        this.setVisitStore();
        this.setClientGroupAuth();
        this.setAdvertisement();
        this.setEvent();
        studioMbPop.load(this.userInfo, {
            onShow : function(){
                $('.boxcont').height($(window).height()-$('.sroll-box').height()-$('#header').height()-$('.cen-ulist').height()-$('.fob_open').height());
            },
            onHide : function(){
                $('.boxcont').height('auto');
            }
        });
        this.initRoom();
    },
    /**
     * 初始化房间
     */
    initRoom:function(){
        //如果没有昵称，自动设置一个昵称
        if(!this.userInfo.nickname){
            this.refreshNickname(false, "匿名_" + this.userInfo.userId.substring(8,12));
        }
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
        $("#header_ui").text(nickname);
        //个人信息
        studioMbPop.Person.refreshNickName(nickname);
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

        this.userInfo.clientStoreId=obj.clientStoreId;
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
     * 设置房间客户组授权信息提示
     */
    setClientGroupAuth:function(){
        var getAuthTitle = function(auths){
            auths = auths || "";
            auths = "," + auths;
            var loc_authInfo = [], cnt = 0;
            //simulate,register,active,notActive,vip,visitor
            if(auths.indexOf(",vip") >= 0){
                loc_authInfo.push("VIP");
                cnt ++;
            }
            if(auths.indexOf(",active") >= 0 && auths.indexOf(",notActive") >= 0){
                loc_authInfo.push("真实");
                cnt += 2;
            }else if(auths.indexOf(",active") >= 0){
                loc_authInfo.push("真实A");
                cnt ++;
            }else if(auths.indexOf(",notActive") >= 0){
                loc_authInfo.push("真实N");
                cnt ++;
            }
            if(auths.indexOf(",simulate") >= 0){
                loc_authInfo.push("模拟");
                cnt ++;
            }
            if(auths.indexOf(",register") >= 0){
                loc_authInfo.push("注册");
                cnt ++;
            }
            if(auths.indexOf(",visitor") >= 0){
                loc_authInfo.push("游客");
                cnt ++;
            }
            if(cnt == 6){
                return "所有客户均可观看";
            }else{
                return loc_authInfo.join(",") + "用户可观看";
            }
        };

        $("#studioListTab .tit span").each(function(){
            $(this).html(getAuthTitle($(this).attr("aw")));
        });
    },
    /**
     * 设置广告
     */
    setAdvertisement:function(){
        this.getArticleList("advertisement","studio_home","0",1,3,'{"sequence":"asc"}',function(dataList){
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
     * 绑定页面各类事件
     */
    setEvent : function(){
        this.setEventHeader();
        this.setEventCen();
        this.setEventRoom();
        this.setEventSyllabus();

        /*收藏提示关闭*/
        $('.c_close').click(function(){
            $('.collect-tip').hide();
        });
    },
    setEventHeader : function(){
        //登录、显示用户信息
        $("#header_ui").bind("click", function(){
            if(studioChatMbIdx.userInfo && studioChatMbIdx.userInfo.isLogin){
                //已登录，显示用户信息
                studioMbPop.popBox("person");
            }else{
                //未登录，弹出登录框
                studioMbPop.popBox("login", {groupId : "", clientStoreId : studioChatMbIdx.userInfo.clientStoreId});
            }
        });
    },
    /**
     * 主页tab切换，房间信息展示等事件
     */
    setEventCen : function(){
        /*tab切换*/
        var cenTab = new Swiper('.cen-qhbox', {
            loop: false,
            autoplay : false,
            onSlideChangeStart: function(mySwiper){
                $('.cen-ulist li').eq(mySwiper.activeIndex).trigger("click");
            }
        });

        $('.cen-ulist li').bind("click", cenTab,  function(event){
            $('.cen-ulist li.on').removeClass('on');
            $(this).addClass('on');
            var type = $(this).attr("t");
            if(type=='tradeInfoTab'){
                studioChatMbIdx.setNewsInfo("#tradeInfoTab .boxcont",false,3,5);
            }else if(type=='commentTab'){
                studioChatMbIdx.setNewsInfo("#commentTab .boxcont",false,3,3);
            }
            event.data.slideTo($(this).index(), 300, false);
        });

        $("#tradeInfoTab .moreitem").bind("click", function(){
            studioChatMbIdx.setNewsInfo("#tradeInfoTab .boxcont",true,3,5);
        });

        $("#commentTab .moreitem").bind("click", function(){
            studioChatMbIdx.setNewsInfo("#commentTab .boxcont",true,3,3);
        });
    },
    /**
     * 设置房间事件：房间介绍展示
     */
    setEventRoom:function(){
        /*房间介绍展示*/
        $('.videoroom-ul li').click(function(){
            $('.videoroom-ul li.on').removeClass('on');
            $(this).addClass('on');
        });

        $("#studioListTab .videoroom-ul li:first").trigger("click");

        //只有一个房间时，显示介绍信息
        var loc_roomDoms = $("#studioListTab .videoroom-ul>li");
        if(loc_roomDoms.size() == 1){
            loc_roomDoms.find(".syllabus").show();
        }

        /**
         * 进入房间
         */
        $(".btns .enter").click(function(){
            var loc_liDom = $(this).parents("li");
            var loc_groupId = loc_liDom.attr("gi");
            if(loc_liDom.attr("ga") != 'true'){
                if(studioChatMbIdx.userInfo.clientGroup == "visitor"){
                    studioMbPop.popBox("login", {groupId : loc_groupId, clientStoreId : studioChatMbIdx.userInfo.clientStoreId});
                }else{
                    studioMbPop.showMessage("您没有访问该直播间的权限，如需进入请升级直播间等级或联系客服！");
                }
                return false;
            }
            if(loc_liDom.attr("go") != 'true'){
                studioMbPop.showMessage("该直播间暂未开放，请稍后访问！");
                return false;
            }
            studioMbPop.loadingBlock($("body"));
            common.getJson("/studio/checkGroupAuth",{groupId:loc_groupId}, function(result){
                studioMbPop.loadingBlock($("body"), true);
                if(!result.isOK){
                    if(result.error && result.error.errcode === "1000"){
                        studioMbPop.showMessage("您长时间未操作，请刷新页面后重试！");
                    }else{
                        studioMbPop.showMessage("您没有访问该直播间的权限，如需进入请升级直播间等级或联系客服！");
                    }
                }else{
                    studioMbPop.reload();
                }
            },true,function(err){
                if("success"!=err) {
                    studioMbPop.loadingBlock($("body"), true);
                    studioMbPop.showMessage("操作失败，请联系客服！");
                }
            });
            return false;
        });
    },
    /**
     * 课程表相关事件
     */
    setEventSyllabus : function(){
        //初始化课表
        var groupIds= $("#studioListTab .videoroom-ul li").map(function(){ return $(this).attr("gi");}).get().join(",");
        $.getJSON('/studio/getSyllabus?t=' + new Date().getTime(),{groupType:studioChatMbIdx.userInfo.groupType,groupId:groupIds},function(result){
            var loc_html = null,data=result.data;
            if(data){
                var row=null,liDom=null,courseObj=null,syTipDom=null;
                var dayCn=['周日','周一','周二','周三','周四','周五','周六'];
                var courseTypeTxt={'0':'文字直播','1':'视频直播','2':'ONE TV'};
                for(var i in data){
                    row=data[i];
                    if(row.courses){
                        loc_html = common.formatSyllabus(row.courses, result.serverTime, 3, {
                            dayCN :dayCn
                        });
                        liDom=$('#studioListTab .videoroom-ul li[gi='+row.groupId+']');
                        courseObj=common.getSyllabusPlan(row,result.serverTime);
                        if(courseObj){
                            liDom.find(".syll-tip .syll-time").text(dayCn[courseObj.day+""]+' '+courseObj.startTime+"-"+courseObj.endTime).next().text(courseTypeTxt[courseObj.courseType]).next().text(courseObj.lecturer);
                            if(!courseObj.isNext){
                                liDom.find(".tit i").addClass("st");
                            }else{
                                liDom.find(".tit i").removeClass("st");
                            }
                            liDom.find(".syll-tip").show();
                        }
                        var loc_panel =liDom.find(".timetable");
                        loc_panel.html(loc_html);
                        loc_panel.find("th").bind("click", function(){
                            var loc_this = $(this);
                            loc_this.siblings(".active").removeClass("active");
                            loc_this.addClass("active");
                            var loc_day = loc_this.attr("d");
                            loc_this.parent().siblings("tr[d]").hide();
                            loc_this.parent().siblings("tr[d='" + loc_day + "']").show();
                        });
                        loc_panel.find("th.active").trigger("click");
                    }
                }
            }
        });
        //显示课程表
        $('.btns .timebtn').click(function(){
            $(".pop-time .sc_cont").empty().append($(this).parents("li").find(".timetable").clone(true));
            studioMbPop.popShow($('.pop-time'));
            return false;
        });
    },
    /**
     * 文档信息(广告,公告)
     * @param code
     * @param platform
     * @param hasContent
     * @param curPageNo
     * @param pageSize
     * @param orderByStr
     * @param callback
     */
    getArticleList:function(code,platform,hasContent,curPageNo,pageSize,orderByStr,callback){
        try{
            $.getJSON('/wechat/getArticleList',{code:code,platform:platform,hasContent:hasContent,pageNo:curPageNo,pageSize:pageSize,orderByStr:orderByStr},function(data){
                callback(data);
            });
        }catch (e){
            console.error("getArticleList->"+e);
            callback(null);
        }
    },
    /**
     * 设置资讯或专业评论
     */
    setNewsInfo:function(domId,isAppend,type1,type2,pageSize){
        var panelDom = $(domId);
        var moreDom = panelDom.find(".moreitem");
        var pageNo = !isAppend ? 1 : parseInt(moreDom.attr("pno") || 1);
        if(pageNo < 0){
            return false;
        }
        studioMbPop.loadingBlock(panelDom);
        this.getNewsInfoList(type1,type2,pageNo,pageSize,function(data){
            var info;
            if(data && (info=data.informations).result==0){
                var list=info.informationList,row=null;
                var loc_html = [];
                if(list && list.length > 0){
                    loc_html.push('<ul class="trade-ul">');
                    for(var i in list){
                        row=list[i];
                        loc_html.push('<li><a href="'+studioChatMbIdx.mobile24kPath+'/comment/'+row.id+'_'+row.contenttype2+'.html" target="_blank">');
                        loc_html.push('<span>'+row.title+'</span>');
                        loc_html.push('<time>'+(row.datestr ? row.datestr.replace(/(^\d{4}-)|(:\d{2}$)/g, "") : "") +'</time>');
                        loc_html.push('</a></li>');
                    }
                    loc_html.push('</ul>');
                }
                if(!isAppend){
                    panelDom.find("ul").remove();
                }
                moreDom.before(loc_html.join(""));
                if(info.totalPage > info.pageNo){
                    moreDom.html("更多" + (type2 == 5 ? "交易策略" : "专业评论")).attr("pno", pageNo + 1);
                }else{
                    moreDom.html("已加载全部" + (type2 == 5 ? "交易策略" : "专业评论")).attr("pno", -1);
                }
            }else{
                console.error("提取数据有误！");
            }
            studioMbPop.loadingBlock(panelDom, true);
        });
    },
    /**
     * 提取咨询信息
     * @param type1
     * @param type2
     * @param pageNo
     * @param pageSize
     * @param callback
     */
    getNewsInfoList:function(type1,type2,pageNo,pageSize,callback){
        try{
            var  pageNoTmp=pageNo||1;
            var  pageSizeTmp=pageSize||5;
            //备注 contentType->2:即时资讯;3:专业评论
            $.getJSON(this.apiUrl+'/getNewsInfoList',{pageNo:pageNoTmp,pageSize:pageSizeTmp,lang:'zh',contentType1:type1,contentType2:type2},function(data){
                //console.log("getNewsInfoList->data:"+JSON.stringify(data));
                callback(data);
            });
        }catch (e){
            console.error("getNewsInfoList->"+e);
            callback(null);
        }
    }
};