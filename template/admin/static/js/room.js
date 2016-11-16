/**
 * 后台聊天室房间操作类
 * author Alan.wu
 */
var room={
    filePath:'',
    apiUrl:'',
    nwIsMinimize:false,//标记nw窗口是否最小化
    desktopNotice:null,//桌面通知提示对象
    nwWin:null,//当前nw窗口对象
    roomName:'',//房间名称
    nwTray:null,//当前nw Tray对象
    //信息类型
    msgType:{
        text:'text' ,
        img:'img',
        file:'file'
    },
    socket:null,
    socketUrl:'',
    userInfo:null,
    rmWin:null,//房间窗口
    whTipIntervalId:null,
    //消息提示音对象
    tipSoundObj:{
        key:'tip_sound',
        storageObj:{
            turn:'on'
        }
    },
    whHistoryUserObj:{
        key:'whUsers',
        whUserList:[]
    },//历史会话记录
    init:function(){
        this.setSocket();
        this.setVideo();
        this.setEvent();
    },
    /**
     * 设置视频
     * @param isYy
     */
    setVideo:function(){
        try{
            $.getJSON('/admin/getSyllabus?t=' + new Date().getTime(),{groupType:room.userInfo.groupType,groupId:room.userInfo.groupId},function(result){
                var loc_html = null,data=result.data;
                if(data && common.isValid(data.studioLink)){
                    var studioLinkArr=JSON.parse(data.studioLink),url='';
                    for(var i in studioLinkArr){
                        if(studioLinkArr[i].code==1){
                            url=studioLinkArr[i].url;
                            break;
                        }
                    }
                    if(common.isValid(url)){
                        if($("#yyVideoDiv embed").length==0){
                            if(url.indexOf('rtmp:')!=-1) {
                                var sdHtml = '<div style="position: relative; width: 100%; height: 100%; left: 0px; top: 0px;">' +
                                    '<object type="application/x-shockwave-flash" id="sewise_player" name="sewise_player" data="/base/lib/flash/SewisePlayer.swf" width="100%" height="100%">' +
                                    '<param name="allowfullscreen" value="true">' +
                                    '<param name="wmode" value="transparent">' +
                                    '<param name="allowscriptaccess" value="always">' +
                                    '<param name="flashvars" value="autoStart=true&amp;programId=&amp;shiftTime=&amp;lang=zh_CN&amp;type=rtmp&amp;serverApi=ServerApi.execute&amp;skin=/base/lib/flash/skins/liveOrange.swf&amp;title=&amp;draggable=true&amp;published=0&amp;streamUrl=' + url + '&amp;duration=3600&amp;poster=&amp;flagDatas=&amp;videosJsonUrl=&amp;adsJsonData=&amp;statistics=&amp;customDatas=&amp;playerName=Sewise Player&amp;clarityButton=enable&amp;timeDisplay=disable&amp;controlBarDisplay=enable&amp;topBarDisplay=disable&amp;customStrings=&amp;volume=0.6&amp;key=&amp;trackCallback=">' +
                                    '</object>' +
                                    '</div>';
                                $("#yyVideoDiv").html(sdHtml);
                            }else{
                                $('#yyVideoDiv').html('<embed src="'+url+'" quality="high" width="100%" height="100%" align="middle" allowScriptAccess="never" allowFullScreen="true" mode="transparent" type="application/x-shockwave-flash"></embed>');
                            }
                        }
                    }
                }
            });
        }catch(e){
            console.error("setVideo has error:"+e);
        }
    },
    /**
     * @记录列表显示
     * @param isAdd
     */
    setTalkTop:function(isAdd,data){
        if(isAdd){
            var gIdDom = $("#groupInfoId");
            var hasWh = gIdDom.attr("aw")=="true"&& common.containSplitStr(gIdDom.attr("awr"),room.userInfo.userType);
            var fromUser=data.fromUser;
            $(".mymsg").show();
            $(".mymsg em").hide();
            $(".replybtn").attr("tm",fromUser.publishTime).attr("uid",fromUser.userId).attr("ts",fromUser.talkStyle).attr("utype",fromUser.userType);
            $(".sender").html(fromUser.nickname);
            var talkContent = data.content.value;
            if(data.content.msgType==room.msgType.img){
                talkContent = '<img src="'+data.content.value+'" />';
            }
            $(".xcont").html(talkContent);
            $("#talk_top_id").prepend('<section class="ss-tk-info clearfix" tm="'+fromUser.publishTime+'"><label><strong>'+fromUser.nickname+'</strong>：</label><span style="margin-left:5px;text-align:justify;">'+talkContent+'</span><button type="button">关闭</button><button type="button" uid="'+fromUser.userId+'" utype="'+fromUser.userType+'" '+(hasWh?'':'style="display:none;"')+'" cg="'+fromUser.clientGroup+'" nk="'+fromUser.nickname+'" iswh="true">私聊</button><button type="button" uid="'+fromUser.userId+'" utype="'+fromUser.userType+'">回复</button></section>');
            var pDom=$('#talk_top_id .ss-tk-info[tm='+fromUser.publishTime+']');
            pDom.find("button").click(function(){
                var tp=$(this).parents(".ss-tk-info");
                var fuId=$(this).attr("uid");
                var isWh = $(this).attr('iswh');
                var tm=tp.attr("tm");
                if(common.isValid(fuId) && common.isBlank(isWh)){
                    var $this = $(this);
                    room.setDialog(null,fuId,tp.find("strong").addClass("reply-st").html(),$this.attr("ts"),$this.attr("utype"),tm, $this.siblings("span").html());//设置对话
                }else if(common.isValid(isWh) && isWh) {
                    room.setDialog($(this).attr("cg"), fuId, $(this).attr("nk"), '1', $(this).attr("utype"), tm, "");//设置对话
                }else{
                    tp.remove();
                    $("#show_top_btn strong,#top_num").text("【"+$("#talk_top_id .ss-tk-info").length+"】");
                    $(".mymsg .replybtn[tm="+tm+"]").parent().hide();
                    if($("#contentText .txt_dia[tm="+tm+"]").length>0){
                        $("#contentText").html("");
                    }
                }
            });
        }else{
            if(data.publishTime){
                $('#talk_top_id .ss-tk-info[tm='+data.publishTime+']').remove();
                $(".mymsg .replybtn[tm="+data.publishTime+"]").parent().hide();
            }
        }
        $("#show_top_btn strong,#top_num").text("【"+$("#talk_top_id .ss-tk-info").length+"】");
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
            $.getJSON('/admin/getVistiorByName',{groupType:room.userInfo.groupType,groupId:room.userInfo.groupId,nickname:nickname},function(data){
                if(data){
                    $(".searchResult").show();
                    var onlineStatus= 0,userId='';
                    for(var i in data){
                        userId=data[i].userId||data[i].visitorId;
                        if($('.searchResult ul li[uid='+userId+']').length>0){
                            continue;
                        }
                        onlineStatus=data[i].onlineStatus;
                        $(".searchResult ul").append('<li uid="'+userId+'" cg="'+data[i].clientGroup+'"  '+(onlineStatus==1?'':'class="off"')+'><label>'+data[i].nickname+'</label></li>');
                    }
                    //点击事件
                    $(".searchResult ul li").click(function(){
                        $(".searchResult").hide();
                        var tvId=$(this).attr("uid");
                        room.setWhVisitors((tvId.indexOf("visitor_")!=-1?-1:0),$(this).attr("cg"),tvId,$(this).find("label").text(),!$(this).hasClass("off"));
                        $('.visitorDiv .wh_tab_ul li[uid='+$(this).attr("uid")+']').click();
                    });
                }
            });
        }catch (e){
            alert("查询异常,请联系管理员！");
            console.error("getVistiorByName->"+e);
        }
    },
    /**
     * 提取私聊toUser
     * @returns {}
     */
    getWhToUser:function(){
        var liDom=$('.visitorDiv .wh_tab_ul li[class~=on]');
        return {userId:liDom.attr("uid"),nickname:liDom.find("label").text(),talkStyle:1,userType:liDom.attr("utype")};
    },
    /**
     * 发送私聊信息
     * @param msg
     */
    sendWhMsg:function(txtObj){
        //发送剪切图片
        var toUser = room.getWhToUser();
        var sendObj={uiId:room.getUiId(),fromUser:room.userInfo,content:{}};
        sendObj.fromUser.toUser=toUser;
        var imgObj = txtObj.find(".text-min-img img");
        if(imgObj.size() > 0){
            var imgData = imgObj.attr("src");
            if(imgData.length > 1024*1024){
                alert('发送的图片大小不要超过1MB.');
            }else{
                room.setUploadImg(imgData, toUser);
                imgObj.remove();
            }
        }
        var msg = room.getSendMsg(txtObj);
        if(msg === false){
            sendObj.content = {msgType:room.msgType.msg,value:""};
            room.setWhHistory(sendObj);
            txtObj.html("");//清空内容
            return false;
        }
        sendObj.content = {msgType:room.msgType.text,value:msg};
        room.socket.emit('sendMsg',sendObj);//发送数据
        room.setWhHistory(sendObj);
        room.setWhContent(sendObj,true,false);//直接把数据填入内容栏
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
                        targetDom.find(".wrtip").text('');
                        $('#wh_msg_'+userInfoTmp.loginId).attr('id','wh_msg_'+userInfoTmp.userId);
                    }
                }else if(userInfoTmp.userType=="0" && common.isValid(userInfoTmp.visitorId)){//游客转用户登入
                    targetDom=$('.visitorDiv ul li[uid='+userInfoTmp.visitorId+']');
                    targetDom.find(".wrtip").text(room.getWhUserCGTip(userInfoTmp.userType,userInfoTmp.clientGroup));
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
     *
     * @param userType
     */
    getWhUserCGTip:function(userType,clientGroup){
        if(userType==0){
            if("active"==clientGroup){
                return '真实A';
            }else if("notActive"==clientGroup){
                return '真实N';
            }else if("simulate"==clientGroup){
                return "模拟";
            }else if("register"==clientGroup){
                return "注册";
            }else{
                return '';
            }
        }else if(userType==1){
            return "管理员";
        }else if(userType==2){
            return "分析师";
        }else if(userType==3){
            return "客服";
        }else{
            return '';
        }
    },
    /**
     * 设置私聊访客
     * @param userType
     * @param clientGroup
     * @param userId
     * @param nickname
     * @param isOnline
     * @param isShowNum
     */
    setWhVisitors:function(userType,clientGroup,userId,nickname,isOnline,isShowNum){
        if($(".visitorDiv .wh_tab_ul li[uid="+userId+"]").length==0){
            var isMb = $("#userListId li[id='"+userId+"']").attr('ismb');
            $(".visitorDiv .wh_tab_ul").append('<li uid="'+userId+'"  '+(isOnline?'':'class="off"')+' utype="'+userType+'"><span  class="user-row"><label>'+nickname+'</label><em class="close ym" t="0"></em><em class="mb">'+(isMb=="true"?'(mb)':'')+'</em><em class="wrtip">'+room.getWhUserCGTip(userType,clientGroup)+'</em></span></li>');
            room.setListScroll($('.visitorDiv .wh_tab_div'),{scrollbarPosition:"outside"});
            var liDom=$('.visitorDiv .wh_tab_ul li[uid='+userId+']');
            if(isShowNum) {
                var numDom = liDom.find(".close"), num = parseInt(numDom.attr("t")) + 1;
                numDom.attr("t", num).text(num).addClass('ym');
            }
            liDom.find('.close').click(function(){
                var pt=$(this).parent().parent();
                var isOn=pt.hasClass("on");
                pt.remove();
                $('#wh_msg_'+pt.attr("uid")).remove();
                var whTabli=$(".visitorDiv .wh_tab_ul li");
                if(isOn && whTabli.length>0){
                    whTabli.eq(0).click();
                }
                if(whTabli.length==0){
                    $(".visitorDiv .pub_tab_ul li").click();
                }
            });
            liDom.click(function(){
                $(".wh_msg_only").show();
                if($(".open_wh_box").is(':hidden')){
                    $('#wh_msg_public,.right-teacher').addClass('dn');
                    $('.visitorDiv ul li').removeClass('on');
                }else{
                    $('.visitorDiv .wh_tab_ul li').removeClass('on');
                }
                $(".wh_msg_only").children().addClass('dn');
                $(this).addClass('on');
                $(this).find(".close").attr("t",0).text("").removeClass('ym');
                var userId=$(this).attr("uid"),whId='wh_msg_'+userId,userType=$(this).attr("utype");
                if($("#"+whId).length==0){
                    var msgHtml='<div id="'+whId+'" class="wh-tab-msg" wid="newMsgShowBtn"><div class="wh-title"><span><label>'+$(this).find("label").text()+'</label>【<strong></strong>】</span><span class="title-tip"></span></div><div class="wh-content"></div>'+
                        '<div class="wh-txt"><div class="toolbar"><a href="javascript:" class="facebtn">表情</a><label for="file_'+whId+'" class="send-wh-img" title="发送图片"></label><input type="file" id="file_'+whId+'" style="position:absolute;clip:rect(0 0 0 0);" class="fileBtn"/></div><div contenteditable="true" class="ctextarea" id="whTxt_'+userId+'" data-placeholder="按回车键发送"></div></div></div>';
                    $(".wh_msg_only").append(msgHtml);
                    //私聊天内容发送事件
                    $("#"+whId).find(".ctextarea").pastableTextarea().on('pasteImage', function(ev, data){
                        var img=$(this).find(".text-min-img");
                        if(img.length>0){
                            img.attr("href",data.dataURL);
                            img.find("img").attr("src",data.dataURL);
                        }else{
                            $(this).append('<a class="text-min-img" href="'+data.dataURL+'" data-lightbox="whSend-img"><img src="'+data.dataURL+'"/></a>');
                            $(this).focusEnd();
                        }
                    }).keydown(function(e){
                        if(e.keyCode==13){//按回车键发送
                            room.sendWhMsg($(this));
                            return false;
                        }
                    });
                    //初始化表情事件
                    $("#"+whId).find('.facebtn').qqFace({
                        id:'faceId_'+userId,
                        zIndex:1000000,
                        assign:'whTxt_'+userId, //给控件赋值
                        path:room.filePath+'/face/'//表情存放的路径
                    });
                    //图片选择事件
                    $("#"+whId).find(".fileBtn")[0].addEventListener('change',function () {
                        var _this=this;
                        var img = _this.files[0];
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
                        if(fileSize>=1024*1024*5){
                            alert('发送的图片大小不要超过5MB.');
                            return false ;
                        }
                        //加载文件转成URL所需的文件流
                        var reader = new FileReader();
                        reader.readAsDataURL(img);
                        reader.onload = function(e){
                            room.setUploadImg(e.target.result,room.getWhToUser());//处理并发送图片
                        };
                        reader.onprogress=function(e){};
                        reader.onloadend = function(e){};
                        $(this).val("");
                    }, false);
                    //加载私聊信息
                    room.socket.emit("getWhMsg",{userType:room.userInfo.userType,groupId:room.userInfo.groupId,groupType:room.userInfo.groupType,userId:room.userInfo.userId,toUser:{userId:userId,userType:userType}});
                }else{
                    $("#"+whId).removeClass('dn');
                    room.setTalkListScroll(true,$('#'+whId+' .wh-content'),'dark');
                }
                room.widthCheck();
                room.heightCalcu();
                //上下线提示
                room.setWhOnlineTip(userId,!$(this).hasClass("off"));
            });
        }
    },
    /**
     * 提取私聊框
     * @returns {*|jQuery|HTMLElement}
     */
    getWhBox:function(userId){
        return $(".wh-middle #wh_msg_"+userId);
    },
    /**
     * 设置提示框闪动
     * @param userId
     */
    setWhTipImgPlay:function(userId){
        $('#userListId li[id='+userId+']').attr("k",1);
        room.whTipIntervalId=setInterval(function(){
            $('#userListId li[k=1]').toggleClass("have_op");
        },1000);
    },
    /**
     * 关闭私聊提示
     */
    closeWhTipMsg:function(userId){
        $('#userListId li[id='+userId+']').attr("k",0).removeClass("have_op");
        if($('#userListId[k=1]').length==0 && room.whTipIntervalId){
            clearInterval(room.whTipIntervalId);
        }
    },
    /**
     * 填充私聊弹框
     * @param userType
     * @param clientGroup
     * @param userId
     * @param nickname
     * @param isShowNum
     */
    fillWhBox:function(userType,clientGroup,userId,nickname,isTip,isShowNum){
        var userTab=$('.visitorDiv .wh_tab_ul li[uid='+userId+']');
        var whBox=this.getWhBox(userId);
        if(whBox.length==0 && userTab.length==0){//私聊框不存在，则初始化私聊框
            room.setWhVisitors(userType,clientGroup,userId,nickname,true,isShowNum);
            return false;
        }else{
            if(userTab.length==0){//如果弹框没有对应用户，则先配置该用户tab
                room.setWhVisitors(userType,clientGroup,userId,nickname,true,isShowNum);
                return false;
            }else{
                if(isShowNum && !userTab.hasClass("on")){
                    var numDom= userTab.find(".close"),num=parseInt(numDom.attr("t"))+1;
                    numDom.attr("t",num).text(num).addClass('ym');
                    return true;
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
        var fromUser=data.fromUser,cls='dialog whcontent ',content=data.content,nkTitle='',loadImgHtml='',loadHtml='';
        if(data.rule){
            $('#'+data.uiId+' span[contt="a"]').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            return;
        }
        if(!isLoadData){
            fromUser.toWhUserId=fromUser.userId;
        }
        if(room.userInfo.userId==fromUser.userId){
            if(isMeSend){//发送，并检查状态
                fromUser.publishTime=data.uiId;
                fromUser.toWhUserId=fromUser.toUser.userId;
                loadHtml='<em class="img-loading"></em>';
                loadImgHtml='<span class="shadow-box"></span><s class="shadow-conut"></s>';
            }
            if(data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
                $('#'+data.uiId+' .dtime').html(room.formatPublishTime(fromUser.publishTime));
                $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
                if(data.content.msgType==room.msgType.img){
                    room.removeLoadDom(fromUser.publishTime);//去掉加载框
                    var liObj=$('#'+fromUser.publishTime+' p');
                    var url=data.content.needMax?'/admin/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId:liObj.find("a img").attr("src");
                    liObj.find('a[class=swipebox]').attr("href",url);
                }
                return;
            }
            cls+='mine';
            nkTitle='<span class="wh-dia-title"><label class="dtime">'+room.formatPublishTime(fromUser.publishTime,isLoadData,'/')+'</label><label class="wh-nk">我</label></span>';
        }else{
            if(!isLoadData){//如接收他人私信
                room.tipSound();//私聊消息提示音
                room.setWhHistory(data);
                var isFillWh=this.fillWhBox(fromUser.userType,fromUser.clientGroup,fromUser.userId,fromUser.nickname,true,true);
                if($('.visitorDiv .wh_tab_ul li[uid='+fromUser.toWhUserId+']').length == 0) {//不存在则添加
                    $('.visitorDiv .wh_tab_ul').append($('.visitorDiv ul li[uid=' + fromUser.toWhUserId + ']'));//在左边列表的最后添加发送私信人
                }
                if(!isFillWh){
                    return;
                }
            }
            nkTitle='<span class="wh-dia-title"><label class="wh-nk">'+fromUser.nickname+'</label><label class="dtime">'+room.formatPublishTime(fromUser.publishTime,isLoadData,'/')+'</label></span>';
        }
        if(common.isBlank(fromUser.toWhUserId)){
            console.error("setWhContent->fromUser toWhUserId is null,please check!");
            return;
        }
        var pHtml='';
        var whContent=$('#wh_msg_'+fromUser.toWhUserId+' .wh-content');
        var scrContent=whContent.find(".mCSB_container");//是否存在滚动
        var html='';
        if(content.msgType==room.msgType.img){
            if(content.needMax){
                pHtml='<p><a href="/admin/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId+'" class="swipebox"  data-lightbox="dialog-img"><img src="'+content.value+'" alt="图片"/></a>'+loadImgHtml+'</p>';
            }else{
                pHtml='<p><a href="'+content.value+'" class="swipebox"  data-lightbox="dialog-img"><img src="'+content.value+'" alt="图片" /></a>'+loadImgHtml+'</p>';
            }
            pHtml+=loadHtml;
        }else{
            if(!isMeSend && common.isValid(fromUser.toUser.question)){
                html='<div class="dialog mine whcontent"><div><span class="wh-dia-title"><label class="dtime">'+room.formatPublishTime(fromUser.toUser.publishTime,isLoadData,'/')+'</label><label class="wh-nk">我</label></span></div><div class="whblt">'+fromUser.toUser.question+'</div></div>';
                if(scrContent.length>0){
                    scrContent.append(html);
                }else{
                    whContent.append(html);
                }
            }
            pHtml='<p><span class="dcont" contt="a">'+content.value+'</span></p>';
        }
        html='<div class="'+cls+'" id="'+fromUser.publishTime+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header"><div style="margin-bottom:3px;">'+nkTitle+ '</div>'+pHtml+'</div>';
        if(scrContent.length>0){
            scrContent.append(html);
        }else{
            whContent.append(html);
        }
        this.formatMsgToLink(fromUser.publishTime);//格式链接
        if(!isLoadData){
            room.setTalkListScroll(true,whContent,'dark');
        }
    },
    /**
     * 清除黏贴的图片
     */
    clearPasteImg:function(){
        if(!$(".paste-img").is(':hidden')) {//存在图片
            $(".paste-img").hide().find("img").attr("src",'').attr("h",120).attr("w",100);
        }
    },
    /**
     * 设置并压缩图片
     * @param base64Data
     */
    setUploadImg:function(base64Data,toUser){
        var isWh = toUser && toUser.talkStyle == 1;
        var uiId=room.getUiId();
        //先填充内容框
        var formUser={};
        common.copyObject(formUser,room.userInfo,true);
        formUser.toUser=toUser;
        var sendObj={uiId:uiId,fromUser:formUser,content:{msgType:room.msgType.img,value:'',needMax:0,maxValue:''}};
        if(isWh){
            room.setWhHistory(sendObj);
            room.setWhContent(sendObj, true, false);
        }else {
            room.setContent(sendObj, true, false);
        }
        sendObj.content.value=base64Data;
        room.zipImg(sendObj,100,60,function(result,value){//压缩缩略图
            if(result.error){
                alert(result.error);
                $('#'+uiId).remove();
                return false;
            }
            var imgObj=null;
            if(isWh){
                imgObj=$('#'+result.uiId+' p .swipebox img');
            }else{
                imgObj=$('#'+result.uiId+' span[contt=a] a[class=min_img] img');
            }
            imgObj.attr("src",value).attr("needMax",result.content.needMax);
            room.dataUpload(result);
        });
    },
    /**
     * 图片压缩
     * @param max
     * @param data
     * @param quality 压缩量
     * @returns {string}
     */
    zipImg:function(sendObj,max,quality,callback){
        var image = new Image();
        // 绑定 load 事件处理器，加载完成后执行
        image.onload = function(){
            var canvas = document.createElement('canvas');
            if(!canvas){
                callback({error:'发送图片功能目前只支持Chrome、Firefox、IE10或以上版本的浏览器！'});
            }
            var w = image.width;
            var h = image.height;
            if(h>=9*w){
                callback({error:'该图片高度太高，暂不支持发送！'});
                return false;
            }
            if(max>0) {
                if ((h > max) || (w > max)) {     //计算比例
                    sendObj.content.needMax=1;
                    if(h>max && w<=max){
                        w= (max/h)*w;
                        h = max;
                    }else{
                        h = (max / w) * h;
                        w = max;
                    }
                    image.height = h;
                    image.width = w;
                }
            }
            var ctx = canvas.getContext("2d");
            canvas.width = w;
            canvas.height = h;
            // canvas清屏
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // 将图像绘制到canvas上
            ctx.drawImage(image, 0, 0, w, h);
            callback(sendObj,canvas.toDataURL("image/jpeg",quality/100));
        };
        image.src = sendObj.content.value;
    },
    /**
     * 数据上传
     * @param data
     */
    dataUpload:function(data){
        //上传图片到后端
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/admin/uploadData');
        xhr.addEventListener("progress", function(e){
            if (e.lengthComputable) {
                var ra= ((e.loaded / e.total *100)|0)+"%";
                $("#"+data.uiId+" .shadow-box").css({height:"'+ra+'"});
                $("#"+data.uiId+" .shadow-conut").html(ra);
            }
        }, false);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                console.log("dataUpload success!");
            }
        };
        data.fromUser.socketId=room.socket.id;
        xhr.send(JSON.stringify(data)); //发送base64
    },
    /**
     * 事件设置
     */
    setEvent:function(){
        $(".openWhBoxBtn").click(function(){
            var uid=$(".wh_out_div .wh_tab_ul li.on").attr("uid");
            if($(".open_wh_box").is(":hidden")){
                $(this).hide();
                $('.pub_tab_ul li').click();
                $(".open_wh_box .visitorDiv").append($(".wh_out_div"));
                $(".open_wh_box .wh-middle").append($(".wh_msg_only"));
                $(".open_wh_box,.wh_msg_only").show();
                $('.wh-history').css('float','right');
            }else{
                $(".local_box .visitorDiv").append($(".wh_out_div"));
                $(".local_box .wh-middle").append($(".wh_msg_only"));
                $(".open_wh_box").hide();
                $(".local_box .openWhBoxBtn").show();
                $('.wh-history').css('float','left');
            }
            room.widthCheck();
            room.heightCalcu();
            if(common.isValid(uid)){
                $(".wh_out_div .wh_tab_ul li[uid="+uid+"]").click();
            }else{
                $(".wh_out_div .wh_tab_ul li:first").click();
            }
        });
        $('.open_wh_box').draggable({handle: ".box_title", cursor: "move" ,containment: "document", scroll: false}).resizable({minWidth: 550,minHeight:450,maxWidth:1600,maxHeight:900});
        $('.open_wh_box').resize(function(e){
            room.widthCheck();
            room.heightCalcu();
        });
        /*#################私聊事件#################begin*/
        var currTab=$("#groupInfoId"),awr=currTab.attr("awr"), aw=currTab.attr("aw");
        if("true" == aw && common.containSplitStr(awr, room.userInfo.userType)){
            $(".wh_out_div").removeClass('dn');
        }
        $('.pub_tab_ul li').click(function(){
            if($(".open_wh_box").is(":hidden")){
                $('.visitorDiv li').removeClass('on');
                $('.wh_msg_only').hide();
            }
            $(this).addClass('on');
            $('#wh_msg_public,.right-teacher').removeClass('dn');
            room.widthCheck();
            room.setTalkListScroll(true);
        });
        /**
         * 老师观点
         */
        $('#publish_point').click(function(){
            $('#userListId li').removeClass('zin');
            $('.point-list').addClass('dn');
            $('.right-teacher .publish-point').removeClass('dn');
            $('.point-list .point-list-content ul li .cancel-btn').click();
        });
        $('.right-teacher .publish-point .publish-close,.right-teacher .point-list .point-close').click(function(){
            $('.right-teacher .publish-point,.right-teacher .point-list').addClass('dn');
            $('.point-list .point-list-content ul li .cancel-btn').click();
        });
        $('.publish-point .publish-btn').click(function(){
            $(this).attr('disabled','disabled');
            room.publishViewPoint();
        });
        $('#point_list').click(function(){
            $('#userListId li').removeClass('zin');
            $('.right-teacher .publish-point').addClass('dn');
            $('.point-list').removeClass('dn');
            room.getArticleList("trade_strategy_article",room.userInfo.groupId,1,1,20,'{"createDate":"desc"}', room.userInfo.userId,function(dataList) {
                var size = dataList.data.length, cls = '';
                $('.point-list .point-list-content ul').html('');
                if(dataList && dataList.result==0 && dataList.data && size>0) {
                    var tearchPointHtml = '', tearchPointFormat = room.formatHtml('point-list');
                    $.each(dataList.data, function (key, row) {
                        var detail = row.detailList[0];
                        if (key + 1 == size) {
                            cls = ' class="last"';
                        }
                        tearchPointHtml += tearchPointFormat.formatStr(cls, row._id, detail.title, common.formatterDateTime(row.publishStartDate), common.formatterDateTime(row.publishEndDate), detail.content);
                    });
                    $('.point-list .point-list-content ul').html(tearchPointHtml);
                    room.teacherPointEdit('.point-list .point-list-content ul li .edit-btn','.point-list .point-list-content ul li .save-btn','.point-list .point-list-content ul li .cancel-btn');
                    room.setListScroll('.point-list .point-list-content',{scrollbarPosition:"outside"});
                }
            });
        });
        //清屏
        $(".clearbtn").click(function(){
            $("#dialog_list").html("");//设置对话
            room.setTalkListScroll();
        });
        //滚动设置
        $(".scrollbtn").click(function(){
            if($(this).hasClass("on")){
                $(this).removeClass("on");
            }else{
                $(this).addClass("on");
                room.setTalkListScroll(true);
            }
        });
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
            room.socket.emit('approvalMsg',{fromUser:room.userInfo,status:$(this).attr("btnType"),publishTimeArr:idArr,fuIdArr:fuIdArr});
        });
        $("#approveCheckAll").click(function(){
            var isCheck=$(this).prop("checked");
            $("#dialog_list .approve input[type=checkbox]").each(function(){
                $(this).prop("checked", isCheck);
            });
        });
        //@记录框显示隐藏事件
        $("#close-top-box").click(function(){
            $(".top-box").addClass('dn');
        });
        $("#show_top_btn").click(function(){
            $(".top-box").toggleClass('dn');
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
            assign:'whTxt', //给控件赋值
            path:room.filePath+'/face/'//表情存放的路径
        });
        //回复对话
        $(".replybtn").click(function(){
            room.setDialog(null,$(this).attr("uid"),$(".sender").html(),$(this).attr("ts"),$(this).attr("utype"),$(this).attr("tm"), $(this).parent().find(".xcont").html());//设置对话
            $(".mymsg em").show();
        });
        //关闭对话
        $(".closebtn").click(function(){
            $(".mymsg,.mymsg em").hide();//设置对话
        });
        $("#vSearchTxt").keydown(function(e){
            if(e.keyCode==13){//按回车键进行查询
                room.getVisitorList(this.value);
            }
        });
        $("#vSearchTxtBtn").click(function(){
            room.getVisitorList($("#vSearchTxt").val());
        });
        //图片选择事件
        $("#wh_msg_public").find(".fileBtn")[0].addEventListener('change',function () {
            var _this=this;
            var img = _this.files[0];
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
            if(fileSize>=1024*1024*5){
                alert('发送的图片大小不要超过5MB.');
                return false ;
            }
            //加载文件转成URL所需的文件流
            var reader = new FileReader();
            reader.readAsDataURL(img);
            reader.onload = function(e){
                room.setUploadImg(e.target.result,null);//处理并发送图片
            };
            reader.onprogress=function(e){};
            reader.onloadend = function(e){};
            $(this).val("");
        }, false);
        /**
         * 键盘事件
         */
        $("#wh_msg_public #whTxt").pastableTextarea().on('pasteImage', function(ev, data){
            var img=$(this).find(".text-min-img");
            if(img.length>0){
                img.attr("href",data.dataURL);
                img.find("img").attr("src",data.dataURL);
            }else{
                $(this).append('<a class="text-min-img" href="'+data.dataURL+'" data-lightbox="send-img"><img src="'+data.dataURL+'"/></a>');
                $(this).focusEnd();
            }
        }).keydown(function(e){
            var val=$(this).html();
            if(e.keyCode==13){//按回车键并且当@提示选择隐藏后按回车才发送消息
                $(this).html(val.replace(/<div>|<\/div>/g,""));
                if($('.ui-autocomplete').is(':hidden')) {
                    var toUser = room.getToUser();
                    //发送剪切图片
                    var imgObj = $("#wh_msg_public #whTxt .text-min-img img");
                    if(imgObj.size() > 0){
                        var imgData = imgObj.attr("src");
                        if(imgData.length > 1024*1024){
                            alert('发送的图片大小不要超过1MB.');
                        }else{
                            room.setUploadImg(imgData, toUser);
                            imgObj.remove();
                        }
                    }
                    var msg = room.getSendMsg();
                    if (msg === false) {
                        $("#whTxt").html("");//清空内容
                        return false;
                    }
                    var sendObj = {uiId: room.getUiId(), fromUser: room.userInfo, content: {msgType: room.msgType.text, value: msg}};
                    var replyDom = $(".replybtn");
                    if (toUser && toUser.userId == replyDom.attr("uid") && toUser.talkStyle == 0) {//如果对话userId匹配则表示当前回复结束
                        $(".mymsg,.mymsg em").hide();
                    }
                    sendObj.fromUser.toUser = toUser;
                    room.socket.emit('sendMsg', sendObj);//发送数据
                    room.setContent(sendObj, true, false);//直接把数据填入内容栏
                    //清空输入框
                    $("#whTxt").html("");//清空内容
                }
                return false;
            }
            if(e.keyCode==8){//按退格键删除
                var txtDom=$(this).find(".txt_dia");
                if($.trim($(this).text())==txtDom.text()){
                    txtDom.remove();
                    $(this).html("");
                    return true;
                }
            }
        }).autocomplete({//输入@自动提示
            source: function(request, response ){
                if (/^@.*$/g.test(request.term)) {
                    response(room.searchUserList(request.term.substring(1, request.term.length)));
                }
            },
            delay: 500,
            minLength:2,
            position: {
                my: "left bottom",
                at: "left top"
            },
            select: function(event,ui) {
                $("#whTxt").html("").append('<span class="txt_dia" contenteditable="false" uid="'+ui.item.value+'" utype="'+ui.item.userType+'">@<label>'+ui.item.label+'</label></span>&nbsp;').focusEnd();
                return false;
            }
        }).autocomplete("instance")._renderItem = function(ul, item ) {
            return $("<li>").append("<a>" + item.label +"</a>").appendTo(ul);
        };

        $('.right-teacher .teacher .open-video').click(function(){
            $('.video').removeClass('dn');
        });
        $(".video .video-close").click(function(){
            $('.video').addClass('dn');
        });
        $('.video').draggable({handle: ".close-title"}).resizable({minWidth: 450,minHeight:420,maxWidth:1024,maxHeight:900});
        $('.video').resize(function(e){
            $(this).find(".mod_video").height($(this).height()-40);
        });
        $('.not-talk .talk-title .talk-close,#btnCantTalkCancel').click(function(){
            $('.not-talk').addClass('dn');
        });
        $('#btnCantTalk').click(function(){
            var data = room.getUserGagData();
            room.setUserGag(data.set, data.visitor);
        });
        /*私聊框声音提示*/
        if (!store.enabled){
            console.log('Local storage is not supported by your browser.');
            return;
        }
        room.tipSoundObj.storageObj = store.get(room.tipSoundObj.key);
        if(!common.isBlank(room.tipSoundObj.storageObj)){
            if(room.tipSoundObj.storageObj.turn=='on'){
                $('.wh_out_div .tip-sound').removeClass('off');
            }else{
                $('.wh_out_div .tip-sound').addClass('off');
            }
        }else{//首次未设置时，设置未默认开启
            var setSoundObj = {turn:'on'};
            store.set(room.tipSoundObj.key, setSoundObj);
        }
        $('.wh_out_div .tip-sound').click(function(){
            var keyVal = room.tipSoundObj.storageObj = store.get(room.tipSoundObj.key);
            var obj={};
            if(common.isBlank(keyVal)){
                obj.turn = 'on';
            }else{
                obj = keyVal;
            }
            if($(this).hasClass('off')){
                $(this).removeClass('off');
                obj.turn = 'on';
            }else{
                $(this).addClass('off');
                obj.turn = 'off';
            }
            store.set(room.tipSoundObj.key,obj);
        });
        /*在线用户列表搜索*/
        $('.rightTitle a').click(function(){
            if($('.onlineSearch').hasClass('dn')){
                $('.onlineSearch').removeClass('dn');
            }else{
                $('.onlineSearch').addClass('dn');
                $('#userListId li').show();
                $("#onlineSearchTxt").val('');
            }
            room.heightCalcu();
            room.setListScroll(".user_box");
        });
        $("#onlineSearchTxt").keydown(function(e){
            if(e.keyCode==13){//按回车键进行查询
                room.searchUser($(this).val());
            }
        });
        $("#onlineSearchTxtBtn").click(function(){
            room.searchUser($("#onlineSearchTxt").val());
        });

        //课堂笔记
        room.articleNote.setArticleNoteEvent();
        /**
         * 会话记录
         */
        /*$('.wh-history').hover(function(){
                room.fillWhHistory();
                $('.wh_tab_history_div').removeClass('dn');
            },
            function(){
                $('.wh_tab_history_div').addClass('dn');
            });*/
        $('.wh-history').click(function(){
            room.fillWhHistory();
            $('.wh_tab_history_div').removeClass('dn');
        });
        $('#wh_close').click(function(){
            $('.wh_tab_history_div').addClass('dn');
            return false;
        });
    },

    /**课堂笔记*/
    articleNote : {
        articleEditor:null, //文档编辑器
        setArticleNoteEvent:function(){
            var noteHandler = $('#publish_note');
            if(noteHandler.size == 0){
                return;
            }
            $("#publish_note_content").append('<script id="article_note_editor" name="content" type="text/plain" style="width:auto;height:auto;"></script>');
            this.articleEditor = UE.getEditor("article_note_editor", {
                serverUrl:room.apiUrl + '/upload/editorUpload',
                customDomain:true,
                initialFrameWidth : '100%',
                initialFrameHeight : '200'
            });

            //课堂笔记
            $('#publish_note').click(function(){
                $('#userListId li').removeClass('zin');
                room.articleNote.articleEditor.execCommand('cleardoc');
                $('.right-teacher .publish-note').show();
            });
            //关闭
            $('.right-teacher .publish-note .publish-close').click(function(){
                $('.right-teacher .publish-note').hide();
            });
            //课堂笔记提交
            $('.publish-note .publish-btn').click(function(){
                $(this).prop('disabled',true);
                room.articleNote.saveArticleNote();
            });
        },
        /**保存课堂笔记*/
        saveArticleNote:function(){
            var articleContent = this.articleEditor.getContent();
            if(!articleContent){
                room.showTipBox("笔记内容为空！");
                $('.publish-note .publish-btn').prop('disabled', false);
                return;
            }
            var courseUrl = room.apiUrl + "/common/getCourse?flag=S&groupType=" + room.userInfo.groupType + "&groupId=" + room.userInfo.groupId;
            $.getJSON(courseUrl,function(data){
                if(data && data.result == "0" && data.data && data.data.length > 0 && !data.data[0].isNext){
                    var course = data.data[0];
                    var dateStr = common.formatterDate(course.date, "-");
                    var articleInfo = {
                        template:'note',
                        category:'class_note',
                        platform:room.userInfo.groupId,
                        publishStartDate:dateStr + " " + course.startTime + ":00",
                        publishEndDate:dateStr + " " + course.endTime + ":00",
                        mediaUrl:'',
                        mediaImgUrl:'',
                        linkUrl:'',
                        detailList:[{
                            lang:'zh',
                            title:course.title,
                            content:articleContent,
                            authorInfo:{
                                userId:course.lecturerId,
                                name:course.lecturer,
                                avatar:course.avatar,
                                position:''
                            }
                        }]
                    };
                    common.getJson('/admin/addArticle',{data:JSON.stringify(articleInfo),isNotice:"Y"},function(result){
                        if(result.isOK){
                            if(result.id){
                                room.showTipBox("发布课堂笔记成功！");
                                $('.right-teacher .publish-note .publish-close').click();
                            }else{
                                room.showTipBox("发布课堂笔记失败！");
                            }
                        }else{
                            room.showTipBox(result.msg);
                        }
                        $('.publish-note .publish-btn').prop('disabled', false);
                    });
                }else{
                    room.showTipBox("未找到相应课程信息！");
                    $('.publish-note .publish-btn').prop('disabled', false);
                }
            });
        }
    },

    /*openWin:function(){
        //初始化
        this.rmWin = $("#roomWin").dialog({
            autoOpen: false,
            height: 300,
            width: 350,
            modal: true,
            buttons: {
                "Create an account": addUser,
                Cancel: function() {
                    room.rmWin.dialog("close");
                }
            },
            close: function() {
            }
        });
    },*/
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
     * 过滤发送消息：过滤一些特殊字符等。
     * 如果返回值为false,则终止发送消息。
     */
    getSendMsg : function(dom){
        var dom=dom?dom:$("#whTxt");
        //排除表情,去除其他所有html标签
        var txtDia=dom.find(".txt_dia");
        if(dom.find(".txt_dia").length>0){
            room.setTalkTop(false,{publishTime:txtDia.attr("tm")});
            dom.find(".txt_dia").remove();
        }
        var msg =common.clearMsgHtml(dom.html());
        if(common.isBlank(msg)){
            dom.html("");
            return false;
        }
        return msg;
    },
    /**
     * 设置列表滚动条
     */
    setListScroll:function(domClass,options){
        if($(domClass).hasClass("mCustomScrollbar")){
            $(domClass).mCustomScrollbar("update");
        }else{
            options = $.extend({scrollButtons:{enable:true},theme:"dark"}, options);
            $(domClass).mCustomScrollbar(options);
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
        var curDom=$('#whTxt .txt_dia');
        if(curDom.length>0){
            var obj = {userId:curDom.attr("uid"),nickname:curDom.find("label").text(),talkStyle:0,userType:curDom.attr("utype")};
            var sp = curDom.find("input");
            if(sp.length>0){
                obj.question=sp.val();
            }
            return obj;
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
     * @param ptm 发布时间
     */
    setDialog:function(clientGroup,userId,nickname,talkStyle,userType,ptm, txt){
        if(talkStyle==1){//私聊,则直接弹私聊框
            room.fillWhBox(userType,clientGroup,userId,nickname,false);
            room.getWhBox(userId).removeClass("dn");
            $('.visitorDiv ul li[uid='+userId+']').click();
        }else if(talkStyle==3) {//禁言，弹出禁言框 (?<=^\【)\w+(?=\】) \\((.| )+?\\) /\【(.+?)\】/g
            $('.not-talk .talk-title span').text('设置禁言【用户：'+nickname+'；房间：'+$('title').text()+'】');
            $("#userGagForm input[name='utype']").val(userType);
            $("#userGagForm input[name='memberId']").val(userId);
            $("#userGagForm input[name='groupId']").val(room.userInfo.groupId);
            $("#userGagForm input[name='groupType']").val(room.userInfo.groupType);
            if(userType==0) {
                room.initGagDate();
                $('.not-talk').removeClass('dn');
            } else {
                $("#userGagForm input[name='memberId']").val(nickname);
                var data = room.getUserGagData();
                data.set.type = 'visitor_filter';
                $('.not-talk').addClass('dn');
                room.setUserGag(data.set, data.visitor);
            }
        }else{
            $("#whTxt .txt_dia").remove();
            $("#whTxt").html($("#whTxt").html().replace(/^((&nbsp;)+)/g,''));
            var loc_txt = '';
            if(txt){
                loc_txt = '<input type="hidden" value="">';
                var txtDom = $('<div>' + txt + '</div>');
                txtDom.find(".txt_dia").remove();
                txt = txtDom.html();
            }
            var htmlDom = $('<span class="txt_dia" contenteditable="false" uid="'+userId+'" tm="'+ptm+'" utype="'+userType+'">' + loc_txt + '@<label>'+nickname+'</label></span>');
            htmlDom.find("input").val(txt);
            $("#whTxt").prepend('&nbsp;').prepend(htmlDom).focusEnd();
            $("#talk_top_id .ss-tk-info[tm="+ptm+"]").find("strong").addClass("reply-st");
        }
    },
    /**
     * 填充内容
     * @param data
     */
    setContent:function(data,isMeSend,isLoadData){
        var fromUser=data.fromUser,cls='dialog ',content=data.content,nkTitle='',loadImgHtml='',loadHtml='';
        if(isMeSend){//发送，并检查状态
            fromUser.publishTime=data.uiId;
        }
        if(isLoadData && $("#"+fromUser.publishTime).length>0){
            $("#"+fromUser.publishTime+" span[contt] em[class=ruleTipStyle]").remove();
            $("#"+fromUser.publishTime+" .approve").remove();
            return;
        }
        if(data.rule){
            if(data.value && data.value.needApproval){
                $('#'+data.uiId).attr("id",fromUser.publishTime);
            }else{
                $('#'+data.uiId+' span[contt="a"]').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            }
            return;
        }
        if(!isMeSend && room.userInfo.userId==fromUser.userId && data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
            $('#'+data.uiId+' .dtime').html(room.formatPublishTime(fromUser.publishTime));
            $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
            if(data.content.msgType==room.msgType.img){
                room.removeLoadDom(fromUser.publishTime);//去掉加载框
                var aObj=$('#'+fromUser.publishTime+' span[contt=a] a[class=min_img]');
                var url=data.content.needMax?'/admin/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId:aObj.children("img").attr("src");
                aObj.attr("href",url);
            }
            this.removeTalkMsg(fromUser.publishTime);//移除聊天记录
            return;
        }

        var dialog=room.formatContentHtml(data,isMeSend,isLoadData);
        var list=$("#dialog_list");
        list.append(dialog);
        this.formatMsgToLink(fromUser.publishTime);//格式链接
        var vst=$('.view_select .selectlist a[class=on]').attr("t");//按右上角下拉框过滤内容
        if(vst!='all'){
            //room.showViewSelect(vst);
        }
        if(!isLoadData && $(".scrollbtn").hasClass("on")) {//有新消息时自动滚动到最底部
            room.setTalkListScroll(true);
        }
        //对话事件
        $('#'+fromUser.publishTime+' .headimg').click(function(){
            var dp=$(this).parent();
            var diaDom=dp.find('.dialogbtn');
            diaDom.attr("tm",dp.attr("id"));
            room.openDiaLog(diaDom);
        });
        //昵称点击
        $('#'+fromUser.publishTime+' .uname').click(function(){
            var dp=$(this).parent().parent();
            var diaDom=dp.find('.dialogbtn');
            diaDom.attr("tm",dp.attr("id"));
            room.openDiaLog(diaDom);
            diaDom.css('left','62px');
            //diaDom.css('top','30px');
        });
        $('#'+fromUser.publishTime+' .txt_dia').click(function(){
            room.setDialog(null,$(this).attr("uid"),$(this).find("label").text(),0,$(this).attr("utype"));
        });
        //审核按钮事件
        $('#'+fromUser.publishTime + " .approve button").click(function(){
            var idArr=[],fuIdArr=[];
            var pObj=$(this).parents("div");
            idArr.push(pObj.attr("id"));
            fuIdArr.push(pObj.attr("fuId"));
            room.socket.emit('approvalMsg',{fromUser:room.userInfo,status:$(this).attr("btnType"),publishTimeArr:idArr,fuIdArr:fuIdArr});
        });
        this.removeTalkMsg(fromUser.publishTime);//移除聊天记录
    },
    /**
     * 移除聊天记录
     */
    removeTalkMsg:function(ptime){
        if(ptime.indexOf('_ms')!=-1){
            return;
        }
        $('#'+ptime + " p .close").click(function(){
            if(confirm('确定删除该记录？')) {
                var param = {publishTimeArr: [ptime], groupId: room.userInfo.groupId};
                common.getJson('/admin/removeMsg', {data: JSON.stringify(param)}, function (data) {
                    if (data != null) {
                        if (data.isOK) {
                            room.showTipBox('删除聊天记录成功！');
                        }else{
                            room.showTipBox('删除聊天记录失败！');
                        }
                    }else{
                        room.showTipBox('删除聊天记录失败！');
                    }
                });
            }
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
            var userListSize = $('#userListId li').size();
            if(diaDom.parent().hasClass('analyst')){
                diaDom.css('top', loc_isLast ? '-67px' : '53px');
            }else{
                if(userListSize == 1 && dp.is('ul')){
                    $('#userListId').css('margin-bottom','55px');
                    diaDom.css('top', '0px');
                }else {
                    if(dp.is('div')) {
                        var aLength = diaDom.find('a').size();
                        if(aLength===3) {
                            diaDom.css({'top': (loc_isLast ? '-90px' : '35px'), 'left': '5px'});
                        }else if(aLength===4){
                            diaDom.css({'top': (loc_isLast ? '-120px' : '10px'), 'left': '5px'});
                        }else{
                            diaDom.css({'top': (loc_isLast ? '-60px' : '35px'), 'left': '5px'});
                        }
                    }else {
                        $('#userListId').css('margin-bottom', '25px');
                        diaDom.css('top', loc_isLast ? '12px' : '39px');
                    }
                }
            }
        }
        if(!diaDom.is(':hidden')){
            diaDom.hide();
            return false;
        }
        diaDom.show();
        if(diaDom.attr("sk")=='true'){
            return;
        }
        diaDom.attr("sk",'true').find("a").click(function(){
            var tp=$(this).parent();
            var txt = "";
            var t = $(this).attr("t");
            if(t == "2"){
                t = 0;
                var spanDom = tp.prev().find("span[contt='a']");
                var imgTxt = spanDom.find('a[data-lightbox]').html();
                if(common.isValid(imgTxt)){
                    spanDom.find('span:last').html(imgTxt);
                }
                txt = spanDom.html();
            }
            room.setDialog(tp.attr("cg"),tp.attr("uId"),tp.attr("nk"),t,tp.attr("utype"),tp.attr("tm"),txt);//设置对话
            tp.hide();
        });
    },
    /**
     * 格式内容栏
     */
    formatContentHtml:function(data,isMeSend,isLoadData){
        var cls='dialog ',pHtml='',dtHtml='',loadImgHtml='',loadHtml='',dialog='',uName='uname ',isMe='false',
            fromUser=data.fromUser,
            content=data.content,
            nickname=fromUser.nickname;
        var toUser=fromUser.toUser,toUserHtml='';
        if(toUser && common.isValid(toUser.userId)){
            toUserHtml='<span class="txt_dia" uid="'+toUser.userId+'" utype="'+toUser.userType+'">@<label>'+toUser.nickname+'</label></span>';
            if(room.userInfo.userId==toUser.userId){
                isMe='true';
            }
        }
        pHtml=content.value;
        if(room.userInfo.userId==fromUser.userId){
            if(isMeSend){//发送，并检查状态
                fromUser.publishTime=data.uiId;
                //fromUser.toWhUserId=fromUser.toUser.userId;
                loadHtml='<em class="img-loading"></em>';
                loadImgHtml='<span class="shadow-box"></span><s class="shadow-conut"></s>';
            }
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
            if(fromUser.userType==3){
                cls+='cs';
            }
            dialog=room.getDialogHtml(fromUser.clientGroup,fromUser.userId,nickname,fromUser.userType,fromUser.isMobile, true);
            if(!isLoadData && toUser){
                if(room.userInfo.userId==toUser.userId){
                    room.setTalkTop(true,data);
                }
            }
        }
        var pStyle='';
        if(content.msgType==room.msgType.img){
            pStyle='style="display:block;max-width:150px;"';
            if(content.needMax){
                pHtml='<span '+pStyle+'><a href="/admin/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId+'" data-lightbox="dialog-img"><img src="'+content.value+'" alt="图片"/></a>'+loadImgHtml+'</span>';
            }else{
                pHtml='<span '+pStyle+'><a href="'+content.value+'" class="min_img" data-lightbox="dialog-img"><img src="'+content.value+'" alt="图片" /></a>'+loadImgHtml+'</span>';
            }
            pHtml+=loadHtml;
        }else{
            pHtml=content.value;
        }
        var html='<div class="'+cls+'" id="'+fromUser.publishTime+'" isMe="'+isMe+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header">'
            + '<a href="javascript:" class="headimg" uId="'+fromUser.userId+'">'+room.getUserAImgCls(fromUser.clientGroup,fromUser.userType,fromUser.avatar)+'</a><i></i>'
            + '<p><a href="javascript:"  class="'+uName+'">'+nickname+'</a><span class="dtime">'+room.formatPublishTime(fromUser.publishTime)+'</span><a href="javascript:void(0);" class="close"></a>';
        if(content.status==0){//需要审批
            html +=  '<span class="approve"><input type="checkbox"/><button btnType="1">通过</button><button btnType="2">拒绝</button></span>';
            $("#approveAllHandler").show();
        }
        if(toUser && common.isValid(toUser.question)){
            html += '<span class="dcont">'
            + '<span uid="'+toUser.userId+'" utype="'+toUser.userType+'">'+toUser.nickname+'</span>'
            + '提问：'
            + '<span contt="q">' + toUser.question + '</span>'
            + '<span class="dialog_reply">回复：<span contt="a">' + pHtml + '</span></span>';
        }else{
            html += '<span class="dcont" contt="a">' + toUserHtml + pHtml + '</span>';
        }
        html += '</span></p>' +dialog+'</div>';
        return html;
    },
    /**
     * 格式链接
     * @param ptime
     */
    formatMsgToLink:function(ptime){
        $('#'+ptime+' span[contt]:contains("http:"),#'+ptime+' span[contt]:contains("https:")').each(function (index,el){
            var elHtml=$(el).html(),elArr=elHtml.split(/<img[^>]*>|<a[^>]*>.*?<\/a>/g);
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
        }else if("active"==clientGroup || "notActive"==clientGroup){
            aImgCls="user_r";
        }else if("simulate"==clientGroup){
            aImgCls="user_d";
        }else if("register"==clientGroup){
            aImgCls="user_m";
        }else{
            aImgCls="user_c";
        }
        return '<img src="/admin/img/'+aImgCls+'.png">';
    },
    /**
     * 提取对话html
     * @param clientGroup
     * @param userId
     * @param nickname
     * @param userType
     * @param isMb
     * @returns {string}
     */
    getDialogHtml:function(clientGroup,userId,nickname,userType,isMb,isMsgList){
        if(room.userInfo.userId!=userId && room.userInfo.userId.indexOf('visitor_')==-1){
            var gIdDom=$("#groupInfoId"),mainDiv=[],cls = 'd2';
            mainDiv.push('<div class="dialogbtn" style="display:none;" cg="'+clientGroup+'" nk="'+nickname+'" uId="'+userId+'" utype="'+userType+'">');

            mainDiv.push('<a href="javascript:" class="d1" t="0"><span>@TA</span></a>');
            if(gIdDom.attr("aw")=="true"&& common.containSplitStr(gIdDom.attr("awr"),room.userInfo.userType)){
                if(userType<=0 || isMsgList){
                    cls = 'd1';
                }else{
                    cls = 'd2';
                }
                mainDiv.push('<a href="javascript:" class="'+cls+'" t="1"><span>私聊</span></a>');
            }
            if(isMsgList){
                if(userType<=0){
                    cls = 'd1';
                }else{
                    cls = 'd2';
                }
                mainDiv.push('<a href="javascript:" class="'+cls+'" t="2"><span>回复</span></a>');
            }
            if(userType<=0) {
                mainDiv.push('<a href="javascript:" class="d3" t="3"><span>禁言</span></a>');
            }
            return mainDiv.length > 1 ? (mainDiv.join("")+"</div>"):'';
        }else{
            return '<div class="dialogbtn" style="display:none;" cg="'+clientGroup+'" nk="'+nickname+'" uId="'+userId+'" utype="'+userType+'"></div>';
        }
    },
    /**
     * 提取在线用户的dom
     * @param row
     * @returns {{hasDg: boolean, dom: string}}
     */
    getOnlineUserDom:function(row){
        var clientGroup = {'notActive':'(N)','active':'(A)'};
        var dialogHtml=room.getDialogHtml(row.clientGroup,row.userId,row.nickname,row.userType,row.isMobile, false),isMeHtml="",seq=row.sequence;
        var an = common.isBlank(clientGroup[row.clientGroup])?'':clientGroup[row.clientGroup];
        var mbEm=row.isMobile?'<em class="mb-cls">(mb)'+an+'</em>':'<em class="mb-cls">'+an+'</em>';
        if(room.userInfo.userId == row.userId){
            isMeHtml = "【我】";
            seq = 0;
        }
        return {isMe:common.isValid(isMeHtml),hasDg:common.isValid(dialogHtml),dom:'<li id="'+row.userId+'" t="'+seq+'" utype="'+row.userType+'"  ismb="'+row.isMobile+'">'+dialogHtml+'<a href="javascript:" t="header" class="uname"><div class="headimg">'+room.getUserAImgCls(row.clientGroup,row.userType,row.avatar)+'</div><label class="nk-lb">'+row.nickname+isMeHtml+'</label>'+mbEm+'</a></li>'};
    },
    /**
     * 设置在线用户
     * @param row
     * @returns {boolean}
     */
    setOnlineUser:function(row){
        if(row.userType==2){
            $('.teacher .te_l').attr("uid",row.userId);
            $('.teacher .te_l img').attr('src',row.avatar);
            $('.teacher .te_l div span').text(row.nickname);
            $('.teacher .btn').removeClass('dn');
        }
        $("#userListId li[id='"+row.userId+"']").remove();//存在则移除旧的记录
        var lis=$("#userListId li"),onlineUserDom=this.getOnlineUserDom(row),liDom=onlineUserDom.dom;
        if(lis.length==0){
            $("#userListId").append(liDom);
        }else if(onlineUserDom.isMe){
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
        if(onlineUserDom.hasDg){
            this.setUserListClick($("#userListId li[id="+row.userId+"] a[t=header]"));
        }
        return true;
    },
    /**
     * 设置点击事件
     * @param dom
     */
    setUserListClick:function(dom){
        dom.click(function(){
            if($(this).parent().attr('t') == '0'){
                $('#userListId li').removeClass('zin');
                $('.dialogbtn').hide();
            }else {
                var pt = $(this).parent();
                $('.dialogbtn').hide();
                $('#userListId li').removeClass('zin');
                pt.addClass('zin');
                room.openDiaLog($(this).prev());
                $('.dialogbtn', $(this).parent()).css('left', '7px');
            }
        }).dblclick(function(){
            $(this).prev('.dialogbtn').find("a[t=1]").trigger("click");
        });
    },
    /**
     * 离开房间提示
     */
    leaveRoomTip:function(flag, userIds){
        if("visitor"==room.userInfo.clientGroup){
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
            alert(userIds + room.userInfo.userId);
            var lenI = !userIds ? 0 : userIds.length;
            if(lenI > 0){
                for(var i = 0, lenI = !userIds ? 0 : userIds.length; i < lenI; i++){
                    if(userIds[i] == room.userInfo.userId){
                        break;
                    }
                }
                if(i == lenI){
                    return; //存在userIds, 但当前用户不在userIds列表中
                }
            }

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
            room.userInfo.socketId=room.socket.id;
            var currTab=$("#groupInfoId");
            room.socket.emit('login',{userInfo:room.userInfo,lastPublishTime:$("#content_ul li:last").attr("id"),fUserTypeStr:currTab.attr("awr"), allowWhisper : currTab.attr("aw")});
            $(".img-loading[pf=chatMessage]").show();
        });
        //进入聊天室加载的在线用户
        this.socket.on('onlineUserList',function(data,dataSize){
            $('#userListId').html("");
            var row=null,userArr=[];
            for(var i in data){
                row=data[i];
                if(row.userType==2){
                    room.setOnlineUser(row);
                }else{
                    userArr.push(room.getOnlineUserDom(row).dom);//设置在线用户
                }
            }
            $('#userListId').append(userArr.join(""));
            room.setUserListClick($("#userListId li a[t=header]"));
            $("#onLineSizeNum").text($('#userListId li').length);
            room.setListScroll(".user_box");
        });
        //断开连接
        this.socket.on('disconnect',function(e){
            console.log('disconnect');
            //room.socket.emit('login',room.userInfo);//重新链接
        });
        //出现异常
        this.socket.on("error",function(e){
            console.error('e:'+e);
        });
        //信息传输
        this.socket.on('sendMsg',function(data){
            if(!common.isBlank(data.fromUser.toUser) && data.fromUser.toUser.talkStyle==1){//如果是私聊则转到私聊框处理
                room.setWhContent(data,false,false);
                if(room.userInfo.userId != data.fromUser.userId){
                    room.setTaskBarNotice(data);
                    room.setDesktopNotice(data);//信息提示
                }
            }else{
                if(!data.serverSuccess && room.userInfo.userId == data.fromUser.userId && !data.rule){
                    return;
                }
                room.setContent(data,false,false);
            }
        });
        //通知信息
        this.socket.on('notice',function(result){
            switch (result.type)
            {
                case 'onlineNum':{
                    var data=result.data,userInfoTmp=data.onlineUserInfo;
                    if(data.online){
                        room.setOnlineUser(userInfoTmp);
                    }else{
                        if(room.userInfo.userId!=userInfoTmp.userId){
                            $("#userListId #"+userInfoTmp.userId).remove();
                            room.setListScroll(".user_box");
                        }
                        if(userInfoTmp.userType==2){
                            var teachObj=$('.teacher .te_l[uid='+userInfoTmp.userId+']');
                            teachObj.find("img").attr('src','');
                            teachObj.find("div span").text('老师暂未上线');
                        }
                    }
                    $("#onLineSizeNum").text($("#userListId li").length);
                    //设置私聊在线情况
                    room.setWhOnlineTip(userInfoTmp.userId,data.online,userInfoTmp);
                    break;
                }
                case 'removeMsg':
                    $("#"+result.data.replace(/,/g,",#")).remove();
                    room.setTalkListScroll();
                    break;
                case 'leaveRoom':{
                    room.leaveRoomTip(result.flag, result.userIds);
                    break;
                }
                case 'approvalResult':{
                    var data=result.data;
                    if(data.fromUserId==room.userInfo.userId){//自己在聊天室审核成功或拒绝
                        if(data.isOK){
                            var publishTimeArr=data.publishTimeArr;
                            if(data.status==2){//拒绝
                                for (var i in publishTimeArr) {
                                    $("#"+publishTimeArr[i]).remove();
                                }
                                room.setTalkListScroll();
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
                        room.setTalkListScroll();
                    }else{
                        for (var i in data) {
                            room.formatUserToContent(data[i]);
                        }
                        room.setTalkListScroll(true);
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
                    room.formatUserToContent(row);
                }
                room.setTalkListScroll(true);
            }
        });
        //加载私聊信息
        this.socket.on('loadWhMsg',function(result){
            var data=result.data;
            if(result.type=='offline'){//离线提示信息
                if(data && !$.isEmptyObject(data)){
                    var userId='';
                    for(var index in data){
                        userId=index;
                        room.setWhVisitors(data[index].userType,data[index].clientGroup,index,data[index].nickname,$("#userListId li[id='"+index+"']").length>0);
                    }
                }
            }else{//私聊框中每个用户tab对应的私聊信息
                if(data && $.isArray(data)) {
                    var hasImg= 0,row=null;
                    data.reverse();
                    for (var i in data) {
                        row = data[i];
                        room.formatUserToContent(row,true,result.toUserId);
                        if(row.content.msgType==room.msgType.img){
                            hasImg++;
                        }
                    }
                    room.setTalkListScroll(true,$('#wh_msg_'+result.toUserId+' .wh-content'),'dark');
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
            room.setWhContent({fromUser: fromUser,content:row.content},false,true);
        }else{
            room.setContent({fromUser: fromUser,content:row.content},false,true);
        }
    },
    /**隐藏消息*/
    hideMsg : function(){
        if($("#popMsgBox").is(":visible")){
            $("#popMsgBox").fadeOut("normal", "swing", function(){
                $(".blackbg").hide();
            });
        }
    },
    /**
     * 信息浮动提示
     * @param msg
     */
    showTipBox:function(msg){
        $(".tipsbox").fadeIn().delay(1000).fadeOut(200).find(".cont").text(msg);
    },
    /**显示消息*/
    showMsg : function(ops){
        if(typeof ops == "string"){
            ops = {msg : ops};
        }
        ops = $.extend({
            closeable : true,
            title : "",
            msg : "",
            modal : true,
            delay : 0,
            btns : [{
                txt : "确定",
                fn : function(){
                    room.hideMsg();
                }
            }]
        }, ops);
        $("#popMsgTit").text(ops.title || "");
        $("#popMsgTxt").html(ops.msg);
        var contDom = $("#popMsgCont");
        contDom.find("a.yesbtn").remove();
        var btnObj = null, btnDom = null;
        for(var i = 0, lenI = ops.btns ? ops.btns.length : 0; i < lenI; i++){
            btnObj = ops.btns[i];
            btnDom = $('<a class="yesbtn" href="javascript:void(0)">' + btnObj.txt + '</a>');
            contDom.append(btnDom);
            btnDom.click(btnObj.fn);
        }
        if(ops.closeable){
            $("#popMsgClo").show();
        }else{
            $("#popMsgClo").hide();
        }
        $("#popMsgBox").show();
        if(ops.modal){
            $(".blackbg").show();
        }
        if(ops.delay){
            window.setTimeout(function(){
                room.hideMsg();
            }, ops.delay);
        }
    },
    /**
     * 老师发布观点
     */
    publishViewPoint: function(){
        var title = $('#title').val();
        var publishStartDateStr = $('#publishStartDateStr').val();
        var publishEndDateStr = $('#publishEndDateStr').val();
        var content = $('#content').val();
        if(common.isBlank(title)){
            room.showTipBox("请输入标题");
            return;
        }
        if(common.isBlank(publishStartDateStr)){
            room.showTipBox("请输入发布开始时间");
            return;
        }
        if(common.isBlank(publishEndDateStr)){
            room.showTipBox("请输入发布结束时间");
            return;
        }
        if(common.isBlank(content)){
            room.showTipBox("请输入需要发布的内容!");
            return;
        }
        var param = {category:'trade_strategy_article',
            platform:room.userInfo.groupId,
            publishStartDate:publishStartDateStr,
            publishEndDate:publishEndDateStr,mediaUrl:'',mediaImgUrl:'',linkUrl:'',
            detailList:[{lang:'zh',title:title,content:content,
                authorInfo:{userId:room.userInfo.userId,name:room.userInfo.nickname,avatar:room.userInfo.avatar,position:room.userInfo.position}
            }]
        };
        common.getJson('/admin/addArticle',{data:JSON.stringify(param)},function(result){
            if(result.isOK){
                if(result.id>0){
                    room.showTipBox("观点发布成功！");
                    $('.right-teacher .publish-point .publish-close').click();
                    $('.right-teacher .publish-point input[type="text"],.right-teacher .publish-point textarea').val('');
                }
                else{
                    room.showTipBox("观点发布失败！");
                }
            }
            else{
                room.showTipBox(result.msg);
            }
            $('.publish-point .publish-btn').removeAttr('disabled');
        });
    },
    /**
     * 初始化登录用户禁言日期控件
     */
    initGagDate:function(){
        var data = room.getUserGagData();
        $('#userGag_gagDate_div').empty();
        var currentDate = common.formatterDate(new Date(), '-');
        common.getJson('/admin/getUserGag',{data:JSON.stringify(data.set)},function(result){
            if(result){
                var gagDateTmp = result.gagDate;
                if(common.isBlank(gagDateTmp)){
                    gagDateTmp = {"beginDate":currentDate,"endDate":currentDate,"weekTime":[{"week":"","beginTime":"00:00:00","endTime":"23:59:59"}]};
                } else {
                    gagDateTmp = JSON.parse(gagDateTmp);
                }
                $("#userGag_gagDate_div").dateTimeWeek({data:gagDateTmp});
                $('#userGagForm input[name=gagTips]').val(result.gagTips);
                $('#userGagForm input[name=gagRemark]').val(result.gagRemark);
            }else {
                var gagDateTmp = {"beginDate":currentDate,"endDate":currentDate,"weekTime":[{"week":"","beginTime":"00:00:00","endTime":"23:59:59"}]};
                $("#userGag_gagDate_div").dateTimeWeek({data:gagDateTmp});
            }
        });
    },
    /**
     * 返回禁言数据
     */
    getUserGagData:function(){
        $("#userGag_gagDate").val($("#userGag_gagDate_div").dateTimeWeek("getData"));
        var gagDate = $.trim($("#userGag_gagDate").val());
        var groupType = $.trim($('#userGagForm input[name=groupType]').val());
        var userId = $.trim($('#userGagForm input[name=memberId]').val());
        var groupId = $.trim($('#userGagForm input[name=groupId]').val());
        var gagTips = $.trim($('#userGagForm input[name=gagTips]').val());
        var gagRemark = $.trim($('#userGagForm input[name=gagRemark]').val());
        var data = {groupType:groupType,groupId:groupId,userId:userId,gagDate:gagDate,gagTips:gagTips,gagRemark:gagRemark};
        var isVisitor = $.trim($('#userGagForm input[name=utype]').val())==0?false:true;
        return {set:data, visitor:isVisitor};
    },
    /**
     * 禁言请求
     * @param data
     * @param isVisitor
     */
    setUserGag:function(data, isVisitor){
        common.getJson('/admin/setUserGag',{data:JSON.stringify(data),isvisitor:isVisitor},function(result){
            if(!isVisitor){
                $('.not-talk').addClass('dn');
            }else{
                $('#userListId li div.dialogbtn').hide();
            }
            if(result.isOK){
                room.showTipBox("设置禁言成功！");
            } else{
                room.showTipBox("设置禁言失败："+result.msg);
            }
        });
    },
    /**
     * 设置桌面通知
     * @param data
     */
    setDesktopNotice:function(data){
        if(room.nwWin && room.nwIsMinimize) {
            try {
                room.nwTray.tooltip = room.roomName;
                if (this.desktopNotice) {
                    this.desktopNotice.update({
                        type: 'info',
                        text: data.fromUser.nickname + '：' + data.content.value,
                        icon: data.fromUser.avatar
                    });
                } else {
                    PNotify.desktop.permission();
                    this.desktopNotice = (new PNotify({
                        title: '新消息',
                        text: data.fromUser.nickname + '：' + data.content.value,
                        desktop: {
                            desktop: true,
                            icon: data.fromUser.avatar
                        }
                    }));
                    this.desktopNotice.get().click(function (e) {
                        $('.visitorDiv ul li[uid=' + data.fromUser.userId + ']').click();
                        room.nwWin.setAlwaysOnTop(true);
                        room.nwWin.show();
                        room.nwWin.setAlwaysOnTop(false);
                    });
                }
            }catch(e){
                console.log(e.message);
            }
        }
    },
    /**
     * 设置任务栏高亮显示，只有在非最小化，失去焦点时才生效
     * @param data
     */
    setTaskBarNotice:function(data){
        if(room.nwWin && !room.nwIsMinimize) {
            room.nwWin.focus();
            room.nwWin.blur();
            room.nwIsMinimize = false;
        }else if(room.rmWin && room.rmWin.open && !room.rmWin.closed) {
            /*貌似只有IE会高亮(非最小化的情况下)，加上blur()则不会高亮*/
            room.rmWin.focus();
            //room.rmWin.blur();
        }
    },
    /**
     * 播放提示音
     */
    tipSound:function(){
        if (!store.enabled){
            console.log('Local storage is not supported by your browser.');
            return;
        }
        var audio = $('#tipsound')[0];
        room.tipSoundObj.storageObj = store.get(room.tipSoundObj.key);
        if(!common.isBlank(room.tipSoundObj.storageObj)){
            if(room.tipSoundObj.storageObj.turn == 'on'){
                audio.play();
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
     * @param authorId
     * @param callback
     */
    getArticleList:function(code,platform,hasContent,curPageNo,pageSize,orderByStr,authorId,callback){
        try{
            $.getJSON('/admin/getArticleList',{authorId:common.trim(authorId),code:code,platform:platform,hasContent:hasContent,pageNo:curPageNo,pageSize:pageSize,orderByStr:orderByStr},function(data){
                //console.log("getArticleList->data:"+JSON.stringify(data));
                callback(data);
            });
        }catch (e){
            console.error("getArticleList->"+e);
            callback(null);
        }
    },
    /**
     * 编辑老师观点
     * @param dom
     */
    teacherPointEdit:function(editDom, saveDom, cancelDom){
        $(editDom).click(function(){
            var titleH4 = $(this).parent().children('h4').hide();
            var title = titleH4.text();
            titleH4.after('<input type="text" name="title" class="edit-title" value="'+title+'" />');
            $(this).parent().children('div').removeClass('dn');
            var contentP = $(this).parent().children('p').hide();
            var content = contentP.text();
            contentP.after('<textarea name="content">'+content+'</textarea>');
            $(this).parent().children('input[type=button]').removeClass('dn');
            $(this).addClass('dn');
            room.setListScroll('.point-list .point-list-content ul',{scrollbarPosition:"outside"});
        });
        $(saveDom).click(function(){
            var id = $(this).parent().children('input[name="_id"]').val();
            var title = $(this).parent().children('input[name="title"]').val();
            var publishStartDateStr = $(this).parent().find('input[name=publishStartDateStr]').val();
            var publishEndDateStr = $(this).parent().find('input[name=publishEndDateStr]').val();
            var content = $(this).parent().children('textarea[name=content]').val()/*.replace(/\r\n/g, '').replace(/\r/g, '').replace(/\n/g, '')*/;
            var currCancel = $(this).next('input.cancel-btn');
            if(common.isBlank(title)){
                room.showMsg({
                    closeable : false,
                    msg : "标题不能为空",
                    btns : [{
                        txt : "确定",
                        fn : function(){
                            room.hideMsg();
                        }
                    }]
                });
                return;
            }
            if(common.isBlank(publishStartDateStr)){
                room.showMsg({
                    closeable : false,
                    msg : "发布开始时间不能为空",
                    btns : [{
                        txt : "确定",
                        fn : function(){
                            room.hideMsg();
                        }
                    }]
                });
                return;
            }
            if(common.isBlank(publishEndDateStr)){
                room.showMsg({
                    closeable : false,
                    msg : "发布结束时间为空",
                    btns : [{
                        txt : "确定",
                        fn : function(){
                            room.hideMsg();
                        }
                    }]
                });
                return;
            }
            if(common.isBlank(content)){
                room.showMsg({
                    closeable : false,
                    msg : "内容不能为空",
                    btns : [{
                        txt : "确定",
                        fn : function(){
                            room.hideMsg();
                        }
                    }]
                });
                return;
            }
            var param = {
                publishStartDate:publishStartDateStr,
                publishEndDate:publishEndDateStr,
                title:title,
                content:content
            };
            var where = {_id:id, lang:'zh'};
            common.getJson('/admin/modifyArticle',{data:JSON.stringify(param), where:JSON.stringify(where)},function(result){
                if(result.isOK){
                    room.showTipBox("观点更新成功！");
                    currCancel.click();
                } else {
                    room.showTipBox("观点更新失败："+result.msg);
                }
            });
        });
        $(cancelDom).click(function(){
            var title = $(this).parent().children('input[name="title"]').val();
            $(this).parent().children('h4').show().html(title);
            $(this).parent().children('input[type!=button]').hide();
            var content = $(this).parent().children('textarea').hide().val();
            $(this).parent().children('div').addClass('dn');
            $(this).parent().children('p').html(content).show();
            $(this).parent().children('input[type=button]').addClass('dn');
            $(this).parent().children('input.edit-btn').removeClass('dn');
            room.setListScroll('.point-list .point-list-content ul',{scrollbarPosition:"outside"});
        });
    },
    /**
     * 查询用户
     * @param val
     */
    searchUser:function(val){
        if(common.isValid(val)) {
            $('#userListId li').hide();
            var userDomArr = $('#userListId li .uname label:contains("' + val + '")');
            $.each(userDomArr, function(key,val){
                $(val).parent().parent().show();
            });
        }else{
            $('#userListId li').show();
        }
    },
    /**
     * 获取私聊人员历史记录
     * @returns {*}
     */
    getWhHistory:function(){
        if (!store.enabled){
            console.log('Local storage is not supported by your browser.');
            return;
        }
        return store.get(room.whHistoryUserObj.key+'_'+room.userInfo.groupId);
    },
    /**
     * 设置私聊人员记录
     * @param whUser json {}
     */
    setWhHistory:function(data){
        if (!store.enabled){
            console.log('Local storage is not supported by your browser.');
            return;
        }
        room.whHistoryUserObj.whUserList = room.getWhHistory();
        if(!$.isArray(room.whHistoryUserObj.whUserList)){
            room.whHistoryUserObj.whUserList = [];
        }
        if(data) {
            var whHistoryUserObj = {};
            if(room.userInfo.userId==data.fromUser.userId) {
                whHistoryUserObj.userId=data.fromUser.toUser.userId;
                whHistoryUserObj.utype=data.fromUser.toUser.userType;
                whHistoryUserObj.nk=data.fromUser.toUser.nickname;
                whHistoryUserObj.dt=common.formatterDateTime(parseInt(data.uiId.replace(/_\d*$/,''), 10), '-');
            }else {
                whHistoryUserObj.userId = data.fromUser.userId;
                whHistoryUserObj.utype = data.fromUser.userType;
                whHistoryUserObj.nk = data.fromUser.nickname;
                whHistoryUserObj.dt=common.formatterDateTime(parseInt(data.fromUser.publishTime.replace(/_\d*$/,''), 10), '-');
            }
            whHistoryUserObj.cg=data.fromUser.clientGroup;
            whHistoryUserObj.value = data.content.value;
            if(data.content.msgType==room.msgType.img){
                whHistoryUserObj.value = '[图片]';
            }
            var len = room.whHistoryUserObj.whUserList.length;
            if(len > 0) {
                for (var i = 0; i < len; i++) {
                    var row = room.whHistoryUserObj.whUserList[i];
                    if (row.userId == whHistoryUserObj.userId) {
                        room.whHistoryUserObj.whUserList[i] = {};
                    }
                    if(common.isBlank(row.userId)){
                        break;
                    }
                }
                room.whHistoryUserObj.whUserList.unshift(whHistoryUserObj);
                if (len > 50) {
                    room.whHistoryUserObj.whUserList.splice(50, len - 50);
                }
                store.set(room.whHistoryUserObj.key + '_' + room.userInfo.groupId, room.whHistoryUserObj.whUserList);
            }
        }
    },
    /**
     * 填充历史会话用户列表
     */
    fillWhHistory:function(){
        room.whHistoryUserObj.whUserList = room.getWhHistory();
        var html = '', formatHtmlStr = room.formatHtml('whHistory');
        if(!$.isArray(room.whHistoryUserObj.whUserList)){
            var params = {groupType:room.userInfo.groupType,groupId:room.userInfo.groupId,userId:room.userInfo.userId};
            common.getJson('/admin/getLastTwoDaysMsg',{data:JSON.stringify(params)},function(result){
                if(result){
                    $.each(result, function (key, row) {
                        var dTime = common.formatterDateTime(parseInt(row.value.publishTime.replace(/_\d*$/,''), 10), '-').substring(5,16);
                        var nickName='',userId='',userType=0;
                        if(row.value.userId==room.userInfo.userId){
                            nickName = row.value.toUser.nickname;
                            userId = row.value.toUser.userId;
                            userType = row.value.toUser.userType;
                        }else{
                            nickName = row.value.nickname;
                            userId = row.value.userId;
                            userType = row.value.userType;
                        }
                        html += formatHtmlStr.formatStr(userId, ($("#userListId li[id='" + userId + "']").length > 0 ? '' : ' class="off"'), userType, nickName, dTime , (row.value.content.msgType==room.msgType.img?'[图片]':row.value.content.value));
                    });
                    room.setWhHistoryHtml(html);
                }
            });
        } else {
            $.each(room.whHistoryUserObj.whUserList, function (key, row) {
                if(common.isValid(row.userId)) {
                    var dTime = row.dt.substring(5, 16);
                    html += formatHtmlStr.formatStr(row.userId, ($("#userListId li[id='" + row.userId + "']").length > 0 ? '' : ' class="off"'), row.utype, row.nk, dTime, row.value);
                }
            });
            room.setWhHistoryHtml(html);
        }
    },
    /**
     * 填充历史会话列表
     * @param html
     */
    setWhHistoryHtml:function(html){
        $('.wh-history .wh_tab_history_div .wh_tab_history_ul').html(html);
        $('.wh-history .wh_tab_history_div .wh_tab_history_ul li').click(function () {
            room.setWhVisitors($(this).attr('utype'), $(this).attr("cg"), $(this).attr('uid'), $(this).find("label:first").text(), !$(this).hasClass("off"));
            $('.visitorDiv .wh_tab_ul li[uid=' + $(this).attr('uid') + ']').click();
            $('.wh_tab_history_div').addClass('dn');
            return false;
        });
        room.setListScroll($('.wh-history .wh_tab_history_div .wh_tab_history_list'));
    },
    /**
     * 计算宽度
     */
    widthCheck: function(resize){
        var ww = $(window).width();
        if(ww > 1680 ){
            $('body').attr('class','');
            $('body').addClass('wid1');
        }
        if(ww <= 1680 && ww > 1480 ){
            $('body').attr('class','');
            $('body').addClass('wid2');

        }
        if(ww <= 1480 && ww >= 1280 ){
            $('body').attr('class','');
            $('body').addClass('wid3');
        }
        if(ww < 1280 ){
            $('body').attr('class','');
            $('body').addClass('wid4');
        }
        if($(".open_wh_box").is(':hidden')||resize){
            if($('.visitorDiv ul li[uid="public"]').hasClass('on')) {
                $('.local_box .wh-middle').width(ww - (225 + 200));
            }else{
                $('.local_box .wh-middle').width(ww - 210);
            }
        }else{
            $('.open_wh_box .wh-middle').width($('.open_wh_box').width() - 210);
        }
    },
    /**
     * 计算高度
     */
    heightCalcu: function(resize){
        var prefixDom=".local_box";
        var  hh = $(window).height();
        var disH=130,hisH=95;
        if($(".open_wh_box").is(':hidden')||resize){
            if($('.onlineSearch').hasClass('dn')){
                $('.user_box').height(hh-180).css('max-height',(hh-180)+'px');
            }else{
                $('.user_box').height(hh-205).css('max-height',(hh-205)+'px');
            }
            $('.right-teacher').height(hh-10);
            $('.wh_tab_history_div').css({'top':'75px'});
        }else{
            hisH = 20;
            $('.wh_tab_history_div').css({'top':'27px'});
            hh =$(".open_wh_box").height()-25;
            prefixDom='.open_wh_box';
            disH=60;
        }
        $(prefixDom+' .wh-left,'+prefixDom+' .wh-middle').height(hh-10);
        /*$(prefixDom+' .visitorDiv').height(hh-45).css('max-height',(hh-55)+'px');*/
        $(prefixDom+' .visitorDiv .wh_tab_div').height($(prefixDom+' .wh-left').height()-disH);
        $(prefixDom+' .visitorDiv .wh_tab_history_list').height($(prefixDom+' .wh-left').height()-hisH);//会话历史记录高度
        $(prefixDom+' .wh-tab-msg').height(hh-80);
        $(prefixDom+' .wh-content').height(hh-230);
    },
    /**
     * 根据区域返回对应HTML
     * @param region
     * @returns {string}
     */
    formatHtml:function(region){
        var formatHtmlArr = [];
        switch(region){
            case 'point-list':
                formatHtmlArr.push('<li{0}>');
                formatHtmlArr.push('    <input type="hidden" name="_id" value="{1}" />');
                formatHtmlArr.push('    <h4>{2}</h4>');
                formatHtmlArr.push('    <div class="dn">');
                formatHtmlArr.push('        从<input type="text" name="publishStartDateStr" id="publishStartDateStr_{1}" class="date" onfocus="WdatePicker({maxDate:\'#F{$dp.$D(\\\'publishEndDateStr_{1}\\\')}\',dateFmt:\'yyyy-MM-dd HH:mm:ss\'})" value="{3}" />');
                formatHtmlArr.push('        到<input type="text" name="publishEndDateStr" id="publishEndDateStr_{1}" class="date" onfocus="WdatePicker({minDate:\'#F{$dp.$D(\\\'publishStartDateStr_{1}\\\')}\',dateFmt:\'yyyy-MM-dd HH:mm:ss\'})" value="{4}" />');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('     <p>{5}</p>');
                formatHtmlArr.push('     <input type="button" value="编辑" class="edit-btn" />');
                formatHtmlArr.push('     <input type="button" value="提交" class="save-btn dn" />');
                formatHtmlArr.push('     <input type="button" value="取消" class="cancel-btn dn" />');
                formatHtmlArr.push('</li>');
                break;
            case 'whHistory':
                formatHtmlArr.push('<li uid="{0}"{1} utype="{2}"><span class="user-row"><label>{3}</label><label>{4}</label></span><span class="user-msg">{5}</span></li>');
                break;
        }
        return formatHtmlArr.join('');
    }
};