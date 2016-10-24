/**
 * 直播间聊天区直播老师选项卡操作类
 * author Jade.zhu
 */
var chatTeacher = {
    //直播老师絯号
    teacherId : null,

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
            /*  if(csDom.size() == 0){//没有老师助理在线
                $("#sdNoAuthBox .sdzl").hide();
            }else{
                $("#sdNoAuthBox .sdzl").show();
                $("#sdNoAuthBox .aid_chat img").attr("src", csDom.find(".headimg img").attr("src"));
                $("#sdNoAuthBox .aid_chat span").attr("uid", csDom.attr("id")).text(csDom.find(".uname span:first").text());
            }*/

            $("#sdNoAuthBox .sdzl").show();
            $("#sdNoAuthBox .aid_chat img").attr("src", csDom.find(".headimg img").attr("src"));
            $("#sdNoAuthBox .aid_chat span").attr("uid", csDom.attr("id")).text(csDom.find(".uname span:first").text());
            $("#sdNoAuthBox,.blackbg").show();
        }
    },

    /**培训报名*/
    trainRegis:function(obj){
        if(indexJS.userInfo.isLogin) {
            var userNo =$(obj).attr("userno");
            var group =$(obj).attr("group");
            var updateTrain =$(obj).attr("updateTrain");
            var userGroup = indexJS.userInfo.clientGroup;
            var nickname = indexJS.userInfo.nickname;
            if(group.indexOf(userGroup) > 0){
                var params = {userNo:userNo,nickname:nickname,clientGroup:group,updateTrain:updateTrain}
                common.getJson('/studio/addClientTrain',{data:JSON.stringify(params)},function(data){console.log(data);
                    if(data.errcode == "3003"){
                        box.showMsg(data.errmsg);
                        return;
                    }
                    if(data.isOK){
                        console.log("succ");
                        if(updateTrain){
                            chatTeacher.showTrani(data.chatGroup);
                        }else{
                            box.showMsg(data.msg);
                        }
                    }else if(data.train){
                        box.showMsg(data.msg);
                    }else{
                        console.log("fail");
                        box.showMsg(data.msg);
                    }
                });
            }else{
                var groupMeg = [];
                groupMeg.push("[");
                if(group.indexOf(",") > 0){
                    var groupTypes = group.split(",");
                    for(var i in groupTypes){
                       var groupType = groupTypes[i];
                        groupMeg.push(common.groupType[groupType])
                        if(i < groupTypes.length-1){
                            groupMeg.push(",");
                        }
                    }
                }else{
                    groupMeg.push(common.groupType[group]);
                }
                groupMeg.push("]");

                var msg = "客户为:["+common.groupType[userGroup]+"],培训班只对"+groupMeg.join("")+"客户开放";
                box.showMsg(msg);
            }
        }else{
            common.openPopup('.blackbg,.login');
        }
    },

    selectAnalyst:function(obj){
        $(obj).addClass('on');
        chatTeacher.initShowTeacher($(obj).attr('uid'));
    },

    /**初始化直播老师栏目*/
    initShowTeacher:function(userNo){
        var teachId ;
        if(null == userNo){
            teachId = indexJS.courseTick.course && indexJS.courseTick.course.lecturerId;
        }else{
            teachId = userNo;
        }
        var groupId = LoginAuto.sessionUser['groupId'];

        /*if(teachId == chatTeacher.teacherId){
            return;
        }*/
        chatTeacher.teacherId = teachId;
        var params = {
            groupId:groupId,
            authorId:chatTeacher.teacherId,
            code:"teach_video_base,teach_video_gw,teach_video_expert",
            hasContent:0,
            pageNo:1,
            pageSize:3,
            orderByStr:'{"sequence":"desc","publishStartDate":"desc"}'
        };

        common.getJson('/studio/initShowTeacher',{data:JSON.stringify(params)},function(data){
            var userInfo = data.userInfo;//直播老师
            var analystList = data.analystList;//分析师列表
            var chatShowTrade = data.chatShowTrade;//直播老师晒单
            var chatGroupInfo = data.chatGroupInfo;//直播房间
            var articleList = data.articleList;
            if(null != userInfo){//直播老师信息
                $('.main_tab .teacherlist .teacherbox .te_top  .info-l span').eq(0).text(userInfo.userName);
                $('.main_tab .teacherlist .teacherbox .te_top  .info-l span').eq(1).text(userInfo.position);
                $('.main_tab .teacherlist .teacherbox .te_top  .himg img').attr({src:userInfo.avatar});
                var winRate = userInfo.winRate!=""?userInfo.winRate:"0%";
                $('.main_tab .teacherlist .teacherbox .te_top  .stateshow .item b').eq(0).text(winRate);
                $('.main_tab .teacherlist .teacherbox  .intro span').text(userInfo.introduction);

                $(".main_tab .teacherlist .teacherbox .te_top  .stateshow .item:last-child").empty();
                $(".main_tab .teacherlist .teacherbox .te_top  .stateshow .item:last-child").append('<a href="javascript:void(0)" class="support" uid="'+userInfo.userNo+'" onclick="chatTeacher.showAnalystPraiseInfo(this)"><i class="i6"></i></a><b>('+userInfo.praiseNum+')</b><span>赞</span>');
            }

            if(null != analystList){
                var html = [];
                for(var i = 0;i<analystList.length;i++){
                    var analyst = analystList[i];
                    html.push('<a href="javascript:void(0)" class="" onclick="chatTeacher.selectAnalyst(this)" uid="'+analyst.userNo+'">'+analyst.userName+'</a>');
                }
                $('.main_tab .teacherlist .teacherbox  .clearfix .teacher_select .selectlist').empty().prepend(html.join(""));
            }

            if(null != chatShowTrade){//直播老师晒单
                var html = [];
                var isNotAuth = indexJS.checkClientGroup("new"), isPos = false;
                for(var i = 0,k=1;i<chatShowTrade.tradeList.length;i++,k++){
                    var chatTrade = chatShowTrade.tradeList[i];
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
                    if(isNotAuth && isPos){
                        html.push('<a href="javascript:chatTeacher.sd.showAuthBox()">');
                        html.push('<i class="i-zoom"></i><img src="/pm/theme1/img/sd_default.png"></a>');
                    }else{
                        html.push('<a href="' + chatTrade.tradeImg + '" data-lightbox="sd-img" data-title="' + (isPos ? "持仓中" : "获利：" + chatTrade.profit) + '">');
                        html.push('<i class="i-zoom"></i><img src="' + chatTrade.tradeImg + '"></a>');
                    }
                    html.push('</div></li>');
                }
                $('.main_tab .teacherlist .teacherbox .sd_show  .sd_ul').empty().prepend(html.join(""));
            }
            if(null != chatGroupInfo){//直播房间老师
                chatTeacher.showTrani(chatGroupInfo);
            }
            if(articleList != null){
                var  articleHtml = [];
                for(var i = 1;i>=3;i++){
                    if( i % 2 != 0){
                        articleHtml.push('<li>');
                    }else{
                        articleHtml.push('<li class="r">');
                    }
                    articleHtml.push('     <a href="" class="imga"><img src="/pm/theme1/img/tebox_pic2.jpg" alt=""><b class="playbtn"><i></i></b></a>');
                    articleHtml.push('     <a href="" class="vlink">非农议息大赚</a></li>');
                }
                $('.main_tab .teacherlist .teacherbox .tebox_video  ul').empty().prepend(articleHtml.join(""));
            }
        });
    },

    showTrani:function(chatGroupInfo){
        var traninNum = 0;
        if(null != chatGroupInfo){//直播房间老师
            var  trainHtml = [];
            var  trainClientHtml = [];
            chatGroupInfo.forEach(function(row,index){
                traninNum +=row.traninClient.length;
                if((index+1) % 2 != 0){
                    trainHtml.push('<li>');
                }else{
                    trainHtml.push('<li class="r">');
                }
                var introduction = common.trim(row.defaultAnalyst.introduction);
                trainHtml.push('<div class="cont">');
                trainHtml.push('<div class="headimg"><img src="'+row.defaultAnalyst.avatar+'" alt="" class="mCS_img_loaded"></div>');
                trainHtml.push('<div class="train_name">'+row.name+'</span></div>');
                trainHtml.push('<p>'+introduction+'</p>');
                trainHtml.push('<a href="javascript:void(0)" class="trainbtn" userno="'+row.defaultAnalyst.userNo+'" group= "'+row.clientGroup+'" updateTrain="updateTrain" onclick="chatTeacher.trainRegis(this)">报名（'+row.traninClient.length+'人）</a>');
                trainHtml.push('</div></li>');

                var traninClientList = row.traninClient;
                if(null != traninClientList && traninClientList.length >0){
                    for(var i = 0;i<traninClientList.length;i++){
                        var traninClient = traninClientList[i];
                        trainClientHtml.push('<li>');
                        trainClientHtml.push('<div class="imga"><img src="/pm/theme1/img/tebox_pic1.jpg" alt=""></div>');
                        trainClientHtml.push('<span class="vlink">Tim学员非农大赚1万美金</span>');
                        trainClientHtml.push('</li>');
                    }
                }
            });
            $('.main_tab .teacherlist .teacherbox .tebox_train  .tebox_tit span').text('(已结束开班57期/总共'+traninNum+'人)');
            $('.main_tab .teacherlist .teacherbox .tebox_train  ul').empty().prepend(trainHtml.join(""));
            $('.main_tab .teacherlist .teacherbox .tebox_tranin  ul').empty().prepend(trainClientHtml.join(""));
        }
    },

    /**点赞事件*/
    showAnalystPraiseInfo : function(obj){
            var _this=$(obj);
            try{
                common.getJson("/studio/setUserPraise",{clientId:indexJS.userInfo.userId,praiseId:_this.attr("uid")},function(result){
                    if(result.isOK) {
                        _this.find('i').fadeIn().delay(400).fadeOut();
                        var lb= _this.find("label");
                        lb.text(common.isValid(lb.text())?(parseInt(lb.text())+1):0);
                    }else{
                        box.showTipBox('亲，已点赞，当天只能点赞一次！');
                    }
                   // _this.addClass('supported');
                    _this.attr('title','已点赞');
                },true);
            }catch(e){
                console.error("setPraise->"+e);
            }
    }

};

//初始化
$(function() {
    chatTeacher.init();
});