/**
 * 聊天器客户端操作类
 * @type {{init: Function, setKindEdit: Function, setSocket: Function}}
 * author Alan.wu
 */
var chat={
    maxRows:50,//显示的最大条数
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
        this.setSocket();
        this.setEvent();
    },
    /**
     * 提取uiId,用于标记记录的id，信息发送成功后取发布日期代替
     */
    getUiId:function(){
        var currentDate=new Date();
        return currentDate.getTime()*1000+currentDate.getMilliseconds();
    },
    refreshVerifyCode:function(){
        common.getJson("/getVerifyCode",null,function(data){
            if(data){
                var canvas = document.getElementById("canvasId");
                var ctx = canvas.getContext("2d");
                ctx.fillStyle="#ffffff";
                ctx.fillRect(0,0,canvas.width,canvas.height);
                ctx.strokeStyle="#000";
                ctx.fillStyle="#000000";
                ctx.font="18px _sans";
                ctx.textBaseline="middle";
                ctx.fillText(data.code,5,8);
            }
        },true);
    },
    /**
     * 事件设置
     */
    setEvent:function(){
        /**
         * top信息点击
         */
        $("#top_info label").click(function(){
            chat.setTxtOfNickname($(this).attr("fuserId"),$(this).attr("fnickname"));
            $(this).html("");
            $("#top_info").hide();
            $(".talk-infobox").css("margin-top","25px");
        });
        /**
         * 关闭登录框按钮事件
         */
        $("#loginSection .del-btn,#tipSection .del-btn").click(function(){
            common.hideBox('#loginBox');
        });
        /**
         * 删除顶部消息
         */
        $("#close_top_btn").click(function(){
            $("#top_info").hide();
        });
        /**
         * 点击大图
         */
        $("#showImgDiv").click(function(){
            $("#showImgDiv").hide();
            $("#body").show();
        });
         /**
         * 输入框blur事件
         */
        $("#loginForm input[type=text]").blur(function(){
            if(common.isValid(this.value)){
                $('.wrong-info[tId='+this.name+']').html("");
            }
        });
        /**
         * 验证码设置
         */
        $("#verifyCodeId").click(function(){
            chat.refreshVerifyCode();
        });
        /**
         * 登录按钮事件
         */
        $("#formBtn").click(function(){
            if(!chat.checkLoginInput()){
                return;
            }
            common.getJson("/checkClient",$("#loginForm").serialize(),function(result){
                $(".wrong-info").html("");
                if(result.errcode){
                    $(".wrong-info").html(result.errmsg);
                    return false;
                }
                var flag=result.flag;
                if('wechat'==chat.userInfo.groupId){
                    if(result.isSys){
                        if(result.isOk){
                            $("#loginSection").hide();
                            $("#tipSection h2").html("验证成功");
                            $("#tipSection .succ-p-info").html("尊贵的客户：欢迎光临金道贵金属聊天室！");
                            $("#tipSection").show();
                        }else{
                            $(".wrong-info").html("账号或手机号验证不通过，请重新输入！");
                        }
                    }else{
                        if(flag==1){//客户记录标志:0（记录不存在）、1（未绑定微信）、2（未入金激活）、3（绑定微信并且已经入金激活）
                            chat.setWechatTip();
                        }else if(flag==2){
                            $("#loginSection").hide();
                            $("#tipSection h2").html("提示");
                            $("#tipSection .succ-p-info").html("欢迎光临金道贵金属聊天室，目前发言功能暂仅对激活客户开放，了解更多请咨询金道微信客户！");
                            $("#tipSection").show();
                        }else if(flag==3){
                            $("#loginSection").hide();
                            $("#tipSection h2").html("登录成功");
                            $("#tipSection .succ-p-info").html("尊贵的客户：欢迎光临金道贵金属聊天室，即时参与和分析师互动，让投资变得更简单！");
                            $("#tipSection").show();
                        }else{
                            $(".wrong-info").html("账号或手机号验证不通过，请重新输入！");
                        }
                    }
                }else{
                    $("#loginSection").hide();
                    $("#tipSection h2").html("验证成功");
                    $("#tipSection .succ-p-info").html("尊贵的客户：欢迎光临金道贵金属聊天室！");
                    $("#tipSection").show();
                }
            },true);
        });
       //输入框事件
        $('#contentText')[0].addEventListener("input", function(e) {
            if(common.isValid(this.value)){
                $('#sendBtn').show();
                $('#addBtn').hide();
            }else{
                $('#addBtn').show();
                $('#sendBtn').hide();
            }
        }, false);
        /**
         * 隐藏发图片框
         */
        $('#contentText').focus(function(){
            $('.add-img').hide();
        })
        /**
         * 输入框退格事件
         */
        $("#contentText").keydown(function(e){
            if(e.keyCode==8){
                if(common.isBlank($(this).val())){
                    chat.removeTxtOfNickname();
                }
            }
        });

        //阅读设置
        $("#readSet").click(function(){
            if($(this).hasClass("on-fon")){
                $(this).removeClass("on-fon").addClass("off-fon");
                $("#content_ul li").show();
            }else{
                $(this).removeClass("off-fon").addClass("on-fon");
                $("#content_ul li[utype!=2]").hide();
            }
        });
        //聊天内容发送事件
        $("#sendBtn").click(function(){
            var msg=$("#contentText").val();
            if(common.isValid(msg)) {
                msg= $("#txtNicknameId").html()+msg;
                var sendObj={uiId:chat.getUiId(),fromUser:chat.userInfo,content:{msgType:chat.msgType.text,value:common.escapeHtml(msg)}};
                chat.setContent(sendObj,true,false);//直接把数据填入内容栏
                chat.socket.emit('sendMsg',sendObj);//发送数据
                chat.removeTxtOfNickname();
                //清空输入框
                $("#contentText").val("");
                $(this).hide();
                $('#addBtn').show();
            }
        });
        //添加按钮事件
        $('#addBtn').click(function(){
            $('.add-img').show();
        });
        //图片选择事件
        $("#fileBtn")[0].addEventListener("change", function () {
            var _this=this;
            chat.checkSendAuthority(function(isOk){
                if(isOk){
                    var img = _this.files[0];
                    // 判断是否图片
                    if(!img){
                        return false;
                    }
                    // 判断图片格式
                    if(!(img.type.indexOf('image')==0 && img.type && /\.(?:jpg|png|gif)$/.test(img.name.toLowerCase())) ){
                        alert('图片只能是jpg,gif,png');
                        return false ;
                    }
                    var fileSize=img.size;
                    //加载文件转成URL所需的文件流
                    var reader = new FileReader();
                    reader.readAsDataURL(img);
                    var uiId=chat.getUiId();
                    //先填充内容框
                    chat.setContent({uiId:uiId,fromUser:chat.userInfo,content:{msgType:chat.msgType.img,value:'',needMax:0}},true,false);
                    reader.onload = function(e){
                        var sendObj={uiId:uiId,fromUser:chat.userInfo,content:{msgType:chat.msgType.img,value:'',needMax:0,maxValue:''}};
                        var base64Data=e.target.result;
                        $("#"+uiId+" img").attr("src",base64Data);
                        chat.zipImg(sendObj,150,base64Data,80,function(result,value){//压缩缩略图
                            result.content.value=value;
                            if(result.content.needMax==1) {
                                chat.zipImg(result,0, base64Data, 50, function (newResult,bigValue) {//压缩大图
                                    newResult.content.maxValue=bigValue;
                                    chat.dataUpload(newResult);
                                    //chat.socket.emit('sendMsg', newResult);//发送图片
                                });
                            }else{
                                chat.dataUpload(result);
                                //chat.socket.emit('sendMsg', result);//发送图片
                            }
                        });
                    };
                    reader.onprogress=function(e){};
                    reader.onloadend = function(e){};
                }
                $('.add-img').hide();
            });
        }, false);
    },
    /**
     * 数据上传
     * @param data
     */
    dataUpload:function(data){
        // 发送到后端
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/uploadData');
        xhr.addEventListener("progress", function(e){
            if (e.lengthComputable) {
                var ra= (e.loaded / e.total *100|0)+"%";
                console.log("ss;" + ra);
                $("#"+data.uiId+" .shadow-box").css({height:"'+ra+'"});
                $("#"+data.uiId+" .shadow-conut").html(ra);
            }
        }, false);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                console.log("success!");
             }
        };
        xhr.send(JSON.stringify(data)); //发送base64
    },
    /**
     * 图片压缩
     * @param max
     * @param data
     * @param quality 压缩量
     * @returns {string}
     */
    zipImg:function(sendObj,max,data,quality,callback){
        var image = new Image();
        // 绑定 load 事件处理器，加载完成后执行
        image.onload = function(){
            var ratio=0;
            var canvas = document.createElement('canvas');
            if(max>0) {
                var w = image.width;
                var h = image.height;
                if ((h > max) || (w > max)) {     //计算比例
                    sendObj.content.needMax=1;
                    var hRatio=0;
                    var wRatio=0;
                    var ratio = 1;
                    wRatio = max / w;
                    hRatio = max / h;
                    if(wRatio<1 || hRatio<1){
                        ratio = (wRatio<=hRatio?wRatio:hRatio);
                    }
                    if (ratio<1){
                        w = w * ratio;
                        h = h * ratio;
                    }
                    image.height = h;
                    image.width = w;
                }
            }
            var ctx = canvas.getContext("2d");
            // canvas清屏
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = image.width;
            canvas.height = image.height;
            // 将图像绘制到canvas上
            ctx.drawImage(image, 0, 0, image.width, image.height);
            callback(sendObj,canvas.toDataURL("image/jpeg",quality/100));
        };
        image.src = data;
    },
    /**
     * 检查发送状态
     * @param uiId
     */
    checkSendStatus:function(uiId,isInitEvent){
        var li=$("#"+uiId);
        var ld=$('.img-loading',li);
        ld.removeClass("img-loading").addClass("img-load-gan").attr("title","重发");
        if(ld.length>0 && isInitEvent){
            ld.click(function(){
                var uiIdTmp=$(this).parents("li").attr("id");
                ld.removeClass("img-load-gan").addClass("img-loading");
                if(li.attr("mType")==chat.msgType.img){
                    var sendObj={uiId:uiIdTmp,fromUser:chat.userInfo,content:{msgType:chat.msgType.img,value:'',needMax:0,maxValue:''}};
                    var base64Data=$(".talk-content p img",li).attr("src");
                    console.log("base64Data:"+base64Data);
                    chat.zipImg(sendObj,150,base64Data,50,function(result,value){//压缩缩略图
                        result.content.value=value;
                        if(result.content.needMax==1) {
                            chat.zipImg(result,0, base64Data, 50, function (newResult,bigValue) {//压缩大图
                                newResult.content.maxValue=bigValue;
                                chat.dataUpload(newResult);
                            });
                        }else{
                            chat.dataUpload(result);
                        }
                    });
                }else{
                    chat.socket.emit('sendMsg',{uiId:uiIdTmp,fromUser:chat.userInfo,content:{msgType:chat.msgType.text,value:$(".talk-content p",li).html()}});
                }
                chat.timeOutSend(uiIdTmp,false);//一分钟后检查是否发送成功，不成功提示重发
            });
        }
    },
    /**
     * 检查发送权限
     */
    checkSendAuthority:function(callback){
        common.getJson("/checkSendAuthority",{userId:chat.userInfo.userId,groupId:chat.userInfo.groupId},function(result){
            if(result.isVisitor) {
                chat.openLoginBox();
                callback(false);
            }else{
                callback(true);
            }
        },true);
    },
    /**
     * 设置微信组提示
     */
    setWechatTip:function(){
        $("#loginSection").hide();
        $("#tipSection h2").html("提示");
        $("#tipSection .succ-p-info").html('您的微信还未绑定金道交易账号，绑定金道交易账号，尊享更多专业服务！<a href="http://103.227.194.71/index.php/articles_2931.html" >如何绑定</a>');
        $("#tipSection").show();
    },
    /**
     * 移除@对方的输入
     */
    removeTxtOfNickname:function(){
        var obj=$("#txtNicknameId");
        if(common.isValid(obj.text())){
            obj.html("").attr("tId","");
            $("#contentText").css({"padding-left":"1%"}).width("98%");//重置输入框宽度
        }
    },
    /**
     * 显示大图
     */
    showBigImg:function(_this,needMax){
        $("#showImgDiv img").attr("src","");
        $("#body").hide();
        $("#showImgDiv").show();
        $(".loading-box").show();
        if(needMax){
            common.getJson("/getBigImg",{publishTime:$(_this).parents("li").attr("id")},function(result){
                $("#showImgDiv img").attr("src",result.value);
                $('#showImgDiv p').autoIMG();
                $(".loading-box").hide();
            },true,function(){
                $(".loading-box").hide();
            });
        }else{
            $("#showImgDiv img").attr("src",$(_this).attr("src"));
            $('#showImgDiv p').autoIMG();
            $(".loading-box").hide();
        }
    },
    /**
     * 设置@发送的昵称
     */
    setTxtOfNickname:function(tId,name){
        if(!/^@/.test(name)){
            name="@"+name;
        }
        $("#contentText").width('98%');//重置输入框宽度
        $("#txtNicknameId").html('<label class="dt-send-name" tId="'+tId+'">'+name+'</label>');
        var w=parseInt($("#txtNicknameId").width());
        $("#contentText").css({"padding-left":w+5}).width($("#contentText").width()-w);//调整输入框宽度
    },
    /**
     * 检查页面输入
     */
    checkLoginInput:function(){
       var isTrue=true;
       $("#loginForm input[type=text]").each(function(){
           if(common.isBlank($(this).val())){
               if(this.name=='accountNo'){
                   $(".wrong-info").attr("tId",this.name).html("账号不能为空！");
               }
               if(this.name=='mobilePhone'){
                   $(".wrong-info").attr("tId",this.name).html("手机号码不能为空！");
               }
               if(this.name=='verifyCode'){
                   $(".wrong-info").attr("tId",this.name).html("验证码不能为空！");
               }
               isTrue=false;
               return isTrue;
           }else{
               if(this.name=='mobilePhone'&& !(/(^[0-9]{11})$|(^86(-){0,3}[0-9]{11})$/.test($(this).val()))) {
                   $(".wrong-info").attr("tId",this.name).html("手机号码输入有误！");
                   isTrue=false;
                   return isTrue;
               }
           }
       });
       return isTrue;
    },

    /**
     * 打开登录框
     */
    openLoginBox:function(){
        $("#loginForm input[type=hidden]").each(function(){
            $(this).val(chat.userInfo[this.name]);
        });
        chat.refreshVerifyCode();
        common.showBox('#loginBox');
    },
    /**
     * 一分钟后检查是否发送成功，不成功提示重发
     * @param uiId
     * @param isInitEvent 首次需要初始化点击事件
     */
    timeOutSend:function(uiId,isInitEvent){
        window.setTimeout(function(){//一分钟后检查是否发送成功，不成功提示重发
            chat.checkSendStatus(uiId,isInitEvent);
        },60000);
    },
    /**
     * 填充内容
     * @param data
     */
    setContent:function(data,isMeSend,isLoadData){
        if(data.isVisitor){
            $("#"+data.uiId).remove();
            chat.openLoginBox();
            return;
        }
        if(data.rule){
           alert("系统提示："+data.content.value);
           return;
        }
        if(data.isShowWechatTip){
            chat.setWechatTip();
            common.showBox('#loginBox');
        }
        var fromUser=data.fromUser;
        if(isMeSend){//发送，并检查状态
            fromUser.publishTime=data.uiId;
            chat.timeOutSend(data.uiId,true);//一分钟后检查是否发送成功，不成功提示重发
            $('#'+data.uiId+' p').autoIMG();
        }
        if(!isMeSend && chat.userInfo.userId==fromUser.userId && data.serverSuccess){
            $('#'+data.uiId+' .img-loading,#'+data.uiId+' .img-load-gan').remove();
            $('#'+data.uiId+' .shadow-box,#'+data.uiId+' .shadow-conut').remove();
            $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
            $('#'+data.uiId+' dd[tId=time]').html(common.longMsTimeToDateTime(fromUser.publishTime/1000,'.'));
             return;
        }
        var li=chat.formatContentHtml(data,isMeSend);
        var ul=$("#content_ul");
        ul.append(li);
        while (ul.length > chat.maxRows) {
            ul.eq(1).remove();
        }
        $("#content_div")[0].scrollTop = $("#content_div")[0].scrollHeight;
        //内容@事件设置
        var dtObj=$('#'+fromUser.publishTime+' .talk-content .dt-send-name');
        if(dtObj.length>0) {
            var tId=dtObj.attr("tId");
            if(!isLoadData && tId==chat.userInfo.userId && fromUser.userId!=chat.userInfo.userId){//如果是@自己，则在顶部浮动层显示
                $("#top_info").show();
                $(".talk-infobox").css("margin-top",(25+$("#top_info").height())+"px");
                $("#top_info label").html(fromUser.nickname+':'+dtObj.html()).attr("tId",tId).attr("fnickname",fromUser.nickname).attr("fuserId",fromUser.userId);
            }
            dtObj.click(function () {
                var name=dtObj.text();
                chat.setTxtOfNickname(dtObj.attr("tId"),name);
            });
        }
        //设计师@事件设置
        $('#'+fromUser.publishTime+' .talk-dlbox .dt-send-name').click(function () {
            chat.setTxtOfNickname($(this).attr("tId"),$(this).next().text());
        });
    },

    /**
     * 格式内容栏
     */
    formatContentHtml:function(data,isMeSend){
        var liClass='',contentClass='',pHtml='',dtHtml='',loadImgHtml='',loadHtml='',
            fromUser=data.fromUser,
            content=data.content,
            nickname=fromUser.nickname;
        if(chat.userInfo.userId==fromUser.userId){
            liClass='me-li';
            nickname='我';
            if(isMeSend){
                loadHtml='<i class="img-loading"></i>';
                loadImgHtml='<span class="shadow-box"></span><s class="shadow-conut"></s>';
            }
        }
        else if(fromUser.userType==2){//分析师样式设置
            liClass='expert-li';
            dtHtml='<dt class="dt-send-name" tId="'+fromUser.userId+'">@</dt>';
        }
        if(common.isBlank(nickname)){
            nickname=fromUser.userId;
        }
        if(content.msgType==chat.msgType.img){
            contentClass='talk-img';
            pHtml='<img src="'+content.value+'" width=150 height=150 alt="图片"  onclick="chat.showBigImg(this,'+content.needMax+');"/>'+loadImgHtml;
        }else{
            pHtml=common.encodeHtml(content.value);
        }
        var html='<li class="'+liClass+' clearfix" id="'+fromUser.publishTime+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" >'+
                 '<dl class="talk-dlbox">'+dtHtml+'<dt>'+nickname+'</dt><dd tId="time">'+common.longMsTimeToDateTime(fromUser.publishTime/1000,'.')+'</dd></dl>'+
                 '<section class="talk-content "'+contentClass+'><seciton class="arrow-outer jian-position1"><seciton class="arrow-shadow"></seciton></seciton>'+loadHtml+'<p>'+pHtml+'</p></section></li>';
        return html;
    },
    /**
     * 设置socket
     */
    setSocket:function(){
        this.socket = io.connect(this.socketUrl);
        //建立连接
        this.socket.on('connect',function(){
            console.log('connected to server!');
            chat.socket.emit('login',chat.userInfo);
        });
        //登录成功返回信息(包括在线人数）
        this.socket.on('loginResult',function(data){
             $("#onlineUserNum").text(data.onlineUserNum);
        });
        //断开连接
        this.socket.on('disconnect',function(e){
            console.log('disconnect');
        });
        //出现异常
        this.socket.on("error",function(e){
            console.log('e:'+e);
        });
        //信息传输
        this.socket.on('sendMsg',function(data){
            chat.setContent(data,false,false);
        });
        //信息传输
        this.socket.on('loadMsg',function(data){
            $("#content_ul").html("");
            var fromUser = null, row = null, result = [];
            if(data && $.isArray(data)) {
                data.reverse();
                var content='';
                for (var i in data) {
                    row = data[i];
                    fromUser = {
                        userId: row.userId,
                        nickname: row.nickname,
                        avatar: row.avatar,
                        userType: row.userType,
                        groupId: row.groupId,
                        publishTime: row.publishTime//发布日期
                    };
                    chat.setContent({fromUser: fromUser,content:row.content},false,true);
                }
            }
        });
    }
};

 