/**
 * 直播间聊天区直播老师选项卡操作类
 * author Jade.zhu
 */
var chatTeacher = {
    //直播老师絯号
    teacherId : null,
    teacherSele : "off",
    init: function(){
    	this.setEvent();
    },
    setEvent: function(){
        /**
         * 联系助理按钮事件
         */
        $('#sdNoAuthBox .contactContact').click(function(){
            if($(".pletter_win .mult_dialog a[utype=3]").length==0) {
                chat.getCSList();//设置所有客服
            }
            if($(this).hasClass('nocs')){
                box.showTipBox('助理失联中');
            }else {
                common.openPopup('.blackbg,.pletter_win');
            }

            $("#sdNoAuthBox").hide();
        })

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
            var course=common.getSyllabusPlan(indexJS.syllabusData,indexJS.serverTime);
            if(course && course.lecturerId && (!videos.sd.analyst || course.lecturerId.indexOf(videos.sd.analyst.userNo) == -1)){
                $.getJSON('/studio/getShowTradeInfo',{userNo: course.lecturerId},function(data){
                    if(data && data.analyst){
                        videos.sd.analyst = data.analyst;
                        videos.sd.tradeList = data.tradeList || [];
                        videos.sd.loadAll = false;
                        $("#sdInfoId .nosd_tip").hide();
                        videos.sd.showPraiseInfo();
                        videos.sd.showSDInfo();
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
                    common.getJson("/studio/setUserPraise",{clientId:indexJS.userInfo.userId,praiseId:_this.attr("uid")},function(result){
                        if(result.isOK) {
                            _this.find('i').fadeIn().delay(400).fadeOut();
                            var lb= _this.find("label");
                            lb.text(common.isValid(lb.text())?(parseInt(lb.text())+1):0);
                        }else{
                            box.showTipBox('亲，已点赞，当天只能点赞一次！');
                        }
                        _this.addClass('supported');
                        _this.attr('title','已点赞');
                        //同步视频直播老师中的点赞信息
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
                    html.push('<img src="/pm/theme1/img/sd_default.png"></a>');
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
            indexJS.setListScroll($("#sdInfoId .sd_show"), null, {callbacks : {onTotalScroll : videos.sd.showTradeList}});
        },
        /**显示未授权弹框*/
        showAuthBox:function(){
           var csDom = $("#userListId li[utype='3']:first");
            $("#sdNoAuthBox .sdzl").show();
            $("#sdNoAuthBox .aid_chat img").attr("src", csDom.find(".headimg img").attr("src"));
            $("#sdNoAuthBox .aid_chat span").attr("uid", csDom.attr("id")).text(csDom.find(".uname span:first").text());
            $("#sdNoAuthBox,.blackbg").show();
        }
    },
    /**培训班详情*/
    trainDetails : function(obj){
        var $this = $(obj);
        $('.train_detail .pop_tit label').text($this.parent().find(".train_name").text());
        var userNo=$this.attr("userno");
        $("#train_info_id").empty().load("/studio/getTrDetail?uid="+userNo,function(){
            common.openPopup('.blackbg,.train_detail');
        });
    },
    /**按照培训班分析师编号报名培训班*/
    trainRegisByUserNo : function(userNo){
        var $obj = $(".pop_train .scrollbox .trainlist a[userno='" + userNo + "']");
        if($obj.size() == 0){
            $obj = $("#roomList_panel a[userno='" + userNo + "']")
        }
        chatTeacher.trainRegis($obj[0]);

    },
    /**培训报名*/
    trainRegis:function(obj){
        if(indexJS.userInfo.isLogin) {
            var userNo =$(obj).attr("userno");
            var group =$(obj).attr("cgs");
            var updateTrain =$(obj).attr("updateTrain");
            var isDetail = $(obj).attr('isDetail');
            var userGroup = indexJS.userInfo.clientGroup;
            var nickname = indexJS.userInfo.nickname;
            if(group && group.indexOf(userGroup) != -1){
                var params = {groupId:$(obj).attr("rid"),userNo:userNo,clientGroup:group,nickname:nickname};
                common.getJson('/studio/addClientTrain',{data:JSON.stringify(params)},function(data){
                    if(data.awInto){
                        indexJS.toRefreshView();
                    }else if(data.errcode){
                        if(!$(".train_detail").is(":visible") && $(obj).attr('rml')=='true' && $.inArray(data.errcode,['3003','3009'])>-1){
                            $('.train_detail .pop_tit label').text($(obj).text());
                            $("#train_info_id").empty().load("/studio/getTrDetail?uid="+userNo,function(){
                                common.openPopup('.blackbg,.train_detail');
                            });
                        } else {
                            box.showMsg(data.errmsg);
                        }
                    }else{
                        if(data.isOK){
                            if(updateTrain){
                                chatTeacher.showTrani(data.chatGroup);
                            }else if(isDetail=='true'){
                                box.showMsg(data.msg);
                                videosTrain.getTrainList();
                            }else{
                                box.showMsg(data.msg);
                            }
                        }else{
                            box.showMsg(data.msg||data.errmsg);
                        }
                    }
                });
            }else{
                /*var groupMeg = [];
                groupMeg.push("【");
                if(group.indexOf(",") !=-1){
                    var groupTypes = group.split(",");
                    for(var i in groupTypes){
                       var groupType = groupTypes[i];
                        groupMeg.push(common.clientGroupStr[groupType])
                        if(i < groupTypes.length-1){
                            groupMeg.push(" , ");
                        }
                    }
                }else{
                    groupMeg.push(common.clientGroupStr[group]);
                }
                groupMeg.push("】");

                var msg = "客户为:【"+common.clientGroupStr[userGroup]+"】,培训班只对"+groupMeg.join("")+"客户开放";
                 box.showMsg(msg);*/
                box.showMsg({msg: "该房间仅对培训班学员开放,"});
                $("#popMsgTxt").append('<a class="contactContact" style="color:#2980d1; font-size:14px;text-decoration:none;cursor:pointer" onclick="videosLive.contactTeacher();_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'left_zb_callzhuli\', \'content_left\', 1, true]);">如有疑问请联系老师助理</a>。');
                $("#popMsgCont .yesbtn").bind("click", function(){
                    videosLive.contactTeacher();
                    _gaq.push(['_trackEvent', 'pmchat_studio', 'left_zb_confirm', 'content_left', 1, true]);
                });
            }
        }else{
            $('#loginBox').css('z-index','102');
            common.openPopup('.blackbg,.login');
        }
    },
    /**
     * 选择分析师
     * @param obj
     */
    selectAnalyst:function(obj){
        chatTeacher.teacherSele = "off";
        chatTeacher.getShowTeacher($(obj).attr('uid'));
        chatTeacher.teacherSele = "on";
    },
    /**
     * 清空html
     * @param arr
     */
    clearHtml:function(arr){
        var obj=$(".main_tab .teacherlist .teacherbox");
        for(var i in arr){
            obj.find(arr[i]).html("");
        }
    },
    /**初始化直播老师栏目*/
    getShowTeacher:function(userNo){
        if(!$('.main_tabnav a[t=teacher]').hasClass("on")){
            return;
        }
        var teachId ;
        if(common.isBlank(userNo)){
            teachId = indexJS.courseTick.course && indexJS.courseTick.course.lecturerId.split(",")[0];
        }else{
            teachId = userNo;
            if(teachId == chatTeacher.teacherId|| chatTeacher.teacherSele == "on"){
                return;
            }
        }
        if(common.isBlank(teachId)){
            teachId=$("#textlivePanel .livebrief[pt]:eq(0)>div.te_info").attr("tid")||"";
        }
        var groupId = LoginAuto.sessionUser['groupId'];
        this.clearHtml([".taglist",".sd_show .sd_ul",".tebox_teachLive ul",".tebox_studentLive ul",".tebox_teachVideo ul"]);
        common.getJson('/studio/getShowTeacher',{data:JSON.stringify({groupId:groupId,authorId:teachId})},function(data){
            var userInfo = data.userInfo;//直播老师
            var teacherList = data.teacherList;//分析师列表
            var tradeList = data.tradeList;//直播老师晒单
            var trainList = data.trainList;//培训班列表
            var trAndClNum=data.trAndClNum;
            if(null != userInfo){//直播老师信息
                chatTeacher.teacherId = userInfo.userNo;
                $('.main_tab .teacherlist .teacherbox .te_top  .info-l span').eq(0).text(userInfo.userName);
                $('.main_tab .teacherlist .teacherbox .te_top  .info-l span').eq(1).text(userInfo.position);
                $('.main_tab .teacherlist .teacherbox .te_top  .himg img').attr({src:userInfo.avatar});
                var winRate = !common.isBlank(userInfo.winRate) && userInfo.winRate!=""?userInfo.winRate:"--";
                var earningsM = !common.isBlank(userInfo.earningsM) && userInfo.earningsM!=""?userInfo.earningsM:"--";
                $('.main_tab .teacherlist .teacherbox .te_top  .stateshow .item b').eq(0).text(winRate);
                $('.main_tab .teacherlist .teacherbox .te_top  .stateshow .item b').eq(1).text(earningsM);
                $('#analystIntro').text(userInfo.introduction);
                $('#analystWeChatQrCode').attr('src',userInfo.wechatCodeImg);

                $(".main_tab .teacherlist .teacherbox .te_top  .stateshow .item:last-child").empty();
                $(".main_tab .teacherlist .teacherbox .te_top  .stateshow .item:last-child").append('<a href="javascript:void(0)" class="support" uid="'+userInfo.userNo+'" onclick="chatTeacher.showAnalystPraiseInfo(this)"><i class="i6"></i></a><b>(<label>'+userInfo.praiseNum+'</label>)</b><span>赞</span>');
                $(".main_tab .teacherlist .teacherbox  .taglist").empty();
                if(userInfo.tag){
                    var tagHtml = [];
                    var tags = userInfo.tag.split(",");
                    for(var i = 0 ;i<tags.length;i++){
                        var tag = tags[i];
                        tagHtml.push('<span class="tag"><span>'+tag+'</span><i></i></span>');
                    }
                    $(".main_tab .teacherlist .teacherbox  .taglist").html(tagHtml.join(""));
                }
            }
            if(null != teacherList){//分析师列表
                var html = [],analyst = null;
                for(var i = 0;i<teacherList.length;i++){
                    analyst = teacherList[i];
                    html.push('<a href="javascript:void(0)" onclick="chatTeacher.selectAnalyst(this);_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_ls_OthenTeacher\', \''+analyst.userName+'\', 1, true]);" uid="'+analyst.userNo+'">'+analyst.userName+'</a>');
                }
                $('.main_tab .teacherlist .teacherbox  .clearfix .teacher_select .selectlist').html(html.join(""));
            }
            if(null != tradeList){//直播老师晒单显示
                var data = {type:"prerogative",item:"prerogative_position"};
                common.getJson('/studio/getChatPointsConfig',{data:JSON.stringify(data)}, function(result) {
                    var isNotAuth = false,isPos = false;
                    if(result){
                        var clientGroups = result.clientGroup;
                        for(var i=0, lenI = !clientGroups ? 0 : clientGroups.length; i < lenI;i++){
                            var clientGroup = clientGroups[i];
                            if(clientGroup == indexJS.userInfo.clientGroup){
                                isNotAuth = true;
                            }
                        }
                    }
                    var html = [],chatTrade =null;
                    for(var i = 0,k=1;i<tradeList.tradeList.length;i++,k++){
                        chatTrade = tradeList.tradeList[i];
                        isPos = !chatTrade.profit;
                        if(k >4){
                            break;
                        }
                        if( k % 2 != 0){
                            html.push('<li>');
                        }else{
                            html.push('<li class="r">');
                        }
                        html.push('<div class="cont">');
                        html.push('<div class="sd_tit">');
                        html.push('<span class="dep">');
                        if(isPos){
                            html.push('持仓中');
                        }else{
                            html.push('获利：');
                            html.push('<b' + (/^-/.test(chatTrade.profit) ? ' class="fall"' : '') + '>' + chatTrade.profit + '</b>');
                        }
                        html.push('</span>');
                        html.push('<span class="sdtime">晒单时间: ' + common.formatterDateTime(chatTrade.showDate).substring(5, 16) + '</span>');
                        html.push('</div>');

                        if(isPos){
                            if(indexJS.userInfo.isLogin && isNotAuth){
                                html.push('<a href="#" onclick="chatTeacher.deductionIntegralShowTrade(this)" tradeId="'+chatTrade._id+'" tradeImg="'+chatTrade.tradeImg+'" isPos="'+isPos+'" profit="'+chatTrade.profit+'">');
                                html.push('<i class="i-zoom"></i><img src="/pm/theme1/img/sd_default.png"></a>');
                            }else if(!indexJS.userInfo.isLogin){
                                html.push('<a href="javascript:chatTeacher.sd.showAuthBox();_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_ls_ChiChangZhong\', \'content_right\', 1, true]);">');
                                html.push('<i class="i-zoom"></i><img src="/pm/theme1/img/sd_default.png"></a>');
                            }else{
                                html.push('<a href="' + chatTrade.tradeImg + '" data-lightbox="sd-img" data-title="' + (isPos ? "持仓中" : "获利：" + chatTrade.profit) + '">');
                                html.push('<i class="i-zoom"></i><img src="' + chatTrade.tradeImg + '"></a>');
                            }
                        }else{
                            html.push('<a href="' + chatTrade.tradeImg + '" data-lightbox="sd-img" data-title="' + (isPos ? "持仓中" : "获利：" + chatTrade.profit) + '">');
                            html.push('<i class="i-zoom"></i><img src="' + chatTrade.tradeImg + '"></a>');
                        }
                        html.push('</div></li>');
                    }
                    $('.main_tab .teacherlist .teacherbox .sd_show .sd_ul').html(html.join(""));
                });
            }
            if(null != trainList){//直播房间老师培训班显示
                chatTeacher.showTrani(trainList,trAndClNum);
            }
            //查询精采直播、学员风采、教学视频
            indexJS.getArticleList("teach_video_base,teach_video_expert,teach_video_financial,teach_video_gw,student_style,teach_live_video",indexJS.userInfo.groupId,0,1,20,'{"createDate":"desc"}',{authorId:teachId},function(dataList){
                if(dataList && dataList.result==0){
                    var articleList = dataList.data;
                    var teachLiveCount = 1,studentLiveCount = 1,teachVideoCount = 1;
                    var teachLiveHtml = [],studentLiveHtml = [],teachVideoHtml = [];
                    var article =null,articleDetail = null;
                    for(var i = 0;i<articleList.length;i++){
                        article = articleList[i];
                        articleDetail = articleList[i].detailList[0];
                        //精彩直播
                        if(article.categoryId == "teach_live_video" ){
                            if(teachLiveCount <= 6){
                                if( teachLiveCount % 3 != 0){
                                    teachLiveHtml.push('<li>');
                                }else{
                                    teachLiveHtml.push('<li class="r">');
                                }
                                teachLiveHtml.push('<a href="javascript:" class="imga" title="'+articleDetail.title+'" ct="'+article.categoryId+'" articleId="'+article._id+'" vUrl="'+article.mediaUrl+'" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_ls_Wonderfullive\', \''+articleDetail.title+'\', 1, true]);"><img src="'+article.mediaImgUrl+'" ><b class="playbtn"><i></i></b></a>');
                                teachLiveHtml.push('<a href="javascript:" class="vlink" title="'+articleDetail.title+'" ct="'+article.categoryId+'" articleId="'+article._id+'" vUrl="'+article.mediaUrl+'" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_ls_Wonderfullive\', \''+articleDetail.title+'\', 1, true]);">'+articleDetail.tag+'</a>');
                                teachLiveHtml.push('</li>');
                                teachLiveCount++;
                            }
                        }else  if(article.categoryId == "student_style" ){ //学员风采
                            if(studentLiveCount <= 3){
                                if( studentLiveCount % 3 != 0){
                                    studentLiveHtml.push('<li>');
                                }else{
                                    studentLiveHtml.push('<li class="r">');
                                }
                                studentLiveHtml.push('<a href="'+article.mediaUrl+'" data-lightbox="student-img" data-title="' +articleDetail.title+ '" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_ls_StudentsStyle\', \''+articleDetail.tag+'\', 1, true]);"><div class="imga"><img src="'+article.mediaUrl+'" ></div></a>');
                                studentLiveHtml.push('<span class="vlink">'+articleDetail.tag+'</span>');
                                studentLiveHtml.push('</li>');
                                studentLiveCount++;
                            }
                        }else{//教学视频
                            if(teachVideoCount <= 3){
                                if( teachVideoCount % 3 != 0){
                                    teachVideoHtml.push('<li>');
                                }else{
                                    teachVideoHtml.push('<li class="r">');
                                }
                                teachVideoHtml.push('<a href="javascript:" class="imga" title="'+articleDetail.title+'" ct="'+article.categoryId+'" articleId="'+article._id+'" vUrl="'+article.mediaUrl+'" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_ls_teachvideo\', \''+articleDetail.title+'\', 1, true]);"><img src="'+article.mediaImgUrl+'" ><b class="playbtn"><i></i></b></a>');
                                teachVideoHtml.push('<a href="javascript:" class="vlink" title="'+articleDetail.title+'" ct="'+article.categoryId+'" articleId="'+article._id+'" vUrl="'+article.mediaUrl+'" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_ls_teachvideo\', \''+articleDetail.title+'\', 1, true]);">'+articleDetail.tag+'</a>');
                                teachVideoHtml.push('</li>');
                                teachVideoCount++;
                            }
                        }
                    }
                    $('.main_tab .teacherlist .teacherbox .tebox_teachLive ul').html(teachLiveHtml.join("")); //精彩直播
                    $('.main_tab .teacherlist .teacherbox .tebox_studentLive ul').html(studentLiveHtml.join("")); //学员风采
                    $('.main_tab .teacherlist .teacherbox .tebox_teachVideo ul').html(teachVideoHtml.join("")); //教学视频
                    //精采视频播放
                    $('.main_tab .teacherlist .teacherbox .tebox_teachLive ul li a').click(function(){
                        $('.main_tab .teacherlist .teacherbox .tebox_teachLive ul li .vlink').removeClass("on");
                        if($(this).attr("class") =="imga"){
                            $(this).next(".vlink").addClass("on");
                        }
                        if($(this).attr("class") =="vlink"){
                            $(this).addClass("on");
                        }
                        videos.player.play($(this).attr("vurl"), $(this).attr("title"));
                        var vdId=$(this).attr("articleId");
                        chatAnalyze.setUTM(false,{courseId:vdId});//统计教学视频点击数
                    });
                    //教学视频播放
                    $('.main_tab .teacherlist .teacherbox .tebox_teachVideo ul li a').click(function(){
                        $('.main_tab .teacherlist .teacherbox .tebox_teachVideo ul li .vlink').removeClass("on");
                        if($(this).attr("class") =="imga"){
                            $(this).next(".vlink").addClass("on");
                        }
                        if($(this).attr("class") =="vlink"){
                            $(this).addClass("on");
                        }
                        videos.player.play($(this).attr("vurl"), $(this).attr("title"));
                        var vdId=$(this).attr("articleId");
                        chatAnalyze.setUTM(false,{courseId:vdId});//统计教学视频点击数
                    });
                }
            });
        });
    },
    /**
     * 显示培训班
     * @param trainList
     * @param trAndClNum
     */
    showTrani:function(trainList,trAndClNum){
        if(null != trainList){//直播房间老师
            var  trainHtml = [];
            var  trainClientHtml = [];
            trainList.forEach(function(row,index){
                if((index+1) % 2 != 0){
                    trainHtml.push('<li>');
                }else{
                    trainHtml.push('<li class="r">');
                }
                var txt = '报名',cls='trainbtn',numTxt='('+row.clientSize+'人)',clk=' onclick="chatTeacher.trainRegis(this);_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_ls_Signup\', \''+row.name+'\', 1, true]);"';
                if(row.allowInto){
                    txt = '进入';
                    numTxt = '';
                }else if(row.isEnd){
                    txt = '已结束';
                    cls += ' b2';
                    clk = '';
                    numTxt = '';
                }
                var remark = common.trim(row.remark);
                trainHtml.push('<div class="cont">');
                trainHtml.push('<div class="headimg"><img src="'+row.defaultAnalyst.avatar+'" alt=""></div>');
                trainHtml.push('<div class="train_name">'+row.name+'</span></div>');
                trainHtml.push('<p>'+remark+'</p>');
                trainHtml.push('<a href="javascript:void(0)" class="'+cls+'" userno="'+row.defaultAnalyst.userNo+'" sp="'+row.allowInto+'" cgs= "'+row.clientGroup+'" rid="'+row._id+'" updateTrain="updateTrain"'+clk+'>'+txt+numTxt+'</a>');
                trainHtml.push('</div></li>');
            });
            if(trAndClNum){
                $('.main_tab .teacherlist .teacherbox .tebox_train  .tebox_tit span').text('(已结束开班'+trAndClNum.trainNum+'期/总共'+trAndClNum.clientNum+'人)');
            }
            $('.main_tab .teacherlist .teacherbox .tebox_train  ul').empty().prepend(trainHtml.join(""));
        }
    },

    /**点赞事件*/
    showAnalystPraiseInfo : function(obj){
            var _this=$(obj);
            try{
                common.getJson("/studio/setUserPraise",{clientId:indexJS.userInfo.userId,praiseId:_this.attr("uid")},function(result){
                    if(result.isOK) {
                       // _this.find('i').fadeIn().delay(400).fadeOut();
                        var lb= _this.next().find("label");
                        lb.text(common.isValid(lb.text())?(parseInt(lb.text())+1):0);
                        box.showTipBox('亲，点赞成功！');
                    }else{
                        box.showTipBox('亲，已点赞，当天只能点赞一次！');
                    }
                    _this.addClass('supported');
                    _this.attr('title','已点赞');
                },true);
            }catch(e){
                console.error("setPraise->"+e);
            }
    },
    /**
     * 扣积分查看晒单数据
     * @param dom
     */
    deductionIntegralShowTrade:function(obj){
        var _this=$(obj);
        if (indexJS.userInfo.isLogin && indexJS.userInfo.clientGroup != 'vip') {
            var params = {groupType:indexJS.userInfo.groupType,item:"prerogative_position",tag:'trade_'+_this.attr('tradeId')};
            common.getJson('/studio/addPointsInfo',{params:JSON.stringify(params)}, function(result) {
                if (!result.isOK) {
                    box.showTipBox(result.msg);
                }else{
                    _this.attr("href",_this.attr("tradeImg"));
                    _this.attr("data-lightbox","sd-img");
                    _this.attr("data-title",_this.attr("isPos") ? "持仓中" : "获利：" +_this.attr("profit"));
                    _this.removeAttr('onclick');
                    _this.unbind('click');
                    _this.click();
                }
            })
        }
    }
};

