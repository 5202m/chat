/**
 * 直播间客户端通用操作类
 * @type {{init: Function, setKindEdit: Function, setSocket: Function}}
 * author Alan.wu
 */
var studioChat={
    filePath:'',
    //信息类型
    enable : true, //是否使用store
    storeInfoKey : "storeWhMsg_",
    whTipIntervalId:{},
	hasWhTipIntervalId:{},//是否存在提示
    msgType:{
       text:'text' ,
        img:'img',
        file:'file'
    },
    socket:null,
    socketUrl:'',
    userInfo:null,
    init:function(){
        this.enable = store && store.enabled;
        if (!this.enable && console){
            console.log('Local storage is not supported by your browser.');
        }
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
            $.getJSON('/studio/getSyllabus?t=' + new Date().getTime(),{groupType:studioChat.userInfo.groupType,groupId:studioChat.userInfo.groupId},function(result){
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
                                    '<object type="application/x-shockwave-flash" id="sewise_player" name="sewise_player" data="/js/lib/flash/SewisePlayer.swf" width="100%" height="100%">' +
                                    '<param name="allowfullscreen" value="true">' +
                                    '<param name="wmode" value="transparent">' +
                                    '<param name="allowscriptaccess" value="always">' +
                                    '<param name="flashvars" value="autoStart=true&amp;programId=&amp;shiftTime=&amp;lang=zh_CN&amp;type=rtmp&amp;serverApi=ServerApi.execute&amp;skin=/js/lib/flash/skins/liveOrange.swf&amp;title=&amp;draggable=true&amp;published=0&amp;streamUrl=' + url + '&amp;duration=3600&amp;poster=&amp;flagDatas=&amp;videosJsonUrl=&amp;adsJsonData=&amp;statistics=&amp;customDatas=&amp;playerName=Sewise Player&amp;clarityButton=enable&amp;timeDisplay=disable&amp;controlBarDisplay=enable&amp;topBarDisplay=disable&amp;customStrings=&amp;volume=0.6&amp;key=&amp;trackCallback=">' +
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
            var fromUser=data.fromUser;
            $(".mymsg").show();
            $(".mymsg em").hide();
            $(".replybtn").attr("tm",fromUser.publishTime).attr("uid",fromUser.userId).attr("ts",fromUser.talkStyle).attr("utype",fromUser.userType);
            $(".sender").html(fromUser.nickname);
            $(".xcont").html(data.content.value);
            $("#talk_top_id").prepend('<section class="ss-tk-info clearfix" tm="'+fromUser.publishTime+'"><label><strong>'+fromUser.nickname+'</strong>：</label><span style="margin-left:5px;text-align:justify;">'+data.content.value+'</span><button type="button">关闭</button><button type="button" uid="'+fromUser.userId+'" utype="'+fromUser.userType+'">回复</button></section>');
            var pDom=$('#talk_top_id .ss-tk-info[tm='+fromUser.publishTime+']');
            pDom.find("button").click(function(){
                var tp=$(this).parents(".ss-tk-info");
                var fuId=$(this).attr("uid");
                var tm=tp.attr("tm");
                if(common.isValid(fuId)){
                    var $this = $(this);
                    studioChat.setDialog(null,fuId,tp.find("strong").addClass("reply-st").html(),$this.attr("ts"),$this.attr("utype"),tm, $this.siblings("span").html());//设置对话
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
                        $(".searchResult ul").append('<li uid="'+userId+'" cg="'+data[i].clientGroup+'"  '+(onlineStatus==1?'':'class="off"')+'><label>'+data[i].nickname+'</label></li>');
                    }
                    //点击事件
                    $(".searchResult ul li").click(function(){
                        $(".searchResult").hide();
                        var tvId=$(this).attr("uid");
                        studioChat.setWhVisitors((tvId.indexOf("visitor_")!=-1?-1:0),$(this).attr("cg"),tvId,$(this).find("label").text(),!$(this).hasClass("off"));
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
     * 提取私聊toUser
     * @returns {{userId: *, nickname: *, talkStyle: number, userType: *}}
     */
    getWhToUser:function(){
        var liDom=$('.visitorDiv ul li[class~=on]');
        return {userId:liDom.attr("uid"),nickname:liDom.find("label").text(),talkStyle:1,userType:liDom.attr("utype")};
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
        sendObj.fromUser.toUser=this.getWhToUser();
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
                        targetDom.find(".wrtip").text('');
                        $('#wh_msg_'+userInfoTmp.loginId).attr('id','wh_msg_'+userInfoTmp.userId);
                    }
                }else if(userInfoTmp.userType=="0" && common.isValid(userInfoTmp.visitorId)){//游客转用户登入
                    targetDom=$('.visitorDiv ul li[uid='+userInfoTmp.visitorId+']');
                    targetDom.find(".wrtip").text(studioChat.getWhUserCGTip(userInfoTmp.userType,userInfoTmp.clientGroup));
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
        if($(".visitorDiv ul li[uid="+userId+"]").length==0){
            $(".visitorDiv ul").append('<li uid="'+userId+'"  '+(isOnline?'':'class="off"')+' utype="'+userType+'"><span  class="user-row"><label>'+nickname+'</label><em class="close ym" t="0"></em><em class="wrtip">'+studioChat.getWhUserCGTip(userType,clientGroup)+'</em></span></li>');
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
                var userId=$(this).attr("uid"),whId='wh_msg_'+userId,userType=$(this).attr("utype");
                studioChat.closeWhTipMsg(userId);
                $(".wh-right").children().hide();
                if($("#"+whId).length==0){
                    var msgHtml='<div id="'+whId+'" class="wh-tab-msg"><div class="wh-title"><span><label>'+$(this).find("label").text()+'</label>【<strong></strong>】</span><span class="title-tip"></span></div><div class="wh-content"></div>'+
                        '<div class="wh-txt"><div class="toolbar"><a href="javascript:" class="facebtn">表情</a><label for="file_'+whId+'" class="send-wh-img" title="发送图片"></label><input type="file" id="file_'+whId+'" style="position:absolute;clip:rect(0 0 0 0);" class="fileBtn"/></div><div contenteditable="true" class="ctextarea" id="whTxt_'+userId+'" data-placeholder="按回车键发送"></div></div></div>';
                    //取消已读数据提示
                    studioChat.updateWhTipStore(studioChat.userStoreInfoKey(studioChat.userInfo) , userId);
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
                            studioChat.setUploadImg(e.target.result);//处理并发送图片
                        };
                        reader.onprogress=function(e){};
                        reader.onloadend = function(e){};
                    }, false);
                    //加载私聊信息
                    studioChat.socket.emit("getWhMsg",{userType:studioChat.userInfo.userType,groupId:studioChat.userInfo.groupId,groupType:studioChat.userInfo.groupType,userId:studioChat.userInfo.userId,toUser:{userId:userId,userType:userType}});
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
        var wh_msg_ftip = 0;
        if($(".wh_msg_ftip").attr('class').indexOf(' have') == -1){
            $(".wh_msg_ftip").attr("uid",userId).attr("k",1).show().addClass("have");
            wh_msg_ftip = 1;
        }
        $('#userListId li[id='+userId+']').attr("k",1);

        if(studioChat.hasWhTipIntervalId[userId] == undefined){ //用户发多条信息，保持闪烁频率一致
            studioChat.whTipIntervalId[userId]=setInterval(function(){
                $('#userListId li[id='+userId+'][k=1]').toggleClass("have_op");
                studioChat.hasWhTipIntervalId[userId] = true ;
                wh_msg_ftip == 1 && $('.wh_msg_ftip[k=1]').toggleClass("have_op"); //总体上闪烁一次
            },1000);
        }
    },
    /**
     * 关闭私聊提示
     */
    closeWhTipMsg:function(userId){
        $('#userListId li[id='+userId+']').attr("k",0).removeClass("have_op");
        if($('#userListId [k=1]').length>0){
            $('.wh_msg_ftip').attr("uid",$('#userListId [k=1]:first').attr('id'));
        }else{
            $('.wh_msg_ftip[uid='+userId+']').attr("k",0).removeClass("have have_op");
        }
        if($('#userListId[k=1]').length==0 && $('.wh_msg_ftip[k=1]').length==0){
            if(studioChat.whTipIntervalId[userId]){
                clearInterval(studioChat.whTipIntervalId[userId]);
                studioChat.whTipIntervalId[userId]=null;
                if(studioChat.hasWhTipIntervalId[userId]){
                    studioChat.hasWhTipIntervalId[userId] = null;
                }
            }
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
        var whBox=this.getWhBox();
        var key=studioChat.userStoreInfoKey(this.userInfo);
        if(whBox.length==0){//私聊框不存在，则初始化私聊框
            studioChat.setWhBox(true);
            studioChat.setWhVisitors(userType,clientGroup,userId,nickname,true,isShowNum);
            if(isTip){
                studioChat.setWhTipStore(key,userId);
            }
            return false;
        }else{
            var userTab=$('.visitorDiv ul li[uid='+userId+']');
            if(userTab.length==0){//如果弹框没有对应用户，则先配置该用户tab
                studioChat.setWhVisitors(userType,clientGroup,userId,nickname,true,isShowNum);
                if(whBox.is(':hidden')){
                    if(isTip) {
                        studioChat.setWhTipStore(key,userId);
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
                        studioChat.setWhTipStore(key,userId);
                    }
                }else{
                    if(!userTab.hasClass("on") && isTip){
                        studioChat.setWhTipStore(key,userId);
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
        var fromUser=data.fromUser,cls='dialog ',content=data.content,nkTitle='',loadImgHtml='',loadHtml='';
        if(data.rule){
            $('#'+data.uiId+' span[contt="a"]').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            return;
        }
        if(!isLoadData){
            fromUser.toWhUserId=fromUser.userId;
        }
        if(studioChat.userInfo.userId==fromUser.userId){
            if(isMeSend){//发送，并检查状态
                fromUser.publishTime=data.uiId;
                fromUser.toWhUserId=fromUser.toUser.userId;
                loadHtml='<em class="img-loading"></em>';
                loadImgHtml='<span class="shadow-box"></span><s class="shadow-conut"></s>';
            }
            if(data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
                $('#'+data.uiId+' .dtime').html(studioChat.formatPublishTime(fromUser.publishTime));
                $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
                if(data.content.msgType==studioChat.msgType.img){
                    studioChat.removeLoadDom(fromUser.publishTime);//去掉加载框
                    var liObj=$('#'+fromUser.publishTime+' p');
                    var url=data.content.needMax?'/studio/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId:liObj.find("a img").attr("src");
                    liObj.find('a[class=swipebox]').attr("href",url);
                    //上传成功后可以点击查看
                    $('.swipebox').swipebox();
                }
                return;
            }
            cls+='mine';
            nkTitle='<span class="wh-dia-title"><label class="dtime">'+studioChat.formatPublishTime(fromUser.publishTime,isLoadData,'/')+'</label><label class="wh-nk">我</label></span>';
        }else{
            if(!isLoadData){//如接收他人私信
                var isFillWh=this.fillWhBox(fromUser.userType,fromUser.clientGroup,fromUser.userId,fromUser.nickname,true,true);
                $('.visitorDiv ul').prepend($('.visitorDiv ul li[uid='+fromUser.toWhUserId+']'));
                if(!isFillWh){
                    return;
                }
            }
            nkTitle='<span class="wh-dia-title"><label class="wh-nk">'+fromUser.nickname+'</label><label class="dtime">'+studioChat.formatPublishTime(fromUser.publishTime,isLoadData,'/')+'</label></span>';
        }
        if(common.isBlank(fromUser.toWhUserId)){
            console.error("setWhContent->fromUser toWhUserId is null,please check!");
            return;
        }
        var pHtml='';
        var whContent=$('#wh_msg_'+fromUser.toWhUserId+' .wh-content');
        var scrContent=whContent.find(".mCSB_container");//是否存在滚动
        var html='';
        if(content.msgType==studioChat.msgType.img){
            if(content.needMax){
                pHtml='<p><a href="/studio/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId+'" class="swipebox" ><img src="'+content.value+'" alt="图片"/></a>'+loadImgHtml+'</p>';
            }else{
                pHtml='<p><a href="'+content.value+'" class="swipebox" ><img src="'+content.value+'" alt="图片" /></a>'+loadImgHtml+'</p>';
            }
            pHtml+=loadHtml;
        }else{
            if(!isMeSend && common.isValid(fromUser.toUser.question)){
                html='<div class="dialog mine"><div><span class="wh-dia-title"><label class="dtime">'+studioChat.formatPublishTime(fromUser.toUser.publishTime,isLoadData,'/')+'</label><label class="wh-nk">我</label></span></div><div class="whblt">'+fromUser.toUser.question+'</div></div>';
                if(scrContent.length>0){
                    scrContent.append(html);
                }else{
                    whContent.append(html);
                }
            }
            pHtml='<p><span class="dcont" contt="a">'+content.value+'</span></p>';
        }
        html='<div class="'+cls+'" id="'+fromUser.publishTime+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header"><div>'+nkTitle+ '</div>'+pHtml+'</div>';
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
    setUploadImg:function(base64Data){
        var uiId=studioChat.getUiId();
        //先填充内容框
        var formUser={};
        common.copyObject(formUser,studioChat.userInfo,true);
        formUser.toUser=this.getWhToUser();
        var sendObj={uiId:uiId,fromUser:formUser,content:{msgType:studioChat.msgType.img,value:'',needMax:0,maxValue:''}};
        studioChat.setWhContent(sendObj,true,false);
        sendObj.content.value=base64Data;
        studioChat.zipImg(sendObj,100,60,function(result,value){//压缩缩略图
            if(result.error){
                alert(result.error);
                $('#'+uiId).remove();
                return false;
            }
            var imgObj=$("#"+result.uiId+" img");
            imgObj.attr("src",value).attr("needMax",result.content.needMax);
            studioChat.dataUpload(result);
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
        xhr.open('POST', '/studio/uploadData');
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
        data.fromUser.socketId=studioChat.socket.id;
        xhr.send(JSON.stringify(data)); //发送base64
    },
    /**
     * 事件设置
     */
    setEvent:function(){
        $("#header_img_id").attr("src",studioChat.userInfo.avatar);
        /*#################私聊事件#################begin*/
        var currTab=$("#groupInfoId"),awr=currTab.attr("awr"), aw=currTab.attr("aw");
        if("true"==aw && common.containSplitStr(awr,studioChat.userInfo.userType)){
            $(".wh_msg_ftip").show();
        }
        jqWindowsEngineZIndex=100000;
        $("#newMsgTipBtn").click(function(){
            var uid=$(this).attr("uid");
            //studioChat.closeWhTipMsg(uid);
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
            //studioChat.closeWhTipMsg(uid);
            var wBox=studioChat.getWhBox();
            if(wBox.length>0){
                $('.visitorDiv ul li[uid='+uid+']').click();
                wBox.show();
            }else{
                $('.dialogbtn[uid="'+uid+'"] a.d2').click();
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

        //@记录框显示隐藏事件
        $("#close-top-box").click(function(){
            $(".top-box").hide();
        });
        $("#show_top_btn").click(function(){
            $(".top-box").toggle();
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
            var $this = $(this);
            studioChat.setDialog(null,$this.attr("uid"),$(".sender").html(),$this.attr("ts"),$this.attr("utype"),$this.attr("tm"), $this.parent().find(".xcont").html());//设置对话
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
        $('.view_select .se_cont').hover(function() {
            $(this).parent().addClass('dw');
        },function(){
            $(this).parent().removeClass('dw');
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
            if(e.keyCode==8){//按退格键发送
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
                $("#contentText").html("").append('<span class="txt_dia" contenteditable="false" uid="'+ui.item.value+'" utype="'+ui.item.userType+'">@<label>'+ui.item.label+'</label></span>&nbsp;').focusEnd();
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
        //排除表情,去除其他所有html标签
        var txtDia=dom.find(".txt_dia");
        if(dom.find(".txt_dia").length>0){
            studioChat.setTalkTop(false,{publishTime:txtDia.attr("tm")});
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
     * @param [txt] 问题
     */
    setDialog:function(clientGroup,userId,nickname,talkStyle,userType,ptm,txt){
        if(talkStyle==1){//私聊,则直接弹私聊框
            studioChat.fillWhBox(userType,clientGroup,userId,nickname,false);
            studioChat.getWhBox().show();
            $('.visitorDiv ul li[uid='+userId+']').click();
        }else{
            $("#contentText .txt_dia").remove();
            $("#contentText").html($("#contentText").html().replace(/^((&nbsp;)+)/g,''));
            var loc_txt = '';
            if(txt){
                loc_txt = '<input type="hidden" value="">';
                var txtDom = $('<div>' + txt + '</div>');
                txtDom.find(".txt_dia").remove();
                txt = txtDom.html();
            }
            var htmlDom = $('<span class="txt_dia" contenteditable="false" uid="'+userId+'" tm="'+ptm+'" utype="'+userType+'">' + loc_txt + '@<label>'+nickname+'</label></span>&nbsp;');
            htmlDom.find("input").val(txt);
            $("#contentText").prepend(htmlDom).focusEnd();
            $("#talk_top_id .ss-tk-info[tm="+ptm+"]").find("strong").addClass("reply-st");
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
        $('#'+fromUser.publishTime+' .headimg,#'+fromUser.publishTime+' .uname').click(function(){
            var dp=$(this).parents(".dialog");
            var diaDom=dp.find('.dialogbtn');
            diaDom.attr("tm",dp.attr("id"));
            studioChat.openDiaLog(diaDom, true);
        });
        $('#'+fromUser.publishTime+' .dialogbtn a').click(function(){
            var tp=$(this).parent();
            var t = $(this).attr("t");
            var txt = "";
            if(t == "2"){
                t = 0;
                txt = tp.prev().find("span[contt='a']").html();
            }
            studioChat.setDialog(tp.attr("cg"),tp.attr("uId"),tp.attr("nk"),t,tp.attr("utype"),tp.attr("tm"),txt);//设置对话
            tp.hide();
        });
        $('#'+fromUser.publishTime+' .txt_dia').click(function(){
            studioChat.setDialog(null,$(this).attr("uid"),$(this).find("label").text(),0,$(this).attr("utype"));
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
    openDiaLog: function (diaDom, isMsgList) {
        $('.dialogbtn').not(diaDom).hide();
        diaDom.css('left', '0');
        var dp = diaDom.parent();
        if (common.isValid(dp.attr("utype"))) {
            var loc_isLast = dp.next().size() === 0;
            if (diaDom.parent().hasClass('analyst')) {
                diaDom.css('top', isMsgList && loc_isLast ? '-120px' : '53px');
            } else {
                diaDom.css('top', isMsgList && loc_isLast ? '-92px' : '39px');
            }
        }
        if (!diaDom.is(':hidden')) {
            diaDom.hide();
            return false;
        }
        diaDom.show();
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
            dialog=studioChat.getDialogHtml(fromUser.clientGroup,fromUser.userId,nickname,fromUser.userType,fromUser.isMobile, true);
            if(!isLoadData && toUser){
                if(studioChat.userInfo.userId==toUser.userId){
                    studioChat.setTalkTop(true,data);
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
        if(toUser && common.isValid(toUser.question)){
            html += '<span class="dcont">'
            + '<span uid="'+toUser.userId+'" utype="'+toUser.userType+'">'+toUser.nickname+'</span>'
            + '提问：'
            + '<span contt="q">' + toUser.question + '</span>'
            + '<span class="dialog_reply">回复：<span contt="a">' + pHtml + '</span></span>';
        }else{
            html += '<span class="dcont" contt="a">' + toUserHtml + pHtml + '</span>';
        }
        html += '</span></p>' + dialog + '</div>';
        return html;
    },
    /**
     * 格式链接
     * @param ptime
     */
    formatMsgToLink:function(ptime){
        $('#'+ptime+' span[contt]:contains("http:"),#'+ptime+' span[contt]:contains("https:")').each(function (index,el){
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
        }else if("active"==clientGroup || "notActive"==clientGroup){
            aImgCls="user_r";
        }else if("simulate"==clientGroup){
            aImgCls="user_d";
        }else if("register"==clientGroup){
            aImgCls="user_m";
        }else{
            aImgCls="user_c";
        }
        return '<img src="/images/studio_admin/'+aImgCls+'.png">';
    },
    /**
     * 提取对话html
     * @param clientGroup
     * @param userId
     * @param nickname
     * @param userType
     * @param isMb
     * @param isMsgList
     * @returns {string}
     */
    getDialogHtml:function(clientGroup,userId,nickname,userType,isMb, isMsgList){
        if(studioChat.userInfo.userId!=userId && studioChat.userInfo.userId.indexOf('visitor_')==-1){
            var gIdDom=$("#groupInfoId"),mainDiv=[];
            mainDiv.push('<div class="dialogbtn" style="display:none;" cg="'+clientGroup+'" nk="'+nickname+'" uId="'+userId+'" utype="'+userType+'">');
            /*if(userId.indexOf('visitor_')==-1){
                mainDiv+='<a href="javascript:" class="d1" t="0"><span>@TA</span></a>';
                hasMainDiv=true;
            }*/
            mainDiv.push('<a href="javascript:" class="d1" t="0"><span>@TA</span></a>');
            if(gIdDom.attr("aw")=="true"&& common.containSplitStr(gIdDom.attr("awr"),studioChat.userInfo.userType)){
                mainDiv.push('<a href="javascript:" class="d2" t="1"><span>私聊</span></a>');
            }
            if(isMsgList){
                mainDiv.push('<a href="javascript:" class="d1" t="2"><span>回复</span></a>');
            }
            return mainDiv.length > 1 ? (mainDiv.join("")+"</div>"):'';
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
        var clientGroup = {'notActive':'(N)','active':'(A)'};
        $("#userListId li[id='"+row.userId+"']").remove();//存在则移除旧的记录
        var dialogHtml=studioChat.getDialogHtml(row.clientGroup,row.userId,row.nickname,row.userType,row.isMobile, false),isMeHtml="",seq=row.sequence;
        var an = common.isBlank(clientGroup[row.clientGroup])?'':clientGroup[row.clientGroup];
        var mbEm=row.isMobile?'<em class="mb-cls">(mb)'+an+'</em>':'<em class="mb-cls">'+an+'</em>';
        if(studioChat.userInfo.userId==row.userId){
            isMeHtml = "【我】";
            mbEm='';
            seq = 0;
        }
        var lis=$("#userListId li"),
            liDom=$('<li id="'+row.userId+'" t="'+seq+'" utype="'+row.userType+'"  ismb="'+row.isMobile+'">'+dialogHtml+'<a href="javascript:" t="header" class="uname"><div class="headimg">'+studioChat.getUserAImgCls(row.clientGroup,row.userType,row.avatar)+'</div><label class="nk-lb">'+row.nickname+isMeHtml+'</label>'+mbEm+'</a></li>');
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
                var pt=$(this).parent();
                //studioChat.closeWhTipMsg(pt.attr("id"));
                $('.dialogbtn').hide();
                $('.user_box li').removeClass('zin');
                pt.addClass('zin');
                studioChat.openDiaLog($(this).prev(), false);
                $('.dialogbtn',$(this).parent()).css('left','7px');
            });
            liDom.find(".dialogbtn a").click(function(){
                var tp=$(this).parent();
                studioChat.setDialog(tp.attr("cg"),tp.attr("uId"),tp.attr("nk"),$(this).attr("t"),tp.attr("utype"),tp.attr("tm"));//设置对话
                tp.hide();
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
        this.socket.on('onlineUserList',function(data,dataSize){
            $('#userListId').html("");
            var row=null;
            for(var i in data){
                row=data[i];
                studioChat.setOnlineUser(row);
            }
            $("#onLineSizeNum").text(dataSize);
            studioChat.setListScroll(".user_box");
            /** 载入未读信息提示 **/
            studioChat.loadWhTipStore(studioChat.userStoreInfoKey(studioChat.userInfo));
            /** 未读取信息提示结束 **/
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
                if(data.content.msgType==studioChat.msgType.img){
                    $('.swipebox').swipebox();
                }
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
                            studioChat.setListScroll(".user_box");
                        }
                    }
                    $("#onLineSizeNum").text($("#userListId li").length);
                    //设置私聊在线情况
                    studioChat.setWhOnlineTip(userInfoTmp.userId,data.online,userInfoTmp);
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
                        studioChat.setWhVisitors(data[index].userType,data[index].clientGroup,index,data[index].nickname,$("#userListId li[id='"+index+"']").length>0);
                    }
                    //studioChat.setWhTipInfo(userId);
                    var key=studioChat.userStoreInfoKey(studioChat.userInfo);
                    studioChat.setWhTipStore(key,userId);
                }
            }else{//私聊框中每个用户tab对应的私聊信息
                if(data && $.isArray(data)) {
                    var hasImg= 0,row=null;
                    data.reverse();
                    for (var i in data) {
                        row = data[i];
                        studioChat.formatUserToContent(row,true,result.toUserId);
                        if(row.content.msgType==studioChat.msgType.img){
                            hasImg++;
                        }
                    }
                    if(hasImg>0){
                        $('.swipebox').swipebox();
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
    },
    /**
     * 更新私聊未读提示
     * @param key
     */
    updateWhTipStore:function(key , userId){
        if(!this.enable) return ;
        //取消已读数据
        var keyVal=store.get(key);
        var newVal = [] ;
        for(var i=0;i<keyVal.length;i++){
            if(keyVal[i] == userId){
                delete keyVal[i]; //还会留下空
            }else if(keyVal[i]){
                newVal.push(keyVal[i]) ;//新数据
            }
        }
        store.set(key , newVal);
    },
    /**
     * 存储私聊未读提示
     * @param key
     * @param keyVal
     */
    setWhTipStore:function(key , userId){
        if(!this.enable) return ;
        if(!userId) return ;
        var keyVal=store.get(key);
        if(common.isBlank(keyVal)){
            keyVal = [];
            keyVal.push(userId);
        }else{
            if($.inArray(userId , keyVal) == -1){
                keyVal.push(userId);
            }
        }
        store.set(key,keyVal);
        studioChat.loadWhTipStore(key);
    },
    /**
     * 载入私聊未读提示
     * @param key
     */
    loadWhTipStore:function(key) {
        if(!this.enable) return ;
        var keyVal=store.get(key);
        if(keyVal.length>0){
            for(var i=0;i<keyVal.length;i++){
                if(keyVal[i]){
                    studioChat.setWhTipInfo(keyVal[i]);//未读
                }
            }
        }
    },
    whTipStoreUserIdFirst : function(key) {
        if(!this.enable) return ;
        if(store.get(key).length){
            return store.get(key)[0];
        }
    },
    userStoreInfoKey : function(userInfo){
        return studioChat.storeInfoKey+userInfo.groupId + '_'+userInfo.accountNo;
    }
};
// 初始化
$(function() {
    studioChat.init();
});
 