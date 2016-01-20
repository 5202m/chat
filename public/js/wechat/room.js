/**
 * 聊天器客户端通用操作类
 * @type {{init: Function, setKindEdit: Function, setSocket: Function}}
 * author Alan.wu
 */
var room={
    maxRows:50,//显示的最大条数
    //信息类型
    msgType:{
       text:'text' ,
        img:'img',
        file:'file'
    },
    imgDB:{},
    isCanReSend:true,
    socket:null,
    socketUrl:'',
    userInfo:null,
    verifyCodeIntervalId:'',
    init:function(){
        room.wrapAdjust(true);//先调整高度，防止出现空白
        this.setUserInfo();
        this.setSocket();
        this.setEvent();
        this.createImgDB();//创建数据库
        this.setAdvertisement();
    },
    /**
     * 提取头像
     * @param avatar
     * @param userType
     */
    getUserAvatar:function(avatar,userType){
        if(common.isValid(avatar)){
            return avatar;
        }else if(!userType || userType==0){
            return '/images/wechat/user.jpg';
        }else{
            return '/images/wechat/def_b_user.png';
        }
    },
    /**
     * 设置用户信息
     */
    setUserInfo:function(){
        $(".user-name").html(room.userInfo.nickname);//设置头像
        $(".user-img img").attr("src",this.getUserAvatar(room.userInfo.avatar,room.userInfo.userType));//设置头像
    },
    /**
     * 文档信息(广告,公告)
     * @param code
     * @param curPageNo
     * @param pageSize
     * @param orderByStr
     * @param callback
     */
    getArticleList:function(code,platform,hasContent,curPageNo,pageSize,orderByStr,callback){
        try{
            $.getJSON('/wechat/getArticleList',{code:code,platform:platform,hasContent:hasContent,pageNo:curPageNo,pageSize:pageSize,orderByStr:orderByStr},function(data){
                /*console.log("getArticleList->data:"+JSON.stringify(data));*/
                callback(data);
            });
        }catch (e){
            console.error("getArticleList->"+e);
            callback(null);
        }
    },
    /**
     * 设置广告
     */
    setAdvertisement:function(){
        /*$('#room_advertisement s').click();*/
        this.getArticleList("advertisement","wechat_room","0",1,1,'',function(dataList){
            if(dataList.result==0){
                var data=dataList.data;
                if(data && data[0]){
                    if(common.isValid(data[0].linkUrl)){
                        $("#room_advertisement a").attr("href",data[0].linkUrl);
                    }
                    $("#room_advertisement img").attr("src",data[0].mediaUrl);
                    $('#room_advertisement').show();
                    room.wrapAdjust(true);
                }
            }
        });
    },
    createImgDB:function(){//创建数据库
        try{
            room.imgDB =openDatabase('imgDB', '1.0','imgDB', 15 * 1024 * 1024);
            room.imgDB.transaction(function (tx) {
               tx.executeSql('create table if not exists bigImg (id unique, data)',[],function(){
                   room.clearImgTable();//清空数据表
               });
             });
        }catch(e){
            room.isCanReSend=false;
        }
    },
    deleteImgDataById:function(id){//通过id删除数据对应数据
        room.imgDB.transaction(function (tx) {
           tx.executeSql('delete from bigImg where id=?',[id]);
        });
    },
    clearImgTable:function(){//清空表数据
        room.imgDB.transaction(function (tx) {
          tx.executeSql('delete from bigImg');
        });
    },
    getImgDataById:function(id,callback){//通过id找对应数据
        try{
            room.imgDB.transaction(function (tx) {
                tx.executeSql('select * from bigImg where id=?', [id], function (tx, results) {
                    callback(results.rows.item(0).data);
                }, null);
            });
        }catch(e){
            console.error("getImgDataById has error:"+e);
        }
    },
    insertImgDBData:function (row){  //插入数据
        try{
            room.imgDB.transaction(function (tx) {
                tx.executeSql('insert into bigImg (id, data) values (?, ?)',[row.id,row.data]);
            });
        }catch(e){
         console.error("insertImgDBData has error:"+e);
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
     * 设置报价
     */
    setPrice:function(){
        try{
            getAllMarketpriceIndex("ws://kdata.gwfx.com:8087/websocket.do","service=HqDataWebSocketService&method=pushMarketprice&symbol=XAGUSD|XAUUSD|USDX|CLWTI&dataType=simpleMarketPrice","http://kdata.gwfx.com:8099/gateway.do?service=HqDataService&method=getMarkrtPriceDataFromCache");
        }catch (e){
            console.error("setPrice->"+e);
        }
    },
    /**
     * 调整高度
     */
    wrapAdjust:function(isAdjustFloat){
        $('.wrapper').css('top',$('#header').height());
        if(isAdjustFloat){
            $('.hq-btn').css({
                left:function(){
                    return $(window).width()-$(this).width()-5;
                },
                top:function(){
                    return $('#header').height()+7;
                }
            });

            $('.kf-btn').css({
                left:function(){
                    return $(window).width()-$(this).width()-5;
                },
                top:function(){
                    return $('#header').height()+52;
                }
            });
        }
    },
    /**
     * 事件设置
     */
    setEvent:function(){
        /**
         * 手机输入监听
         */
        $('#loginForm input[name=mobilePhone]')[0].addEventListener("input", function(e) {
            var domBtn=$(this).parents("form").find(".rbtn");
            if(parseInt(domBtn.attr("t")) < 60 && domBtn.prop("disabled"))
            {
                //倒计时状态不修改样式
                return;
            }
            if(common.isMobilePhone(this.value)){
                domBtn.attr("disabled" ,false);
            }else{
                domBtn.attr("disabled" ,true);
            }
        }, false);
        /**
         * 获取验证码事件
         */
        $('#loginForm .rbtn').click(function(){
            $(".wrong-info").html("");
            if($(this).is(':disabled')){
                return;
            }
            $(this).attr("disabled" ,true).val("发送中...");
            var mobile=$("#loginForm input[name=mobilePhone]").val();
            var useType = $(this).attr("ut");
            try{
                $.getJSON('/wechat/getMobileVerifyCode?t=' + new Date().getTime(),{mobilePhone:mobile,useType:useType},function(data){
                    if(!data || data.result != 0){
                        if(data.errcode == "1005"){
                            alert(data.errmsg);
                        }else{
                            console.error("提取数据有误！");
                        }
                        room.setVerifyCodeTime('#loginForm .rbtn',true);
                    }else{
                        room.setVerifyCodeTime('#loginForm .rbtn');
                    }
                });
            }catch (e){
                room.setVerifyCodeTime('#loginForm .rbtn',true);
                console.error("setMobileVerifyCode->"+e);
            }
        });
        /*数据盘收起*/
        $('.date-box .hide-btn').click(function(){
            $('.date-box').hide();
            $('.hq-btn').show();
            room.wrapAdjust();
        });
        /*行情、客服漂浮按钮*/
        (function(){
            util.rangeControl = function(num,max){
                num = Math.max(num,0);
                return Math.min(num,max);
            };

            var start_left,start_top;
            util.toucher($(".hq-btn")[0])
                .on('singleTap',function(e){
                    if("1"!=$(this).attr("set_p")){
                        room.setPrice();//设置报价
                    }
                    $(this).attr("set_p","1");
                    $('.date-box').show();
                    $(this).hide();
                    room.wrapAdjust();
                })
                .on('swipeStart',function(e){
                    start_left = parseInt(this.style.left) || 0;
                    start_top = parseInt(this.style.top) || 0;
                    this.style.transition = 'none';

                }).on('swipe',function(e){
                    this.style.left = util.rangeControl(start_left + e.moveX,$(window).width() - this.clientWidth) + 'px';
                    this.style.top = util.rangeControl(start_top + e.moveY,$(window).height() - this.clientHeight) + 'px';
                    return false;
                }).on('swipeEnd',function(e){
                    return false;
                });

            util.toucher($(".kf-btn")[0])
                .on('singleTap',function(e){
                    var uId=$(this).attr("uId"),name=$(this).attr("n");
                    room.setTxtOfNickname(common.isValid(uId)?uId:3,common.isValid(name)?name:"金道贵金属客服",null,3);//@客服,如果不存在客服id则存入客服角色id
                })
                .on('swipeStart',function(e){
                    start_left = parseInt(this.style.left) || 0;
                    start_top = parseInt(this.style.top) || 0;
                    this.style.transition = 'none';

                }).on('swipe',function(e){
                    this.style.left = util.rangeControl(start_left + e.moveX,$(window).width() - this.clientWidth) + 'px';
                    this.style.top = util.rangeControl(start_top + e.moveY,$(window).height() - this.clientHeight) + 'px';
                    return false;
                }).on('swipeEnd',function(e){
                    return false;
                });
        })();

        /*广告关闭*/
        $('#room_advertisement s').click(function(){
            $('#room_advertisement').hide();
            room.wrapAdjust();
        });

        /*设置*/
        $('.set-btn').click(function(){
            $('.set-bar').show()
        });
        /**
         * 隐藏阅读设置
         */
        $('.set-bar .set-close').click(function(){
            $('.set-bar').hide()
        });

        //阅读设置
        $("#readSet").click(function(){
            if($(this).hasClass("guan-fon")){
                $(this).removeClass("guan-fon").addClass("on-fon");
                $("#content_ul li[uType!=2]").hide();
            }else{
                $(this).removeClass("on-fon").addClass("guan-fon");
                $("#content_ul li").show();
            }
            room.setScrollToBottom();
        });

        /**
         * 输入框设置
         */
        $('#contentText').focus(function(){
            $('.add-img').hide();
            $('.wrapper').css('top',"0px");
            $('#header').fadeOut('fast');
            room.setScrollToBottom();
        }).blur(function(){
            room.wrapAdjust();
            $('#header').fadeIn('fast');
            room.setScrollToBottom();
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
                    room.removeTxtOfNickname();
                }
            }
        });

        //手势控制
         $('#content_div')[0].addEventListener("touchstart", function(e) {
            if($('.wrapper').position().top==0){
               $('#contentText').blur();
            }
         }, false);


        /**
         * top信息点击
         */
        $("#top_info label").click(function(){
            room.setTxtOfNickname($(this).attr("fuserId"),$(this).attr("fnickname"),$("#top_info span").html(),$(this).attr("fuType"));
            $(this).html("");
            $("#top_info").hide();
            $(".talk-infobox").css("margin-top","25px");
        });
        /**
         * 关闭登录框按钮事件
         */
        $("#loginSection .del-btn,#tipSection .del-btn").click(function(){
            common.hideBox('#openBox');
            $('#formBtnLoad').hide();
            $("#loginForm")[0].reset();
            $('.wrong-info').html("");
            room.setVerifyCodeTime('#loginForm .rbtn',true);
        });
        /**
         * 删除顶部消息
         */
        $("#close_top_btn").click(function(){
            $("#top_info").hide();
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
         * 登录按钮事件
         */
        $("#formBtn").click(function(){
            $(".wrong-info").html("");
            if(!room.checkLoginInput()){
                return;
            }
            $('#formBtn').attr('disabled',true);
            $('#formBtnLoad').show();
            common.getJson("/wechat/checkClient",$("#loginForm").serialize(),function(result){
                room.clearVerifyInter('#loginForm .rbtn');
                $(".wrong-info").html("");
                $('#formBtn').attr('disabled',false);
                $('#formBtnLoad').hide();
                if(result.errcode){
                    $(".wrong-info").html(result.errmsg);
                    return false;
                }
                var flag=result.flag;
                if(result.isSys){
                    if(result.isOK){
                        room.userInfo.nickname=result.nickname;
                        room.userInfo.userType=result.userType;
                        $(".user-stadus").hide();
                        $("#loginSection").hide();
                        $("#tipSection h2").html("验证成功");
                        $("#tipSection .succ-p-info").html("尊贵的客户：欢迎光临金道贵金属微解盘！");
                        $("#tipSection").show();
                    }else{
                        $(".wrong-info").html("账号或手机号验证不通过，请重新输入！");
                    }
                }else{
                    if(flag==1||flag==3){//客户记录标志:0（记录不存在）、1（未绑定微信）、2（未入金激活）、3（绑定微信并且已经入金激活）
                        $("#loginSection").hide();
                        $("#tipSection h2").html("登录成功");
                        $("#tipSection .succ-p-info").html("尊贵的客户：欢迎光临金道贵金属微解盘，即时参与和分析师互动，让投资变得更简单！");
                        $("#tipSection").show();
                        $(".user-stadus").hide();
                    }else if(flag==2){
                        $("#loginSection").hide();
                        $("#tipSection h2").html("提示");
                        $("#tipSection .succ-p-info").html("欢迎光临金道贵金属微解盘，目前发言功能暂仅对激活客户开放，了解更多请咨询金道微信客服！");
                        $("#tipSection").show();
                        $(".user-stadus").hide();
                    }else if(flag==4){
                        $(".wrong-info").html("该账号已被占用，请输入其他账号！");
                    }else{
                        $(".wrong-info").html("账号或手机号验证不通过，请重新输入！");
                    }
                }
            },true,function(err){
                $('#formBtn').attr('disabled',false);
                $('#formBtnLoad').hide();
            });
        });

        //聊天内容发送事件
        $("#sendBtn").click(function(){
            var msg=$("#contentText").val();
            if(common.isValid(msg)) {
                if(msg.length>=80){
                    room.showTipBox("注意：消息内容超过最大长度限制（80字以内）！");
                    return false;
                }
                msg=msg.replace(/<[^>].*?>/g,'');
                var strRegex = '(((https|http)://)?)[A-Za-z0-9-_]+\\.[A-Za-z0-9-_&\\?\\/.=]+';//加链接
                var regex=new RegExp(strRegex,"gi");
                msg=msg.replace(regex,function(m){
                    return !isNaN(m)?m:'<a href="'+m+'" target="_blank">'+m+'</a>';
                });
                var sendObj={uiId:room.getUiId(),fromUser:room.userInfo,content:{msgType:room.msgType.text,value:msg}};
                sendObj.fromUser.toUser = room.getToUser();
                room.socket.emit('sendMsg',sendObj);//发送数据
                room.setContent(sendObj,true,false);//直接把数据填入内容栏
                sendObj.fromUser.toUser=null;//发送成功后，把toUser设置为空
                room.removeTxtOfNickname();
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
            $('.add-img').hide();
            room.checkSendAuthority(function(isOk){
                if(isOk){
                    var img = _this.files[0];
                    // 判断是否图片
                    if(!img){
                        return false;
                    }
                    // 判断图片格式
                    if(!(img.type.indexOf('image')==0 && img.type && /\.(?:jpg|png|gif)$/.test(img.name.toLowerCase())) ){
                        alert('目前暂支持jpg,gif,png格式的图片！');
                        return false ;
                    }
                    var fileSize=img.size;
                    if(fileSize>=1024*1024*3){
                        alert('发送的图片大小不要超过3MB.');
                        return false ;
                    }
                    //加载文件转成URL所需的文件流
                    var reader = new FileReader();
                    reader.readAsDataURL(img);
                    var uiId=room.getUiId();
                    //先填充内容框
                    room.setContent({uiId:uiId,fromUser:room.userInfo,content:{msgType:room.msgType.img,value:'',needMax:0}},true,false);
                    reader.onload = function(e){
                        var sendObj={uiId:uiId,fromUser:room.userInfo,content:{msgType:room.msgType.img,value:'',needMax:0,maxValue:''}};
                        sendObj.content.value=e.target.result;
                        room.zipImg(sendObj,100,60,function(result,value){//压缩缩略图
                            if(result.error){
                                alert(result.error);
                                $('#'+uiId).remove();
                                return false;
                            }
                            if(sendObj.content.value.length<value.length){
                                value=sendObj.content.value;
                            }
                            var imgObj=$("#"+result.uiId+" .dialog .imgdiv img");
                            imgObj.attr("src",value);
                            imgObj.attr("needMax",result.content.needMax);
                            room.dataUpload(result);
                            if(result.content.needMax==1 && room.isCanReSend){
                                room.insertImgDBData({id:uiId,data:result.content.value});
                            }
                        });
                    };
                    reader.onprogress=function(e){};
                    reader.onloadend = function(e){};
                }
            });
        }, false);
    },
    /**
     * 数据上传
     * @param data
     */
    dataUpload:function(data){
        //上传图片到后端
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/wechat/uploadData');
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
                console.log("success!");
             }
        };
        data.fromUser.socketId=room.socket.id;
        xhr.send(JSON.stringify(data)); //发送base64
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
     * 检查发送状态
     * @param uiId
     */
    checkSendStatus:function(uiId,isInitEvent,msgType){
        var li=$("#"+uiId),ld=null;
        if(msgType==room.msgType.img){
            ld=$('.imgdiv .sending',li);
            ld.siblings(".shadow-conut").html("");
            ld.addClass("sfailed").removeClass("sending").attr("title","重发");
        }else{
            ld=$('.txtBox .sending',li);
            ld.addClass("sfailed").removeClass("sending").attr("title","重发");
        }
        /*if(ld.length>0 && isInitEvent && room.isCanReSend){
            ld.click(function(){
                var uiIdTmp=$(this).parents("li").attr("id");
                ld.removeClass("img-load-gan").addClass("img-loading");
                if(li.attr("mType")==room.msgType.img){
                    var sendObj={uiId:uiIdTmp,fromUser:room.userInfo,content:{msgType:room.msgType.img,value:'',needMax:0,maxValue:''}};
                    var imgObj=$("#"+uiIdTmp+" img");
                    sendObj.content.needMax=imgObj.attr("needMax");
                    if(sendObj.content.needMax==1){
                        room.getImgDataById(uiIdTmp,function(data){ //提取数据
                            sendObj.content.maxValue=data;
                            room.dataUpload(sendObj);//上传数据
                        });
                    }else{
                        sendObj.content.value=imgObj.attr("src");
                        room.dataUpload(sendObj);//上传数据
                    }
                }else{
                    room.socket.emit('sendMsg',{uiId:uiIdTmp,fromUser:room.userInfo,content:{msgType:room.msgType.text,value:$(".talk-content p",li).html()}});
                }
                room.timeOutSend(uiIdTmp,false);//一分钟后检查是否发送成功，不成功提示重发
            });
        }*/
    },
    /**
     * 检查发送权限
     */
    checkSendAuthority:function(callback){
        common.getJson("/wechat/checkSendAuthority",{accountNo:room.userInfo.accountNo,userId:room.userInfo.userId,groupId:room.userInfo.groupId,fromPlatform:room.userInfo.fromPlatform},function(result){
            if(result.isVisitor) {
                room.openLoginBox();
                callback(false);
            }else{
                callback(true);
            }
        },true);
    },
    /**
     * 移除@对方的输入
     */
    removeTxtOfNickname:function(){
        var obj=$("#txtNicknameId");
        if(common.isValid(obj.text())){
            obj.html("");
            $("#contentText").css({"padding-left":"1%"}).width("98%");//重置输入框宽度
        }
    },

    /**
     * 设置@发送的昵称
     * @param tId
     * @param name
     * @param txt
     */
    setTxtOfNickname:function(tId,name,txt,userType){
        $("#contentText").width('98%');//重置输入框宽度
        var sp='';
        if(common.isValid(txt)){
            sp='<span style="display:none;">'+txt+'</span>';
        }
        $("#txtNicknameId").html('<span class="dt-send-name" tId="'+tId+'" uType="'+userType+'">@<label>'+name+'</label>'+sp+'</span>');
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
               if(this.name=='mobilePhone'&& !common.isMobilePhone($(this).val())) {
                   $(".wrong-info").attr("tId",this.name).html("手机号码输入有误！");
                   isTrue=false;
                   return isTrue;
               }
           }
       });
       return isTrue;
    },

    /**
     * 设置验证码
     * @param tId
     * @param isClear
     */
    setVerifyCodeTime:function(tId,isClear){
        var t=0;
        if(!isClear){
            t=parseInt($(tId).attr("t"))||60;
            if(t>1 && common.isBlank(room.verifyCodeIntervalId)){
                room.verifyCodeIntervalId=setInterval("room.setVerifyCodeTime('"+tId+"')",1000);
            }
        }
        if(t>1){
            $(tId).attr("t",t-1).val("获取验证码("+(t-1)+")");
        }else{
            room.clearVerifyInter(tId);
        }
    },
    /**
     * 清除验证码的Interval
     * @param domId
     */
    clearVerifyInter:function(domId){
        if(common.isValid(room.verifyCodeIntervalId)){
            clearInterval(room.verifyCodeIntervalId);
            room.verifyCodeIntervalId="";
        }
        var disabled=true;
        if(common.isMobilePhone($("#loginForm input[name=mobilePhone]").val())){
            disabled=false;
        }
        $(domId).attr("t",60).attr("disabled",disabled).val("获取验证码");
    },
    /**
     * 打开登录框
     */
    openLoginBox:function(){
        $("#loginForm")[0].reset();
        $("#loginForm input[type=hidden]").each(function(){
            $(this).val(room.userInfo[this.name]);
        });
        $("#tipSection").hide();
        $("#loginSection").show();
        common.showBox('#openBox');
    },
    /**
     * 设置加载框
     * @param dom
     * @param isShow
     */
    setLoadImg:function(dom,isShow){
        if(isShow){
            dom.parent().find(".loading-box").show();
        }else{
            dom.parent().find(".loading-box").hide();
        }
    },
    /**
     * 一分钟后检查是否发送成功，不成功提示重发
     * @param uiId
     * @param isInitEvent 首次需要初始化点击事件
     */
    timeOutSend:function(uiId,isInitEvent,msgType){
        window.setTimeout(function(){//一分钟后检查是否发送成功，不成功提示重发
            room.checkSendStatus(uiId,isInitEvent,msgType);
        },60000);
    },
    /**
     * 格式发布日期
     */
    formatPublishTime:function(time){
        return common.isBlank(time)?'':common.longMsTimeToDateTime(Number(time.replace(/_.+/g,"")),'.');
    },
    /**
     * 提取@对话html
     */
    getToUser:function(){
        var curDom=$('#txtNicknameId .dt-send-name');
        if(curDom.length>0){
            var userType=common.trim(curDom.attr("uType"));
            var obj={userId:common.trim(curDom.attr("tId")),nickname:curDom.find("label").text(),userType:userType,talkStyle:("3"==userType?1:0)},sp=curDom.find("span");
            if(sp.length>0){
                obj.question=sp.text();
            }
            return obj;
        }else{
            return null;
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
            room.timeOutSend(data.uiId, true,data.content.msgType);//一分钟后检查是否发送成功，不成功提示重发
        }
        if(data.isVisitor){
            $("#"+data.uiId).remove();
            room.openLoginBox();
            return;
        }
        if(isLoadData && $("#"+fromUser.publishTime).length>0){
            $("#"+fromUser.publishTime+" .dialog em[class=ruleTipStyle]").remove();
            return;
        }
        if(data.rule){
            room.removeLoadDom(data.uiId);
            if(data.value ){
                if(data.value.leaveRoom){
                    room.leaveRoomTip();
                }else if(data.value.needApproval){
                    $('#'+data.uiId).attr("id",fromUser.publishTime);
                }else{
                    $('#'+data.uiId+' .dialog').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
                }
            }
            return;
        }
        if(!isMeSend && room.userInfo.userId==fromUser.userId && data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
            room.removeLoadDom(data.uiId);
            $('#'+data.uiId+' .uname label').html(room.formatPublishTime(fromUser.publishTime));
            $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
            //设置看大图的url
            if(data.content.msgType==room.msgType.img){
                if(data.content.needMax==1 && room.isCanReSend){//清除重发前的原始数据
                    room.deleteImgDataById(data.uiId);
                }
                var imgdiv=$('#'+fromUser.publishTime+' .imgdiv');
                var url=data.content.needMax?'/wechat/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId:imgdiv.find("a img").attr("src");
                imgdiv.find('a[class=swipebox]').attr("href",url);
                //上传成功后可以点击查看
                $('.swipebox').swipebox();
            }
             return;
        }
        var contentDivDom=$("#content_div")[0],isScroll=(contentDivDom.scrollTop + $(contentDivDom).height() >= contentDivDom.scrollHeight);
        var li=room.formatContentHtml(data,isMeSend);
        var ul=$("#content_ul");
        ul.append(li);
        if(!isLoadData && isScroll) {
            room.setScrollToBottom();
        }
        //内容@事件设置
        if(data.content.msgType==room.msgType.text && fromUser.toUser && common.isValid(fromUser.toUser.userId)){
            if(!isLoadData && fromUser.toUser.userId==room.userInfo.userId && fromUser.userId!=room.userInfo.userId){//如果是@自己，则在顶部浮动层显示
                $("#top_info").show();
                $(".talk-infobox").css("margin-top",(25+$("#top_info").height())+"px");
                $("#top_info label").html(fromUser.nickname+':@'+fromUser.toUser.nickname).attr("tId",fromUser.toUser.userId).attr("fuType",fromUser.userType).attr("fnickname",fromUser.nickname).attr("fuserId",fromUser.userId);
                $("#top_info span").html(data.content.value);
            }
            var dtObj=null;
            if(common.isValid(fromUser.toUser.question)){
                dtObj=$('#'+fromUser.publishTime+' .dialog .asker');
                dtObj.click(function () {
                    room.setTxtOfNickname($(this).attr("tId"),$(this).html(),null,$(this).attr("uType"));
                });
            }else{
                dtObj=$('#'+fromUser.publishTime+' .dialog .dt-send-name');
                dtObj.click(function () {
                    room.setTxtOfNickname($(this).attr("tId"),$(this).find("label").text(),null,$(this).attr("uType"));
                });
            }
        }
        //设计师@事件设置
        $('#'+fromUser.publishTime+' .headimg img').click(function () {
            var pDom=$(this).parent().parent();
            room.setTxtOfNickname($(this).parent().attr("tId"),pDom.find(".uname strong").text(),null,pDom.attr("uType"));
        });
        if($("#readSet").hasClass("on-fon")){ //如果开启了只看分析师，则隐藏不是分析师的内容
            $("#content_ul li[uType!=2]").hide();
        }
    },

    /**
     * 提取用户类型字符
     * @param userType
     */
    getUserTypeName:function(userType){
        if(userType==1){
           return '(管理员)';
        }
        if(userType==2){
            return '(分析师)';
        }
        if(userType==3){
            return '(客服)';
        }
    },
    /**
     * 格式昵称
     * @param nickname
     * @param position
     * @param userType
     */
    formatNickname:function(userType,nickname,position){
      if(!userType||userType==0){
          return nickname;
      }else{
          var newNickname='';
          if(common.isValid(position)){
              newNickname=position+'-';
          }
          newNickname+=nickname+this.getUserTypeName(userType);
          return newNickname;
      }
    },
    /**
     * 格式内容栏
     */
    formatContentHtml:function(data,isMeSend){
        var liClass='',unameHtml='',dtHtml='',loadImgHtml='',loadHtml='',liDom=[],
            fromUser=data.fromUser,
            content=data.content,
            nickname=room.formatNickname(fromUser.userType,fromUser.nickname,fromUser.position);
        if(room.userInfo.userId==fromUser.userId){
            liClass="me-li";
            nickname='我';
            unameHtml='<label>'+room.formatPublishTime(fromUser.publishTime)+'</label><strong>'+nickname+'</strong>';
            if(isMeSend){
                loadHtml='<i class="sending"></i>';
                loadImgHtml=loadHtml+'<span class="shadow-box"></span><s class="shadow-conut"></s>';
            }
        }else if(fromUser.userType==2) {
            if(room.msgType.img!=content.msgType){
                liClass='expert-li';
            }
        }else{
            liClass="visitor-li";
        }
        if(common.isBlank(unameHtml)){
            unameHtml='<strong>'+nickname+'</strong>'+room.formatPublishTime(fromUser.publishTime);
        }
        liDom.push('<li class="'+liClass+' clearfix" id="'+fromUser.publishTime+'" uType="'+fromUser.userType+'" mType="'+content.msgType+'">');
        liDom.push('<div class="headimg" tId="'+fromUser.userId+'"><img src="'+room.getUserAvatar(fromUser.avatar,fromUser.userType)+'"/></div>');
        liDom.push('<div class="detail">');
        liDom.push('<span class="uname">'+unameHtml+'</span>');
        if(content.msgType==room.msgType.img){
            liDom.push('<div class="dialog sendimg">');
            liDom.push('<div class="imgdiv">');
            var pHtml='';
            if(content.needMax){
                liDom.push('<a href="/wechat/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId+'" class="swipebox" ><img src="'+content.value+'" alt="图片"/></a>');
            }else{
                liDom.push('<a href="'+content.value+'" class="swipebox" ><img src="'+content.value+'" alt="图片" /></a>');
            }
            liDom.push(loadImgHtml);
            liDom.push('</div></div>');
        }else{
            if(content.msgType==room.msgType.text && fromUser.toUser && common.isValid(fromUser.toUser.userId)){
                if(common.isValid(fromUser.toUser.question)){
                    liDom.push('<div class="dialog">');
                    liDom.push('<p class="question"><span class="asker" tId="'+fromUser.toUser.userId+'" uType="'+fromUser.toUser.userType+'">'+fromUser.toUser.nickname+'</span><label>&nbsp;:&nbsp;</label><span>'+fromUser.toUser.question+'</span></p>');
                    liDom.push('<p class="reply"><span>回复:</span>'+common.encodeHtml(content.value)+'</p></div>');
                }else{
                    dtHtml='<span class="dt-send-name" tId="'+fromUser.toUser.userId+'" uType="'+fromUser.toUser.userType+'">@<label>'+fromUser.toUser.nickname+'</label></span>';
                    liDom.push('<div class="dialog"><span class="to"></span>'+dtHtml+common.encodeHtml(content.value)+'</div>');
                }
            }else{
                liDom.push('<div class="dialog txtBox"><span class="to"></span>'+loadHtml+common.encodeHtml(content.value)+'</div>');
            }
        }
        liDom.push('</div></li>');
        return liDom.join("");
    },
    /**
     * 离开房间提示
     */
    leaveRoomTip:function(flag){
        var txt='';
        if(flag=="roomClose"){
            txt='房间已停用，';
        }
        if(flag=="otherLogin"){
            txt='您的账号已在其他地方登陆，';
        }
        this.showTipBox("注意："+txt+"正自动退出房间.....");
        window.setTimeout(function(){//3秒钟退出房间
            window.location.href="/wechat";
        },3000);
    },
    /**
     * 显示提示框
     */
    showTipBox:function(text){
        var dom=$(".errorbox");
        dom.find("span").html(text);
        dom.fadeIn(0).delay(6000).fadeOut(200);
    },
    /**
     * 移除加载提示的dom
     * @param uiId
     */
    removeLoadDom:function(uiId){
        $('#'+uiId+' .sending,#'+uiId+' .shadow-box,#'+uiId+' .shadow-conut').remove();
    },
    /**
     * 设置socket
     */
    setSocket:function(){
        this.socket = common.getSocket(io,this.socketUrl,this.userInfo.groupType);
        //建立连接
        this.socket.on('connect',function(){
            console.log('connected to server!');
            room.userInfo.socketId=room.socket.id;
            room.socket.emit('login',{userInfo:room.userInfo,lastPublishTime:$("#content_ul li:last").attr("id")});
            room.setLoadImg($("#content_ul"),true);
        });
        this.socket.on('disconnect',function(e){
            console.log('disconnect');
        });
        //出现异常
        this.socket.on("error",function(e){
            console.error('e:'+e);
        });
        //信息传输
        this.socket.on('sendMsg',function(data){
            room.setContent(data,false,false);
            if(data.content && data.content.msgType==room.msgType.img){
                $('.swipebox').swipebox();
            }
        });
        //通知信息
        this.socket.on('notice',function(result){
            var data=result.data;
            switch (result.type)
            {
                case 'onlineNum':
                {
                    $("#onlineUserNum").text(data.onlineUserNum);
                    if(room.userInfo.userId==data.userId && data.hasRegister){
                        $(".user-stadus").hide();
                    }
                    break;
                }
                case 'removeMsg':
                    $("#"+data.replace(/,/g,",#")).remove();
                    break;
                case 'leaveRoom':{
                    room.leaveRoomTip(result.flag);
                    break;
                }
                case 'approvalResult':
                {
                    if(data.refuseMsg){
                        var publishTimeArr=data.publishTimeArr;
                        for(var i in publishTimeArr){
                            $("#"+publishTimeArr[i]+" .dialog em[class=ruleTipStyle]").html("已拒绝");
                        }
                    }else{
                        for (var i in data) {
                            room.formatUserToContent(data[i]);
                        }
                        $('.swipebox').swipebox();
                        room.setScrollToBottom();
                    }
                    break;
                }
            }
        });
        //信息传输
        this.socket.on('loadMsg',function(data){
            var msgData=data.msgData,isAdd=data.isAdd;
            if(!isAdd) {
                $("#content_ul").html("");
            }
            room.setLoadImg($("#content_ul"),false);
            if(msgData && $.isArray(msgData)) {
                msgData.reverse();
                for (var i in msgData) {
                    room.formatUserToContent(msgData[i]);
                }
                $('.swipebox').swipebox();
                if(!isAdd) {
                    room.setScrollToBottom();
                }
            }
        });
        //选择目标客服信息通知
        this.socket.on('targetCS',function(data){
            $(".kf-btn").attr("uId",data.userId).attr("n",data.nickname);
            $("#content_ul .dialog .dt-send-name[tId=3]").attr("tId",data.userId).find("label").html(data.nickname);
        });
    },
    /**
     * 设置滚动条到底部
     */
    setScrollToBottom:function(){
        $("#content_div").scrollTop($('#content_div')[0].scrollHeight);
    },
    formatUserToContent:function(row){
        var fromUser = {
            userId: row.userId,
            nickname: row.nickname,
            avatar: row.avatar,
            userType: row.userType,
            groupId: row.groupId,
            publishTime: row.publishTime,
            toUser:row.toUser,
            avatar:row.avatar,
            position:row.position
        };
        room.setContent({fromUser: fromUser,content:row.content},false,true);
    }
};
// 初始化
$(function() {
    room.init();
});
 