/**
 * 直播间客户端通用操作类
 * author Dick.guo
 */
var roomJS={
    initSewise:false,//是否初始化视频插件
    web24kPath:'',
    filePath:'',
    apiUrl:'',
    currStudioAuth:false,//当前房间是否授权
    visitorSpeak:false,//游客是否允许发言
    options:null,//附加参数
    serverTime:0,//服务器时间
    pushObj:{
        talkPush : [], //公聊推送消息
        whInfos:[]//私聊推送消息
    },
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
        this.serverTimeUp();
        this.setVisitStore();
        this.whTalk.initWH(); //初始化私聊
        this.setSocket();//设置socket连接
        this.setEvent();//设置各种事件
        this.setVideoList();
        studioMbPop.load(this.userInfo, this.options, {
            onShow : function(){
                $("#tVideoDiv video").hide();
            },
            onHide : function(){
                $("#tVideoDiv video").show();
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
        if(this.userInfo.clientGroup=='visitor'){
            var lgt = $('#currStudioInfo').attr("lgt");//后台控制登录弹框时间
            var spn = $('#currStudioInfo').attr("spn");//后台控制发言次数限制
            //当前房间未授权，并且是游客
            //3分钟后强制要求登录
            if (common.isValid(lgt) && !isNaN(lgt)) {
                if(!this.currStudioAuth){
                    studioMbPop.popBox("login", {
                        groupId : roomJS.userInfo.groupId,
                        clientGroup : roomJS.userInfo.clientGroup,
                        clientStoreId : roomJS.userInfo.clientStoreId,
                        platform : roomJS.options.platform,
                        closeable:false,
                        lgTime:lgt
                    });
                }else if(studioMbPop.Login.forceLogin()){
                    //之前已经看过3分钟了。
                    studioMbPop.popBox("login", {
                        groupId : roomJS.userInfo.groupId,
                        clientGroup : roomJS.userInfo.clientGroup,
                        clientStoreId : roomJS.userInfo.clientStoreId,
                        platform : roomJS.options.platform,
                        closeable:false,
                        showTip:true,
                        lgTime:lgt
                    });
                }else{
                    try {
                        lgt = parseInt(lgt);
                        window.setTimeout(function () {
                            //if (roomJS.userInfo.clientGroup == 'visitor') {
                                studioMbPop.Login.forceLogin(true);
                                studioMbPop.popBox("login", {
                                    groupId: roomJS.userInfo.groupId,
                                    clientGroup: roomJS.userInfo.clientGroup,
                                    clientStoreId: roomJS.userInfo.clientStoreId,
                                    platform: roomJS.options.platform,
                                    closeable: false,
                                    showTip: true,
                                    lgTime:lgt
                                });
                            //}
                        }, lgt * 60 * 1000);
                    } catch (e) {
                        console.error("set login Time has error", e);
                    }
                }
            }else if(common.isValid(spn)){
                if(!this.currStudioAuth){
                    studioMbPop.popBox("login", {
                        groupId : roomJS.userInfo.groupId,
                        clientGroup : roomJS.userInfo.clientGroup,
                        clientStoreId : roomJS.userInfo.clientStoreId,
                        platform : roomJS.options.platform,
                        closeable:false,
                        lgTime:null,
                        spn:spn
                    });
                }else if(studioMbPop.Login.forceLogin()){
                    //之前已经发过言了。
                    studioMbPop.popBox("login", {
                        groupId : roomJS.userInfo.groupId,
                        clientGroup : roomJS.userInfo.clientGroup,
                        clientStoreId : roomJS.userInfo.clientStoreId,
                        platform : roomJS.options.platform,
                        closeable:false,
                        showTip:true,
                        lgTime:null,
                        spn:spn
                    });
                }
            }
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
        studioMbPop.Person.refreshNickname(nickname);
    },
    /**
     * 服务器时间更新
     */
    serverTimeUp: function () {
        setInterval(function () {
            roomJS.serverTime += 1000;
            roomJS.setPushInfo();
        }, 1000);//每秒一次
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
            if(!this.visitorSpeak){
                $("#contentText").attr("contenteditable",false).append('<span style="margin:15px 5px;">亲，<a id="contentText_login" href="javascript:void(0);" style="text-decoration: underline;color:#3F51B5;cursor: pointer;">登录</a>&nbsp;&nbsp;后可以发言哦~</span>');
                $("#contentText_login").click(function () {
                    studioMbPop.popBox("login", {
                        groupId: roomJS.userInfo.groupId,
                        clientStoreId: roomJS.userInfo.clientStoreId,
                        platform : roomJS.options.platform
                    });
                });
            }
        }else{
            obj.loginId=this.userInfo.userId;
            store.set(key,obj);
        }
        this.isNeverLogin=!common.isValid(obj.loginId);
    },
    /**
     * 设置socket
     */
    setSocket:function(){
        studioMbPop.loadingBlock($("#talkBoxTab"));
        this.socket = common.getSocket(io,this.socketUrl,this.userInfo.groupType);
        //建立连接
        this.socket.on('connect',function(){
            console.log('connected to server!');
            roomJS.userInfo.socketId=roomJS.socket.id;
            roomJS.socket.emit('login',{
                    userInfo:roomJS.userInfo,
                    lastPublishTime:$("#dialog_list>li:last").attr("id"),
                    fromPlatform : roomJS.options.platform,
                    allowWhisper : roomJS.whTalk.enable
                },
                navigator.userAgent);
        });
        //在线用户列表
        this.socket.on('onlineUserList', function(data,dataLength){
            if(roomJS.whTalk.enable){
                for(var i in data){
                    if(data[i].userType==3){
                        roomJS.whTalk.setCSOnline(data[i].userId, true);
                    }
                }
                roomJS.whTalk.getCSList(); //加载客服列表
            }
        });
        //断开连接
        this.socket.on('disconnect',function(){
            console.log('disconnect');
        });
        //出现异常
        this.socket.on("error",function(e){
            console.error('e:'+e);
        });
        //信息传输
        this.socket.on('sendMsg',function(data){
            if(data.fromUser.toUser && data.fromUser.toUser.talkStyle==1){//如果是私聊则转到私聊框处理
                roomJS.whTalk.receiveMsg(data, false, false);
            }else{
                if(!data.serverSuccess && roomJS.userInfo.userId == data.fromUser.userId && !data.rule){
                    return;
                }
                roomJS.setContent(data, false, false);
            }
        });
        //通知信息
        this.socket.on('notice',function(result){
            switch (result.type)
            {
                case 'onlineNum':
                    var data=result.data,userInfoTmp=data.onlineUserInfo;
                    if(userInfoTmp.userType==3 && roomJS.whTalk.enable){
                        roomJS.whTalk.setCSOnline(userInfoTmp.userId, data.online);
                    }
                    break;
                case 'removeMsg':
                    $("#"+result.data.replace(/,/g,",#")).remove();
                    roomJS.setTalkListScroll();
                    break;
                case 'leaveRoom':{
                    roomJS.leaveRoomTip(result.flag);
                    break;
                }
                case 'approvalResult':
                {
                    var data=result.data;
                    var i = 0;
                    if(data.refuseMsg){
                        var publishTimeArr=data.publishTimeArr;
                        for(i in publishTimeArr){
                            $("#"+publishTimeArr[i]+" .dialog em[class=ruleTipStyle]").html("已拒绝");
                        }
                    }else{
                        for (i in data) {
                            roomJS.formatUserToContent(data[i]);
                        }
                        roomJS.setTalkListScroll();
                    }
                    break;
                }
                case 'pushInfo':
                    var data=result.data;
                    if(data.position==1){//私聊框
                        roomJS.pushObj.whInfos = data.infos;
                    }else if(data.position==3){ //公聊框
                        roomJS.pushObj.talkPush = data.infos;
                        for(var i = 0, len = roomJS.pushObj.talkPush.length; i < len; i++){
                            roomJS.pushObj.talkPush[i].nextTm = roomJS.pushObj.talkPush[i].serverTime + roomJS.pushObj.talkPush[i].onlineMin * 60 * 1000;
                        }
                    }
                    break;
                case 'serverTime':
                    roomJS.serverTime = result.data;
                    break;
            }
        });
        //信息传输
        this.socket.on('loadMsg',function(data){
            var msgData=data.msgData,isAdd=data.isAdd;
            if(!isAdd) {
                $("#content_ul").html("");
            }
            if(msgData && $.isArray(msgData)) {
                msgData.reverse();
                for (var i in msgData) {
                    roomJS.formatUserToContent(msgData[i]);
                }
                studioMbPop.loadingBlock($("#talkBoxTab"), true);
                roomJS.setTalkListScroll();
                window.setTimeout(function(){
                    roomJS.setTalkListScroll();
                }, 500);
            }
        });
        //加载私聊信息
        this.socket.on('loadWhMsg',function(result){
            var data=result.data;
            if(data && $.isArray(data)){
                var row;
                for (var i = 0, lenI = data.length; i < lenI; i++) {
                    row = data[i];
                    roomJS.formatUserToContent(row, true, result.toUserId);
                }
            }
        });
    },
    /**
     * 教学视频列表
     */
    setVideoList:function(){
        studioMbPop.loadingBlock($("#videosTab"));
        this.getArticleList("teach_video_base,teach_video_gw,teach_video_expert,teach_video_financial",this.userInfo.groupId,0,1,100,'{"sequence":"desc","publishStartDate":"desc"}',null,function(dataList){
            var loc_panel = $("#videosTab .boxcont");
            loc_panel.html("");
            if(dataList && dataList.result==0){
                var data=dataList.data;
                var loc_html = [];
                var row=null;
                for(var i = 0, lenI = !data ? 0 : data.length; i < lenI; i++){
                    if(i % 5 == 0){
                        loc_html.push('<ul class="teach-ul">');
                    }
                    row=data[i].detailList[0];
                    loc_html.push('<li><a title="' + row.title + '" href="javascript:void(0)" id="'+data[i]._id+'" vUrl="'+data[i].mediaUrl+'"><i></i><span>'+row.title+'</span></a></li>');
                    if(i % 5 == 4 || i == lenI - 1){
                        loc_html.push('</ul>');
                    }
                    loc_panel.html(loc_html.join(""));
                }
                //播放视频
                loc_panel.find("li a").click(function(){
                    if(!$(this).is(".on")){
                        $("#videosTab .boxcont li a.on").removeClass("on");
                        $(this).addClass("on");
                    }
                    roomJS.video.change(false, true);
                    roomJS.video.play("studio", "mp4", $(this).attr("vUrl"), $(this).text());
                });
            }
            roomJS.video.start(false, true);
            studioMbPop.loadingBlock($("#videosTab"), true);
        });
    },
    /**
     * 事件设置
     */
    setEvent:function(){
        this.setEventCen();
        this.video.init();
        this.setEventChat();
        this.setHeight();
        this.browserState.initBrowserState();
    },
    /**
     * 设置高度
     */
    setHeight : function(){
        var loc_amount = 0;
        loc_amount += $(".videopart").height();
        loc_amount += $(".cen-ulist").is(":hidden") ? 0 : $(".cen-ulist").height();
        loc_amount += $("#header").is(":hidden") ? 0 : $("#header").height();
        loc_amount = $(window).height() - loc_amount;
        $('.cen-pubox .boxcont:gt(1)').height(loc_amount);
        loc_amount -= $(".float-box").height();
        $('.cen-pubox .boxcont:lt(2)').height(loc_amount);
    },
    /**
     * 设置页面tab事件等
     */
    setEventCen:function(){
        var cenTab = new Swiper('.cen-qhbox', {
            loop: false,
            autoplay : false,
            onSlideChangeStart: function(mySwiper){
                $('.cen-ulist li').eq(mySwiper.activeIndex).trigger("click");
            }
        });

        /*tab切换*/
        $('.cen-ulist li').click(function(){
            $('.cen-ulist li.on').removeClass('on');
            $(this).addClass('on');
            var type = $(this).attr("t");

            if(type=="talkBoxTab"){
                roomJS.view.boardCtrl(1);
                roomJS.whTalk.whSwitch(false);
            }else if(type=="whTalkBoxTab"){
                roomJS.whTalk.whSwitch(true);
                roomJS.view.boardCtrl(1);
            }else{
                roomJS.whTalk.whSwitch(false);
                roomJS.view.boardCtrl(0);
                if(type=='TradeArticleTab'){
                    roomJS.setTradeArticle();
                }
            }
            cenTab.slideTo($(this).index(), 300, false);
        });

        //主页按钮
        $("#header_hb").bind("click", function(){
            window.location.href = "/hxstudio/home";
        });

        //登录、显示用户信息
        $("#header_ui").bind("click", function(){
            if(roomJS.userInfo && roomJS.userInfo.isLogin){
                //已登录，显示用户信息
                studioMbPop.popBox("person");
            }else{
                //未登录，弹出登录框
                studioMbPop.popBox("login", {
                    groupId : roomJS.userInfo.groupId,
                    clientGroup : roomJS.userInfo.clientGroup,
                    clientStoreId : roomJS.userInfo.clientStoreId,
                    platform : roomJS.options.platform
                });
            }
        });
    },
    /**
     * 设置聊天相关事件
     */
    setEventChat:function(){
        //表情输入控制
        $('#msgFaceBtn').bind("click", function(){
            $(this).blur();
            if(roomJS.view.viewBoard == 2){
                roomJS.view.boardCtrl(1);
            }else{
                roomJS.view.boardCtrl(2);
            }
            //初始化标签
            roomJS.face.init($("#facePanel"),
                $("#contentText"),
                roomJS.filePath+'/face/',
                !roomJS.visitorSpeak && "visitor"==roomJS.userInfo.clientGroup);
        });

        /*聊天屏蔽下拉框*/
        $('#talkBoxTab .view_select').click(function() {
            var loc_this = $(this);
            if(loc_this.is(".dw")){
                loc_this.removeClass("dw");
                roomJS.view.viewSelect = false;
            }else{
                loc_this.addClass("dw");
                roomJS.view.viewSelect = true;
            }
        }).find(".selectlist a").click(function(){
            if(!$(this).is(".on")){
                $('#talkBoxTab .view_select .selectlist a').removeClass("on");
                $('#talkBoxTab .view_select .selected').text($(this).text());
                $(this).addClass("on");
                var type = $(this).attr("t");
                roomJS.showViewSelect(type);
            }
        });

        //手势控制
        $(document).bind("touchstart", function(e) {
            if(roomJS.view.viewSelect){
                var viewSelect = $("#talkBoxTab .view_select");
                if(!viewSelect.is(e.target) && viewSelect.find(e.target).length == 0){
                    viewSelect.trigger('click');
                }
            }
            if(roomJS.whTalk.viewSelect){
                var viewSelect = $("#whThtalkBoxTab .view_select");
                if(!viewSelect.is(e.target) && viewSelect.find(e.target).length == 0){
                    viewSelect.trigger('click');
                }
            }
        });

        /**
         * contentText键盘事件
         */
        $("#contentText").keydown(function(e){
            var val=$(this).html();
            if(e.keyCode==13){//按回车键发送
                if(common.isValid(val)){
                    $(this).html(val.replace(/<div>|<\/div>/g,""));
                    $("#sendBtn").click();
                }
                return false;
            }
        }).keyup(function(e){
            if(e.keyCode==8){//按回车键发送
                var txtDom=$(this).find(".txt_dia");
                if($.trim($(this).text())==txtDom.text() && $(this).find("img").length==0){
                    txtDom.remove();
                    $(this).html("");//.trigger("input");
                    return true;
                }
            }
        }).focus(function(){
            if(roomJS.view.viewBoard == 4){
                roomJS.view.boardCtrl(1);
            }
            //roomJS.view.boardCtrl(3);
        }).bind("input", function(){
            var isOk = ($.trim($(this).text())!=$(this).find(".txt_dia").text() || $(this).find("img").size() > 0);
            if(isOk){
                $("#sendBtn").show();
                $("#sendToolBtn").hide();
                $("#floatBox").removeClass('send-add');
            }else{
                $("#sendBtn").hide();
                $("#sendToolBtn").show();
                $("#floatBox").addClass('send-add');
            }
        });

        //聊天内容发送事件
        $("#sendBtn").click(function(){
            $(this).blur();
            roomJS.view.boardCtrl(1);
            if(!roomJS.whTalk.tabCheck && !roomJS.visitorSpeak && roomJS.userInfo.clientGroup=='visitor'){
            	studioMbPop.popBox("login", {
                    groupId : roomJS.userInfo.groupId,
                    clientGroup : roomJS.userInfo.clientGroup,
                    clientStoreId : roomJS.userInfo.clientStoreId,
                    platform : roomJS.options.platform
                });
            	return;
            }
            if(roomJS.userInfo.isSetName === false){
                studioMbPop.popBox("set", {studioChatObj : roomJS});
                return;
            }
            var isMeSend = $('[isme="true"]').size(), speakNum = $('#currStudioInfo').attr('spn');
            if(common.isValid(speakNum) && isMeSend == speakNum && !roomJS.userInfo.isLogin) {//发言次数限制
                studioMbPop.Login.forceLogin(true);
                studioMbPop.popBox("login", {
                    groupId: roomJS.userInfo.groupId,
                    clientGroup: roomJS.userInfo.clientGroup,
                    clientStoreId: roomJS.userInfo.clientStoreId,
                    platform: roomJS.options.platform,
                    closeable: false,
                    showTip: true,
                    lgtTime:null,
                    spn:speakNum
                });
                return;
            }
            if(!roomJS.socket.connected){
                studioMbPop.showMessage('连接已断开');
            }
            var toUser=roomJS.getToUser();

            var msg = roomJS.getSendMsg();
            if(msg === false){
                return;
            }
            var sendObj={uiId:roomJS.getUiId(),fromUser:roomJS.userInfo,content:{msgType:roomJS.msgType.text,value:msg}};
            sendObj.fromUser.toUser = toUser;
            if(roomJS.whTalk.tabCheck){
                roomJS.whTalk.sendWhMsg(sendObj);
            }else{
                roomJS.socket.emit('sendMsg',sendObj);//发送数据
                roomJS.setContent(sendObj,true,false);//直接把数据填入内容栏
            }
            //清空输入框
            $("#contentText").html("").trigger("input");//清空内容
        });

        /**
         * 点击“+”号
         * */
        $('#sendToolBtn').click(function(){
            if(roomJS.view.viewBoard == 4){
                roomJS.view.boardCtrl(1);
            }else{
                roomJS.view.boardCtrl(4);
            }
        });

        /**
         * top信息点击
         */
        $("#top_msg").click(function(){
            var loc_label = $(this).find("label");
            $(this).slideUp();
            roomJS.setDialog(loc_label.attr("fuserId"), loc_label.attr("fnickname"), 0, loc_label.attr("fuType"), null);
        });
        $("#top_msg i").click(function(){
            $("#top_msg").slideUp();
            return false;
        });
        //发送图片--选择图片
        $(".file-img").click(function () {
            if (!FileReader) {
                alert("发送图片功能目前只支持Chrome、Firefox、IE10或以上版本的浏览器！");
                return false;
            }
            if(!roomJS.whTalk.tabCheck && !roomJS.visitorSpeak && roomJS.userInfo.clientGroup=='visitor'){
            	studioMbPop.popBox("login", {
                    groupId : roomJS.userInfo.groupId,
                    clientGroup : roomJS.userInfo.clientGroup,
                    clientStoreId : roomJS.userInfo.clientStoreId,
                    platform : roomJS.options.platform
                });
            	return false;
            }
            if(roomJS.userInfo.isSetName === false){
                studioMbPop.popBox("set", {studioChatObj : roomJS});
                return false;
            }
        });
        //发送图片
        $(".file-img").bind("change", function () {
            var _this = this;
            var img = _this.files[0];
            // 判断是否图片
            if (!img) {
                return false;
            }
            // 判断图片格式
            if (!(img.type.indexOf('image') == 0 && img.type && /\.(?:jpg|png|gif)$/.test(img.name.toLowerCase()))) {
                alert('目前暂支持jpg,gif,png格式的图片！');
                return false;
            }
            var fileSize = img.size;
            if (fileSize >= 1024 * 1024) {
                alert('发送的图片大小不要超过1MB.');
                return false;
            }
            //加载文件转成URL所需的文件流
            var reader = new FileReader();
            reader.readAsDataURL(img);

            reader.onload = function (e) {
                roomJS.setUploadImg(e.target.result, roomJS.getToUser());//处理并发送图片
            };
            reader.onprogress = function (e) {};
            reader.onloadend = function (e) {};
            roomJS.view.boardCtrl(1);
            $(this).val("");
        });
    },
    /**
     * 设置并压缩图片
     */
    setUploadImg:function(base64Data, toUser){
        var uiId=roomJS.getUiId();

        //先填充内容框
        var formUser={};
        common.copyObject(formUser,roomJS.userInfo,true);
        formUser.toUser=toUser;
        var sendObj={uiId:uiId,fromUser:formUser,content:{msgType:this.msgType.img,value:'',needMax:0,maxValue:''}};
        if(roomJS.whTalk.tabCheck) {
            roomJS.whTalk.sendWhMsg(sendObj);
        }else{
            this.setContent(sendObj,true,false);
        }
        sendObj.content.value=base64Data;
        this.zipImg(sendObj,100,60,function(result,value){//压缩缩略图
            if(result.error){
                alert(result.error);
                $('#'+uiId).remove();
                return false;
            }
            var aObj=$("#"+result.uiId+" span[contt='a'] a");//[contt='a']
            aObj.attr("url", value)
                .children("img").attr("src",value).attr("needMax",result.content.needMax);
            roomJS.dataUpload(result);
        });
    },

    /**
     * 图片压缩
     * @param sendObj
     * @param max
     * @param quality 压缩量
     * @param callback
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
        xhr.open('POST', '/hxstudio/uploadData');
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
        data.fromUser.socketId=this.socket.id;
        xhr.send(JSON.stringify(data)); //发送base64
    },
    /**
     * 页面控制
     */
    view : {
        viewSelect : false,
        viewBoard : 1, //0-不显示输入框 1-仅显示输入框 2-显示表情 3-显示键盘 4-显示图片框
        boardCtrl : function(type){
            if(this.viewBoard == type){
                return;
            }
            this.viewBoard = type;
            var blocks = {
                header : $("#header"),
                backToLive : $("#backToLive"),
                floatBox : $("#floatBox"),
                facePanel : $("#facePanel"),
                imgBox : $("#sendToolPanel")
            };
            switch(type){
                case 0:
                    blocks.header.show();
                    blocks.backToLive.show();
                    blocks.floatBox.hide();
                    break;
                case 1:
                    blocks.header.show();
                    blocks.backToLive.show();
                    blocks.floatBox.show();
                    blocks.facePanel.hide();
                    blocks.imgBox.hide();
                    break;
                case 2:
                    blocks.header.hide();
                    blocks.backToLive.hide();
                    blocks.floatBox.show();
                    blocks.facePanel.show();
                    blocks.imgBox.hide();
                    break;
                case 3:
                    blocks.header.show();
                    blocks.backToLive.hide();
                    blocks.floatBox.show();
                    blocks.facePanel.hide();
                    blocks.imgBox.hide();
                    break;
                case 4:
                    blocks.header.hide();
                    blocks.backToLive.hide();
                    blocks.floatBox.show();
                    blocks.facePanel.hide();
                    blocks.imgBox.show();
                    break;
            }
        }
    },
    /**
     * 视频控制
     */
    video : {
        initPlayer : false,//播放器是否初始化
        playerType :  '',  //播放器类别: video、sewise
        videoType : '',    //视频类别: mp4、m3u8...
        studioType : '',   //直播类别: studio、yy、oneTV
        liveUrl : "http://ct.phgsa.cn:1935/live/01/playlist.m3u8", //yy直播URL
        $panel : null,     //播放器容器
        backToLivePos : {  //返回直播按钮位置
            x : 0,
            y : 0
        },
        waveAudio:$('#voiceWaveAudio'),//音频audio对象
        /**
         * 初始化
         */
        init : function(){
            if(navigator.userAgent.match(/Android/i)||(navigator.userAgent.indexOf('iPhone') != -1) || (navigator.userAgent.indexOf('iPod') != -1) || (navigator.userAgent.indexOf('iPad') != -1)){
                this.playerType = 'video';
            }else{
                this.playerType = 'sewise';
            }
            var yyDom=$(".videopart input:first"),yc=yyDom.attr("yc"),mc=yyDom.attr("mc");
            this.$panel = $("#tVideoDiv");
            this.$panel.css({'z-index':"inherit"}).height($(".videopart").width()*0.55);
            this.setEvent();
            makeVideoPlayableInline(this.waveAudio[0]);
        },
        /**
         * 启动，只能选择播放
         */
        start : function(isBack, isAudio){
            var course=common.getSyllabusPlan(roomJS.syllabusData,roomJS.serverTime, isAudio);
             if(!course||course.isNext||(course.courseType!=0 && common.isBlank(course.studioLink))||course.courseType==2||course.courseType==0){
                if(isBack){
                	studioMbPop.showMessage("目前还没有视频直播，详情请留意直播间的课程安排！");
                    return;
                }else if(course && !course.isNext && course.courseType==0){
                	$(".videopart").hide().css({height:"0"});
                }else{
                	this.playMp4Vd();
                }
            }else{
                 if(isAudio){
                     this.change(true);
                     this.studioType = "yy";
                     this.voiceWave(false, course.studioLink, course.title);
                 }else{
                     this.change(false);
                     this.play("yy", "", course.studioLink, "");
                 }
            }
            roomJS.setHeight();
        },
        /**
         * 视频音频切换
         * @param isAudio
         * @param isStudio
         */
        change : function(isAudio, isStudio){
            if(isAudio){
                this.doPause();
                $('#waveDiv').removeClass('dn');
                $('#tVideoDiv').addClass('dn');
                if(!isStudio){
                    $("#backToLive").removeClass('video').html('<span>视频<br />直播</span>');
                }
            }else{
                this.voiceWave(false);
                $('#waveDiv').addClass('dn');
                $('#tVideoDiv').removeClass('dn');
                if(!isStudio) {
                    $("#backToLive").addClass('video').html('<span>音频<br />直播</span>');
                }
            }
        },
        /**
         *随机播放MP4视频
         */
        playMp4Vd:function(){
            if($("#studioTeachId a[class=on]").length<=0){
                var mpDom=$("#videosTab li a");
                var vdom=$(mpDom.get(common.randomIndex(mpDom.length)));
                vdom.click();
            }
        },
        /**
         * 播放
         * @param studioType "studio"-教学视频 "yy"-yy直播
         * @param videoType "mp4"-MP4视频 ""-未知,yy直播的视频类型
         * @param url
         * @param title
         */
        play : function(studioType, videoType, url, title){
            this.studioType = studioType;
            var backToLive = $("#backToLive");
            if($(".videopart").is(":hidden")){
                $(".videopart").show().css({height:"auto"});
                roomJS.setHeight();
            }
            if(studioType != "studio"){
                $("#videosTab li a.on").removeClass("on");
            }
            if(this.playerType == 'video'){
                if(this.initPlayer) {
                    var loc_item = this.$panel.find("video");
                    loc_item[0].pause();
                    loc_item.attr("src", url);
                    loc_item[0].play();
                }else {
                    var bf=$("body").attr("fp"), isOnlyMb=('webui'!=bf && 'app'!=bf);
                    this.$panel.append('<video src="' + url + '" webkit-playsinline controls="true" autoplay="'+isOnlyMb+'" style="width: 100%; height: 100%; background-color: rgb(0, 0, 0);"></video>');
                    var vDom=this.$panel.find("video");
                    /*makeVideoPlayableInline(vDom.get(0));*/
                    if(!isOnlyMb){
                        vDom.trigger("pause");
                    }
                    this.initPlayer = true;
                    this.setEventAd();
                }
            }else{
                if(this.initPlayer){
                    SewisePlayer.toPlay(url, title, 0, true);
                    this.videoType = videoType;
                }else{
                    var srcPathAr=[];
                    srcPathAr.push("/base/lib/sewise.player.min.js?server=vod");
                    srcPathAr.push("type="+videoType);
                    srcPathAr.push("videourl="+url);
                    srcPathAr.push("autostart=true");
                    srcPathAr.push("logo=");
                    srcPathAr.push("title="+title);
                    srcPathAr.push("buffer=5");
                    var srcPath =srcPathAr.join("&") ;
                    var script = document.createElement('script');
                    script.type = "text/javascript";
                    script.src = srcPath;
                    this.initPlayer = true;
                    this.videoType = videoType;
                    this.$panel.get(0).appendChild(script);
                    this.setEventAd();
                }
            }
        },
        /**
         * 设置事件
         */
        setEvent : function(){
            /**
             * 视频广告，重播
             */
            $(".ctrlblock div.replay a").bind("click", function(){
                var loc_nextDom = $("#videosTab li a.on");
                loc_nextDom.trigger("click");
            });

            /**
             * 视频广告，下一集
             */
            $(".ctrlblock div.nextbtn a").bind("click", function(){
                var loc_items = $("#videosTab li a");
                for(var i = 0, lenI = loc_items.size(); i < lenI; i++){
                    if(loc_items.eq(i).is(".on")){
                        loc_items.eq(i < lenI - 1 ? i + 1 : 0).trigger("click");
                        break;
                    }
                }
            });

            /**
             * 返回直播初始位置
             */
            $('#backToLive').css({
                left:function(){
                    return $(window).width() - $(this).width() - 10;
                },
                top:function(){
                    return $(window).height() - $('#header').height() - 70;
                }
            });

            /**
             * 返回直播拖动控制
             */
            var rangeControl = function(num,max){
                num = Math.max(num,10);//10代表可拖放范围的边距
                return Math.min(num,max-10);
            };

            /**
             * 返回直播
             */
            util.toucher($("#backToLive")[0])
                .on('singleTap',function(){
                    //点击返回直播
                    roomJS.socket.emit('serverTime');
                    //优化手机锁屏对定时器的影响，锁屏后serverTime将停止更新。（微信测试）
                    window.setTimeout(function(){
                        var isAudio = $("#backToLive").is('.video');
                        isAudio = roomJS.video.studioType == 'studio' ? !isAudio : isAudio;
                        roomJS.video.start(true, isAudio);
                    }, 1000);
                })
                .on('swipeStart',function(){
                    roomJS.video.backToLivePos.x = parseInt(this.style.left) || 0;
                    roomJS.video.backToLivePos.y = parseInt(this.style.top) || 0;
                    $(this).addClass("blue");
                }).on('swipe',function(e){
                    this.style.left = rangeControl(roomJS.video.backToLivePos.x + e.moveX, $(window).width() - this.clientWidth) + 'px';
                    this.style.top = rangeControl(roomJS.video.backToLivePos.y + e.moveY, $(window).height() - this.clientHeight) + 'px';
                    return false;
                }).on('swipeEnd',function(){
                    $(this).removeClass("blue");
                    return false;
                });
            /*音频图片显示隐藏*/
            $('#waveDiv .voice_ctrl .togglebtn').click(function(){
                var $this=$(this),$wave = $('#waveDiv .voice_wave');
                if($wave.hasClass('dn')){
                    $this.removeClass('hiding');
                    $wave.removeClass('dn');
                }else{
                    $this.addClass('hiding');
                    $wave.addClass('dn');
                }
                roomJS.setHeight();
            });
            /*音频播放停止按钮事件*/
            $('#waveDiv .voice_ctrl .playbtn').click(function(){
                roomJS.video.voiceWave($('#waveDiv').is(".stopped"));
            });

            $('#waveDiv .voice_playbtn').click(function(){
                roomJS.video.voiceWave(true);
            });
        },
        /**
         * 设置视频控制块事件
         */
        setEventAd : function(){
            if(this.playerType == "sewise"){
                //轮播控制
                var checkOverFunc = function(){
                    if(!window.SewisePlayer){
                        window.setTimeout(checkOverFunc, 500);
                        return;
                    }
                    SewisePlayer.onPause(function(){
                        if(roomJS.video.studioType == "studio"){
                            window.setTimeout(function(){
                                if(SewisePlayer.duration() <= SewisePlayer.playTime()) {
                                    $(".ctrlblock").show();
                                }
                            }, 1000);
                        }
                    });
                    SewisePlayer.onStart(function(){
                        $(".ctrlblock").hide();
                    });
                };
                checkOverFunc();
            }else if(this.playerType == "video"){
                var loc_item = this.$panel.find("video");
                loc_item.bind("ended", function(){
                    if(roomJS.video.studioType == "studio"){
                        $(".ctrlblock").show();
                    }
                }).bind("loadstart", function(){
                    $(".ctrlblock").hide();
                });
            }
        },
        /**
         * 外部控制视频播放
         */
        doPlay:function(){
            if(this.playerType == 'video') {
                this.$panel.find("video").trigger("play");
            }else if(this.playerType == "sewise" && window.SewisePlayer){
                SewisePlayer.doPlay();
            }
        },
        /**
         * 外部控制视频暂停
         */
        doPause:function(){
            if(this.playerType == 'video') {
                this.$panel.find("video").trigger("pause");
            }else if(this.playerType == "sewise" && window.SewisePlayer){
                SewisePlayer.doPause();
            }
        },
        /**
         * 外部控制视频全屏
         */
        doFullscreen:function(){
            if(this.playerType == 'video') {
                var videoDom = this.$panel.find("video")[0];
                if(videoDom){
                    if(videoDom.requestFullscreen) {
                        videoDom.requestFullscreen();
                    } else if(videoDom.mozRequestFullScreen) {
                        videoDom.mozRequestFullScreen();
                    } else if(videoDom.msRequestFullscreen){
                        videoDom.msRequestFullscreen();
                    } else if(videoDom.oRequestFullscreen){
                        videoDom.oRequestFullscreen();
                    } else if(videoDom.webkitRequestFullscreen){
                        videoDom.webkitRequestFullScreen();
                    }
                }
            }
        },
        /**
         * 外部控制视频退出全屏
         */
        doExitFullscreen:function(){
            if(this.playerType == 'video') {
                var videoDom = this.$panel.find("video")[0];
                if(videoDom){
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if(document.oRequestFullscreen){
                        document.oCancelFullScreen();
                    }else if (document.webkitExitFullscreen){
                        document.webkitExitFullscreen();
                    }
                }
            }
        },
        /**
         * 音频播放停止事件
         */
        voiceWave:function(doPlay, voiceUrl, title){
            var imgIdx;
            if(common.isValid(voiceUrl)){
                imgIdx = common.randomIndex(5);
                $('#waveImg').attr("idx", imgIdx);
                roomJS.video.waveAudio.attr('src',voiceUrl);
            }
            if(common.isValid(title)){
                $('#waveDiv .voice_ctrl .tit span').text(title);
            }
            imgIdx = imgIdx || $('#waveImg').attr("idx") || "1";
            if(doPlay) {
                $('#waveDiv').removeClass('stopped');
                $('#waveImg').attr('src','/hx/theme2/img/wave' + imgIdx + '.gif');
                roomJS.video.waveAudio.trigger("play");
            }else{
                $('#waveDiv').addClass('stopped');
                $('#waveImg').attr('src','/hx/theme2/img/wave' + imgIdx + '.jpg');
                roomJS.video.waveAudio.trigger("pause");
            }
        }
    },
    /**
     * 表情控制
     */
    face:{
        initFace : false,

        /**
         * 初始化
         */
        init : function($panel, $assign, path, disabled){
            if(this.initFace){
                return;
            }
            this.build($panel, path);

            /**表情分页滑动*/
            new Swiper($panel, {
                pagination: '.swiper-pagination',
                paginationClickable: true
            });

            /**
             * 表情选择事件
             */
            $panel.find("img").bind("click", {
                panel : $panel,
                assign : $assign,
                disabled : disabled
            }, function(e){
                if(!e.data.disabled){
                    e.data.assign.append($(this).clone()).trigger("input");
                }
            });
            this.initFace = true;
        },
        /**
         * 构建表情
         * @param $panel
         * @param path
         */
        build : function($panel, path){
            var loc_face = [];
            var step = 7;
            for(var i = 1; i <= 75; i+=21){
                loc_face.push('<div class="swiper-slide"><table border="0" cellspacing="0" cellpadding="0">');
                for(var j = i, lenJ = Math.min(i + 20, 75); j <= lenJ; j++){
                    if(j % step == 1){
                        loc_face.push('<tr>');
                    }
                    loc_face.push('<td><img src="' + path + j + '.gif"/></td>');
                    if(j % step == 0 || j == lenJ){
                        loc_face.push('</tr>');
                    }
                }
                loc_face.push('</table></div>');
            }
            $panel.find("div.face").html(loc_face.join(""));
            //$(window).trigger("resize");
        }
    },
    /**
     * 设置聊天列表滚动条
     */
    setTalkListScroll:function(){
        $("#talkPanel").scrollTop($('#talkPanel')[0].scrollHeight);
    },
    /**
     * 提取uiId,用于标记记录的id，信息发送成功后取发布日期代替
     */
    getUiId:function(){
        var currentDate=new Date();
        return currentDate.getTime()+"_ms";
    },
    /**
     * 文档信息(视频,公告,直播安排
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
            var query = {
                code: code,
                platform: platform,
                hasContent: hasContent,
                pageNo: curPageNo,
                pageSize: pageSize,
                orderByStr: orderByStr
            };
            if(authorId){
                query.authorId = common.trim(authorId);
            }
            $.getJSON('/hxstudio/getArticleList',query,function(data){
                //console.log("getArticleList->data:"+JSON.stringify(data));
                callback(data);
            });
        }catch (e){
            console.error("getArticleList->"+e);
            callback(null);
        }
    },
    /**
     * 设置老师观点
     */
    setTradeArticle : function(){
        studioMbPop.loadingBlock($("#TradeArticleTab"));
        roomJS.getArticleList("trade_strategy_article",roomJS.userInfo.groupId,1,1,1,'{"createDate":"desc"}',null,function(dataList){
            var loc_panel = $("#TradeArticleTab ul:first");
            var loc_html = [];
            if(dataList && dataList.result==0){
                var data=dataList.data;
                if(data && data.length > 0){
                    var detail = null;
                    var author = null;
                    for(var i = 0, lenI = data.length; i < lenI; i++){
                        detail = data[i].detailList[0];
                        author = detail.authorInfo || {};
                        loc_html.push('<li>');
                        loc_html.push('<div class="himg"><img src="' + (author.avatar || "") + '"></div>');
                        loc_html.push('<div class="detail">');
                        loc_html.push('<h3>' + detail.title + '</h3>');
                        loc_html.push('<div class="subinfo">');
                        loc_html.push('<span>' + (author.name || "") + '</span>');
                        loc_html.push('<span>' + (data[i].publishStartDate ? common.longMsTimeToDateTime(data[i].publishStartDate) : "") + '</span>');
                        loc_html.push('</div>');
                        loc_html.push('<p>' + detail.content + '</p>');
                        loc_html.push('</div>');
                    }
                }
            }
            loc_panel.html(loc_html.join(""));
            $("#TradeArticleTab .detail p span").attr("style","");//去掉后台编辑框样式
            studioMbPop.loadingBlock($("#TradeArticleTab"), true);
        });
    },
    /**
     * 显示过滤的聊天记录
     * @param t
     */
    showViewSelect:function(t){
        var loc_panel = $("#dialog_list");
        if(t=='analyst'){
            loc_panel.children("[utype!=2]").hide();
            loc_panel.children("[utype=2]").show();
        }else if(t=='me'){
            loc_panel.children("[isme='false']").hide();
            loc_panel.children("[isme='true']").show();
        }else{
            loc_panel.children().show();
        }
        roomJS.setTalkListScroll();
    },
    /**
     * 过滤发送消息：过滤一些特殊字符等。
     * 如果返回值为false,则终止发送消息。
     */
    getSendMsg : function(dom){
        dom = dom || $("#contentText");
        //校验聊天内容长度
        if(dom.text().length + dom.find("img").size() > 140){
            studioMbPop.showMessage("消息内容超过最大长度限制（140字以内）！");
            return false;
        }

        var msg = dom.html();
        msg =common.clearMsgHtml(msg);
        if(common.isBlank(msg)){
            dom.html("");
            return false;
        }
        if(dom.find(".txt_dia").length>0){
            dom.find(".txt_dia").remove();
            msg=dom.html();
            msg=msg.replace(/^(&nbsp;){1,2}/, "");
        }
        return msg;
    },
    /**
     * 提取@对话html
     */
    getToUser:function(){
      var curDom=$('#contentText .txt_dia');
      if(curDom.length>0){
          return {userId:curDom.attr("uid"),nickname:curDom.find("label").text(),talkStyle:0,userType:curDom.attr("utype"),avatar:curDom.attr("avatar")};
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
     * @param talkStyle 聊天方式（0对话，1私聊）
     * @param userType 用户类别(0客户；1管理员；2分析师；3客服）
     * @param [avatar]
     */
    setDialog:function(userId,nickname,talkStyle,userType,avatar){
        if(!roomJS.visitorSpeak && "visitor"==roomJS.userInfo.clientGroup){
            return;
        }
        $("#contentText .txt_dia").remove();
        $("#contentText").html($("#contentText").html().replace(/^((&nbsp;)+)/g,''));
        $("#contentText").prepend('&nbsp;<span class="txt_dia" contenteditable="false" uid="'+userId+'" utype="'+userType+'" avatar="'+avatar+'">@<label>'+nickname+'</label></span>&nbsp;').focusEnd();
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
        if(data.isVisitor){
            $("#"+data.uiId).remove();
            return;
        }
        if(isLoadData && $("#"+fromUser.publishTime).length>0){
            $("#"+fromUser.publishTime+" .dialog em[class=ruleTipStyle]").remove();
            $("#"+fromUser.publishTime+" input").remove();
            return;
        }
        if(data.rule){
            if(data.value && data.value.needApproval){
                $('#'+data.uiId).attr("id",fromUser.publishTime);
            }else{
                roomJS.removeLoadDom(data.uiId);//去掉加载框
                $('#'+data.uiId+' .dialog').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            }
            return;
        }
        if(!isMeSend && roomJS.userInfo.userId==fromUser.userId && data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
            $('#'+data.uiId+' .uname span').html(roomJS.formatPublishTime(fromUser.publishTime));
            $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
            if(data.content.msgType==roomJS.msgType.img){
                roomJS.removeLoadDom(fromUser.publishTime);//去掉加载框
                var aObj=$('#'+fromUser.publishTime+' span[contt="a"]>a');
                var url=data.content.needMax?'/hxstudio/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId:aObj.children("img").attr("src");
                aObj.attr("href",url);
            }
            return;
        }
        var dialog=roomJS.formatContentHtml(data,isMeSend,isLoadData, false);
        var list=$("#dialog_list");
        var talkPanel = $("#talkPanel");
        //如果本身就在最底端显示，则自动滚动，否则不滚动
        var isScroll = talkPanel.scrollTop() + talkPanel.height() + 30 >= talkPanel.get(0).scrollHeight;
        list.append(dialog);
        if(isScroll && !isLoadData){
            roomJS.setTalkListScroll();
        }
        this.formatMsgToLink(fromUser.publishTime);//格式链接
        var vst=$('#talkBoxTab .view_select .selectlist a[class=on]').attr("t");//按右上角下拉框过滤内容
        if(vst!='all'){
            roomJS.showViewSelect(vst);
        }
        //对话、私聊事件
        $('#' + fromUser.publishTime + ' .c-menu a').click(function(){
            var tp=$(this).parents(".c-menu");
            roomJS.setDialog(tp.attr("uid"),tp.attr("nk"),$(this).attr("t"),tp.attr("utype"));//设置对话
        });
        //对话事件
        $('#'+fromUser.publishTime+' .headimg').click(function(){
            $('#' + fromUser.publishTime + ' .c-menu a[t=0]').trigger("click");
        });
        $('#' + fromUser.publishTime + ' .txt_dia').click(function () {
            roomJS.setDialog($(this).attr("uid"),$(this).find("label").text(),0,$(this).attr("utype"));
        });
        //昵称点击
        $('#'+fromUser.publishTime+' .uname').click(function(){
            $('#' + fromUser.publishTime + ' .c-menu a[t=0]').trigger("click");
        });
    },
    /**
     * 格式内容栏
     */
    formatContentHtml:function(data,isMeSend,isLoadData, isWh){
        var cls='clearfix ',dialog='',isMe='false', csId='',
            fromUser=data.fromUser,
            content=data.content,
            nickname=fromUser.nickname;
        var toUser=fromUser.toUser,pHtml=[],msgVal,
            loadHtml='';

        if(roomJS.userInfo.userId==fromUser.userId){
            if(isMeSend){//发送，并检查状态
                fromUser.publishTime=data.uiId;
                loadHtml='<em class="img-loading"></em><span class="shadow-box"></span><s class="shadow-conut"></s>';
            }
        }
        if(content.msgType==roomJS.msgType.img){
            var lightboxArg = isWh ? "whimg-" + fromUser.userId : "dialog-img";
            if(content.needMax){
                msgVal='<a href="/hxstudio/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId+'" data-lightbox="' + lightboxArg + '"><img src="'+content.value+'" alt="图片"/></a>';
            }else{
                msgVal='<a href="'+content.value+'" data-lightbox="' + lightboxArg + '"><img src="'+content.value+'" alt="图片" /></a>';
            }
            msgVal = '<span contt="a">' + msgVal + '</span>' +loadHtml;
        }else{
            msgVal = '<span contt="a">' + content.value + '</span>';
        }
        if(toUser && common.isValid(toUser.userId)){
            if(isWh){
                pHtml.push(msgVal);
            }else if(common.isValid(toUser.question)){//对话模式
                pHtml.push('<p class="question"><em>');
                pHtml.push('<strong class="asker" uid="'+toUser.userId+'" utype="'+toUser.userType+'">'+toUser.nickname+'</strong>');
                pHtml.push('提问：</em>');
                pHtml.push('<span contt="q">' + toUser.question + '</span>');
                pHtml.push('</p>');
                pHtml.push('<p class="reply"><span>回复：</span>');
                pHtml.push(msgVal);
                pHtml.push('</p>');
            }else{
                pHtml.push('<span class="txt_dia" uid="'+toUser.userId+'" utype="'+toUser.userType+'">');
                pHtml.push('@<label>'+toUser.nickname+'</label>');
                pHtml.push('</span>');
                pHtml.push(msgVal);
            }
            if(roomJS.userInfo.userId==toUser.userId){
                isMe='true';
            }
        }else{
            pHtml.push(msgVal);
        }
        if(roomJS.userInfo.userId==fromUser.userId){
            cls+='me-li';
            nickname='我';
            isMe='true';
            if(isWh && toUser){
                csId = " csid=" + toUser.userId;
            }
        }else{
            if(fromUser.userType==3){
                nickname += "&nbsp;（助理）";
                cls+='admin';
            }else if(fromUser.userType==2){
                cls+='analyst';
            }else if(fromUser.userType==1){
                cls+='admin';
            }
            if(isWh){
                csId = " csid=" + fromUser.userId;
            }
            dialog=isWh ? "" : roomJS.getDialogHtml(fromUser.userId,nickname,fromUser.userType);
            if(!isLoadData && toUser){
                if(roomJS.userInfo.userId==toUser.userId && !isWh){
                    $("#top_msg label").html(fromUser.nickname+':@'+toUser.nickname)
                        .attr("tId",toUser.userId)
                        .attr("fuType",fromUser.userType)
                        .attr("fnickname",fromUser.nickname)
                        .attr("fuserId",fromUser.userId);
                    $("#top_msg span").html(content.value);
                    $("#top_msg").slideDown();
                }
            }
        }
        var loc_html = [];
        loc_html.push('<li class="'+cls+'" id="'+fromUser.publishTime+'" isme="'+isMe+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" t="header"' + csId + '>');
        loc_html.push('<div class="headimg" uid="'+fromUser.userId+'">');
        loc_html.push(roomJS.getUserAImgCls(fromUser.userId, fromUser.clientGroup,fromUser.userType,fromUser.avatar));
        loc_html.push('</div>');
        loc_html.push('<div class="detail">');
        loc_html.push('<span class="uname">');
        if(roomJS.userInfo.userId==fromUser.userId){
            loc_html.push('<span>' + roomJS.formatPublishTime(fromUser.publishTime) + '</span>');
            loc_html.push('<strong>' + nickname + '</strong>');
        }else{
            loc_html.push('<strong>' + nickname + '</strong>');
            loc_html.push('<span>' + roomJS.formatPublishTime(fromUser.publishTime) + '</span>');
        }
        loc_html.push('</span>');
        loc_html.push('<div class="dialog">' + pHtml.join("") + '</div>');
        loc_html.push('</div>');
        loc_html.push(dialog);
        loc_html.push('</li>');
        return loc_html.join("");
    },
    /**
     * 格式链接
     * @param ptime
     */
    formatMsgToLink:function(ptime){
        $('#'+ptime+' span[contt]:contains("http:"),#'+ptime+' span[contt]:contains("https:")').each(function (index,el){
            var elHtml=$(el).html(),elArr=elHtml.split(/<img[^>]*>|<a[^>]*>.*?<\/a>/g);
            var linkTxt;
            for(var i in elArr){
                linkTxt=elArr[i];
                if(common.isBlank(linkTxt)){
                    continue;
                }
                var newTest=linkTxt.replace(/(http:\/\/|https:\/\/)((\w|=|\?|\.|\/|\\&|-)+)(:\d+)?(\/|\S)+/g,function(m){
                    return '<a href="'+m+'" target="_blank">'+m+'</a>';
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
     * @param userId
     * @param clientGroup
     * @param userType
     * @param avatar
     * @returns {string}
     */
    getUserAImgCls:function(userId, clientGroup,userType,avatar){
        var aImgCls='';
        if(common.isValid(avatar)){
            return '<img src="'+avatar+'">';
        }else if("vip"==clientGroup){
            aImgCls="user_v";
        }else if("active"==clientGroup){
            var idTmp = 0;
            if(userId && userId.length > 0){
                idTmp += (userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1));
            }
            idTmp = (idTmp + 15) % 45;
            return '<img src="' + roomJS.filePath + '/upload/pic/header/chat/visitor/' + idTmp + '.png">';
        }else if("notActive"==clientGroup){
            aImgCls="user_r";
        }else if("simulate"==clientGroup){
            aImgCls="user_d";
        }else if("register"==clientGroup){
            aImgCls="user_m";
        }else if("visitor"==clientGroup || userType == -1){
            userId = userId || "";
            var idTmp = parseInt(userId.substring(userId.length - 2), 10);
            if(isNaN(idTmp)){
                idTmp = 100;
            }
            idTmp = (idTmp + 17) % 45;
            return '<img src="' + roomJS.filePath + '/upload/pic/header/chat/visitor/' + idTmp + '.png">';
        }else{
            aImgCls="cm";
        }
        return '<img src="/hx/theme2/img/'+aImgCls+'.png">';
    },
    /**
     * 离开房间提示
     */
    leaveRoomTip:function(flag){
        if(flag=="roomClose"){
            studioMbPop.showMessage("注意：房间已停用，正自动登出...");
            if("visitor"==roomJS.userInfo.clientGroup){
                window.setTimeout(function(){//3秒钟后登出
                    studioMbPop.reload();
                },2000);
            }else{
                window.setTimeout(function(){//3秒钟后登出
                    LoginAuto.setAutoLogin(false);
                    window.location.href="/hxstudio/logout";
                },2000);
            }
        }else if(flag=="otherLogin"){
            if("visitor"==roomJS.userInfo.clientGroup){
                return;
            }
            roomJS.socket.disconnect();
            studioMbPop.popBox("msg", {
                msg : "由于您打开了多个直播室页面，造成重复登录，下线后请重新登录",
                type : "logout"
            });
        }
    },
    /**
     * 提取对话html
     * @param userId
     * @param nickname
     * @param userType
     * @returns {string}
     */
    getDialogHtml:function(userId,nickname,userType){
        if(roomJS.userInfo.userId!=userId){
            var hasMainDiv=false,gIdDom=$("#studioListId a[class~=ing]"),mainDiv='<div class="c-menu" style="display:none;" nk="'+nickname+'" uid="'+userId+'" utype="'+userType+'">';
            mainDiv += "<ul>";
            if(roomJS.visitorSpeak || (roomJS.userInfo.userId.indexOf('visitor_')==-1 && userId && userId.indexOf('visitor_')==-1)){
                mainDiv+='<li><a href="javascript:void(0)" t="0"><i></i>@TA</a></li>';
                hasMainDiv=true;
            }
            if(gIdDom.attr("aw")=="true"&& common.containSplitStr(gIdDom.attr("awr"),userType)){
                mainDiv+='<li><a href="javascript:void(0)" t="1"><i></i>私信</a></li>';
                hasMainDiv=true;
            }
            mainDiv += "</ul>";
            return hasMainDiv?mainDiv+"</div>":'';
        }else{
            return '';
        }
    },
    /**
     * 格式化用户信息
     * @param row
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
            position:row.position
        };
        if(isWh){
            fromUser.toWhUserId=toWhUserId;
            roomJS.whTalk.receiveMsg({fromUser: fromUser,content:row.content},false,true);
        }else{
            roomJS.setContent({fromUser: fromUser,content:row.content},false,true);
        }
    },
    /**
     * 将消息显示在公聊框
     * @param info
     */
    showTalkPushMsg : function(info){
        var html = [];
        html.push('<li class="clearfix push">');
        if(info.content.indexOf('img') > -1){
            var imgSrc = $(info.content).find('img').attr('src');
            html.push('<a href="'+imgSrc+'" data-lightbox="dialog-img">');
            html.push('<p><img src="'+imgSrc+'" style="width:90%;height:auto;" /></p>');
            html.push('</a>');
        }else {
            html.push(info.content);
        }
        html.push('</div>');
        var talkPanel = $("#talkPanel");
        var isScroll = talkPanel.scrollTop() + talkPanel.height() + 30 >= talkPanel.get(0).scrollHeight;
        $("#dialog_list").append(html.join(""));
        var img=$("#dialog_list").find(".dialog.push img");
        if(img.length>0){
            img.width("100%");
            img.height("auto");
        }
        if(isScroll){
            roomJS.setTalkListScroll();
        }
    },

    /**
     * 浏览器状态
     */
    browserState : {
        /**浏览器属性信息*/
        hiddenProperty : "hidden",
        visibilityStateProperty : "visibilityState",
        visibilityEvent : "visibilitychange",

        /**获取浏览器前缀*/
        getBrowserPrefix : function() {
            if ('hidden' in document) {
                return null;
            }
            var browserPrefixes = ['moz', 'ms', 'o', 'webkit'];
            for (var i = 0; i < browserPrefixes.length; i++) {
                var prefix = browserPrefixes[i] + 'Hidden';
                if (prefix in document) {
                    return browserPrefixes[i];
                }
            }
            return null;
        },

        /**初始化*/
        initBrowserState : function(){
            var prefix = this.getBrowserPrefix();
            if(prefix){
                this.hiddenProperty = prefix + "Hidden";
                this.visibilityStateProperty = prefix + "VisibilityState";
                this.visibilityEvent = prefix + "visibilitychange";
            }else{
                this.hiddenProperty = "hidden";
                this.visibilityStateProperty = "visibilityState";
                this.visibilityEvent = "visibilitychange";
            }

            this.setBrowserStateEvent();
        },

        /**设置浏览器状态事件*/
        setBrowserStateEvent : function(){
            document.addEventListener(this.visibilityEvent, function(){
                if(document[roomJS.browserState.visibilityStateProperty] === "visible"){
                    roomJS.socket.emit('serverTime');
                }
            })
        }
    },

    /**
     * 私聊
     */
    whTalk : {
        enable : false,   //是否允许私聊
        status : 0,       //状态
        tabCheck : false, //当前是否选中私聊tab
        CSMap : {},       //老师助理列表
        currCS : null,    //当前私聊老师助理
        msgCnt : 0,       //未读消息数
        pushObj : null,   //私聊推送信息
        askMsgObj : null,
        viewSelect : false, //老师助理下拉是否选中

        /**
         * 初始化私聊
         */
        initWH : function(){
            this.enable = $("#currStudioInfo").attr("aw") == "true";
            this.refreshTips();

            /*在线客服下拉框*/
            $('#whTalkBoxTab .view_select').click(function() {
                var loc_this = $(this);
                if(loc_this.is(".dw")){
                    loc_this.removeClass("dw");
                    roomJS.whTalk.viewSelect = false;
                }else{
                    loc_this.addClass("dw");
                    roomJS.whTalk.viewSelect = true;
                }
            }).find(".selectlist a").live("click", function(){
                if(!$(this).is(".on")){
                    var userId = $(this).attr("uid");
                    roomJS.whTalk.setCurrCS({userId : userId});
                }
            });
        },

        /**
         * 私聊开关-标识当前是否选中了老师助理tab
         * @param isOpen
         */
        whSwitch : function(isOpen){
            if(isOpen){
                this.tabCheck = true;
                this.msgCnt = 0;
                this.refreshTips();
                this.setWHTalkListScroll();
                this.pushMsg();
            }else{
                this.tabCheck = false;
            }
        },

        /**
         * 加载私聊信息
         */
        loadMsg : function(csId){
            if(!this.CSMap.hasOwnProperty(csId) || this.CSMap[csId].load){
                return;
            }
            var csTmp = this.CSMap[csId];
            csTmp.load = true;
            //加载私聊信息
            roomJS.socket.emit("getWhMsg",{
                clientStoreId:roomJS.userInfo.clientStoreId,
                userType:roomJS.userInfo.userType,
                groupId:roomJS.userInfo.groupId,
                groupType:roomJS.userInfo.groupType,
                userId:roomJS.userInfo.userId,
                toUser:{userId:csTmp.userNo,userType:csTmp.userType}});
        },

        /**
         * 设置当前老师助理
         * @param userInfo
         */
        setCurrCS : function(userInfo) {
            var result = null;
            if (userInfo && userInfo.userId) {
                if(this.CSMap.hasOwnProperty(userInfo.userId)){
                    result = this.CSMap[userInfo.userId];
                }else{
                    result = {
                        userNo: userInfo.userId,
                        userName: userInfo.userName || userInfo.nickname,
                        online: true,
                        load: false,
                        userType: userInfo.userType,
                        avatar : userInfo.avatar
                    };
                    this.CSMap[userInfo.userId] = result;
                }
            }else{
                //随机选择一个，在线老师助理的优先
                var csTmp = null;
                for (var csId in this.CSMap) {
                    csTmp = this.CSMap[csId];
                    if(!result
                        ||(result.userType != 3 && csTmp.userType == 3)
                        ||(result.userType == csTmp.userType && !result.online && csTmp.online))
                    {
                        result = csTmp;
                    }
                }
            }
            if(!result){
                return null;
            }
            if(!result.load){
                this.loadMsg(result.userNo);
            }
            if(result.userNo){
                this.currCS = result;
                //设置下拉列表框
                var csPanel = $("#whTalkBoxTab .view_select");
                var csDom = csPanel.find("a[uid=" + this.currCS.userNo + "]");
                csPanel.find('.selectlist a').removeClass("on");
                if(csDom.size() == 0){
                    csPanel.find(".selectlist").append('<a href="javascript:void(0)" class="on" uid="' + this.currCS.userNo + '">' + this.currCS.userName + '</a>');
                    csPanel.find('.selected').text(this.currCS.userName);
                }else{
                    csDom.addClass("on");
                    csPanel.find('.selected').text(csDom.text());
                }
                if(csPanel.find(".selectlist a").size() <= 1){
                    csPanel.hide();
                }else{
                    csPanel.show();
                    $("#whDialog_list").children().hide();
                    $("#whDialog_list").children("[csid=" + this.currCS.userNo + "]").show();
                    this.setWHTalkListScroll();
                }
                return result;
            }else{
                return null;
            }
        },

        /**
         * 获取老师助理列表
         */
        getCSList : function(){
            try{
                $.getJSON('/hxstudio/getCS',{groupId:roomJS.userInfo.groupId},function(data){
                    if(data && data.length>0) {
                        var cs, csTmp;
                        for(var i = 0, lenI = data.length; i < lenI; i++){
                            cs = data[i];
                            if(roomJS.whTalk.CSMap.hasOwnProperty(cs.userNo)){
                                csTmp = roomJS.whTalk.CSMap[cs.userNo];
                            }else{
                                csTmp = {online : false};
                                roomJS.whTalk.CSMap[cs.userNo] = csTmp;
                            }
                            csTmp.userNo = cs.userNo;
                            csTmp.userName = cs.userName;
                            csTmp.userType = 3;
                            csTmp.avatar = common.isValid(cs.avatar)?cs.avatar:'/hx/theme2/img/cm.png';
                            csTmp.load = false;
                        }
                    }
                });
            }catch (e){
                console.error("getCSList->"+e);
            }
        },

        /**
         * 设置客服在线状态
         */
        setCSOnline : function(csId, isOnline){
            var csTmp = null;
            if(this.CSMap.hasOwnProperty(csId)){
                csTmp = this.CSMap[csId];
            }else{
                csTmp = {};
                this.CSMap[csId] = csTmp;
            }
            csTmp.online = isOnline;
        },

        /**
         * 显示消息数量
         */
        refreshTips : function(){
            if(roomJS.whTalk.msgCnt > 0){
                $(".wh_tips").text(roomJS.whTalk.msgCnt).show();
            }else{
                $(".wh_tips").hide();
            }
        },

        /**
         * 设置聊天列表滚动条
         */
        setWHTalkListScroll:function(){
            $("#whTalkPanel").scrollTop($('#whTalkPanel')[0].scrollHeight);
        },

        /**
         * 接收消息
         */
        receiveMsg : function(data,isMeSend,isLoadData){
            var fromUser=data.fromUser;
            if(isMeSend){//发送，并检查状态
                fromUser.publishTime=data.uiId;
            }
            if(data.isVisitor){
                $("#"+data.uiId).remove();
                return;
            }
            if(isLoadData && $("#"+fromUser.publishTime).length>0){
                $("#"+fromUser.publishTime+" .dialog em.ruleTipStyle").remove();
                $("#"+fromUser.publishTime+" input").remove();
                return;
            }
            if(data.rule){
                if(data.value && data.value.needApproval){
                    $('#'+data.uiId).attr("id",fromUser.publishTime);
                }else{
                    $('#'+data.uiId+' .dialog').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
                }
                return;
            }
            if(!isMeSend && roomJS.userInfo.userId==fromUser.userId && data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
                $('#'+data.uiId+' .uname span').html(roomJS.formatPublishTime(fromUser.publishTime));
                $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
                if(data.content.msgType==roomJS.msgType.img){
                    roomJS.removeLoadDom(fromUser.publishTime);//去掉加载框
                    var aObj=$('#'+fromUser.publishTime+' span[contt="a"]>a');
                    var url=data.content.needMax?'/hxstudio/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId:aObj.children("img").attr("src");
                    aObj.attr("href",url);
                }
                return;
            }
            var dialog=roomJS.formatContentHtml(data,isMeSend,isLoadData, true);
            var talkPanel = $("#whTalkPanel");
            //如果本身就在最底端显示，则自动滚动，否则不滚动
            var isScroll = talkPanel.scrollTop() + talkPanel.height() + 30 >= talkPanel.get(0).scrollHeight;
            if(isLoadData){
                $("#whDialog_list").prepend(dialog);
            }else{
                $("#whDialog_list").append(dialog);
            }
            if(isScroll && this.tabCheck){
                roomJS.whTalk.setWHTalkListScroll();
            }
            roomJS.formatMsgToLink(fromUser.publishTime);//格式链接
            //昵称点击
            if(roomJS.userInfo.userId!=fromUser.userId){
                $('#'+fromUser.publishTime+' .uname,#'+fromUser.publishTime+' .headimg').click(function(){
                    var liDom = $(this).parents("li:first");
                    var csInfo = {
                        userId : liDom.find(".headimg").attr("uid"),
                        nickname : liDom.find(".uname strong").text(),
                        userType : liDom.attr("utype"),
                        avatar : liDom.find(".headimg img").attr("src")
                    };
                    roomJS.whTalk.setCurrCS(csInfo);
                });
            }
            //消息数提示
            if(!this.tabCheck && !isLoadData){
                roomJS.whTalk.msgCnt++;
                this.refreshTips();
            }
            //设置当前聊天的老师助理
            if(!isLoadData && roomJS.userInfo.userId!=fromUser.userId){
                this.setCurrCS(fromUser);
            }
            //如果不是加载历史消息记录，则下一次对话不带咨询内容（加载推送私聊消息时，会设定咨询内容，当有新的对话的时候，会清空咨询内容）
            if(!isLoadData){
                this.askMsgObj = null;
            }
            //私聊消息咨询内容
            if(isLoadData && fromUser.toUser && common.isValid(fromUser.toUser.question)){
                var csTmp = this.setCurrCS({userId : fromUser.toUser.userId});
                this.receiveMsg({
                    content : {
                        maxValue : "",
                        msgType : "text",
                        status : 1,
                        value : fromUser.toUser.question
                    },
                    fromUser : {
                        nickname : csTmp.userName,
                        userId : csTmp.userNo,
                        userType : csTmp.userType,
                        avatar : csTmp.avatar,
                        publishTime : fromUser.toUser.publishTime
                    }
                },false,true);
            }
        },

        /**
         * 推送消息
         */
        pushMsg : function(){
            if(!this.currCS){
                this.setCurrCS();
            }
            if(!this.pushObj){
                return;
            }
            if(this.currCS){
                this.receiveMsg({
                    content : {
                        maxValue : "",
                        msgType : "text",
                        status : 1,
                        value : this.pushObj.info
                    },
                    fromUser : {
                        nickname : this.currCS.userName,
                        userId : this.currCS.userNo,
                        userType : this.currCS.userType,
                        avatar : this.currCS.avatar,
                        publishTime : this.pushObj.publishTime
                    }
                },false,false);
                this.askMsgObj = this.pushObj;
                this.pushObj = null;
            }
        },

        /**
         * 发送私聊信息
         * @param sendObj
         */
        sendWhMsg : function(sendObj){
            if(!this.currCS){
                this.setCurrCS();
            }
            if(!this.currCS){
                studioMbPop.showMessage("客服不在线，暂不可私聊！");
                return ;
            }
            sendObj.fromUser.toUser = {
                userId : this.currCS.userNo,
                nickname : this.currCS.nickname,
                talkStyle : 1,
                userType : this.currCS.userType
            };
            if(this.askMsgObj){
                sendObj.fromUser.toUser.question=this.askMsgObj.info;
                sendObj.fromUser.toUser.questionId=this.askMsgObj.infoId;
                sendObj.fromUser.toUser.publishTime=this.askMsgObj.publishTime;
            }
            roomJS.whTalk.receiveMsg(sendObj,true,false);//直接把数据填入内容栏
            if(sendObj.content.msgType!=roomJS.msgType.img) {
                roomJS.socket.emit('sendMsg', sendObj);//发送数据
            }
        }
    },
    /**
     * 清空视频直播及断开socket连接
     */
    disableVideoSocket:function(){
        window.setInterval(function(){
            roomJS.video.voiceWave(false);
            roomJS.video.waveAudio.attr('src','');
            $("#tVideoDiv").empty();
            roomJS.socket.disconnect();
        }, 5000);
    },
    /**
     * 加载推送消息
     */
    setPushInfo:function(){
        var whInfo = null, whInfos = roomJS.pushObj.whInfos;
        if(whInfos && whInfos.length > 0) {
            for(var i = 0, len = whInfos.length; i < len; i++) {
                whInfo = whInfos[i];
                if(whInfo.pushed){
                    continue;
                }
                if(whInfo && roomJS.serverTime >= (whInfo.serverTime + whInfo.timeOut * 60 * 1000)) {
                    whInfo.pushed = true;
                    roomJS.whTalk.pushObj = {info:whInfo.content,publishTime:whInfo.publishTime,infoId:whInfo.contentId};
                    roomJS.whTalk.pushMsg();
                }
            }
        }
        var talkBoxInfo = null, talkBoxInfos = roomJS.pushObj.talkPush;
        if(talkBoxInfos && talkBoxInfos.length > 0){
            for(var i = 0, lenI = talkBoxInfos.length; i < lenI; i++){
                talkBoxInfo = talkBoxInfos[i];
                if(talkBoxInfo && talkBoxInfo.nextTm && roomJS.serverTime >= talkBoxInfo.nextTm && common.dateTimeWeekCheck(talkBoxInfo.pushDate, false, roomJS.serverTime)){
                    if(talkBoxInfo.intervalMin && talkBoxInfo.intervalMin > 0){
                        talkBoxInfo.nextTm = roomJS.serverTime + talkBoxInfo.intervalMin * 60 * 1000;
                    }else{
                        delete talkBoxInfo["nextTm"];
                    }
                    roomJS.showTalkPushMsg(talkBoxInfo);
                }
            }
        }
    }
};