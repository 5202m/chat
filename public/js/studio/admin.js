/**
 * 直播间客户端通用操作类
 * @type {{init: Function, setKindEdit: Function, setSocket: Function}}
 * author Alan.wu
 */
var studioChat={
    filePath:'',
    //信息类型
    msgType:{
       text:'text' ,
        img:'img',
        file:'file'
    },
    socket:null,
    socketUrl:'',
    userInfo:null,
    init:function(){
        this.setEvent();
        this.setSocket();
        this.setVideo();
    },
    /**
     * 设置视频
     * @param isYy
     */
    setVideo:function(){
        try{
            if($("#yyVideoDiv embed").length==0){
                var aDom=$("#yyVideoDiv"),yc=aDom.attr("yc"),mc=aDom.attr("mc");
                $('<embed src="'+'http://yy.com/s/'+yc+(common.isValid(mc)?'/'+mc:'')+'/yyscene.swf" quality="high" width="100%" height="100%" align="middle" allowScriptAccess="never" allowFullScreen="true" mode="transparent" type="application/x-shockwave-flash"></embed>').appendTo('#yyVideoDiv');
            }
            $("#yyVideoDiv").show();
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
     * 通过昵称查对应访客
     * @param nickname
     */
    getVisitorList:function(nickname){
        if(common.isBlank(nickname)){
             return;
        }
        try{
            $(".searchResult").hide();
            $(".searchResult ul").html("");
            $.getJSON('/studio/getVistiorByName',{groupType:studioChat.userInfo.groupType,groupId:studioChat.userInfo.groupId,nickname:nickname},function(data){
                if(data){
                    $(".searchResult").show();
                    var onlineStatus= 0,userId='';
                    for(var i in data){
                        userId=data[i].userId||data[i].visitorId;
                        if($('.searchResult ul li[uid='+userId+']').length>0){
                            continue;
                        }
                        onlineStatus=data[i].onlineStatus;
                        $(".searchResult ul").append('<li uid="'+userId+'"  '+(onlineStatus==1?'':'class="off"')+'><label>'+data[i].nickname+'</label></li>');
                    }
                    //点击事件
                    $(".searchResult ul li").click(function(){
                        $(".searchResult").hide();
                        var tvId=$(this).attr("uid");
                        studioChat.setWhVisitors((tvId.indexOf("visitor_")!=-1?-1:0),tvId,$(this).find("label").text(),!$(this).hasClass("off"));
                        $('.visitorDiv ul li[uid='+$(this).attr("uid")+']').click();
                    });
                }
            });
        }catch (e){
            alert("查询异常,请联系管理员！");
            console.error("getVistiorByName->"+e);
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
     * @param userId
     */
    setWhTipInfo:function(userId){
        if(userId){
            $("#newMsgTipBtn").attr("uid",userId);
        }
        studioChat.setWhTipImgPlay(userId);
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
        var liDom=$('.visitorDiv ul li[class~=on]');
        sendObj.fromUser.toUser={userId:liDom.attr("uid"),nickname:liDom.find("label").text(),talkStyle:1,userType:liDom.attr("utype")};
        studioChat.socket.emit('sendMsg',sendObj);//发送数据
        studioChat.setWhContent(sendObj,true,false);//直接把数据填入内容栏
        txtObj.html("");//清空内容
    },
    /**
     * 设置在线提示
     * @param toUserId
     * @param isOnline
     */
    setWhOnlineTip:function(toUserId,isOnline,userInfoTmp){
        if(isOnline){
            if(userInfoTmp){
                var targetDom='';
                if(userInfoTmp.userType=="-1" && common.isValid(userInfoTmp.loginId)){//用户登出转游客
                    targetDom=$('.visitorDiv ul li[uid='+userInfoTmp.loginId+']');
                    if(targetDom.length>0){
                        targetDom.attr("uid",userInfoTmp.userId);
                        $('#wh_msg_'+userInfoTmp.loginId).attr('id','wh_msg_'+userInfoTmp.userId);
                    }
                }else if(userInfoTmp.userType=="0" && common.isValid(userInfoTmp.visitorId)){//游客转用户登入
                    targetDom=$('.visitorDiv ul li[uid='+userInfoTmp.visitorId+']');
                    if(targetDom.length>0){
                        targetDom.attr("uid",userInfoTmp.userId);
                        $('#wh_msg_'+userInfoTmp.visitorId).attr('id','wh_msg_'+userInfoTmp.userId);
                    }
                }
                var nk=$('#wh_msg_'+toUserId+' .wh-title label').text(),ttp=$('#wh_msg_'+toUserId+' .wh-title .title-tip');
                if(common.isValid(nk) && nk!=userInfoTmp.nickname){
                    ttp.text("账号转变:"+nk+' --> '+userInfoTmp.nickname).show();
                }else{
                    ttp.text("").hide();
                }
                $('.visitorDiv ul li[uid='+toUserId+'] label,#wh_msg_'+toUserId+' .wh-title label').text(userInfoTmp.nickname);

            }
            $('.visitorDiv ul li[uid='+toUserId+']').removeClass("off");
            $('#wh_msg_'+toUserId+' .wh-title strong').text("在线");
        }else{
            $('.visitorDiv ul li[uid='+toUserId+']').addClass("off");
            $('#wh_msg_'+toUserId+' .wh-title strong').text("离线");
        }
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
        if($(".visitorDiv ul li[uid="+userId+"]").length==0){
            $(".visitorDiv ul").append('<li uid="'+userId+'"  '+(isOnline?'':'class="off"')+' utype="'+userType+'"><span  class="user-row"><label>'+nickname+'</label><em class="close ym" t="0"></em></span></li>');
            var liDom=$('.visitorDiv ul li[uid='+userId+']');
            if(isShowNum) {
                var numDom = liDom.find(".close"), num = parseInt(numDom.attr("t")) + 1;
                numDom.attr("t", num).text(num).addClass('ym');
            }
            liDom.find('.close').click(function(){
                var pt=$(this).parent().parent();
                pt.remove();
                $('#wh_msg_'+pt.attr("uid")).remove();
                if($(".visitorDiv ul li").length>0){
                    $('.visitorDiv ul li:last').click();
                }
            });
            liDom.click(function(){
                $('.visitorDiv ul li').removeClass('on');
                $(this).addClass('on');
                $(this).find(".close").attr("t",0).text("").removeClass('ym');
                var userId=$(this).attr("uid"),whId='wh_msg_'+userId;
                studioChat.closeWhTipMsg(userId);
                $(".wh-right").children().hide();
                if($("#"+whId).length==0){
                    var msgHtml='<div id="'+whId+'" class="wh-tab-msg"><div class="wh-title"><span><label>'+$(this).find("label").text()+'</label>【<strong></strong>】</span><span class="title-tip"></span></div><div class="wh-content"></div>'+
                        '<div class="wh-txt"><div class="toolbar"><a href="javascript:" class="facebtn" style="">表情</a></div><div contenteditable="true" class="ctextarea" id="whTxt_'+userId+'" data-placeholder="按回车键发送"></div></div></div>';
                    $(".wh-right").append(msgHtml);
                    //私聊天内容发送事件
                    $("#"+whId).find(".ctextarea").keydown(function(e){
                        if(e.keyCode==13){//按回车键发送
                            studioChat.sendWhMsg($(this));
                            return false;
                        }
                    });
                    //初始化表情事件
                    $("#"+whId).find('.facebtn').qqFace({
                        id:'faceId_'+userId,
                        zIndex:1000000,
                        assign:'whTxt_'+userId, //给控件赋值
                        path:studioChat.filePath+'/face/'//表情存放的路径
                    });
                    //加载私聊信息
                    studioChat.socket.emit("getWhMsg",{groupId:studioChat.userInfo.groupId,groupType:studioChat.userInfo.groupType,userId:studioChat.userInfo.userId,toUserId:userId});
                }else{
                    $("#"+whId).show();
                    studioChat.setTalkListScroll(true,$('#'+whId+' .wh-content'),'dark');
                }
                //上下线提示
                studioChat.setWhOnlineTip(userId,!$(this).hasClass("off"));
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
     * 设置提示框闪动
     * @param userId
     */
    setWhTipImgPlay:function(userId){
        $(".wh_msg_ftip").attr("uid",userId).attr("k",1).show().addClass("have");
        $('#userListId li[id='+userId+']').attr("k",1);
        studioChat.whTipIntervalId=setInterval(function(){
            $('#userListId li[k=1],.wh_msg_ftip[k=1]').toggleClass("have_op");
        },1000);
    },
    /**
     * 关闭私聊提示
     */
    closeWhTipMsg:function(userId){
        $('.wh_msg_ftip[uid='+userId+']').attr("k",0).removeClass("have have_op");
        $('#userListId li[id='+userId+']').attr("k",0).removeClass("have_op");
        if($('#userListId[k=1]').length==0 && $('.wh_msg_ftip[k=1]').length==0){
            if(studioChat.whTipIntervalId){
                clearInterval(studioChat.whTipIntervalId);
                studioChat.whTipIntervalId=null;
            }
        }
    },
    /**
     * 填充私聊弹框
     * @param userType
     * @param userId
     * @param nickname
     * @param isShowNum
     */
    fillWhBox:function(userType,userId,nickname,isTip,isShowNum){
        var whBox=this.getWhBox();
        if(whBox.length==0){//私聊框不存在，则初始化私聊框
            studioChat.setWhBox(true);
            studioChat.setWhVisitors(userType,userId,nickname,true,isShowNum);
            if(isTip){
                studioChat.setWhTipInfo(userId);
            }
            return false;
        }else{
            var userTab=$('.visitorDiv ul li[uid='+userId+']');
            if(userTab.length==0){//如果弹框没有对应用户，则先配置该用户tab
                studioChat.setWhVisitors(userType,userId,nickname,true,isShowNum);
                if(whBox.is(':hidden')){
                    if(isTip) {
                        studioChat.setWhTipInfo(userId);
                    }
                }else{
                    return false;
                }
            }else{
                if(isShowNum && !userTab.hasClass("on")){
                    var numDom= userTab.find(".close"),num=parseInt(numDom.attr("t"))+1;
                    numDom.attr("t",num).text(num).addClass('ym');
                }
                if(whBox.is(':hidden')){//如私聊框隐藏，对应的信息框没有加载数据的则返回
                    var whContent=$('#wh_msg_'+userId+' .wh-content');
                    if(whContent.length==0){
                        return false;
                    }
                    if(isTip){
                        studioChat.setWhTipImgPlay(userId);
                    }
                }else{
                    if(!userTab.hasClass("on") && isTip){
                        studioChat.setWhTipImgPlay(userId);
                    }
                }
            }
        }
        return true;
    },
    /**
     * 填充私聊内容框
     * @param data
     * @param isMeSend
     * @param isLoadData
     */
    setWhContent:function(data,isMeSend,isLoadData){
        var fromUser=data.fromUser,cls='dialog ',content=data.content,nkTitle='';
        if(data.rule){
            $('#'+data.uiId+' .dcont').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            return;
        }
        if(!isLoadData){
            fromUser.toWhUserId=fromUser.userId;
        }
        if(studioChat.userInfo.userId==fromUser.userId){
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
            if(!isLoadData && !this.fillWhBox(fromUser.userType,fromUser.userId,fromUser.nickname,true,true)){//如接收他人私信
                return false;
            }
            nkTitle='<span class="wh-dia-title"><label class="wh-nk">'+fromUser.nickname+'</label><label class="dtime">'+studioChat.formatPublishTime(fromUser.publishTime,isLoadData,'/')+'</label></span>';
        }
        if(common.isBlank(fromUser.toWhUserId)){
            console.error("setWhContent->fromUser toWhUserId is null,please check!");
            return;
        }
        var html='<div class="'+cls+'" id="'+fromUser.publishTime+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header"><div>'+nkTitle+ '</div><p><span class="dcont">'+content.value+'</span></p></div>';
        var whContent=$('#wh_msg_'+fromUser.toWhUserId+' .wh-content');
        var scrContent=whContent.find(".mCSB_container");//是否存在滚动
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
     * 事件设置
     */
    setEvent:function(){
        $("#header_img_id").attr("src",studioChat.userInfo.avatar);
        /*#################私聊事件#################begin*/
        jqWindowsEngineZIndex=100000;
        $("#newMsgTipBtn").click(function(){
            var uid=$(this).attr("uid");
            studioChat.closeWhTipMsg(uid);
            var wBox=studioChat.getWhBox();
            if(wBox.length>0){
                wBox.show();
                $('.visitorDiv ul li[uid='+uid+']').click();
                return;
            }
            var boxHtml=[];
            boxHtml.push('<div class="wh-box"><div class="wh-left"><div class="searchDiv">');
            boxHtml.push('<input type="text" id="vSearchTxt"/><a href="javascript:" id="vSearchTxtBtn"><em></em></a>');
            boxHtml.push('<div class="searchResult"><ul></ul></div></div><div class="visitorDiv">');
            boxHtml.push('<ul></ul></div></div><div class="wh-right"></div></div>');
            $("#newMsgShowBtn").newWindow({
                windowTitle: "私聊",
                content:boxHtml.join(""),
                windowType: "normal",
                minimizeButton: true,
                maximizeButton:false,
                statusBar:false,
                resizeIcon: '',
                width: 680,
                height: 550,
                beforeMinimize:function(bx){
                    bx.hide();
                    return false;
                }
            });
            $("#newMsgShowBtn").click();
            $("#vSearchTxt").keydown(function(e){
                if(e.keyCode==13){//按回车键发送
                    studioChat.getVisitorList(this.value);
                }
            });
            $("#vSearchTxtBtn").click(function(){
                studioChat.getVisitorList($("#vSearchTxt").val());
            });
        });
        $(".wh_msg_ftip").click(function(){
            var uid=$(this).attr("uid");
            studioChat.closeWhTipMsg(uid);
            var wBox=studioChat.getWhBox();
            if(wBox.length>0){
                $('.visitorDiv ul li[uid='+uid+']').click();
                wBox.show();
            }else{
                $("#newMsgTipBtn").click();
            }
        });
        /*#################私聊事件#################end*/

        //审核操作类事件
        $("#approveAllHandler button").click(function(){
            var idArr=[],fuIdArr=[];
            $("#dialog_list .approve input:checked").each(function(){
                var obj=$(this).parents("div");
                idArr.push(obj.attr("id"));
                var fObj=obj.attr("fuId");
                var loc_isAdd = false;
                for(var i = 0, lenI = fuIdArr.length; i < lenI; i++){
                    if(fObj === fuIdArr[i]){
                        loc_isAdd = true;
                        break;
                    }
                }
                if(!loc_isAdd){
                    fuIdArr.push(fObj);
                }
            });
            if(idArr.length==0){
                alert("请选择聊天记录！");
                return false;
            }
            studioChat.socket.emit('approvalMsg',{fromUser:studioChat.userInfo,status:$(this).attr("btnType"),publishTimeArr:idArr,fuIdArr:fuIdArr});
        });
        $("#approveCheckAll").click(function(){
            var isCheck=$(this).prop("checked");
            $("#dialog_list .approve input[type=checkbox]").each(function(){
                $(this).prop("checked", isCheck);
            });
        });

        //点击document,关闭dom
        $(document).click(function(e){
            $('div[id^=faceId]').hide();
            if(!$(e.target).hasClass("headimg") && !$(e.target).parent().hasClass("headimg") && $(e.target).parent().attr("t")!="header" && !$(e.target).hasClass("uname")){
                $('.dialogbtn').hide();
            }
            if(!$(e.target).hasClass("searchResult")){
                $('.searchResult').hide();
            }
        });
        //初始化表情事件
        $('.facebtn').qqFace({
            id:'faceId',
            assign:'contentText', //给控件赋值
            path:studioChat.filePath+'/face/'//表情存放的路径
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
         * 键盘事件
         */
        $("#contentText").keydown(function(e){
            if(e.keyCode==13){//按回车键发送
                $("#sendBtn").click();
                return false;
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
                $("#contentText").html("").append('<span class="txt_dia" contenteditable="false" uid="'+ui.item.value+'" utype="'+ui.item.userType+'">@<label>'+ui.item.label+'</label></span>');
                $('#contentText').focusEnd();
                return false;
            }
        }).autocomplete("instance")._renderItem = function(ul, item ) {
            return $("<li>").append("<a>" + item.label +"</a>").appendTo(ul);
        };
        //聊天内容发送事件
        $("#sendBtn").click(function(){
            var toUser=studioChat.getToUser();
            var msg = studioChat.getSendMsg();
            if(msg === false){
                return;
            }
            var sendObj={uiId:studioChat.getUiId(),fromUser:studioChat.userInfo,content:{msgType:studioChat.msgType.text,value:msg}};
            var replyDom=$(".replybtn");
            if(toUser && toUser.userId==replyDom.attr("uId") && toUser.talkStyle==replyDom.attr("ts")){//如果对话userId匹配则表示当前回复结束
                $(".mymsg,.mymsg em").hide();
            }
            sendObj.fromUser.toUser=toUser;
            studioChat.socket.emit('sendMsg',sendObj);//发送数据
            studioChat.setContent(sendObj,true,false);//直接把数据填入内容栏
            //清空输入框
            $("#contentText").html("");//清空内容
        });
    },
    /**
     * 查询UI在线用户
     */
    searchUserList:function(val){
        var userArr=$("#userListId li[t!=14][t!=0]").map(function () {
            var name = $(this).find(".uname").text();
            return name.indexOf(val)!=-1?{value:this.id,label:name,userType: $(this).attr("utype")}:null;
        }).get();
        return userArr;
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
        var msg = dom.html();
        //排除表情,去除其他所有html标签
        msg = msg.replace(/<\/?(?!(img|IMG)\s+src="[^>"]+\/face\/[^>"]+"\s*>)[^>]*>/g,'');
        if(common.isBlank(msg)){
            dom.html("");
            return false;
        }
        if(dom.find(".txt_dia").length>0){
            dom.find(".txt_dia").remove();
            msg=dom.html();
        }
        return msg;
    },
    /**
     * 设置列表滚动条
     */
    setListScroll:function(domClass){
        if($(domClass).hasClass("mCustomScrollbar")){
            $(domClass).mCustomScrollbar("update");
        }else{
            $(domClass).mCustomScrollbar({scrollButtons:{enable:true},theme:"dark"});
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
     * @param talkStyle
     * @param userType 用户类别(0客户；1管理员；2分析师；3客服）
     */
    setDialog:function(userId,nickname,talkStyle,userType){
        if(talkStyle==1){//私聊,则直接弹私聊框
            studioChat.fillWhBox(userType,userId,nickname,false);
            studioChat.getWhBox().show();
            $('.visitorDiv ul li[uid='+userId+']').click();
        }else{
            $("#contentText .txt_dia").remove();
            $("#contentText").prepend('<span class="txt_dia" contenteditable="false" uid="'+userId+'" utype="'+userType+'">@<label>'+nickname+'</label></span>');
            $('#contentText').focusEnd();
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
        if(isLoadData && $("#"+fromUser.publishTime).length>0){
            $("#"+fromUser.publishTime+" .dcont em[class=ruleTipStyle]").remove();
            $("#"+fromUser.publishTime+" .approve").remove();
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
            studioChat.openDiaLog($('#'+fromUser.publishTime+' .dialogbtn'));
        });
        //昵称点击
        $('#'+fromUser.publishTime+' .uname').click(function(){
            var diaDom=$('#'+fromUser.publishTime+' .dialogbtn');
            studioChat.openDiaLog(diaDom);
            diaDom.css('left','62px');
            diaDom.css('top','30px');
        });
        $('#'+fromUser.publishTime+' .txt_dia').click(function(){
            $("#contentText .txt_dia").remove();
            $("#contentText").prepend('<span class="txt_dia" contenteditable="false" uid="'+$(this).attr("uid")+'" utype="'+$(this).attr("utype")+'">@<label>'+$(this).find("label").text()+'</label></span>').focusEnd();
        });
        //审核按钮事件
        $('#'+fromUser.publishTime + " .approve button").click(function(){
            var idArr=[],fuIdArr=[];
            var pObj=$(this).parents("div");
            idArr.push(pObj.attr("id"));
            fuIdArr.push(pObj.attr("fuId"));
            studioChat.socket.emit('approvalMsg',{fromUser:studioChat.userInfo,status:$(this).attr("btnType"),publishTimeArr:idArr,fuIdArr:fuIdArr});
        });
    },
    /**
     * 打开对话框
     */
     openDiaLog:function(diaDom){
        $('.dialogbtn').not(diaDom).hide();
        diaDom.css('left','0');
        var dp=diaDom.parent();
        if(common.isValid(dp.attr("utype"))){
            var loc_isLast = dp.next().size() === 0;
            if(diaDom.parent().hasClass('analyst')){
                diaDom.css('top', loc_isLast ? '-67px' : '53px');
            }else{
                diaDom.css('top',loc_isLast ? '-39px' : '39px');
            }
        }
         if(!diaDom.is(':hidden')){
            diaDom.hide();
            return false;
         }
         diaDom.show();
         diaDom.find("a").click(function(){
             var tp=$(this).parent();
             studioChat.setDialog(tp.attr("uId"),tp.attr("nk"),$(this).attr("t"),tp.attr("utype"));//设置对话
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
                    $(".replybtn").attr("uId",fromUser.userId);
                    $(".replybtn").attr("ts",toUser.talkStyle);
                    $(".replybtn").attr("futype",fromUser.userType);
                    $(".sender").html(fromUser.nickname);
                    $(".xcont").html(pHtml);
                }
            }
        }
        var html='<div class="'+cls+'" id="'+fromUser.publishTime+'" isMe="'+isMe+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header">'
            + '<a href="javascript:" class="headimg" uId="'+fromUser.userId+'">'+studioChat.getUserAImgCls(fromUser.clientGroup,fromUser.userType,fromUser.avatar)+'</a><i></i>'
            + '<p><a href="javascript:"  class="'+uName+'">'+nickname+'</a><span class="dtime">'+studioChat.formatPublishTime(fromUser.publishTime)+'</span>';
        if(content.status==0){//需要审批
            html +=  '<span class="approve"><input type="checkbox"/><button btnType="1">通过</button><button btnType="2">拒绝</button></span>';
            $("#approveAllHandler").show();
        }
        html += '<span class="dcont">'+toUserHtml+pHtml+'</span></p>' +dialog+'</div>';
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
        return '<img src="/images/studio/'+aImgCls+'.png">';
    },
    /**
     * 提取对话html
     * @param userId
     * @param nickname
     * @param userType
     * @returns {string}
     */
    getDialogHtml:function(userId,nickname,userType){
        if(studioChat.userInfo.userId!=userId && studioChat.userInfo.userId.indexOf('visitor_')==-1){
            var hasMainDiv=false,gIdDom=$("#groupInfoId"),mainDiv='<div class="dialogbtn" style="display:none;" nk="'+nickname+'" uId="'+userId+'" utype="'+userType+'">';
            if(userId.indexOf('visitor_')==-1){
                mainDiv+='<a href="javascript:" class="d1" t="0"><span>@TA</span></a>';
                hasMainDiv=true;
            }
            if(gIdDom.attr("aw")=="true"&& common.containSplitStr(gIdDom.attr("awr"),studioChat.userInfo.userType)){
                mainDiv+='<a href="javascript:" class="d2" t="1"><span>私聊</span></a>';
                hasMainDiv=true;
            }
            return hasMainDiv?mainDiv+"</div>":'';
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
        $("#userListId li[id='"+row.userId+"']").remove();//存在则移除旧的记录
        var dialogHtml=studioChat.getDialogHtml(row.userId,row.nickname,row.userType),isMeHtml="",unameCls = "uname",seq=row.sequence;
        if(studioChat.userInfo.userId==row.userId){
            isMeHtml = "【我】";
            unameCls += " ume";
            seq = "0";
        }
        var lis=$("#userListId li"),
                liDom='<li id="'+row.userId+'" t="'+seq+'" utype="'+row.userType+'">'+dialogHtml+'<a href="javascript:" t="header" class="uname"><div class="headimg">'+studioChat.getUserAImgCls(row.clientGroup,row.userType,row.avatar)+'</div>'+row.nickname+isMeHtml+'</a></li>';
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
                    }
                    isInsert=true;
                    return false;
                }
            });
            if(!isInsert){
                $("#userListId").append(liDom);
            }
        }
        if(common.isValid(dialogHtml)){
            $("#userListId li[id="+row.userId+"] a[t=header]").click(function(){
                var pt=$(this).parent();
                studioChat.closeWhTipMsg(pt.attr("id"));
                $('.dialogbtn').hide();
                $('.user_box li').removeClass('zin');
                pt.addClass('zin');
                studioChat.openDiaLog($(this).prev());
                $('.dialogbtn',$(this).parent()).css('left','7px');
            });
        }
        return true;
    },
    /**
     * 离开房间提示
     */
    leaveRoomTip:function(flag){
        if("visitor"==studioChat.userInfo.clientGroup){
            return;
        }
        var txt='';
        if(flag=="roomClose"){
            txt='房间已停用，';
        }
        if(flag=="otherLogin"){
            txt='您的账号已在其他地方进入该房间，';
        }
        if(flag=="forcedOut"){
            txt='您已被管理员强制退出房间，';
        }
        $("#tipMsgBox").fadeIn(0).delay(6000).fadeOut(200).find("span").text("注意："+txt+"正自动退出.....");
        window.setTimeout(function(){//3秒钟后登出
            window.close();
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
            //$(".loading-box").show();
            studioChat.userInfo.socketId=studioChat.socket.id;
            var currTab=$("#groupInfoId");
            studioChat.socket.emit('login',{userInfo:studioChat.userInfo,lastPublishTime:$("#content_ul li:last").attr("id"),fUserTypeStr:currTab.attr("awr"), allowWhisper : currTab.attr("aw")});
            $(".img-loading[pf=chatMessage]").show();
        });
        //进入聊天室加载的在线用户
        this.socket.on('onlineUserList',function(data){
            var row=null;
            for(var i in data){
                row=data[i];
                studioChat.setOnlineUser(row);
            }
            $("#onLineSizeNum").text($("#userListId li").length);
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
                    }else{
                        if(studioChat.userInfo.userId!=userInfoTmp.userId){
                            $("#userListId #"+userInfoTmp.userId).remove();
                        }
                    }
                    //设置私聊在线情况
                    studioChat.setWhOnlineTip(userInfoTmp.userId,data.online,userInfoTmp);
                    $("#onLineSizeNum").text($("#userListId li").length);
                    break;
                }
                case 'removeMsg':
                    $("#"+result.data.replace(/,/g,",#")).remove();
                    studioChat.setTalkListScroll();
                    break;
                case 'leaveRoom':{
                    studioChat.leaveRoomTip(result.flag);
                    break;
                }
                case 'approvalResult':{
                    var data=result.data;
                    if(data.fromUserId==studioChat.userInfo.userId){//自己在聊天室审核成功或拒绝
                        if(data.isOK){
                            var publishTimeArr=data.publishTimeArr;
                            if(data.status==2){//拒绝
                                for (var i in publishTimeArr) {
                                    $("#"+publishTimeArr[i]).remove();
                                }
                                studioChat.setTalkListScroll();
                            }else{
                                for (var i in publishTimeArr) {
                                    $("#"+publishTimeArr[i]+" .approve").remove();
                                }
                            }
                            $("#approveCheckAll").prop("checked", false);
                            if($("#dialog_list .approve").size() == 0){
                                $("#approveAllHandler").hide();
                            }
                        }else{
                            alert("操作出现异常，请重新执行！");
                        }
                    }else if(data.refuseMsg){//具有相同角色拒绝
                        var publishTimeArr=data.publishTimeArr;
                        for (var i in publishTimeArr) {
                            $("#"+publishTimeArr[i]).remove();
                        }
                        studioChat.setTalkListScroll();
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
                    var row = msgData[i];
                    row.content.status=row.status;
                    studioChat.formatUserToContent(row);
                }
                studioChat.setTalkListScroll(true);
            }
        });
        //加载私聊信息
        this.socket.on('loadWhMsg',function(result){
            var data=result.data;
            if(result.type=='offline'){//离线提示信息
                if(data && !$.isEmptyObject(data)){
                    studioChat.setWhBox(true);
                    var userId='';
                    for(var index in data){
                        userId=index;
                        studioChat.setWhVisitors(data[index].userType,index,data[index].nickname,$("#userListId li[id='"+index+"']").length>0);
                    }
                    studioChat.setWhTipInfo(userId);
                }
            }else{//私聊框中每个用户tab对应的私聊信息
                if(data && $.isArray(data)) {
                    data.reverse();
                    console.log("data.length:",data.length);
                    for (var i in data) {
                        var row = data[i];
                        row.content.status=row.status;
                        studioChat.formatUserToContent(row,true,result.toUserId);
                    }
                    studioChat.setTalkListScroll(true,$('#wh_msg_'+result.toUserId+' .wh-content'),'dark');
                }
            }
        });
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
            avatar:row.avatar
        };
        if(isWh){
            fromUser.toWhUserId=toWhUserId;
            studioChat.setWhContent({fromUser: fromUser,content:row.content},false,true);
        }else{
            studioChat.setContent({fromUser: fromUser,content:row.content},false,true);
        }
    }
};
// 初始化
$(function() {
    studioChat.init();
});
 