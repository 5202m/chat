/**
 * 聊天器客户端操作类
 * @type {{init: Function, setKindEdit: Function, setSocket: Function}}
 * author Alan.wu
 */
var chat={
    //预定义数据传输对象
    sendObj:{
        fromUser:null,
        content:{
            msgType:'text',//内容类型,text,img,file,默认是text
            value:'',   //内容值
            maxValue:'',//最大值，如img表示其大图数据
            needMax:0
        }
    },
    socket:null,
    socketUrl:'',
    userInfo:null,
    init:function(){
        this.setSocket();
        this.setEvent();
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
        });
        /**
         * 关闭登录框按钮事件
         */
        $("#loginSection .del-btn,#tipSection .del-btn").click(function(){
            $('#loginBox').slideUp();
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
                    if(flag==1){//客户记录标志:0（记录不存在）、1（未绑定微信）、2（未入金激活）、3（绑定微信并且已经入金激活）
                        $("#loginSection").hide();
                        $("#tipSection h2").html("绑定账号提示");
                        $("#tipSection .succ-p-info").html('欢迎光临金道贵金属聊天室，绑定金道交易账号，尊享更多专业服务！<a href="http://103.227.194.71/index.php/articles_2931.html" >如何绑定</a>');
                        $("#tipSection").show();
                    }else if(flag==2){
                        $("#loginSection").hide();
                        $("#tipSection h2").html("非激活账户提示");
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
                }else{
                    $("#loginSection").hide();
                    $("#tipSection h2").html("验证成功");
                    $("#tipSection .succ-p-info").html("尊贵的客户：欢迎光临金道贵金属聊天室！");
                    $("#tipSection").show();
                }
            },false);
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
                chat.sendObj.fromUser=chat.userInfo;
                chat.sendObj.content.msgType='text';
                msg= $("#txtNicknameId").html()+msg;
                chat.sendObj.content.value=common.escapeHtml(msg);
                chat.socket.emit('sendMsg',chat.sendObj);
                chat.clearSendObj();
                chat.removeTxtOfNickname();
                //清空输入框
                $("#contentText").val("");
                $(this).hide();
                $('#addBtn').show();
            }
        });
        //添加按钮事件
        $('#addBtn').click(function(){
            $(this).next().toggle();
        });
        //图片选择事件
        $("#fileBtn")[0].addEventListener("change", function () {
            var img = this.files[0];
            // 判断是否图片
            if(!img){
                return false;
            }
            // 判断图片格式
            if(!(img.type.indexOf('image')==0 && img.type && /\.(?:jpg|png|gif)$/.test(img.name)) ){
                alert('图片只能是jpg,gif,png');
                return false ;
            }
            //加载文件转成URL所需的文件流
            var reader = new FileReader();
            reader.readAsDataURL(img);
            reader.onload = function(e){
                chat.sendObj.fromUser=chat.userInfo;
                chat.sendObj.content.msgType='img';
                var base64Data=e.target.result;
                chat.zipImg(200,base64Data,50,function(minImg,needMax){//压缩缩略图
                    chat.sendObj.content.value=minImg;
                    chat.sendObj.content.needMax=(needMax?1:0);
                    console.log("minImg:" + minImg);
                    if(needMax) {
                        chat.zipImg(0, base64Data, 50, function (maxImg) {//压缩大图
                            chat.sendObj.content.maxValue = maxImg;
                            console.log("maxImg:" + chat.sendObj.content.maxValue);
                            chat.socket.emit('sendMsg', chat.sendObj);//发送图片
                            chat.clearSendObj();
                        });
                    }else{
                        chat.socket.emit('sendMsg', chat.sendObj);//发送图片
                        chat.clearSendObj();
                    }
                });
                console.log("onload file:"+e.target.result);
            };
        }, false);
    },
    clearSendObj:function(){
        chat.sendObj.fromUser=null;
        chat.sendObj.content.msgType='';
        chat.sendObj.content.value='';
        chat.sendObj.content.maxValue='';
        chat.sendObj.content.needMax=0;
    },
    /**
     * 图片压缩
     * @param max
     * @param data
     * @param quality 压缩量
     * @returns {string}
     */
    zipImg:function(max,data,quality,callback){
        var image = new Image();
        // 绑定 load 事件处理器，加载完成后执行
        image.onload = function(){
            var ratio=0;
            var minImg='',bigImg='',needMax=false;
            var canvas = document.createElement('canvas');
            if(max>0) {
                if ((image.height > max) || (image.width > max)) {     //计算比例
                    needMax=true;
                    if (image.height > image.width) {
                        ratio = parseFloat(max) / image.height;
                    } else {
                        ratio = parseFloat(max) / image.width;
                    }
                    image.width *= ratio;
                    image.height *= ratio;
                }
            }
            var ctx = canvas.getContext("2d");
            // canvas清屏
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = image.width;
            canvas.height = image.height;
            // 将图像绘制到canvas上
            ctx.drawImage(image, 0, 0, image.width, image.height);
            callback(canvas.toDataURL("image/jpeg",quality/100),needMax);
        };
        image.src = data;
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
        if(needMax){
            common.getJson("/getBigImg",{publishTime:$(_this).parents("li").attr("id")},function(result){
                $("#showImgDiv img").attr("src",result.value);
            },true);
        }else{
            $("#showImgDiv img").attr("src",$(_this).attr("src"));
        }
        $("#body").hide();
        $("#showImgDiv").show();
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
     * 填充内容
     * @param data
     */
    setContent:function(data,isLoadData){
        if(data.isVisitor){
           $("#loginForm input[type=hidden]").each(function(){
               $(this).val(chat.userInfo[this.name]);
           });
            chat.refreshVerifyCode();
            $('#loginBox').slideDown();
            return;
        }
        if(data.rule){
           alert("系统提示："+data.content.value);
           return;
        }
        var li=chat.formatContentHtml(data);
        var ul=$("#content_ul");
        ul.append(li);
        while (ul.length > 100) {
            ul.eq(1).remove();
        }
        ul.scrollTop[0]=ul[0].scrollHeight;
        var dtObj=$('#'+data.fromUser.publishTime+' .dt-send-name');
        if(dtObj.length>0) {
            var tId=dtObj.attr("tId");
            if(!isLoadData && tId==chat.userInfo.userId && data.fromUser.userId!=chat.userInfo.userId){//如果是@自己，则在顶部浮动层显示
                $("#top_info").show();
                $("#top_info label").html(data.fromUser.nickname+':'+dtObj.html()).attr("tId",tId).attr("fnickname",data.fromUser.nickname).attr("fuserId",data.fromUser.userId);
            }
            dtObj.click(function () {
                var name=dtObj.text(),next=dtObj.next();
                if(next.attr("tid")=="nickname"){
                    name=next.text();
                }
                chat.setTxtOfNickname(dtObj.attr("tId"),name);
            });
        }
    },

    /**
     * 格式内容栏
     */
    formatContentHtml:function(data){
        var liClass='',contentClass='',pHtml='',dtHtml='',
            fromUser=data.fromUser,
            content=data.content,
            nickname=fromUser.nickname;
        if(chat.userInfo.userId==fromUser.userId){
            liClass='me-li';
            nickname='我';
        }
        else if(fromUser.userType==2){//分析师样式设置
            liClass='expert-li';
            dtHtml='<dt class="dt-send-name" tId="'+fromUser.userId+'">@</dt>';
        }
        if(common.isBlank(nickname)){
            nickname=fromUser.userId;
        }
        if(content.msgType=='img'){
            contentClass='talk-img';
            pHtml='<img src="'+content.value+'" width="100%" alt="图片"  onclick="chat.showBigImg(this,'+content.needMax+');"/><i class="img-loading" style="display:none"></i>';
        }else{
            pHtml=common.encodeHtml(content.value);
        }
        var html='<li class="'+liClass+' clearfix" id="'+fromUser.publishTime+'" utype="'+fromUser.userType+'">'+
                 '<dl class="talk-dlbox">'+dtHtml+'<dt tId="nickname">'+nickname+'</dt><dd>'+common.longMsTimeToDateTime(fromUser.publishTime/1000,'.')+'</dd></dl>'+
                 '<section class="talk-content "'+contentClass+'><seciton class="arrow-outer jian-position1"><seciton class="arrow-shadow"></seciton></seciton><p>'+
                  pHtml+'</p></section></li>';
        return html;
    },
    /**
     * 设置socket
     */
    setSocket:function(){
        this.socket = io.connect(this.socketUrl);
        //建立连接
        this.socket.on('connect',function(){
            console.log('connected to server'+chat.userInfo);
            chat.socket.emit('login',chat.userInfo);
        });
        //断开连接
        this.socket.on('disconnect',function(){
            console.log('disconnect');
        });
        //信息传输
        this.socket.on('sendMsg',function(data){
            chat.setContent(data,false);
        });
        //信息传输
        this.socket.on('loadMsg',function(data){
            $("#content_ul").html("");
            var fromUser = null, row = null, result = [];
            if(data) {
                if($.isArray(data)){
                    data.reverse();
                    var content='';
                    for (var i in data) {
                        row = data[i];
                        fromUser = {
                            id: row._id,
                            userId: row.userId,
                            nickname: row.nickname,
                            avatar: row.avatar,
                            userType: row.userType,
                            groupId: row.groupId,
                            publishTime: row.publishTime//发布日期
                        };
                        console.log("maxValue:"+row.content.value);
                        chat.setContent({fromUser: fromUser,content:row.content},true);
                    }
                }else{
                    chat.setContent(data);
                }
            }
        });
    }
};
// 初始化
$(function() {
    chat.init();
});

 