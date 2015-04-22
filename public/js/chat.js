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
            type:'text',//内容类型,text,img,file,默认是text
            value:''//内容值
        }
    },
    socket:null,
    socketUrl:'http://127.0.0.1:3002',
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
         * 关闭登录框按钮事件
         */
        $(".del-btn").click(function(){
            $('#loginBox').slideUp();
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
                    $("#tipSection h2").html("验证成功");
                    $("#tipSection .succ-p-info").html("尊贵的客户：欢迎光临金道贵金属聊天室！");
                }
            },false);
        });
       //输入框事件
        $('#contentText').change(function(){
            if(common.isValid($(this).val())){
                $('#sendBtn').show();
                $('#addBtn').hide();
            }else{
                $('#addBtn').show();
                $('#sendBtn').hide();
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
                chat.sendObj.content.type='text';
                chat.sendObj.content.value=common.escapeHtml(msg);
                chat.socket.emit('sendMsg',chat.sendObj);
            }
            //清空输入框
            $("#contentText").val("");
            $(this).hide();
            $('#addBtn').show();
        });
        //添加按钮事件
        $('#addBtn').click(function(){
            $(this).next().toggle();
        });
        //图片选择事件
        $("#fileBtn").change(function(e){
            var img = e.target.files[0];
            // 判断是否图片
            if(!img){
                return ;
            }
            // 判断图片格式
            if(!(img.type.indexOf('image')==0 && img.type && /\.(?:jpg|png|gif)$/.test(img.name)) ){
                alert('图片只能是jpg,gif,png');
                return ;
            }
            //console.log("chat.zipImg(img,50):"+chat.zipImg(img,50));//压缩图片
            //加载文件转成URL所需的文件流
            var reader = new FileReader();
            reader.readAsDataURL(img);
            reader.onload = function(e){
                chat.sendObj.fromUser=chat.userInfo;
                chat.sendObj.content.type='img';
                chat.sendObj.content.value=e.target.result;
                chat.socket.emit('sendMsg',chat.sendObj);//发送图片
                console.log("onload file:"+e.target.result);
            };
        });
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
    setContent:function(data){
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
    },

    /**
     * 格式内容栏
     */
    formatContentHtml:function(data){
        var liClass='',contentClass='',pHtml='',
            fromUser=data.fromUser,
            content=data.content,
            nickname=fromUser.nickname;
        if(chat.userInfo.userId==fromUser.userId){
            liClass='me-li';
            nickname='我';
        }
        if(fromUser.userType==2){//分析师样式设置
            liClass='expert-li';
        }
        if(common.isBlank(nickname)){
            nickname=fromUser.userId;
        }
        if(content.type=='img'){
            contentClass='talk-img';
            pHtml='<img src="'+content.value+'" width="100%" alt="图片" /><i class="img-loading" style="display:none"></i>';
        }else{
            pHtml=content.value;
        }
        var html='<li class="'+liClass+' clearfix" id="'+fromUser.publishTime+'" utype="'+fromUser.userType+'" >'+
                 '<dl class="talk-dlbox"><dt>'+nickname+'</dt><dd>'+common.longMsTimeToDateTime(fromUser.publishTime/1000,'.')+'</dd></dl>'+
                 '<section class="talk-content "'+contentClass+'><seciton class="arrow-outer jian-position1"><seciton class="arrow-shadow"></seciton></seciton><p>'+
                  pHtml+'</p></section></li>';
        return html;
    },

    /**
     * 图片压缩
     * @param img
     * @param quality 压缩量
     * @returns {string}
     */
    zipImg:function(img,quality){
        var mime_type = "image/jpeg";
        var cvs = document.createElement('canvas');
        //naturalWidth真实图片的宽度
        cvs.width = img.naturalWidth;
        cvs.height = img.naturalHeight;
        var ctx = cvs.getContext("2d").drawImage(img, 0, 0);
        return cvs.toDataURL(mime_type, quality/100);
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
                        chat.setContent({fromUser: fromUser, content: {type: row.msgType, value: row.content}});
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

 