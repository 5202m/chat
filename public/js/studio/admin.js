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
                $('<embed src="'+'http://yy.com/s/'+yc+(common.isValid(mc)?'/'+mc:'')+'/mini.swf" quality="high" width="100%" height="100%" align="middle" allowScriptAccess="never" allowFullScreen="true" mode="transparent" type="application/x-shockwave-flash"></embed>').appendTo('#yyVideoDiv');
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
     * 事件设置
     */
    setEvent:function(){
        $("#header_img_id").attr("src",studioChat.userInfo.avatar);

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

        /**
         * 键盘事件
         */
        $("#contentText").keydown(function(e){
            if(e.keyCode==13){//按回车键发送
                var val=$("#contentText").html();
                if(common.isValid(val)){
                    $("#contentText").html(val.replace(/<div>|<\/div>/g,""));
                }
            }
        });
        //点击document,关闭dom
        $(document).click(function(e){
            $('#faceId').hide().remove();
            if(!$(e.target).hasClass("headimg") && !$(e.target).parent().hasClass("headimg") && $(e.target).parent().attr("t")!="header" && !$(e.target).hasClass("uname")){
                $('.dialogbtn').hide();
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
        //对话下拉框事件
        $('.send_select').hover(function() {
            $(this).addClass('dw');
            studioChat.setListScroll(".selectlist");
        },function(){
            $(this).removeClass('dw')
        });
        $('#send_selelct_list a').bind("click", function(){
            if($(this).is(".on")){
                return;
            }
            $('.send_select div.selectlist a').removeClass("on");
            $('.send_select div.selected').text($(this).text());
            $(this).addClass("on");
            if($(this).attr("uid")!=$(".replybtn").attr("uid")){
                $(".mymsg em").hide();
            }
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
            var sendObj={uiId:studioChat.getUiId(),fromUser:studioChat.userInfo,content:{msgType:studioChat.msgType.text,value:msg}};
            var toUser=studioChat.getToUser(),replyDom=$(".replybtn");
            if(toUser && toUser.userId==replyDom.attr("uId") && toUser.talkStyle==replyDom.attr("ts")){//如果对话userId匹配则表示当前回复结束
                $(".mymsg,.mymsg em").hide();
            }
            sendObj.fromUser.toUser=toUser;
            studioChat.socket.emit('sendMsg',sendObj);//发送数据
            studioChat.setContent(sendObj,true,false);//直接把数据填入内容栏
            //清空输入框
            $("#contentText").html("");//清空内容
            $(".mymsg p label").html("");//清空私聊提示
        });
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
    getSendMsg : function(){
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
     * @param hasInit
     * @param toBottom
     */
    setTalkListScroll:function(toBottom) {
        if( $("#chatMsgContentDiv").hasClass("mCustomScrollbar")){
            $("#chatMsgContentDiv").mCustomScrollbar("update");
            if($(".scrollbtn").hasClass("on")||toBottom) {
                $("#chatMsgContentDiv").mCustomScrollbar("scrollTo", "bottom");
            }
        }else{
            $("#chatMsgContentDiv").mCustomScrollbar({scrollButtons:{enable:true},theme:"light-2"});
            $("#chatMsgContentDiv").mCustomScrollbar("scrollTo", "bottom");
        }
    } ,
    /**
     * 提取@对话html
     */
    getToUser:function(){
        var curDom=$('#send_selelct_list a[class=on]'),userId=curDom.attr("uId"),ts=curDom.attr("ts"),utype=curDom.attr("utype");
        if(userId!='all'){
            return {userId:userId,nickname:curDom.find("label[t=nk]").html(),talkStyle:ts,userType:utype};
        }
        return null;
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
     * @param talkStyle
     * @param userType 用户类别(0客户；1管理员；2分析师；3客服）
     */
    setDialog:function(userId,nickname,talkStyle,userType){
        $(".send_select div.selectlist a").removeClass("on");
        var obj=$('.send_select div.selectlist a[uId='+userId+']');
        var nm="1"==talkStyle?" (私聊)":"";
        $('.send_select div.selected').text(nickname+nm);
        if(obj.length>0){
            obj.find("label[t=wh]").html(nm);
            obj.attr("ts",talkStyle);
            obj.addClass("on");
        }else{
            var loc_sendElem = $('<a href="javascript:void(0)" class="on" uId="'+userId+'" ts="'+talkStyle+'" utype="'+userType+'"><label t="nk">'+nickname+'</label><label t="wh">'+nm+'</label></a>');
            $("#send_selelct_list").append(loc_sendElem);
            loc_sendElem.click(function(){
                if($(this).is(".on")){
                    return;
                }
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
            $("#"+fromUser.publishTime+" .approve").remove();
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
            toUserHtml='<span class="to">对<b class="toname" uId="'+toUser.userId+'">'+toUser.nickname+(toUser.talkStyle==1?" (私聊)":"")+'</b></span>';
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
                    if("1"==toUser.talkStyle){
                        $(".mymsg p label").html(" (私聊)");
                    }else{
                        $(".mymsg p label").html("");
                    }
                }
            }
        }
        var html='<div class="'+cls+'" id="'+fromUser.publishTime+'" isMe="'+isMe+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header">'
            + '<a href="javascript:" class="headimg" uId="'+fromUser.userId+'">'+studioChat.getUserAImgCls(fromUser.clientGroup,fromUser.userType,fromUser.avatar)+'</a><i></i>'
            + '<p><a href="javascript:"  class="'+uName+'">'+nickname+'</a>'+toUserHtml+'<span class="dtime">'+studioChat.formatPublishTime(fromUser.publishTime)+'</span>';
        if(content.status==0){//需要审批
            html +=  '<span class="approve"><input type="checkbox"/><button btnType="1">通过</button><button btnType="2">拒绝</button></span>';
            $("#approveAllHandler").show();
        }
        html += '<span class="dcont">'+pHtml+'</span></p>' +dialog+'</div>';
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
        if(studioChat.userInfo.userId!=userId && studioChat.userInfo.userId.indexOf('visitor_')==-1 && userId.indexOf('visitor_')==-1){
            var gIdDom=$("#groupInfoId");
            return '<div class="dialogbtn" style="display:none;" nk="'+nickname+'" uId="'+userId+'" utype="'+userType+'"><a href="javascript:" class="d1" t="0"><span><b></b>对话</span></a>'+(gIdDom.attr("aw")=="true"&& common.containSplitStr(gIdDom.attr("awr"),studioChat.userInfo.userType)?'<a href="javascript:" class="d2" t="1"><span><b></b>私聊</span></a>':'')+'</div>'
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
                liDom='<li id="'+row.userId+'" t="'+seq+'">'+dialogHtml+'<a href="javascript:" t="header" class="uname"><div class="headimg">'+studioChat.getUserAImgCls(row.clientGroup,row.userType,row.avatar)+'</div>'+row.nickname+isMeHtml+'</a></li>';
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
                $('.dialogbtn').hide();
                $('.user_box li').removeClass('zin');
                $(this).parent().addClass('zin');
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
            studioChat.socket.emit('login',{userInfo:studioChat.userInfo,lastPublishTime:$("#content_ul li:last").attr("id"), allowWhisper : $("#groupInfoId").attr("aw")});
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
                        if(studioChat.userInfo.userId!=userInfoTmp.userId){
                            $("#userListId #"+userInfoTmp.userId).remove();
                        }
                    }
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
            avatar:row.avatar
        };
        studioChat.setContent({fromUser: fromUser,content:row.content},false,true);
    }
};
// 初始化
$(function() {
    studioChat.init();
});
 