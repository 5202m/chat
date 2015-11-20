/**
 * 直播间客户端通用操作类
 * @type {{init: Function, setKindEdit: Function, setSocket: Function}}
 * author Alan.wu
 */
var studioChat={
    initSewise:false,//是否初始化视频插件
    web24kPath:'',
    filePath:'',
    apiUrl:'',
    studioDate:'',//直播时间点
    verifyCodeIntervalId:null,
    //信息类型
    msgType:{
        text:'text' ,
        img:'img',
        file:'file'
    },
    socket:null,
    socketUrl:'',
    userInfo:null,
    oldTalkDivH:0,
    newTalkDivH:0,
    init:function(){
        this.setSocket();
        this.setVideoList();
        this.setVideoAdvertisement();
        this.setEvent();
        this.setScrollNotice();
        this.setPrice(true);
    },
    /**
     * 按时间点播放yy视频,不符合时间点直接播放视频
     */
    playVideoByDate:function(){
      if(common.dateTimeWeekCheck(this.studioDate, true)){
          this.setVideo(true);
      }else{
          $("#studioTeachId li:first a").click();
      }
    },
    /**
     * 设置视频
     * @param isYy
     * @param thisDom
     */
    setVideo:function(isYy,thisDom){
        try{
            if(isYy){
                if(this.initSewise){
                    SewisePlayer.doStop();
                    $("#tVideoDiv").parent().hide();
                }
                if($("#yyVideoDiv embed").length==0){
                    var aDom=$("#studioListId a[class~=ing]"),yc=aDom.attr("yc"),mc=aDom.attr("mc");
                    $('<embed src="'+'http://yy.com/s/'+yc+(common.isValid(mc)?'/'+mc:'')+'/mini.swf" wmode="Opaque" quality="high" width="100%" height="100%" align="middle" allowScriptAccess="never" allowFullScreen="true" mode="transparent" type="application/x-shockwave-flash"></embed>').appendTo('#yyVideoDiv');
                }
                $("#yyVideoDiv").show();
            }else{
                    $("#tVideoDiv").parent().show();
                    $("#yyVideoDiv").hide();
                    var vUrl=thisDom.attr("vUrl"),title=thisDom.text();
                    if(!this.initSewise){
                        var srcPathAr=[];
                        srcPathAr.push("/js/lib/sewise.player.min.js?server=vod");
                        srcPathAr.push("type=mp4");
                        srcPathAr.push("videourl="+vUrl);
                        srcPathAr.push("autostart=true");
                        srcPathAr.push("logo=");
                        srcPathAr.push("title=VodVideo");
                        srcPathAr.push("buffer=5");
                        //srcPathAr.push("skin=vodWhite");
                        var srcPath =srcPathAr.join("&") ;
                        var script = document.createElement('script');
                        script.type = "text/javascript";
                        script.src = srcPath;
                        $("#tVideoDiv").get(0).appendChild(script);
                        this.initSewise=true;

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
                            			var loc_mtop = $("#tVideoCtrl a.ad").is(":hidden") ? "-68px" : "-150px";
                            			$("#tVideoCtrl div.vcenter").css("margin-top", loc_mtop);
                            			$("#tVideoCtrl div.video_ad").show();
                            		}
                            	}, 1000);
                            });
                            
                            SewisePlayer.onStart(function(){
                            	$("#tVideoCtrl").hide();
                            });
                        };
                        checkOverFunc();
                    }else{
                        SewisePlayer.toPlay(vUrl, title, 0, true);
                    }
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
    setPrice:function(isFirst){
        try{
            $.getJSON(this.apiUrl+'/get24kPrice').done(function(data){
                if(!data){
                    $(".pro_box .pro_c,.pro_box .pro_n").text("--");
                    return false;
                }
                var result = data.result.row,subObj=null;
                $.each(result,function(i,obj){
                    if(obj != null){
                        subObj =obj.attr;
                        var gmCode = subObj.gmcode,															 //产品种类
                            bid = subObj.bid,																 //最新
                            change = subObj.change,															 //涨跌0.31
                            direction = ($.trim(change) != '' && change.indexOf('-') !=-1 ? 'down' : 'up'),  //升或降
                            range = change/(bid-change) *100 ;											 	 //幅度0.03%
                        var product = $(".pro_box div[name="+gmCode+"]");   //获取对应的code的产品
                        product.find(".pro_c").text(Number(bid).toFixed(2));
                        var rangeDom=product.find(".pro_n");
                        rangeDom.text(Number(range).toFixed(2)+'%');
                        if(direction == 'up'){					     //设置产品的颜色变化
                            rangeDom.removeClass("red").addClass("green");
                        }else if(direction == 'down'){
                            rangeDom.removeClass("green").addClass("red");
                        }
                    }
                });
            });
            if(isFirst){
                $(".pro_notice").slide(
                    {
                        titCell: ".num ul",
                        mainCell: ".pro_box",
                        effect: "fade",
                        autoPlay: true,
                        delayTime: 800,
                        interTime: 5000,
                        autoPage: false,
                        prevCell: ".pro_prev",
                        nextCell: ".pro_next",
                        endFun: function(){
                            studioChat.setPrice(false);
                        }
                    });
            }
        }catch (e){
            console.error("setPrice->"+e);
        }
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
            $.getJSON(this.apiUrl+'/getNewsInfoList',{pageNo:1,pageSize:pageSizeTmp,lang:'zh',contentType1:type1,contentType2:type2},function(data){
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
     * @param callback
     */
    getArticleList:function(code,platform,hasContent,curPageNo,pageSize,orderByStr,callback){
        try{
            $.getJSON('/studio/getArticleList',{code:code,platform:platform,hasContent:hasContent,pageNo:curPageNo,pageSize:pageSize,orderByStr:orderByStr},function(data){
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
        this.getArticleList("teach_video",this.userInfo.groupId,0,1,100,'{"sequence":"asc"}',function(dataList){
           $("#studioTeachId").html("");
           $(".img-loading[pf=studioTeachId]").hide();
           if(dataList && dataList.result==0){
               var data=dataList.data;
               var row=null;
               for(var i in data){
                   row=data[i].detailList[0];
                   $("#studioTeachId").append('<li><a title="' + row.title + '" href="javascript:" id="'+data[i]._id+'" vUrl="'+data[i].mediaUrl+'" onclick="_gaq.push([\'_trackEvent\', \'studio\', \'video_play\',$(this).text()]);"><i></i>'+row.title+'</a></li>');
               }
               //播放视频
               $("#studioTeachId li a").click(function(){
                   if(!$(this).is(".on")){
                       $("#studioTeachId li a.on").removeClass("on");
                       $(this).addClass("on");
                   }
                   studioChat.setVideo(false,$(this));
               });
           }
            studioChat.playVideoByDate();
       });
    },
    /**
     * 设置视频广告
     */
    setVideoAdvertisement:function(){
        this.getArticleList("video_advertisement",this.userInfo.groupId,0,1,1,'{"createDate":"desc"}',function(dataList){
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
     * 事件设置
     */
    setEvent:function(){
        /**
         * 返回直播
         */
        $(".vbackbtn").click(function(){
            studioChat.setVideo(true);
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

        /**
         * 视频广告关闭
         */
        $("#tVideoCtrl a.close_ad").bind("click", function(){
            $("#tVideoCtrl div.vcenter").css("margin-top", "-68px");
            $("#tVideoCtrl div.video_ad").hide();
        });

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
        $('.facebtn').qqFace({
            id:'faceId',
            assign:'contentText', //给控件赋值
            path:studioChat.filePath+'/face/'//表情存放的路径
        });
        //点击document,关闭dom
        $(document).click(function(e){
            $('#faceId').hide().remove();
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
            if("disable"==$(this).attr("disable")){
                alert("您未获取访问该直播间的权限，如需进入请升级直播间等级或联系客服！");
                return false;
            }
            common.getJson("/studio/checkGroupAuth",{groupId:this.id},function(result){
                if(!result.isOK){
                    alert("您未获取访问该直播间的权限，如需进入请升级直播间等级或联系客服！");
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
                studioChat.getArticleList("studio_plan",studioChat.userInfo.groupId,1,1,1,'{"sequence":"asc"}',function(dataList){
                    $("#studioPlanTab").html("");
                    if(dataList && dataList.result==0){
                        var data=dataList.data;
                        if(data && data.length > 0){
                            $("#studioPlanTab").html(data[0].detailList[0].content);
                            studioChat.setTabInfoScroll();
                        }
                    }
                });
            }else if(t=='bulletinTab'){
                studioChat.getArticleList("bulletin_system",studioChat.userInfo.groupId,1,1,1,'{"sequence":"asc"}',function(dataList){
                    $("#bulletinTab").html("");
                    if(dataList && dataList.result==0){
                        var data=dataList.data;
                        if(data && data.length > 0){
                            $("#bulletinTab").html(data[0].detailList[0].content);
                            studioChat.setTabInfoScroll();
                        }
                    }
                });
            }else if(t=='downloadTab'){
                studioChat.getArticleList("download",studioChat.userInfo.groupId,1,1,100,'{"sequence":"asc"}',function(dataList){
                    $("#downloadTab").html("");
                    if(dataList && dataList.result==0){
                        var data=dataList.data,row=null;
                        for(var i in data){
                            row=data[i].detailList[0];
                            $("#downloadTab").append('<li><span>'+row.title+'</span><a href="'+data[i].mediaUrl+'" target="_blank" class="downbtn" onclick="_gaq.push([\'_trackEvent\', \'studio\', \'file_download\',$(this).prev().text()]);" >下载</a></li>');
                        }
                        studioChat.setTabInfoScroll();
                    }
                });
            }
        });
        $('.mod_tab .tab_nav a[t=bulletinTab]').click();
        /**
         * 转到登录页面
         */
        $('#login_a,#login_b,#login_c').click(function(){
            studioChat.openLoginBox();
        });
        /**
         * 转到注册页面
         */
        $('#register_a,#register_b,#toRegister').click(function(){
            studioChat.openRegistBox();
        });
        //手机号码输入控制验证码样式
        $.each(["#loginPmForm input[name=mobilePhone]","#mobileCheckForm input[name=mobilePhone]","#registFrom input[name=mobilePhone]"],function(i,obj){
            $(obj).bind("input propertychange", function() {
                var domBtn=$(this).parents("form").find(".rbtn");
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
            $(this).removeClass("pressed").html("");
            var pf=$(this).attr("pf");
            var useType = $(this).attr("ut");
            var mobile=$("#"+pf+" input[name=mobilePhone]").val();
            try{
                studioChat.setVerifyCodeTime('.rbtn[pf='+pf+']');
                $.getJSON('/studio/getMobileVerifyCode?t=' + new Date().getTime(),{mobilePhone:mobile, useType:useType},function(data){
                    if(!data || data.result != 0){
                        if(data.errcode == "1005"){
                            alert(data.errmsg);
                        }else{
                            console.error("提取数据有误！");
                        }
                        studioChat.resetVerifyCode("#" + pf);
                    }
                });
            }catch (e){
                console.error("setMobileVerifyCode->"+e);
            }
        });
        /*弹出框关闭按钮*/
        $('.popup_box .pop_close,.formbtn[t=close]').click(function(){
            $(".blackbg form").each(function(){
                this.reset();
            });
            $(".wrong-info").html("").attr("tId","");
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
         * 登录按钮事件
         */
        $("#loginComForm a[tn=loginBtn],#loginPmForm a[tn=loginBtn]").click(function(){
            var thisFormId=$(this).parents("form").attr("id");
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
                        $("#pmInfoSetBtn").click(function(){
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
                                    _gaq.push(['_trackEvent', 'studio', 'register','成功注册数']);//记录登录数
                                    $("#pmInfoSetBox").hide();
                                    studioChat.toRefreshView();
                                }
                            },true,function(err){
                                $(_this).attr('disabled',false);
                                $('#pmInfoSetLoad').hide();
                            });
                        });
                        return false;
                    }
                    $("#"+thisFormId+" input[name=verifyCode],#loginForm input[name=pwd]").val("");
                    $("#"+thisFormId+" .wrong-info").html(result.error.errmsg);
                    return false;
                }else{
                    _gaq.push(['_trackEvent', 'studio', 'login','成功登录数']);//记录登录数
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
                    _gaq.push(['_trackEvent', 'studio', 'register','成功注册数']);//记录登录数
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
        });
        //关闭对话
        $(".closebtn").click(function(){
           $(".mymsg").hide();//设置对话
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
                studioChat.setTalkListScroll();
                $(this).addClass("on");
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
            if($(this).attr("t")=='analyst'){
                $("#dialog_list").children("[utype!=2]").hide();
                $("#dialog_list").children("[utype=2]").show();
            }else if($(this).attr("t")=='me'){
                $("#dialog_list").children("[isMe=false]").hide();
                $("#dialog_list").children("[isMe=true]").show();
            }else{
                $("#dialog_list").children().show();
            }
            studioChat.setTalkListScroll();
        });
        //对话下拉框事件
        $('.send_select').hover(function() {
            $(this).addClass('dw');
            studioChat.setUserListScroll();
        },function(){
            $(this).removeClass('dw')
        });
        $('#send_selelct_list a').bind("click", function(){
            if($(this).is(".on")){
                return;
            }
            $("#teacherListId a.te_btn.on").removeClass("on");
            $("#teacherListId li[uid='" + $(this).attr("uid") + "']").trigger("talking");
            $('.send_select div.selectlist a').removeClass("on");
            $('.send_select div.selected').text($(this).text());
            $(this).addClass("on");
        });
        /**
         * 键盘事件
         */
        $("#contentText").keydown(function(e){
            if(e.keyCode==13){//按回车键发送
                var val=$("#contentText").html();
                if(common.isValid(val)){
                    $("#contentText").html(val.replace(/<div>|<\/div>/g,""));
                    $("#sendBtn").click();
                }
                return false;
            }
        });
        //聊天内容发送事件
        $("#sendBtn").click(function(){
            var msg = studioChat.getSendMsg();
            if(msg === false){
                return;
            }
            /*var strRegex = '(((https|http)://)?)[A-Za-z0-9-_\/:?]+\\.[A-Za-z0-9-_&\?\/.=]+';
             var regex=new RegExp(strRegex,"gi");
             sendObj.content.value=sendObj.content.value.replace(regex,function(m){
             return (!isNaN(m)||(/\d+\.gif/g).test(m))?m:'<a href="'+m+'" target="_blank">'+m+'</a>';
             });*/
            var sendObj={uiId:studioChat.getUiId(),fromUser:studioChat.userInfo,content:{msgType:studioChat.msgType.text,value:msg}};
            var toUser=studioChat.getToUser(),replyDom=$(".replybtn");
            if(toUser && toUser.userId==replyDom.attr("uid") && toUser.talkStyle==replyDom.attr("ts")){//如果对话userId匹配则表示当前回复结束
                $(".mymsg").hide();
            }
            sendObj.fromUser.toUser = toUser;
            studioChat.socket.emit('sendMsg',sendObj);//发送数据
            studioChat.setContent(sendObj,true,false);//直接把数据填入内容栏
            //清空输入框
            $("#contentText").html("");
        });
        this.placeholderSupport();
    },

    /**
     * 过滤发送消息：过滤一些特殊字符等。
     * 如果返回值为false,则终止发送消息。
     */
    getSendMsg : function(){
        //校验聊天内容长度
        if($("#contentText").text().length + $("#contentText img").size() > 140){
            alert("消息内容超过最大长度限制（140字以内）！");
            return false;
        }

        var msg = $("#contentText").html();
        //排除表情,去除其他所有html标签
        msg = msg.replace(/<\/?(?!(img|IMG)\s+src="[^>"]+\/face\/[^>"]+"\s*>)[^>]*>/g,'');
        if(common.isBlank(msg)){
            $("#contentText").html("");
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
     * 设置tab滚动条
     */
    setTabInfoScroll:function(){
        $(".tab_box[t=needScoll]").jscroll({
            W:"6px",
            BgUrl:"url(/images/studio/scroll.png)",
            Bg:"0 0 repeat-y",
            Bar:{
                Pos:"up",
                Bd:{Out:"#b3cfe2",Hover:"#4e90bd"},
                Bg:{Out:"-10px center repeat-y",Hover:"-20px center repeat-y",Focus:"-20px center repeat-y"}
            },
            Btn:{btn:false}
        });
    },
    /**
     * 设置用户列表滚动条
     */
    setUserListScroll:function(){
        $(".scrollbox").jscroll({
            W:"6px",
            BgUrl:"url(/images/studio/scroll.png)",
            Bg:"0 0 repeat-y",
            Bar:{
                Pos:"up",
                Bd:{Out:"#b3cfe2",Hover:"#4e90bd"},
                Bg:{Out:"-10px center repeat-y",Hover:"-20px center repeat-y",Focus:"-20px center repeat-y"}
            },
            Btn:{btn:false}
        });
        $(".jscroll-h,.jscroll-e").css({
            'border':'0',
            'width':'6px'
        });
    },
    /**
     * 设置聊天列表滚动条
     */
    setTalkListScroll:function(isCurr) {
        var dh=$("#dialog_list").height(),sh=$(".scrollbox2").height(),vPosDir='down';
        if(dh<sh){//判断内容高度小于滚动高度则设置顶部对齐
            vPosDir='up';
        }
        $(".scrollbox2").jscroll({
            W: "6px",
            BgUrl: "url(/images/studio/scroll2.png)",
            Bg: "0 0 repeat-y",
            Bar: {
                Pos: vPosDir,
                isCurr:isCurr,
                Bd: {Out: "#b3cfe2", Hover: "#4e90bd"},
                Bg: {Out: "-10px center repeat-y", Hover: "-20px center repeat-y", Focus: "-20px center repeat-y"}
            },
            Btn: {btn: false},
            Fn:function(){
                //符合条件才滚动
                if(!$(".scrollbtn").hasClass("on") && studioChat.newTalkDivH>studioChat.oldTalkDivH && studioChat.newTalkDivH>350){
                    studioChat.setTalkListScroll(true);
                    studioChat.oldTalkDivH=studioChat.newTalkDivH;
                }
            }
        });
        $(".jscroll-h,.jscroll-e").css({
            'border': '0',
            'width': '6px'
        });
    } ,
    /**
     * 提取@对话html
     */
    getToUser:function(){
      var curDom=$('#send_selelct_list a[class=on]'),userId=curDom.attr("uid"),ts=curDom.attr("ts"),utype=curDom.attr("utype");
      if(userId!='all'){
          return {userId:userId,nickname:curDom.find("label[t=nk]").html(),talkStyle:ts,userType:utype};
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
               if(this.name=='nickname'&& !(/^.{2,10}$/.test(this.value))) {
                   errorDom.attr("tId",this.name).html("昵称输入有误，请输入2至10位字符！");
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
    formatPublishTime:function(time){
        return common.isBlank(time)?'':common.getHHMM(Number(time.replace(/_.+/g,"")));
    },
    /**
     * 设置对话
     * @param userId
     * @param nickname
     * @param talkStyle聊天方式（0对话，1私聊）
     * @param userType 用户类别(0客户；1管理员；2分析师；3客服）
     */
    setDialog:function(userId,nickname,talkStyle,userType){
        $("#teacherListId a.te_btn.on").removeClass("on");
        $("#teacherListId li[uid='" + userId + "']").trigger("talking");
        $(".send_select div.selectlist a").removeClass("on");
        var obj=$('.send_select div.selectlist a[uid='+userId+']');
        var nm="1"==talkStyle?" (私聊)":"";
        $('.send_select div.selected').text(nickname+nm);
        if(obj.length>0){
            obj.find("label[t=wh]").html(nm);
            obj.attr("ts",talkStyle);
            obj.addClass("on");
        }else{
            var loc_sendElem = $('<a href="javascript:void(0)" class="on" uid="'+userId+'" ts="'+talkStyle+'" utype="'+userType+'"><label t="nk">'+nickname+'</label><label t="wh">'+nm+'</label></a>');
            $("#send_selelct_list").append(loc_sendElem);
            loc_sendElem.click(function(){
                if($(this).is(".on")){
                    return;
                }
                $("#teacherListId a.te_btn.on").removeClass("on");
                $("#teacherListId li[uid='" + $(this).attr("uid") + "']").trigger("talking");
                $('.send_select div.selectlist a').removeClass("on");
                $('.send_select div.selected').text($(this).text());
                $(this).addClass("on");
            });
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
            //studioChat.timeOutSend(data.uiId, true);//一分钟后检查是否发送成功，不成功提示重发
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
            //studioChat.removeLoadDom(data.uiId);
            if(data.value && data.value.needApproval){
                $('#'+data.uiId).attr("id",fromUser.publishTime);
            }else{
                $('#'+data.uiId+' .dcont').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            }
            return;
        }
        if(!isMeSend && studioChat.userInfo.userId==fromUser.userId && data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
            //studioChat.removeLoadDom(data.uiId);
            $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
            $('#'+data.uiId+' .dtime').html(studioChat.formatPublishTime(fromUser.publishTime));
             return;
        }
        var dialog=studioChat.formatContentHtml(data,isMeSend,isLoadData);
        var list=$("#dialog_list");
        list.append(dialog);
        if(!isLoadData && $(".scrollbtn").hasClass("on")) {
            studioChat.setTalkListScroll();
        }
        //对话事件
        $('#'+fromUser.publishTime+' .headimg').click(function(){
            studioChat.openDiaLog($('#'+fromUser.publishTime+' .dialogbtn'));
        });
        $('#'+fromUser.publishTime+' .uname').click(function(){
            var diaDom=$('#'+fromUser.publishTime+' .dialogbtn');
            studioChat.openDiaLog(diaDom);
            diaDom.css('left','62px');
            diaDom.css('top','30px');
        });
        var readSetDom=$('.view_select .se_cont a[class=on]');
        if(readSetDom.attr("t")!="on"){ //如果选择了不是查看全部
            readSetDom.click();
        }
        studioChat.newTalkDivH=$("#dialog_list").height();
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
         if("2"!=diaDom.attr("utype") && studioChat.userInfo.userType!=2){
             diaDom.find("a[t=1]").hide();
         }
         diaDom.show();
         diaDom.find("a").click(function(){
             var tp=$(this).parent();
             studioChat.setDialog(tp.attr("uid"),tp.attr("nk"),$(this).attr("t"),tp.attr("utype"));//设置对话
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
            toUserHtml='<span class="to">对<b class="toname" uid="'+toUser.userId+'">'+toUser.nickname+(toUser.talkStyle==1?" (私聊)":"")+'</b></span>';
            if(studioChat.userInfo.userId==toUser.userId){
                isMe='true';
            }
        }
        pHtml=content.value;
        if(studioChat.userInfo.userId==fromUser.userId){
            cls+='mine';
            nickname='我';
            isMe='true';
            /*if(isMeSend){
             loadHtml='<i class="img-loading"></i>';
             loadImgHtml='<span class="shadow-box"></span><s class="shadow-conut"></s>';
             }*/
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
                    $(".replybtn").attr("uid",fromUser.userId);
                    $(".replybtn").attr("ts",toUser.talkStyle);
                    $(".replybtn").attr("futype",fromUser.userType);
                    $(".sender").html(fromUser.nickname);
                    $(".xcont").html(pHtml);
                }
            }
        }
        var html='<div class="'+cls+'" id="'+fromUser.publishTime+'" isMe="'+isMe+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header"><a href="javascript:" class="headimg" uid="'+fromUser.userId+'">'+studioChat.getUserAImgCls(fromUser.clientGroup,fromUser.userType,fromUser.avatar)+'</a><i></i>'+
        '<p><a href="javascript:"  class="'+uName+'">'+nickname+'</a>'+toUserHtml+'<span class="dtime">'+studioChat.formatPublishTime(fromUser.publishTime)+'</span><span class="dcont">'+pHtml+'</span></p>' +dialog+'</div>';
        return html;
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
        if(studioChat.userInfo.userId!=userId && studioChat.userInfo.userId.indexOf('visitor_')==-1 && userId.indexOf('visitor_')==-1){
            return '<div class="dialogbtn" style="display:none;" nk="'+nickname+'" uid="'+userId+'" utype="'+userType+'"><a href="javascript:" class="d1" t="0"><span><b></b>对话</span></a>'+($("#studioListId a[class~=ing]").attr("aw")=="true"?'<a href="javascript:" class="d2" t="1"><span><b></b>私聊</span></a>':'')+'</div>'
        }else{
            return '';
        }
    },
    /**
     * 设置在线用户
     * @param row
     * @returns {boolean}
     */
    setOnlineUser:function(row){
        if(row.userType==2){
            if($("#teacherListId li[uid='" + row.userId + "']").length>0){
                return false;
            }
            var loc_teElem = $('<li uid="'+row.userId+'" utype="'+row.userType+'"><a title="' + (row.introduction||"") + '" href="javascript:" class="te_btn"><img class="headimg" src="'+row.avatar+'"><span><strong>'+row.nickname+'</strong><i>'+(row.position||'')+'</i></span><div class="mp"><b></b></div></a></li>');
            $("#teacherListId").append(loc_teElem);
            $("#teacherListId").width($("#teacherListId").width() + loc_teElem.width());
            if($("#studioListId a[class~=ing]").attr("aw")=="true"){
                $(".te_dialoglist").append(studioChat.getDialogHtml(row.userId,row.nickname,row.userType));
            }
            loc_teElem.bind("talking", function(){
                $(this).find(".te_btn").addClass("on");
            });
            loc_teElem.click(function(){

                var loc_isOn =$(this).find("a").is(".on");

                if($(".te_dialoglist div").length>0){
                    if(loc_isOn){
                        studioChat.setDialog("all","对所有人说");//设置对话
                    }
                    var mydialog = $('.te_dialoglist .dialogbtn').eq($(this).index());
                    studioChat.openDiaLog(mydialog);
                    mydialog.css('left',$(this).offset().left-$('.chat').offset().left+5);
                }else{
                    if(loc_isOn){
                        studioChat.setDialog("all","对所有人说");//设置对话
                    }else{
                        studioChat.setDialog($(this).attr("uid"),$(this).find("strong").text(),0,$(this).attr("utype"));//设置对话
                    }
                }
            });
        }else{
            if($("#userListId li[id='" + row.userId + "']").length>0){
                return false;
            }
            var dialogHtml=studioChat.getDialogHtml(row.userId,row.nickname,row.userType),isMeHtml="",unameCls = "uname",seq=row.sequence;
            if(studioChat.userInfo.userId==row.userId){
                isMeHtml = "【我】";
                unameCls += " ume";
                seq = "0";
            }
            var lis=$("#userListId li"),
                liDom='<li id="'+row.userId+'" t="'+seq+'">'+dialogHtml+'<a href="javascript:" t="header" class="' + unameCls + '"><div class="headimg">'+studioChat.getUserAImgCls(row.clientGroup,row.userType,row.avatar)+'</div>'+row.nickname+isMeHtml+'</a></li>';
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
                    $('.dialogbtn',$(this).parent()).css('left','7px');
                    studioChat.openDiaLog($(this).prev());
                });
            }
        }
        return true;
    },

     /*
     * 设置socket
     */
    setSocket:function(){
        this.socket = io.connect(this.socketUrl);
        //建立连接
        this.socket.on('connect',function(){
            console.log('connected to server!');
            //$(".loading-box").show();
            studioChat.socket.emit('login',{userInfo:studioChat.userInfo,lastPublishTime:$("#dialog_list>div:last").attr("id"), allowWhisper : $("#studioListId a[class~=ing]").attr("aw")});
        });
        //进入聊天室加载的在线用户
        this.socket.on('onlineUserList',function(data){
            $('#userListId').html("");
            //如客户数小于200，则追加额外游客数
            var length=data.length;
            if($("#studioListId a[class~=ing]").attr("av")=="true" && length<=200){
                var randId= 0,size=length<=10?60:(200/length)*3+10;
                for(var i=0;i<size;i++){
                    randId=common.randomNumber(6);
                    data.push({userId:("visitor_"+randId),clientGroup:'visitor',nickname:('游客_'+randId),sequence:14,userType:0});
                }
            }
            var row=null;
            for(var i in data){
                row=data[i];
                if(!studioChat.setOnlineUser(row)){
                    continue;
                }
            }
            studioChat.setUserListScroll();
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
            studioChat.setContent(data,false,false);
        });
        //通知信息
        this.socket.on('notice',function(result){
            switch (result.type)
            {
                case 'onlineNum':{
                    var data=result.data;
                    if(data.online){
                        studioChat.setOnlineUser(data.onlineUserInfo);
                    }else{
                        var userInfoTmp=data.onlineUserInfo;
                        if(userInfoTmp.userType==2){
                            $("#teacherListId li[uid='"+userInfoTmp.userId + "']").remove();
                        }else{
                            if(studioChat.userInfo.userId!=userInfoTmp.userId){
                                $("#userListId #"+userInfoTmp.userId).remove();
                            }
                        }
                    }
                    break;
                }
                case 'removeMsg':
                    $("#"+result.data.replace(/,/g,",#")).remove();
                    break;
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
                        studioChat.setTalkListScroll();
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
            $(".loading-box").hide();
            if(msgData && $.isArray(msgData)) {
                msgData.reverse();
                for (var i in msgData) {
                    studioChat.formatUserToContent(msgData[i]);
                }
                if(!isAdd) {
                    this.oldTalkDivH=this.newTalkDivH;
                    window.setTimeout(function(){
                    	studioChat.setTalkListScroll();
                    }, 50);
                }
            }
        });
    },
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
            avatar:row.avatar,
            position:row.position
        };
        studioChat.setContent({fromUser: fromUser,content:row.content},false,true);
    }
};
// 初始化
$(function() {
    studioChat.init();
});