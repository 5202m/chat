/**
 * 后台聊天室客户端操作类
 * author Alan.wu
 */
var adminChat={
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
    init:function(){
        this.setSocket();
        this.setEvent();
        this.createImgDB();//创建数据库
        this.setPageUserInfo();
    },
    createImgDB:function(){//创建数据库
        try{
            adminChat.imgDB =openDatabase('imgDB', '1.0','imgDB', 15 * 1024 * 1024);
            adminChat.imgDB.transaction(function (tx) {
                tx.executeSql('create table if not exists bigImg (id unique, data)',[],function(){
                    adminChat.clearImgTable();//清空数据表
                });
            });
        }catch(e){
            adminChat.isCanReSend=false;
        }
    },
    deleteImgDataById:function(id){//通过id删除数据对应数据
        adminChat.imgDB.transaction(function (tx) {
            tx.executeSql('delete from bigImg where id=?',[id]);
        });
    },
    clearImgTable:function(){//清空表数据
        adminChat.imgDB.transaction(function (tx) {
            tx.executeSql('delete from bigImg');
        });
    },
    getImgDataById:function(id,callback){//通过id找对应数据
        try{
            adminChat.imgDB.transaction(function (tx) {
                tx.executeSql('select * from bigImg where id=?', [id], function (tx, results) {
                    callback(results.rows.item(0).data);
                }, null);
            });
        }catch(e){
            console.log("getImgDataById has error:"+e);
        }
    },
    insertImgDBData:function (row){  //插入数据
        try{
            adminChat.imgDB.transaction(function (tx) {
                tx.executeSql('insert into bigImg (id, data) values (?, ?)',[row.id,row.data]);
            });
        }catch(e){
            console.log("insertImgDBData has error:"+e);
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
     * 提取验证码
     */
    refreshVerifyCode:function(){
        $("#verifyCodeId img").attr("src",'/getVerifyCode?v='+Math.random());
    },
    /**
     * 设置页面用户信息
     */
    setPageUserInfo:function(){
        $(".user-name").html(adminChat.userInfo.nickname);
        $(".user-img img").attr("src","/images/ren.png");
    },
    /**
     * 事件设置
     */
    setEvent:function(){
        //审核操作类事件
        $(".operator-tool .btn").click(function(){
            var idArr=[],fuIdArr=[];
            $("#content_ul li input[type=checkbox]:checked").each(function(){
                var obj=$(this).parents("li");
                idArr.push(obj.attr("id"));
                var fObj=obj.attr("fuId");
                if(fuIdArr.length>0){
                    var fArrStr=","+fuIdArr.join(",")+",";
                    if(fArrStr.indexOf(","+fObj+",")==-1){
                        fuIdArr.push(fObj);
                    }
                }else{
                    fuIdArr.push(fObj);
                }
            });
            if(idArr.length==0){
                alert("请选择聊天记录！");
                return false;
            }
            adminChat.socket.emit('approvalMsg',{fromUser:adminChat.userInfo,status:$(this).attr("btnType"),publishTimeArr:idArr,fuIdArr:fuIdArr});
        });
        $(".operator-tool input[type=checkbox]").click(function(){
            var isCheck=this.checked;
            $("#content_ul li input[type=checkbox]").each(function(){
                this.checked=isCheck;
            });
        });
        /**
         * top信息点击
         */
        $("#top_info label").click(function(){
            adminChat.setTxtOfNickname($(this).attr("fuserId"),$(this).attr("fnickname"));
            $(this).html("");
            $("#top_info").hide();
            $(".talk-infobox").css("margin-top","25px");
        });
        /**
         * 删除顶部消息
         */
        $("#close_top_btn").click(function(){
            $("#top_info").hide();
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
        });
        /**
         * 键盘事件
         */
        $("#contentText").keydown(function(e){
            if(e.keyCode==8){//输入框退格事件
                if(common.isBlank($(this).val())){
                    adminChat.removeTxtOfNickname();
                }
            }
            if(e.keyCode==13){//按回车键发送
                $("#sendBtn").click();
                e.returnValue = false;//控制回车键换行
                return false;
            }
        });

        //聊天内容发送事件
        $("#sendBtn").click(function(){
            var msg=$("#contentText").val();
            if(common.isValid(msg)) {
                msg= $("#txtNicknameId").html()+msg.replace(/<[^>].*?>/g,'');//去掉所有html标志
                var sendObj={uiId:adminChat.getUiId(),fromUser:adminChat.userInfo,content:{msgType:adminChat.msgType.text,value:common.escapeHtml(msg)}};
                adminChat.socket.emit('sendMsg',sendObj);//发送数据
                var strRegex = '(((https|http)://)?)[A-Za-z0-9-_]+\\.[A-Za-z0-9-_&\?\/.=]+';
                var regex=new RegExp(strRegex,"gi");
                sendObj.content.value=sendObj.content.value.replace(regex,function(m){
                    return !isNaN(m)?m:'<a href="'+m+'" target="_blank">'+m+'</a>';
                });
                adminChat.setContent(sendObj,true,false);//直接把数据填入内容栏
                adminChat.removeTxtOfNickname();
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
            if(fileSize>=1024*1024*5){
                alert('发送的图片大小不要超过5MB.');
                return false ;
            }
            //加载文件转成URL所需的文件流
            var reader = new FileReader();
            reader.readAsDataURL(img);
            var uiId=adminChat.getUiId();
            //先填充内容框
            adminChat.setContent({uiId:uiId,fromUser:adminChat.userInfo,content:{msgType:adminChat.msgType.img,value:'',needMax:0}},true,false);
            reader.onload = function(e){
                var sendObj={uiId:uiId,fromUser:adminChat.userInfo,content:{msgType:adminChat.msgType.img,value:'',needMax:0,maxValue:''}};
                sendObj.content.value=e.target.result;
                adminChat.zipImg(sendObj,100,60,function(result,value){//压缩缩略图
                    if(result.error){
                        alert(result.error);
                        $('#'+uiId).remove();
                        return false;
                    }
                    var imgObj=$("#"+result.uiId+" img");
                    imgObj.attr("src",value);
                    imgObj.attr("needMax",result.content.needMax);
                    adminChat.dataUpload(result);
                    if(result.content.needMax==1 && adminChat.isCanReSend){
                        adminChat.insertImgDBData({id:uiId,data:result.content.value});
                    }
                });
            };
            reader.onprogress=function(e){};
            reader.onloadend = function(e){};
        }, false);
    },
    /**
     * 数据上传
     * @param data
     */
    dataUpload:function(data){
        //上传图片到后端
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/uploadData');
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
        data.fromUser.socketId=adminChat.socket.id;
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
    checkSendStatus:function(uiId,isInitEvent){
        var li=$("#"+uiId);
        var ld=$('.img-loading',li);
        ld.removeClass("img-loading").addClass("img-load-gan").attr("title","重发");
        if(ld.length>0 && isInitEvent && adminChat.isCanReSend){
            ld.click(function(){
                var uiIdTmp=$(this).parents("li").attr("id");
                ld.removeClass("img-load-gan").addClass("img-loading");
                if(li.attr("mType")==adminChat.msgType.img){
                    var sendObj={uiId:uiIdTmp,fromUser:adminChat.userInfo,content:{msgType:adminChat.msgType.img,value:'',needMax:0,maxValue:''}};
                    var imgObj=$("#"+uiIdTmp+" img");
                    sendObj.content.needMax=imgObj.attr("needMax");
                    if(sendObj.content.needMax==1){
                        adminChat.getImgDataById(uiIdTmp,function(data){ //提取数据
                            sendObj.content.maxValue=data;
                            adminChat.dataUpload(sendObj);//上传数据
                        });
                    }else{
                        sendObj.content.value=imgObj.attr("src");
                        adminChat.dataUpload(sendObj);//上传数据
                    }
                }else{
                    adminChat.socket.emit('sendMsg',{uiId:uiIdTmp,fromUser:adminChat.userInfo,content:{msgType:adminChat.msgType.text,value:$(".talk-content p",li).html()}});
                }
                adminChat.timeOutSend(uiIdTmp,false);//一分钟后检查是否发送成功，不成功提示重发
            });
        }
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
     * 一分钟后检查是否发送成功，不成功提示重发
     * @param uiId
     * @param isInitEvent 首次需要初始化点击事件
     */
    timeOutSend:function(uiId,isInitEvent){
        window.setTimeout(function(){//一分钟后检查是否发送成功，不成功提示重发
            adminChat.checkSendStatus(uiId,isInitEvent);
        },60000);
    },
    /**
     * 格式发布日期
     */
    formatPublishTime:function(time){
        return common.isBlank(time)?'':common.longMsTimeToDateTime(Number(time.replace(/_.+/g,"")),'.');
    },
    /**
     * 填充内容
     * @param data
     */
    setContent:function(data,isMeSend,isLoadData){
        var fromUser=data.fromUser;
        if(isMeSend){//发送，并检查状态
            fromUser.publishTime=data.uiId;
            adminChat.timeOutSend(data.uiId, true);//一分钟后检查是否发送成功，不成功提示重发
        }
        if(data.rule){
            adminChat.removeLoadDom(data.uiId);
            $('#'+data.uiId+' .talk-content p').append('<em class="ruleTipStyle">'+(data.value.tip)+'</em>');
            return;
        }
        if(isLoadData && $("#"+fromUser.publishTime).length>0){
            $("#"+fromUser.publishTime+" input").remove();
            return;
        }
        if(!isMeSend && adminChat.userInfo.userId==fromUser.userId && data.serverSuccess){//发送成功，则去掉加载框，清除原始数据。
            adminChat.removeLoadDom(data.uiId);
            $('#'+data.uiId).attr("id",fromUser.publishTime);//发布成功id同步成服务器发布日期
            $('#'+data.uiId+' dd[tId=time]').html(adminChat.formatPublishTime(fromUser.publishTime));
            //设置看大图的url
            if(data.content.msgType==adminChat.msgType.img){
                if(data.content.needMax==1 && adminChat.isCanReSend){//清除重发前的原始数据
                    adminChat.deleteImgDataById(data.uiId);
                }
                var liObj=$('#'+fromUser.publishTime+' .talk-content p');
                var url=data.content.needMax?'/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId:liObj.find("a img").attr("src");
                liObj.find('a[class=swipebox]').attr("href",url);
                //上传成功后可以点击查看
                $('.swipebox').swipebox();
            }
            return;
        }
        //定义变量
        var contentDivDom=$("#content_div")[0],isScroll=(contentDivDom.scrollTop + $(contentDivDom).height() >= contentDivDom.scrollHeight);
        var li=adminChat.formatContentHtml(data,isMeSend);
        var ul=$("#content_ul");
        ul.append(li);
        if(!isLoadData && isScroll) {//判断是否滚动
            $("#content_div")[0].scrollTop = $("#content_div")[0].scrollHeight;
        }
        //内容@事件设置
        var dtObj=$('#'+fromUser.publishTime+' .talk-content .dt-send-name');
        if(dtObj.length>0) {
            var tId=dtObj.attr("tId");
            if(!isLoadData && tId==adminChat.userInfo.userId && fromUser.userId!=adminChat.userInfo.userId){//如果是@自己，则在顶部浮动层显示
                $("#top_info").show();
                $(".talk-infobox").css("margin-top",(25+$("#top_info").height())+"px");
                $("#top_info label").html(fromUser.nickname+':'+dtObj.html()).attr("tId",tId).attr("fnickname",fromUser.nickname).attr("fuserId",fromUser.userId);
            }
            dtObj.click(function () {
                var name=dtObj.text();
                adminChat.setTxtOfNickname(dtObj.attr("tId"),name);
            });
        }
        //设计师@事件设置
        $('#'+fromUser.publishTime+' .talk-dlbox .dt-send-name').click(function () {
            adminChat.setTxtOfNickname($(this).attr("tId"),$(this).next().text());
        });
        //审核按钮事件
        $("#content_ul li[id="+fromUser.publishTime+"] .btn").click(function(){
            var idArr=[],fuIdArr=[];
            var pObj=$(this).parents("li");
            idArr.push(pObj.attr("id"));
            fuIdArr.push(pObj.attr("fuId"));
            adminChat.socket.emit('approvalMsg',{fromUser:adminChat.userInfo,status:$(this).attr("btnType"),publishTimeArr:idArr,fuIdArr:fuIdArr});
        });
        //checkbox事件
        $("#content_ul li[id="+fromUser.publishTime+"] input[type=checkbox]").click(function(){
            $(".operator-tool input[type=checkbox]")[0].checked=$("#content_ul li input[type=checkbox]:not(:checked)").length==0;
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
        if(adminChat.userInfo.userId==fromUser.userId){
            liClass='me-li';
            nickname='我';
            if(isMeSend){
                loadHtml='<i class="img-loading"></i>';
                loadImgHtml='<span class="shadow-box"></span><s class="shadow-conut"></s>';
            }
        }
        else if(fromUser.userType==2){//分析师样式设置
            if(adminChat.msgType.img!=content.msgType){
                liClass='expert-li';
            }
            dtHtml='<dt class="dt-send-name" tId="'+fromUser.userId+'">@</dt>';
        }
        if(common.isBlank(nickname)){
            nickname=fromUser.userId;
        }
        if(content.msgType==adminChat.msgType.img){
            contentClass='talk-img';
            if(content.needMax){
                pHtml='<a href="/getBigImg?publishTime='+fromUser.publishTime+'&userId='+fromUser.userId+'" class="swipebox" ><img src="'+content.value+'" alt="图片"/></a>'+loadImgHtml;
            }else{
                pHtml='<a href="'+content.value+'" class="swipebox" ><img src="'+content.value+'" alt="图片" /></a>'+loadImgHtml;
            }
        }else{
            pHtml=common.encodeHtml(content.value);
        }
        var html='<li class="'+liClass+' clearfix" id="'+fromUser.publishTime+'" utype="'+fromUser.userType+'" mType="'+content.msgType+'" fuId="'+fromUser.userId+'">';
        if(content.status==0){//需要审批
            html+=  '<dl class="talk-dlbox"><input type="checkbox"/>'+dtHtml+'<dt>'+nickname+'</dt><dd tId="time">'+adminChat.formatPublishTime(fromUser.publishTime)+'</dd><input type="button" class="btn" value="通过" btnType="1" /><input type="button" class="btn" value="拒绝" btnType="2"/></dl>';
            $(".operator-tool").show();
            $(".add-btn").css({top:"30px"});
            $(".send-btn").css({top:"30px"});
        }else{
            html+=  '<dl class="talk-dlbox">'+dtHtml+'<dt>'+nickname+'</dt><dd tId="time">'+adminChat.formatPublishTime(fromUser.publishTime)+'</dd></dl>';
        }
        html+= '<section class="talk-content '+contentClass+'"><seciton class="arrow-outer jian-position1"><seciton class="arrow-shadow"></seciton></seciton>'+loadHtml+'<p>'+pHtml+'</p></section></li>';
        return html;
    },
    /**
     * 移除加载提示的dom
     * @param uiId
     */
    removeLoadDom:function(uiId){
        $('#'+uiId+' .img-loading,#'+uiId+' .img-load-gan,#'+uiId+' .shadow-box,#'+uiId+' .shadow-conut').remove();
    },
    /**
     * 设置socket
     */
    setSocket:function(){
        this.socket = io.connect(this.socketUrl);
        //建立连接
        this.socket.on('connect',function(){
            console.log('connected to server!');
            $(".loading-box").show();
            adminChat.socket.emit('login',{userInfo:adminChat.userInfo,lastPublishTime:$("#content_ul li:last").attr("id")});
        });
        //登录成功返回信息
        this.socket.on('loginResult',function(data){});
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
            adminChat.setContent(data,false,false);
            if(data.content && data.content.msgType==adminChat.msgType.img){
                $('.swipebox').swipebox();
            }
        });
        //通知信息
        this.socket.on('notice',function(result){
            switch (result.type)
            {
                case 'onlineNum':
                    $("#onlineUserNum").text(result.data.onlineUserNum);
                    break;
                case 'removeMsg':
                    $("#"+result.data.replace(/,/g,",#")).remove();
                    break;
                case 'approvalResult':{
                    var data=result.data,fromUser=null,row=null;
                    if(data.fromUserId==adminChat.userInfo.userId){//自己在聊天室审核成功或拒绝
                        if(data.isOk){
                            var publishTimeArr=data.publishTimeArr;
                            if(data.status==2){//拒绝
                                for (var i in publishTimeArr) {
                                    $("#"+publishTimeArr[i]).remove();
                                }
                            }else{
                                for (var i in publishTimeArr) {
                                    $("#"+publishTimeArr[i]+" input").remove();
                                }
                            }
                            $(".operator-tool input[type=checkbox]").attr("checked",false);
                        }else{
                            alert("操作出现异常，请重新执行！");
                        }
                    }else if(data.refuseMsg){//具有相同角色拒绝
                        var publishTimeArr=data.publishTimeArr;
                        for (var i in publishTimeArr) {
                            $("#"+publishTimeArr[i]).remove();
                        }
                    }else{
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
                            adminChat.setContent({fromUser: fromUser,content:row.content},false,true);
                        }
                        $('.swipebox').swipebox();
                        $("#content_div")[0].scrollTop = $("#content_div")[0].scrollHeight;
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
            $(".loading-box").hide();
            var fromUser = null, row = null, result = [];
            if(msgData && $.isArray(msgData)) {
                msgData.reverse();
                var content=null;
                for (var i in msgData) {
                    row = msgData[i];
                    fromUser = {
                        userId: row.userId,
                        nickname: row.nickname,
                        avatar: row.avatar,
                        userType: row.userType,
                        groupId: row.groupId,
                        publishTime: row.publishTime//发布日期
                    };
                    row.content.status=row.status;
                    adminChat.setContent({fromUser: fromUser,content:row.content},false,true);
                }
                $('.swipebox').swipebox();
                if(!isAdd) {
                    $("#content_div")[0].scrollTop = $("#content_div")[0].scrollHeight;
                }
            }
        });
    }
};
// 初始化
$(function() {
    adminChat.init();
});