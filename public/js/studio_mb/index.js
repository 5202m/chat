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
     * 设置房间客户组授权信息提示
     */
    setClientGroupAuth:function(){
        var getAuthTitle = function(auths){
            auths = auths || "";
            auths = "," + auths;
            var loc_authInfo = [];
            //simulate,register,real,vip,visitor
            if(auths.indexOf(",vip") >= 0){
                loc_authInfo.push("VIP")
            }
            if(auths.indexOf(",real") >= 0){
                loc_authInfo.push("真实")
            }
            if(auths.indexOf(",simulate") >= 0){
                loc_authInfo.push("模拟")
            }
            if(auths.indexOf(",register") >= 0){
                loc_authInfo.push("注册")
            }
            if(auths.indexOf(",visitor") >= 0){
                loc_authInfo.push("游客")
            }
            if(loc_authInfo.length == 5){
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
            if(loc_liDom.attr("ga") != 'true'){
                studioMbPop.showMessage("您没有访问该直播间的权限，如需进入请升级直播间等级或联系客服！");
                return false;
            }
            if(loc_liDom.attr("go") != 'true'){
                studioMbPop.showMessage("该直播间暂未开放，请稍后访问！");
                return false;
            }
            studioMbPop.loadingBlock($("body"));
            var loc_groupId = loc_liDom.attr("gi");
            common.getJson("/studio/checkGroupAuth",{groupId:loc_groupId},
                function(result){
                if(!result.isOK){
                    studioMbPop.loadingBlock($("body"), true);
                    studioMbPop.showMessage("您没有访问该直播间的权限，如需进入请升级直播间等级或联系客服！");
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
        $("#studioListTab .videoroom-ul li").each(function(){
            var loc_this = $(this);
            var loc_groupType = studioChatMbIdx.userInfo.groupType;
            var loc_groupId = loc_this.attr("gi");
            $.getJSON('/studio/getSyllabus?t=' + new Date().getTime(),{groupType:loc_groupType,groupId:loc_groupId},function(data){
                var loc_html = "";
                if(data && data.courses){
                    loc_html = common.formatSyllabus(data.courses, data.currTime, 3, {
                        dayCN : ['周<br>日','周<br>一','周<br>二','周<br>三','周<br>四','周<br>五','周<br>六']
                    });
                }
                loc_this.find(".timetable").html(loc_html);
            });
        });

        //显示课程表
        $('.btns .timebtn').click(function(){
            $(".pop-time .timetable").html($(this).parents("li").find(".timetable").html());
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
                        loc_html.push('<li><a href="'+studioChatMbIdx.mobile24kPath+'/zh/goldreview/'+row.id+'_'+row.contenttype2+'.html" target="_blank">');
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