/**
 * 直播间聊天室操作类
 * author Alan.wu
 */
var chat={
    socket:null,//sccket对象
    whPushObj:{},//私聊推送信息
    whTipInterId:null,//私聊提示
    pushInfoTimeOutId:null,//延迟执行的ID
    msgType:{ //信息类型
        text:'text' ,
        img:'img',
        file:'file'
    },
    init:function(){
        this.setEvent();//设置各种事件
        this.setSocket();//设置socket连接
        this.setTalkListScroll(true);
    },
    /**
     * 设置各种事件
     */
    setEvent:function(){
        $(".mod_userlist .titbar span").click(function(){
            $(this).addClass("on").siblings(".on").removeClass("on");
            $(".user_box ul").hide().eq($(this).index()-1).show();
        });
        //初始化表情事件
        if(indexJS.visitorSpeak || !indexJS.checkClientGroup("visitor")){
            $('#msgFaceBtn').qqFace({
                id:'faceId',
                assign:'contentText', //给控件赋值
                path:indexJS.filePath+'/face/'//表情存放的路径
            });
        }
        //点击document,关闭dom
        $(document).click(function(e){
            $('div[id^=faceId]').hide();
            if(!$(e.target).hasClass("inp-bar4") && !$(e.target).parents().hasClass("envelope-reward") && !$(e.target).parents().hasClass('popup_box') && !$(e.target).hasClass('blackbg')) {
                $('.envelope-reward').addClass('dn');
            }
            if(!$(e.target).hasClass("headimg") && !$(e.target).parents().hasClass("headimg") && $(e.target).parent().attr("t")!="header" && !$(e.target).hasClass("uname")&& !$(e.target).parents().hasClass("te_ul")){
                $('.dialogbtn').hide();
            }
        });
        //回复对话
        $(".replybtn").click(function(){
            chat.setDialog($(this).attr("uId"),$(".sender").html(),$(this).attr("ts"),$(this).attr("futype"));//设置对话
            $(".mymsg em").show();
        });
        //关闭对话
        $("#mymsgClose").click(function(){
            $(".mymsg,.mymsg em").hide();//设置对话
        });
        //清屏
        $(".clearbtn").click(function(){
            $("#dialog_list").html("");//设置对话
            chat.setTalkListScroll();
        });
        //滚动设置
        $(".scrollbtn").click(function(){
            if($(this).hasClass("on")){
                $(this).removeClass("on");
            }else{
                $(this).addClass("on");
                chat.setTalkListScroll(true);
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
            chat.showViewSelect($(this).attr("t"));
            chat.setTalkListScroll(true);
        });
        /**
         * contentText键盘事件
         */
        $("#contentText").pastableTextarea().on('pasteImage', function(ev, data){
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
            if(e.keyCode==13){//按回车键发送
                if(common.isValid(val)){
                    $(this).html(val.replace(/<div>|<\/div>/g,""));
                    if($('.ui-autocomplete').is(':hidden')) {//当@提示选择隐藏后按回车才发送消息
                        $("#sendBtn").click();
                    }
                }
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
                    response(chat.searchUserList(request.term.substring(1, request.term.length)));
                    $('.ui-autocomplete').css('z-index','10000000');
                }
            },
            delay: 500,
            minLength:2,
            position: {
                my: "left bottom",
                at: "left top"
            },
            select: function(event,ui) {
                $("#contentText").html("").append('&nbsp;<span class="txt_dia" contenteditable="false" uid="'+ui.item.value+'" utype="'+ui.item.userType+'">@<label>'+ui.item.label+'</label></span>&nbsp;').focusEnd();
                return false;
            }
        }).autocomplete("instance")._renderItem = function(ul, item ) {
            return $("<li>").attr( "data-value", item.label).append("<a>" + item.label +"</a>").appendTo(ul);
        };
        //聊天内容发送事件
        $("#sendBtn").click(function(){
            if(!indexJS.visitorSpeak && indexJS.checkClientGroup("visitor")){
                box.openLgBox();
                return;
            }
            if(indexJS.userInfo.isSetName === false){
                box.openSetNameBox(true);
                return;
            }
            var toUser=chat.getToUser();
            //发送剪切图片
            var imgObj = $("#contentText .text-min-img img");
            if(imgObj.size() > 0){
                var imgData = imgObj.attr("src");
                if(imgData.length > 1024*1024){
                    alert('发送的图片大小不要超过1MB.');
                }else{
                    chat.setUploadImg(imgData, toUser);
                    imgObj.remove();
                }
            }
            var msg = chat.getSendMsg();
            if(msg === false){
                return;
            }
            var sendObj={uiId:chat.getUiId(),fromUser:indexJS.userInfo,content:{msgType:chat.msgType.text,value:msg}};
            var replyDom=$(".replybtn");
            if(toUser && toUser.userId==replyDom.attr("uid") && toUser.talkStyle==replyDom.attr("ts")){//如果对话userId匹配则表示当前回复结束
                $(".mymsg,.mymsg em").hide();
            }
            sendObj.fromUser.toUser = toUser;
            chat.socket.emit('sendMsg',sendObj);//发送数据
            chat.setContent(sendObj,true,false);//直接把数据填入内容栏
            //清空输入框
            $("#contentText").html("");//清空内容
        });
        //打开打赏
        $('#sendReward').click(function(){
            chat.reward();
        });
        //打赏返回
        $('.envelope-reward .reward-title .reward-back').click(function(){
            $('#js-reward-user').val('');
            $('.envelope-reward .reward-title .reward-back,.envelope-reward .reward-weima,#rewardQRCode img').addClass('dn').hide();
            $('.envelope-reward .reward-form').removeClass('dn');
        });
        //打赏按钮
        $('#js-reward-send-btn').click(function(){
            var userId = $('#js-reward-user').val();
            if(common.isBlank(userId)){
                box.showMsg('请选择老师');
            }else{
                $('.envelope-reward .reward-form').addClass('dn');
                $('.envelope-reward .reward-title .reward-back,.envelope-reward .reward-weima').removeClass('dn').show();
                $('#qrCode').attr('src','/hx/theme1/img/rew/'+userId+'.png').show();
            }
        });
        //发送图片--选择图片
        $("#sendImgBtn").click(function(){
            if(!FileReader){
                alert("发送图片功能目前只支持Chrome、Firefox、IE10或以上版本的浏览器！");
                return;
            }
            if(!indexJS.visitorSpeak && indexJS.checkClientGroup("visitor")){
                box.openLgBox();
                return;
            }
            if(indexJS.userInfo.isSetName === false){
                box.openSetNameBox(true);
                return;
            }
            $("#sendImgInp").trigger("click");
        });
        //发送图片
        $("#sendImgInp").bind("change", function(){
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
            if(fileSize>=1024*1024){
                alert('发送的图片大小不要超过1MB.');
                return false ;
            }
            //加载文件转成URL所需的文件流
            var reader = new FileReader();
            reader.readAsDataURL(img);
            reader.onload = function(e){
                chat.setUploadImg(e.target.result, chat.getToUser());//处理并发送图片
            };
            reader.onprogress=function(e){};
            reader.onloadend = function(e){};
            $(this).val("");
        });
        //私聊框拖拽
        $( ".pletter_win" ).draggable({handle: ".wh_drag" });
    },
    /**
     * 设置并压缩图片
     */
    setUploadImg:function(base64Data, toUser){
        var uiId=chat.getUiId();
        //先填充内容框
        var formUser={};
        common.copyObject(formUser,indexJS.userInfo,true);
        formUser.toUser=toUser;
        var sendObj={uiId:uiId,fromUser:formUser,content:{msgType:this.msgType.img,value:'',needMax:0,maxValue:''}};
        if(toUser && toUser.talkStyle == 1) {
            this.setWhContent(sendObj,true,false);
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
            var aObj=$("#"+result.uiId+" span[contt='a'] a");
            aObj.attr("href", value)
                .children("img").attr("src",value).attr("needMax",result.content.needMax);
            chat.dataUpload(result);
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
     * 移除加载提示的dom
     * @param uiId
     */
    removeLoadDom:function(uiId){
        $('#'+uiId+' .img-loading,#'+uiId+' .img-load-gan,#'+uiId+' .shadow-box,#'+uiId+' .shadow-conut').remove();
    },
    /**
     * 提取uiId,用于标记记录的id，信息发送成功后取发布日期代替
     */
    getUiId:function(){
        var currentDate=new Date();
        return currentDate.getTime()+"_ms";
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
     * 过滤发送消息：过滤一些特殊字符等。
     * 如果返回值为false,则终止发送消息。
     */
    getSendMsg : function(dom){
        var dom=dom?dom:$("#contentText");
        //校验聊天内容长度
        if(dom.text().length + dom.find("img").size() > 140){
            alert("消息内容超过最大长度限制（140字以内）！");
            return false;
        }
        if(dom.find(".txt_dia").length>0){
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
     * 设置对话
     * @param userId
     * @param nickname
     * @param talkStyle聊天方式（0对话，1私聊）
     * @param userType 用户类别(0客户；1管理员；2分析师；3客服）
     * @param avatar
     */
    setDialog:function(userId,nickname,talkStyle,userType,avatar){
        if(talkStyle==1){//私聊,则直接弹私聊框
            chat.closeWhTip(userId);
            chat.fillWhBox(null,avatar,userType,userId,nickname,false,false);
        }else{
            if(!indexJS.visitorSpeak && indexJS.checkClientGroup("visitor")){
                box.openLgBox();
                return;
            }
            $("#contentText .txt_dia").remove();
            $("#contentText").html($("#contentText").html().replace(/^((&nbsp;)+)/g,''));
            $("#contentText").prepend('&nbsp;<span class="txt_dia" contenteditable="false" uid="'+userId+'" utype="'+userType+'">@<label>'+nickname+'</label></span>&nbsp;').focusEnd();
        }
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
            $("#dialog_list").children("[isme='true']").show();
            $("#dialog_list").children("[isme='false']").hide();
        }else if(t=='admin'){
            $("#dialog_list").children("[utype!=1]").hide();
        }else{
            $("#dialog_list").children().show();
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
        if(data.isVisitor){
            $("#"+data.uiId).remove();
            box.openLgBox();
            return;
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
        if(!isMeSend && indexJS.userInfo.userId==fromUser.userId && data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
            $('#'+data.uiId+' .dtime').html(chat.formatPublishTime(fromUser.publishTime));
            $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
            if(data.content.msgType==chat.msgType.img){
                chat.removeLoadDom(fromUser.publishTime);//去掉加载框
                var aObj=$('#'+fromUser.publishTime+' span[contt="a"]>a');
                var url=data.content.needMax?'/hxstudio/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId:aObj.children("img").attr("src");
                aObj.attr("href",url);
            }
            return;
        }
        var dialog=chat.formatContentHtml(data,isMeSend,isLoadData);
        var list=$("#dialog_list");
        list.append(dialog);
        this.formatMsgToLink(fromUser.publishTime);//格式链接
        var vst=$('.view_select .selectlist a[class=on]').attr("t");//按右上角下拉框过滤内容
        if(vst!='all'){
            chat.showViewSelect(vst);
        }
        if(!isLoadData) {
            //发言检查对方是否更新头像，更新则同步头像
            var currOnlineDom=$('#userListId li[id='+fromUser.userId+']');
            var currAv=null;
            if(fromUser.avatar && currOnlineDom.length>0 && fromUser.avatar!=(currAv=currOnlineDom.find(".headimg img")).attr("src")){
                currAv.attr("src",fromUser.avatar);
            }
            //是否开启滚动
            if($(".scrollbtn").hasClass("on")){
                chat.setTalkListScroll(true);
            }
        }
        //对话事件
        $('#'+fromUser.publishTime+' .txt_dia').click(function(){
            if(!indexJS.visitorSpeak && indexJS.checkClientGroup("visitor")){
                return;
            }
            chat.setDialog($(this).attr("uid"),$(this).find("label").text(),0,$(this).attr("utype"));
        });
        //昵称头像点击
        $('#'+fromUser.publishTime+' .uname,#'+fromUser.publishTime+' .headimg').click(function(){
            var diaDom=$('#'+fromUser.publishTime+' .dialogbtn');
            diaDom.attr("avs",$(this).parents(".dialog").find('.headimg img').attr("src"));
            chat.openDiaLog(diaDom, true);
        });
    },
    /**
     * 打开对话框
     */
    openDiaLog:function(diaDom, isAutoDir){
        $('.dialogbtn').not(diaDom).hide();
        if(!diaDom.is(':hidden')){
            diaDom.hide();
            return false;
        }

        if(isAutoDir){
            var dp=diaDom.parent(), hasDot = diaDom.is(".bot");
            if(dp.next().size() <= 0){
                if(!hasDot){
                    diaDom.addClass("bot");
                }
            }else if(hasDot){
                diaDom.removeClass("bot");
            }
        }
        diaDom.show();
        var am=diaDom.find("a"),dsrc=diaDom.attr("avs");
        if(common.isValid(dsrc)){
            am.attr("avs",dsrc);
            diaDom.attr("avs",'');
        }else{
            am.attr("avs",'');
        }
        am.unbind("click");
        am.click(function(){
            var tp=$(this).parent();
            chat.setDialog(tp.attr("uid"),tp.attr("nk"),$(this).attr("t"),tp.attr("utype"),$(this).attr("avs"));//设置对话
            tp.hide();
        });
    },
    /**
     * 格式发布日期
     */
    formatPublishTime:function(time,isfull,splitChar){
        var nb=Number(time.replace(/_.+/g,""));
        return common.isBlank(time)?'':isfull?common.formatterDateTime(nb,splitChar):common.getHHMM(nb);
    },
    /**
     * 格式内容栏
     */
    formatContentHtml:function(data,isMeSend,isLoadData){
        var cls='dialog ',pHtml='',dialog='',isMe='false',nkTmHtml='',
            fromUser=data.fromUser,
            content=data.content,
            nickname=fromUser.nickname,
            loadHtml='';
        if(indexJS.userInfo.userId==fromUser.userId){
            if(isMeSend){//发送，并检查状态
                fromUser.publishTime=data.uiId;
                loadHtml='<em class="img-loading"></em><span class="shadow-box"></span><s class="shadow-conut"></s>';
            }
        }
        var toUser=fromUser.toUser,toUserHtml='';
        if(toUser && common.isValid(toUser.userId)){
            toUserHtml='<span class="txt_dia" uid="'+toUser.userId+'" utype="'+toUser.userType+'">@<label>'+toUser.nickname+'</label></span>';
            if(indexJS.userInfo.userId==toUser.userId){
                isMe='true';
            }
        }
        if(content.msgType==chat.msgType.img){
            if(content.needMax){
                pHtml='<a href="/hxstudio/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId+'" data-lightbox="dialog-img"><img src="'+content.value+'" alt="图片"/></a>';
            }else{
                pHtml='<a href="'+(content.value ? content.value : 'javascript:')+'" data-lightbox="dialog-img"><img src="'+content.value+'" alt="图片" /></a>';
            }
            pHtml+=loadHtml;
        }else{
            pHtml=content.value;
        }
        if(indexJS.userInfo.userId==fromUser.userId){
            cls+='mine ';
            isMe='true';
            nkTmHtml='<span class="dtime">'+chat.formatPublishTime(fromUser.publishTime)+'</span><a href="javascript:" class="uname">' + nickname + '</a>';
        }else{
            if(fromUser.userType==3){
                nickname += "&nbsp;（客服）";
            }
            nkTmHtml='<a href="javascript:" class="uname">'+nickname+'</a><span class="dtime">'+chat.formatPublishTime(fromUser.publishTime)+'</span>';
            dialog=chat.getDialogHtml(fromUser.userId,nickname,fromUser.userType);
            if(!isLoadData && toUser){
                if(indexJS.userInfo.userId==toUser.userId){
                    $(".mymsg").show();
                    $(".mymsg em").hide();
                    $(".replybtn").attr("uid",fromUser.userId);
                    $(".replybtn").attr("ts",toUser.talkStyle);
                    $(".replybtn").attr("futype",fromUser.userType);
                    $(".sender").html(fromUser.nickname);
                    $(".xcont").html(pHtml);
                }
            }
        }
        var aImgObj=chat.getAImgOrLevel(fromUser.userId,fromUser.clientGroup,fromUser.userType,fromUser.avatar);
        var  dvArr=[];
        dvArr.push('<div class="'+cls+aImgObj.level+'" id="'+fromUser.publishTime+'"  utype="'+fromUser.userType+'" mtype="'+content.msgType+'" isme="' + isMe + '">');
        dvArr.push('<a href="javascript:" class="headimg">'+aImgObj.aImg+'<b></b></a>');
        dvArr.push('<div class="dialog_top">'+nkTmHtml+'</div>');
        //dvArr.push('<p><i></i><span class="dcont">'+toUserHtml+pHtml+'</span></p>');
        //dvArr.push(dialog+'</div>')
        dvArr.push('<p><i></i>');
        if(toUser && common.isValid(toUser.question)){
            dvArr.push('<span class="dcont">');
            dvArr.push('<span uid="'+toUser.userId+'" utype="'+toUser.userType+'">'+toUser.nickname+'</span>提问：');
            dvArr.push('<span contt="q">' + toUser.question + '</span>');
            dvArr.push('<span class="dialog_reply">回复：<span contt="a">' + pHtml + '</span></span>');
            dvArr.push('</span>');
        }else{
            dvArr.push('<span class="dcont" contt="a">' + toUserHtml + pHtml + '</span>');
        }
        dvArr.push('</p>' + dialog + '</div>');;
        return dvArr.join("");
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
                var newTest=linkTxt.toString().replace(/(http:\/\/|https:\/\/)((\w|=|\?|\.|\/|\\&|-)+)(:\d+)?(\/|\S)+/g,function(m){
                    return '<a href="'+m+'" target="_blank">'+m+'</a>';
                });
                el.innerHTML = el.innerHTML.replace(linkTxt,newTest);
            }
        });
    },
    /**
     * 提取头像样式
     * @param clientGroup
     */
    getAImgOrLevel:function(userId, clientGroup,userType,avatar){
        var retObj={aImg:common.isValid(avatar)?'<img src="'+avatar+'">':'<img src="/hx/theme1/img/user.png">',level:''};
        if(common.isValid(userType) && userType>0){
            retObj.level=userType == 2 ? 'analyst' : 'admin';
        }else if("vip"==clientGroup){
            retObj.level='level4';
        }else if("active"==clientGroup || "notActive"==clientGroup){
            retObj.level='level3';
        }else if("simulate"==clientGroup){
            retObj.level='level2';
        }else if("register"==clientGroup){
            retObj.level='level1';
        }else if ("visitor"==clientGroup || userType == -1) {
            userId = userId || "";
            var idTmp = parseInt(userId.substring(userId.length - 2), 10);
            if(isNaN(idTmp)){
                idTmp = 100;
            }
            idTmp = (idTmp + 17) % 45;
            retObj.aImg = '<img src="' + indexJS.filePath + '/upload/pic/header/chat/visitor/' + idTmp + '.png">';;
            retObj.level='visitor';
        }else{
            retObj.level='visitor';
        }
        return retObj;
    },
    /**
     * 提取对话html
     * @param userId
     * @param nickname
     * @param userType
     * @returns {string}
     */
    getDialogHtml:function(userId,nickname,userType){
        if(userId && indexJS.userInfo.userId!=userId){
            var gIdDom=$("#roomInfoId"),mainDiv='',cnt=0;
            if(indexJS.visitorSpeak || (indexJS.userInfo.userId.indexOf('visitor_')==-1 && userId.indexOf('visitor_')==-1)){
                mainDiv+='<a href="javascript:" class="d1" t="0"><b></b><span>@TA</span></a>';
                cnt ++;
            }
            if(gIdDom.attr("aw")=="true" && common.containSplitStr(gIdDom.attr("awr"), userType)){
                mainDiv+='<a href="javascript:"' + (cnt == 0 ? ' class="d1"' : "") + ' t="1"><b></b><span>私聊</span></a>';
                cnt ++;
            }
            return '<div class="dialogbtn'+(cnt == 1 ? ' one' : '')+'"  nk="'+nickname+'" uid="'+userId+'" utype="'+userType+'">'+mainDiv+'</div>';
        }else{
            return '<div class="dialogbtn'+(cnt == 1 ? ' one' : '')+'"  nk="'+nickname+'" uid="'+userId+'" utype="'+userType+'"></div>';
        }
    },
    /**
     * 设置在线用户
     * @param row
     * @returns {boolean}
     */
    setOnlineUser:function(row){
        if(row.userType==2){
            $("#teacherInfoId img").attr("src",row.avatar?row.avatar:'/hx/theme1/img/user-img.jpg');
            $("#teacherInfoId h5").text(row.nickname);
            $("#teacherInfoId p").text(row.position);
            chat.setTeacherQRCode(row.userId);
            $('#outline').hide();
            $('#teacherInfoId').removeClass('dn');
            $("#teacherInfoId").attr({'uid':row.userId,'cg':(common.isBlank(row.clientGroup)?'':row.clientGroup),'t':row.userType,'utype':row.userType});
            heightCalcu();
            return false;
        }
        var userListDomId=row.userType>=0?'#userListId':'#visitorListId';
        $(userListDomId+" li[id='"+row.userId+"']").remove();//存在则移除旧的记录
        var dialogHtml=chat.getDialogHtml(row.userId,row.nickname,row.userType),isMeHtml="",csHtml='',seq=row.sequence,meCls='';
        if(indexJS.userInfo.userId==row.userId){
            isMeHtml = "【我】";
            seq = "0";
            meCls='mynk';
        }
        if(row.userType==3){
            var gIdDom=$("#roomInfoId");
            if(gIdDom.attr("aw")=="true" && common.containSplitStr(gIdDom.attr("awr"), row.userType)){
                csHtml='<em>私聊</em>';
            }
            isMeHtml = "&nbsp;（客服）";
        }
        var lav=chat.getAImgOrLevel(row.userId, row.clientGroup,row.userType,row.avatar);
        var lis=$(userListDomId+" li"),
            liDom='<li id="'+row.userId+'" cg="'+(common.isBlank(row.clientGroup)?'':row.clientGroup)+'" t="'+seq+'" utype="'+row.userType+'" class="'+lav.level+'" >'+dialogHtml+'<a href="javascript:" t="header" class="uname"><div class="headimg">'+lav.aImg+'<b></b></div><span class="'+meCls+'">'+row.nickname+isMeHtml+'<i></i></span>'+csHtml+'</a></li>';
        if(lis.length==0){
            $(userListDomId).append(liDom);
        }else if(seq=="0"){
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
                    nickTmp=$(this).find("a span").text();
                    if(row.nickname<=nickTmp){
                        $(this).before(liDom);
                        isInsert=true;
                        return false;
                    }
                }
            });
            if(!isInsert){
                $(userListDomId).append(liDom);
            }
        }
        if(common.isValid(dialogHtml)){
            $(userListDomId+" li[id="+row.userId+"] a[t=header]").click(function(e){
                if($(this).attr('t') == '0'){
                    $('.user_box li').removeClass('zin');
                }else {
                    $('.user_box li').removeClass('zin');
                    $(this).parent().addClass('zin');
                    var pv = $(this).prev();
                    pv.attr("avs", $(this).find(".headimg img").attr("src"));
                    chat.openDiaLog(pv);
                }
            }).dblclick(function(){
                $(this).find("em").trigger("click");
            }).find("em").click(function(e){
                var pDom=$(this).parents("[utype]");
                var userType=pDom.attr("utype");
                if(userType!=3){
                    return false;
                }
                var userId=pDom.attr("id");
                chat.closeWhTip(userId);
                chat.fillWhBox(pDom.attr("cg"),pDom.find(".headimg img").attr("src"),pDom.attr("utype"),userId,pDom.find(".uname span").text(),false,false);
                return false;
            });
        }
    },
    /**
     * 离开房间提示
     */
    leaveRoomTip:function(flag,userIds){
        if(flag=="forcedOut"){//强制下线分析师
            if(userIds){
                for(var i in userIds){
                    $("#userListId li[id='"+userIds[i]+ "']").remove();
                }
            }
            return;
        }
        if(flag=="roomClose"){
            $(".blackbg").children().hide();
            box.showTipBox("注意：房间已停用，正自动登出...");
            if("visitor"==indexJS.userInfo.clientGroup){
                window.setTimeout(function(){//3秒钟后登出
                    indexJS.toRefreshView();
                },1200);
            }else{
                window.setTimeout(function(){//3秒钟后登出
                    $(".logout").trigger("click");
                },1200);
            }
        }else if(flag=="otherLogin"){
            if("visitor"==indexJS.userInfo.clientGroup){
                return;
            }
            chat.socket.disconnect();
            $(".blackbg").children().hide();
            box.showMsg({
                closeable : false,
                title : "登出提示",
                msg : "注意：您的账号已在其他地方登陆，被踢出！",
                btns : [{
                    txt : "重新登录",
                    fn : function(){
                        indexJS.toRefreshView();
                    }
                },{
                    txt : "确定",
                    fn : function(){
                        $(".logout").trigger("click");
                    }
                }]
            });
        }
    },
    /**
     * 设置在线提示
     * @param toUserId
     * @param isOnline
     */
    setWhOnlineTip:function(toUserId,isOnline){
        var liDom=$('#wh_msg_'+toUserId+' .tit strong');
        if(liDom.length==0){
            return;
        }
        var txt=$('#wh_msg_'+toUserId+' .tit strong'),img=$('.mult_dialog a[uid='+toUserId+']').find("img"),userli=$('#userListId li[t=3][uid='+toUserId+'] .headimg');
        if(isOnline){
            txt.text("在线");
            img.removeClass("have_op");
            userli.removeClass("have_op");
        }else{
            txt.text("离线");
            img.addClass("have_op");
            userli.addClass("have_op");
        }
    },
    /**获取私聊对象用户信息*/
    getWhToUser : function(){
        var liDom=$('.mult_dialog a[class=on]');
        var uid=liDom.attr("uid");
        return {userId:uid,nickname:liDom.find("label").text(),talkStyle:1,userType:liDom.attr("utype")};
    },
    /**
     * 发送私聊信息
     * @param msg
     */
    sendWhMsg:function(txtObj){
        //发送剪切图片
        var toUser = chat.getWhToUser();
        var imgObj = txtObj.find(".text-min-img img");
        if(imgObj.size() > 0){
            var imgData = imgObj.attr("src");
            if(imgData.length > 1024*1024){
                alert('发送的图片大小不要超过1MB.');
            }else{
                chat.setUploadImg(imgData, toUser);
                imgObj.remove();
            }
        }
        var msg = chat.getSendMsg(txtObj);
        if(msg === false){
            return;
        }
        var sendObj={uiId:chat.getUiId(),fromUser:indexJS.userInfo,content:{msgType:chat.msgType.text,value:msg}};
        var uid=$('.mult_dialog a[class=on]').attr("uid");
        sendObj.fromUser.toUser=toUser;
        var diaDom=$('#wh_msg_'+uid+' .dialog:last'),questionDom=diaDom.find(".whblt");
        if(questionDom.length>0){
            sendObj.fromUser.toUser.question=questionDom.html();
            sendObj.fromUser.toUser.questionId=questionDom.attr("rid");
            sendObj.fromUser.toUser.publishTime=diaDom.attr("id");
        }
        chat.socket.emit('sendMsg',sendObj);//发送数据
        chat.setWhContent(sendObj,true,false);//直接把数据填入内容栏
        txtObj.html("");//清空内容
    },
    /**
     * 设置私聊访客
     * @param userType
     * @param userId
     * @param nickname
     * @param isOnline
     * @param isShowNum
     */
    setWhVisitors:function(clientGroup,userType,userId,nickname,avatar,isOnline,isShowNum){
        if($(".mult_dialog a[uid="+userId+"]").length==0){
            var avObj=this.getAImgOrLevel(userId, clientGroup?clientGroup:$("#userListId li[id='"+userId+"']").attr("cg"),userType,avatar);
            $(".mult_dialog").append('<a href="javascript:" uid="'+userId+'" utype="'+userType+'" class="on"><div class="headimg '+avObj.level+'">'+avObj.aImg+'<b></b></div><label>'+nickname+'</label><i class="num dn" t="0"></i><i class="close"></i></a>');
            var liDom=$('.mult_dialog a[uid='+userId+']');
            if(isShowNum) {
                var numDom = liDom.find(".num"), num = parseInt(numDom.attr("t")) + 1;
                numDom.attr("t", num).text(num).show();
            }
            liDom.find('.close').click(function(){
                var pt=$(this).parent();
                pt.remove();
                $('#wh_msg_'+pt.attr("uid")).remove();
                if($(".mult_dialog a").length==0){
                    $(".pletter_win .cont[id]").remove();
                    $(".pletter_win").hide();
                }else{
                    $('.mult_dialog a:last').click();
                }
            });
            liDom.click(function(){
                $('.mult_dialog a').removeClass('on');
                $(this).addClass('on');
                $(this).find(".num").attr("t",0).text("").hide();
                var userId=$(this).attr("uid"),whId='wh_msg_'+userId,userType=$(this).attr("utype");
                chat.closeWhTip(userId);
                $(".pletter_win .cont[id]").hide();
                if($("#"+whId).length==0){
                    var whTxtId='whTxt_'+userId;
                    $(".pletter_win").append($("#wh_content_tmp").html());
                    $(".pletter_win .cont:last").attr("id",whId).find(".ctextarea").attr("id",whTxtId);
                    //初始化表情事件
                    $("#"+whId).find('.facebtn').qqFace({
                        id:'faceId_'+userId,
                        zIndex:1000000,
                        assign:whTxtId, //给控件赋值
                        path:indexJS.filePath+'/face/'//表情存放的路径
                    });
                    //发送图片--选择图片
                    $("#"+whId).find('.imgbtn').click(function(){
                        if(!FileReader){
                            alert("发送图片功能目前只支持Chrome、Firefox、IE10或以上版本的浏览器！");
                            return;
                        }
                        $("#"+whId).find('.imginp').trigger("click");
                    });
                    //发送图片
                    $("#"+whId).find('.imginp').bind("change", function(){
                        var _this=this;
                        var toUser = chat.getWhToUser();
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
                        if(fileSize>=1024*1024){
                            alert('发送的图片大小不要超过1MB.');
                            return false ;
                        }
                        //加载文件转成URL所需的文件流
                        var reader = new FileReader();
                        reader.readAsDataURL(img);
                        reader.onload = function(e){
                            chat.setUploadImg(e.target.result, toUser);//处理并发送图片
                        };
                        reader.onprogress=function(e){};
                        reader.onloadend = function(e){};
                        $(this).val("");
                    });
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
                            chat.sendWhMsg($(this));
                            return false;
                        }
                    });
                    $("#"+whId).find(".sendbtn").click(function(e){
                        chat.sendWhMsg($(this).parents('.cont').find(".ctextarea"));
                    });
                    //关闭事件
                    $("#"+whId).find(".pop_close").click(function(){
                        $(".pletter_win .cont[id],.pletter_win .mult_dialog a[uid]").remove();
                        $(".pletter_win").hide();
                    });
                    //最小化事件
                    $("#"+whId).find(".pop_small").click(function(){
                        $(".pletter_win").hide();
                    });
                    //加载私聊信息
                    chat.socket.emit("getWhMsg",{clientStoreId:indexJS.userInfo.clientStoreId,userType:indexJS.userInfo.userType,groupId:indexJS.userInfo.groupId,groupType:indexJS.userInfo.groupType,userId:indexJS.userInfo.userId,toUser:{userId:userId,userType:userType}});
                }else{
                    //chat.setTalkListScroll(true,$('#'+whId+' .dialoglist'),'dark');
                }
                $("#"+whId).show().find(".wh_nk").text($(this).find("label").text());
                $("#"+whId).find(".ctextarea").focus();
                chat.setTalkListScroll(true,$('#'+whId+' .wh-content'),'dark');
                //上下线提示
                chat.setWhOnlineTip(userId,$("#userListId li[id='"+userId+"']").length>0);
            });
        }
    },
    /**
     * 设置提示框闪动
     * @param userId
     */
    setWhTip:function(userId){
        if($('.pletter_win').is(':hidden')) {
            var iNumDom=$('#userListId li[id=' + userId + '] a.uname span i'),iNo=0;
            if(iNumDom.length>0){
                iNo=iNumDom.text();
                iNo=common.isValid(iNo)?iNo:0;
                $('#userListId li[id=' + userId + '] a.uname span i').text(parseInt(iNo)+1);
            }
            $('#userListId li[id=' + userId + ']').attr("k", 1);
            this.whTipInterId = setInterval(function () {
                $('#userListId li[k=1]').toggleClass("tip_mrg");
            }, 1000);
        }
    },
    /**
     * 关闭私聊提示
     */
    closeWhTip:function(userId){
        $('#userListId li[id='+userId+']').attr("k",0).removeClass("tip_mrg").find("a.uname span i").text('');
        if($('#userListId[k=1]').length==0){
            if(this.whTipInterId){
                clearInterval(this.whTipInterId);
                this.whTipInterId=null;
            }
        }
    },
    /**
     * 填充私聊弹框
     * @param clientGroup
     * @param avatar
     * @param userType
     * @param userId
     * @param nickname
     * @param isTip
     * @param isShowNum
     * @returns {boolean}
     */
    fillWhBox:function(clientGroup,avatar,userType,userId,nickname,isTip,isShowNum){
        var userTab=$('.mult_dialog a[uid='+userId+']');
        if(userTab.length==0){//如果弹框没有对应用户，则先配置该用户tab
            chat.setWhVisitors(clientGroup,userType,userId,nickname,avatar,true,isShowNum);
        }else{
            if(isShowNum && !userTab.hasClass("on")){
                var numDom= userTab.find(".num"),num=parseInt(numDom.attr("t"))+1;
                numDom.attr("t",num).text(num).show();
            }
        }
        //恒信私聊直接弹出
        $(".pletter_win").show();
        $('.mult_dialog a[uid='+userId+']').click();
        return !isTip;
    },
    /**
     * 填充私聊内容框
     * @param data
     * @param isMeSend
     * @param isLoadData
     * @param isOnlyFill
     */
    setWhContent:function(data,isMeSend,isLoadData,isOnlyFill){
        var fromUser=data.fromUser,cls='dialog ',content=data.content,nkTitle='';
        if(data.rule){
            $('#'+data.uiId+' span[contt="a"]').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            return;
        }
        if(!isLoadData){
            fromUser.toWhUserId=fromUser.userId;
        }
        if(indexJS.userInfo.userId==fromUser.userId||(indexJS.userInfo.userType=="0" && fromUser.userType=="-1")||(indexJS.userInfo.userType=="-1" && fromUser.userType=="0")){
            if(isMeSend){//发送，并检查状态
                fromUser.publishTime=data.uiId;
                fromUser.toWhUserId=fromUser.toUser.userId;
            }
            if(data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
                $('#'+data.uiId+' .dtime').html(chat.formatPublishTime(fromUser.publishTime));
                $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
                if(data.content.msgType==chat.msgType.img){
                    chat.removeLoadDom(fromUser.publishTime);//去掉加载框
                    var aObj=$('#'+fromUser.publishTime+' span[contt="a"]>a');
                    var url=data.content.needMax?'/hxstudio/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId:aObj.children("img").attr("src");
                    aObj.attr("href",url);
                }
                return;
            }
            cls+='mine';
            nkTitle='<span class="dtime">'+chat.formatPublishTime(fromUser.publishTime, isLoadData, '/')+'</span><a href="javascript:" class="uname">我</a>';
        }else{
            if(!isLoadData && !isOnlyFill){//如接收他人私信
                var isFillWh=this.fillWhBox(fromUser.clientGroup,fromUser.avatar,fromUser.userType,fromUser.userId,fromUser.nickname,true,true);
                if(isFillWh){
                    return;
                }
            }
            var nkFlag = fromUser.userType == "3" ? "&nbsp;（客服）" : "";
            nkTitle='<a href="javascript:" class="uname">'+fromUser.nickname+nkFlag+'</a><span class="dtime">'+chat.formatPublishTime(fromUser.publishTime, isLoadData, '/')+'</span>';
        }
        if(common.isBlank(fromUser.toWhUserId)){
            console.error("setWhContent->fromUser toWhUserId is null,please check!");
            return;
        }
        var pHtml='';
        var whContent=$('#wh_msg_'+fromUser.toWhUserId+' .dialoglist');
        var html='';
        if(content.msgType==chat.msgType.img){
            if(content.needMax){
                pHtml='<a href="/hxstudio/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId+'" data-lightbox="whimg-"' + fromUser.userId + '><img src="'+content.value+'" alt="图片"/></a>';
            }else{
                pHtml='<a href="'+content.value+'" data-lightbox="whimg-"' + fromUser.userId + '><img src="'+content.value+'" alt="图片" /></a>';
            }
            var loadhtml = isMeSend ? '</span><em class="img-loading"></em><span class="shadow-box"></span><s class="shadow-conut"></s>' : '';
            pHtml ='<p><i></i><span class="dcont" contt="a">' + pHtml + loadhtml + '</p>';
        }else if(isOnlyFill){
            pHtml='<div class="whcls"><i></i><div class="whblt" rid="'+content.infoId+'">'+content.value+'</div></div>';
        }else{
            if(!isMeSend && common.isValid(fromUser.toUser.question)) {
                var nkTitTmp='<a href="javascript:" class="uname">'+fromUser.toUser.nickname+'</a><span class="dtime">'+chat.formatPublishTime(fromUser.publishTime, isLoadData, '/')+'</span>';
                html='<div class="dialog" id="'+fromUser.publishTime+'"><div class="dialog_top">'+nkTitTmp+'</div><div class="whcls"><i></i><div class="whblt">' + fromUser.toUser.question + '</div></div></div>';
                whContent.append(html);
            }
            pHtml='<p><i></i><span class="dcont" contt="a">'+content.value+'</span></p>';
        }
        html='<div class="'+cls+'" id="'+fromUser.publishTime+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'"><div class="dialog_top">'+nkTitle+'</div>'+pHtml+'</div>';
        whContent.append(html);
        this.formatMsgToLink(fromUser.publishTime);//格式链接
        if(!isLoadData){
            var scrollWh=whContent.parents(".wh-content");
            if(scrollWh.hasClass("mCustomScrollbar")){
                chat.setTalkListScroll(true,scrollWh,'dark');
            }
        }
    },
    /**
     * 设置在线人数
     */
    setOnlineNum:function(){
        $(".mod_userlist .titbar label:first").text($("#userListId li").length);
        $(".mod_userlist .titbar label:last").text($("#visitorListId li").length);
    },
    /**
     * 查询UI在线用户
     */
    searchUserList:function(val){
        var userArr=$("#userListId li[t!=14][t!=0]").map(function () {
            var name = $(this).find(".uname span").text();
            return name.indexOf(val)!=-1?{value:$(this).attr("id"),label:name,userType: $(this).attr("utype")}:null;
        }).get();
        var teacherArr=[{value:$('#teacherInfoId').attr('uid'),label:$('#teacherInfoId dd h5').text(),userType:$('#teacherInfoId').attr('utype')}];
        var userList = $.merge(userArr,teacherArr);
        return userList;
    },
    /**
     * 设置socket
     */
    setSocket:function(){
        this.socket = common.getSocket(io,indexJS.socketUrl,indexJS.userInfo.groupType);
        //建立连接
        this.socket.on('connect',function(){
            console.log('connected to server!');
            indexJS.userInfo.socketId=chat.socket.id;
            var currTab=$("#roomInfoId");
            chat.socket.emit('login',{userInfo:indexJS.userInfo,lastPublishTime:$("#dialog_list>div:last").attr("id"),fUserTypeStr:currTab.attr("awr"), allowWhisper : currTab.attr("aw")});
            $(".img-loading[pf=chatMessage]").show();
        });
        //进入聊天室加载的在线用户
        this.socket.on('onlineUserList',function(data,dataLength){
            $('#userListId').html("");
            //如客户数小于200，则追加额外游客数
            if($("#roomInfoId").attr("av")=="true" && dataLength<=200){
                var randId= 0,size=dataLength<=10?60:(200/dataLength)*3+10;
                for(var i=0;i<size;i++){
                    randId=common.randomNumber(6);
                    data[("visitor_"+randId)]=({userId:("visitor_"+randId),clientGroup:'visitor',nickname:('游客_'+randId),sequence:14,userType:-1});
                }
            }
            var row=null;
            for(var i in data){
                row=data[i];
                chat.setOnlineUser(row);//设置在线用户
            }
            chat.setOnlineNum();//设置在线人数
            indexJS.setListScroll(".user_box");
        });
        //断开连接
        this.socket.on('disconnect',function(e){
            console.log('disconnect');
        });
        //出现异常
        this.socket.on("error",function(e){
            console.error('e:'+e);
        });
        //信息传输

        this.socket.on('sendMsg',function(data){
            if(data.fromUser.toUser && data.fromUser.toUser.talkStyle==1){//如果是私聊则转到私聊框处理
                chat.setWhContent(data,false,false);
            }else{
                if(!data.serverSuccess && indexJS.userInfo.userId == data.fromUser.userId && !data.rule){
                    return;
                }
                chat.setContent(data,false,false);
            }
        });
        //通知信息
        this.socket.on('notice',function(result){
            switch (result.type){
                case 'onlineNum':{
                    var data=result.data,userInfoTmp=data.onlineUserInfo;
                    if(data.online){
                        chat.setOnlineUser(userInfoTmp);
                    }else{
                        if(indexJS.userInfo.userId!=userInfoTmp.userId){
                            if(userInfoTmp.userType==2){
                                $('#teacherInfoId,.user-infbox .user-code').addClass('dn');
                                $('#outline').show();
                                heightCalcu();
                            }else if(userInfoTmp.userType==-1){
                                $("#visitorListId #"+userInfoTmp.userId).remove();
                            }else{
                                $("#userListId #"+userInfoTmp.userId).remove();
                            }
                            indexJS.setListScroll(".user_box");
                        }
                    }
                    chat.setOnlineNum();//设置在线人数
                    break;
                }
                case 'removeMsg':
                    $("#"+result.data.replace(/,/g,",#")).remove();
                    chat.setTalkListScroll();
                    break;
                case 'leaveRoom':{
                    chat.leaveRoomTip(result.flag,result.userIds);
                    break;
                }
                case 'pushInfo':{
                    var data=result.data;
                    if(data.position==1){//私聊框
                        chat.whPushObj = {info: data.content,publishTime: data.publishTime,infoId: data.contentId};
                        chat.pushInfoTimeOutId = window.setTimeout(function () {//按推送结果提示私聊
                            var aDom = $("#userListId li[t=3] a .headimg:not(.have_op)");
                            $(aDom.get(common.randomIndex(aDom.length))).parent().dblclick();
                        }, data.timeOut * 60 * 1000);
                    }else if(data.position==3){ //公聊框
                        chat.talkBoxPush.initTBP(data.infos);
                    }
                    break;
                }
                case 'approvalResult':
                {
                    var data=result.data;
                    if(data.refuseMsg){
                        var publishTimeArr=data.publishTimeArr;
                        for(var i in publishTimeArr){
                            $("#"+publishTimeArr[i]+" span[contt] em[class=ruleTipStyle]").html("已拒绝");
                        }
                    }else{
                        for (var i in data) {
                            chat.formatUserToContent(data[i]);
                        }
                        chat.setTalkListScroll(true);
                    }
                    break;
                }
            }
        });
        //信息传输
        this.socket.on('loadMsg',function(data){
            $(".img-loading[pf=chatMessage]").hide();
            var msgData=data.msgData;
            if(msgData && $.isArray(msgData)) {
                msgData.reverse();
                for (var i in msgData) {
                    typeof msgData[i] == "object" &&  chat.formatUserToContent(msgData[i]);//空返回function
                }
            }
            chat.setTalkListScroll(true);
        });
        //加载私聊信息
        this.socket.on('loadWhMsg',function(result){
            var data=result.data;
            if(result.type=='offline'){//离线提示信息
                if(data && !$.isEmptyObject(data)){
                    for(var index in data){
                        chat.setWhVisitors(data[index].clientGroup,data[index].userType,index,data[index].nickname,$("#userListId li[id='"+index+"']").length>0);
                    }
                }
            }else{//私聊框中每个用户tab对应的私聊信息
                if(data && $.isArray(data)) {
                    var hasImg= 0,row=null;
                    data.reverse();
                    var hasPushInfo=0;
                    var targetDom=$('.mult_dialog a[uid='+result.toUserId+']');
                    for (var i in data) {
                        row = data[i];
                        if(row.userType==3 && chat.setWhPushInfo(targetDom,row.publishTime)){
                            hasPushInfo++;
                        }
                        chat.formatUserToContent(row,true,result.toUserId);
                        if(row.content.msgType==chat.msgType.img){
                            hasImg++;
                        }
                    }
                    if(hasPushInfo==0){
                        chat.setWhPushInfo(targetDom,null);
                    }
                    chat.setTalkListScroll(true,$('#wh_msg_'+result.toUserId+' .wh-content'),'dark');
                }
            }
        });
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
            obj.mCustomScrollbar({scrollInertia:1,scrollButtons:{enable:false},theme:(theme?theme:"light-2")});
            indexJS.setScrollStyle(obj);
            obj.mCustomScrollbar("scrollTo", "bottom");
        }
    },
    /**
     * 设置私聊推送信息
     * @param dom
     */
    setWhPushInfo:function(dom,publishTime){
        if($.isEmptyObject(chat.whPushObj)){
            return false;
        }
        if(publishTime && publishTime<chat.whPushObj.publishTime){
            return false;
        }
        var uid=dom.attr("uid"),nk=dom.find("label").text().replace(/\s（客服）$/, "");
        if($('#wh_msg_'+uid+' div[id='+chat.whPushObj.publishTime+']').length>0){
            return false;
        }
        var sendObj={fromUser:{publishTime:chat.whPushObj.publishTime,userId:uid,nickname:nk,userType:3},content:{msgType:chat.msgType.text,value:chat.whPushObj.info,infoId:chat.whPushObj.infoId}};
        chat.setWhContent(sendObj,false,false,true);//直接把数据填入内容栏
        chat.whPushObj = {};//清空后台推送的消息
        window.clearTimeout(chat.pushInfoTimeOutId);
        return true;
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
            avatar:row.avatar,
            position:row.position
        };
        if(isWh){
            fromUser.toWhUserId=toWhUserId;
            chat.setWhContent({fromUser: fromUser,content:row.content},false,true);
        }else{
            chat.setContent({fromUser: fromUser,content:row.content},false,true);
        }
    },

    /**
     * 公聊推送
     */
    talkBoxPush : {
        /**推送消息对象*/
        talkPushList : [], //公聊推送消息
        talkPushInterval : null,

        /**
         * 初始化
         * @param infos
         */
        initTBP : function(infos){
            this.clear();
            this.talkPushList = infos;
            this.start();
        },

        /**
         * 清空定时器，在服务器重启的时候，会重新触发notice，此时需要清空之前所有的定时器
         */
        clear : function(){
            if(chat.talkBoxPush.talkPushInterval){
                window.clearInterval(chat.talkBoxPush.talkPushInterval);
                chat.talkBoxPush.talkPushInterval = null;
            }
            var loc_infos = chat.talkBoxPush.talkPushList;
            var loc_info = null;
            for(var i = 0, lenI = loc_infos.length; i < lenI; i++){
                loc_info = loc_infos[i];
                if(loc_info.timeoutId){
                    window.clearTimeout(loc_info.timeoutId);
                }
                if(loc_info.intervalId){
                    window.clearInterval(loc_info.intervalId);
                }
            }
        },

        /**
         * 启动检查定时器
         */
        start : function(){
            var loc_infos = chat.talkBoxPush.talkPushList;
            if(loc_infos && loc_infos.length > 0){
                chat.talkBoxPush.talkPushInterval = window.setInterval(function(){
                    chat.talkBoxPush.check();
                }, 10000);
            }
        },

        /**
         * 检查所有推送任务
         */
        check : function(){
            var loc_infos = chat.talkBoxPush.talkPushList;
            var loc_info = null;
            for(var i = 0, lenI = loc_infos.length; i < lenI; i++){
                loc_info = loc_infos[i];
                if(loc_info.startFlag){
                    continue;
                }
                if(common.dateTimeWeekCheck(loc_info.pushDate, false, indexJS.serverTime)){
                    loc_info.startFlag = true;
                    loc_info.timeoutId = window.setTimeout(chat.talkBoxPush.delayStartTask(loc_info), (loc_info.onlineMin || 0) * 60 * 1000);
                }
            }
        },

        /**
         * 延迟启动单个定时任务
         * @param info
         */
        delayStartTask : function(info){
            return function(){
                chat.talkBoxPush.showMsg(info);
                if(info.intervalMin && info.intervalMin > 0){
                    info.intervalId = window.setInterval(chat.talkBoxPush.startTask(info), info.intervalMin * 60 * 1000);
                }
            };
        },

        /**
         * 启动单个推送任务
         * @param info
         * @returns {Function}
         */
        startTask : function(info){
            return function(){
                if(common.dateTimeWeekCheck(info.pushDate, false, indexJS.serverTime)){
                    chat.talkBoxPush.showMsg(info);
                }else{
                    window.clearInterval(info.intervalId);
                    info.startFlag = false;
                }
            };
        },

        /**
         * 将消息显示在公聊框
         * @param info
         */
        showMsg : function(info){
            var html = [];
            html.push('<div class="dialog push">');
            html.push(info.content);
            html.push('</div>');
            $("#dialog_list").append(html.join(""));
            if($(".scrollbtn").hasClass("on")) {
                chat.setTalkListScroll(true);
            }
        }
    },
    /**
     * 打赏
     */
    reward: function(){
        if($('.inp-bar4').hasClass('clicked')){
            $('.envelope-reward').removeClass('dn');
        }else {
            /*var data = {groupId: indexJS.userInfo.groupId, hasQRCode:true};
            common.getJson('/hxstudio/getTeachers', {data: JSON.stringify(data)}, function (data) {
                if (data) {
                    $('#js-reward-user').empty();
                    $('#js-reward-user').append('<option value="">请选择老师</option>');
                    $.each(data, function (key, row) {
                        $('#js-reward-user').append('<option value="' + row.userNo + '">' + row.userName + '</option>');
                        //$('#rewardQRCode').append('<img id="js-'+row.userNo+'" src="'+row.wechatCodeImg+'" class="img-responsive" style="display:none;">');
                    });*/
                    $('.inp-bar4').addClass('clicked');
                    $('.envelope-reward').removeClass('dn');
                /*}
            });*/
        }
    },
    /**
     * 根据userId获取老师的QRCode
     * @param userId
     */
    setTeacherQRCode:function(userId){
        var data = {userId:userId};
        common.getJson('/hxstudio/getTeacher', {data: JSON.stringify(data)}, function (data) {
            if (data) {
                if(common.isValid(data.wechatCodeImg)) {
                    $('.user-infbox .user-code').attr('src', data.wechatCodeImg).removeClass('dn');
                }
            }
        });
    }
};
// 初始化
$(function() {
    chat.init();
});