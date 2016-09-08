/**
 * 个人基本信息
 */
var studioMbPerson = {
    /**
     * 初始化（页面加载）
     */
    load : function(userInfo, options){
        if(userInfo && userInfo.isLogin){
            this.refreshNickname(userInfo.nickname);
            $("#person_hp").attr("src", studioMbPerson.getUserLevelIco(userInfo.clientGroup, userInfo.avatar));
            $("#upg_tbody_id").html("");
            studioMbPop.loadingBlock($("#upg_tbody_id"));
            $.getJSON('/hxstudio/getClientGroupList',null,function(data){
                studioMbPop.loadingBlock($("#upg_tbody_id"), true);
                if(data){
                    var currLevel='',seq=0,rowTmp=null;
                    for(var t in data){//找出对应排序号，按排序号分等级
                        if(data[t].clientGroupId==userInfo.clientGroup){
                            seq=data[t].sequence;
                        }
                    }
                    var trDomArr=[];
                    var trCls;
                    for(var i in data){
                        rowTmp=data[i];
                        trCls = '';
                        if(rowTmp.clientGroupId==userInfo.clientGroup){
                            trCls = ' class="on"';
                            currLevel="当前级别";
                        }else if(rowTmp.clientGroupId!="visitor" && seq<rowTmp.sequence){
                            currLevel=rowTmp.clientGroupId=='vip'?'联系客服升级':'<a href="javascript:void(0)" t="' + rowTmp.clientGroupId + '">升级</a>';
                        }else{
                            currLevel='---';
                        }
                        trDomArr.push('<tr' + trCls + '><td width="17%"><img src="'+studioMbPerson.getUserLevelIco(rowTmp.clientGroupId)+'"></td>');
                        trDomArr.push('<td width="20%"><b>'+common.trim(rowTmp.remark)+'</b></td>');
                        trDomArr.push('<td width="43%">'+common.trim(rowTmp.authorityDes)+'</td>');
                        trDomArr.push('<td width="20%">'+currLevel+'</td></tr>');
                    }
                    $("#upg_tbody_id").append(trDomArr.join(""));

                    //点击事件
                    $("#upg_tbody_id a").click(function(){
                        var loc_upLevel = $(this).attr("t");
                        studioMbPop.loadingBlock($("#personPop"));
                        common.getJson("/hxstudio/upgrade",{clientGroup : loc_upLevel},function(result){
                            studioMbPop.loadingBlock($("#personPop"), true);
                            if(result.isOK){
                                var msg = "升级成功！刷新页面后，您可享用更多直播间权限。";
                                if(result.clientGroup === "active" && "notActive" === loc_upLevel){
                                    msg += "<br/>注：你已经激活真实交易账户，直接为你升级到A级别。"
                                }
                                studioMbPop.popBox("msg", {
                                    msg : msg,
                                    type : "upg"
                                });
                            }else{
                                if("active" === loc_upLevel){
                                    studioMbPop.showMessage("很遗憾，您未激活恒信真实交易账户，升级失败！如有疑问请联系客服！");
                                }else if("notActive" === loc_upLevel){
                                    studioMbPop.showMessage("很遗憾，您未开通恒信真实交易账户，升级失败！如有疑问请联系客服！");
                                }else if("simulate" === loc_upLevel){
                                    studioMbPop.showMessage("很遗憾，您未开通恒信模拟交易账户，升级失败！如有疑问请联系客服！");
                                }
                            }
                        },true,function(){
                            studioMbPop.loadingBlock($("#personPop"), true);
                        });
                    });
                }
            });

            /**
             * 注销事件
             */
            $(".logoutbtn").bind("click", function(){
                LoginAuto.setAutoLogin(false);
                window.location.href="/hxstudio/logout?";
            });
        }
    },
    /**
     * 初始化（页面初始化）
     */
    init : function(){
    },
    /**
     * 获取用户头像
     * @param clientGroup
     * @param [avatar]
     * @returns {string}
     */
    getUserLevelIco : function(clientGroup, avatar){
        if(common.isValid(avatar)){
            return avatar;
        }
        var userLevelIco = "/hx/theme4/img/user_c.png";
        switch(clientGroup) {
            case "vip" :
                userLevelIco = "/hx/theme4/img/user_v.png";
                break;
            case "active" :
                userLevelIco = "/hx/theme4/img/user_r.png";
                break;
            case "notActive" :
                userLevelIco = "/hx/theme4/img/user_r.png";
                break;
            case "simulate" :
                userLevelIco = "/hx/theme4/img/user_d.png";
                break;
            case "register" :
                userLevelIco = "/hx/theme4/img/user_m.png";
                break;
        }
        return userLevelIco;
    },

    /**
     * 刷新昵称
     * @param nickname
     */
    refreshNickname : function(nickname){
        $("#person_nn").html(nickname);
    }
};

/**
 * 直播间登录
 */
var studioMbLogin = {
    verifyCodeIntervalId : 0,
    groupId : null,
    clientStoreId : null,
    clientGroup : null,

    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },
    /**
     * 初始化（页面初始化）
     */
    init : function(platform, groupId, clientStoreId, clientGroup, closeable, showTip, lgTime, spn){
        this.groupId = groupId;
        this.clientStoreId = clientStoreId;
        this.clientGroup = clientGroup;
        this.resetFormInput();
        $("#loginForm_csi").val(clientStoreId);
        if(closeable){
            $("#loginPop .pop-close").show();
        }else{
            $("#loginPop .pop-close").hide();
        }
        if(showTip){
            $("#login_tip").show().text($('#setlogintip').text());
            if(common.isValid(spn)){
                $("#login_tip").show().text($('#speaktip').text());
            }
        }else{
            $("#login_tip").hide();
        }
        if(common.isValid(lgTime) || common.isValid(spn)){
            roomJS.disableVideoSocket();
        }
        if(platform == "wechat"){
            $("#loginForm .auto_login").hide();
        }
    },
    /**
     * 绑定事件
     */
    setEvent : function(){
        /**
         * 提取验证码
         */
        $('#verMalCodeId').click(function () {
            $("#verMalCodeId img").attr("src",'/hxstudio/getVerifyCode?code=acLogin&t='+new Date().getTime());
        });
        /*登录框切换登陆方式*/
        $('.login-mode li').click(function () {
            $(this).addClass('on').siblings().removeClass('on');
            $('.mform .lg-box').hide().eq($(this).index()).show();
            if($(this).index()==1){
                $('#verMalCodeId').click();//获取图片验证码
            }
        });
        //登录
        $("#loginForm_sub").bind("click", function(){
            var isPwdLogin=$("#loginForm .login-inf").is(":visible");
            if(!studioMbLogin.checkFormInput("#loginForm",isPwdLogin?["mobilePhone","verifyCode"]:['accountNo','pwd','verMalCode'])){
                return;
            }
            studioMbPop.loadingBlock($("#loginPop"));
            common.getJson("/hxstudio/hxLogin",$("#loginForm").serialize()+'&isPwdLogin='+isPwdLogin,function(result){
                if(!result.isOK){
                    studioMbPop.loadingBlock($("#loginPop"), true);
                    studioMbPop.showMessage(result.error.errmsg);
                    return false;
                }else{
                    studioMbLogin.clientGroup = result.userInfo.clientGroup;
                    if(studioMbLogin.groupId){
                        common.getJson("/hxstudio/checkGroupAuth",{groupId:studioMbLogin.groupId},function(result){
                            if(!result.isOK){
                                if(result.error && result.error.errcode === "1000"){
                                    studioMbPop.showMessage("您长时间未操作，请刷新页面后重试！");
                                }
                            }else{
                                studioMbPop.loadingBlock($("#loginPop"), true);
                                studioMbPop.reload();
                            }
                        },true,function(err){
                            studioMbPop.loadingBlock($("#loginPop"), true);
                            if("success"!=err) {
                                studioMbPop.showMessage("操作失败，请联系客服！");
                            }
                        });
                    }else{
                        studioMbPop.loadingBlock($("#loginPop"), true);
                        LoginAuto.setAutoLogin($("#loginForm_al").prop("checked"));
                        studioMbPop.reload();
                    }
                }
            },true,function(){
                studioMbLogin.resetFormInput();
                studioMbPop.loadingBlock($("#loginPop"), true);
            });
        });

        //手机校验
        $("#loginForm_mb").bind("input propertychange", function(){
            var domBtn=$("#loginForm_vcb");
            if(parseInt(domBtn.attr("t")) < 60 && domBtn.is(".pressed") == false)
            {
                //倒计时状态不修改样式
                return;
            }
            if(common.isMobilePhone(this.value)){
                domBtn.addClass("pressed");
            }else{
                domBtn.removeClass("pressed");
            }
        });

        //获取验证码
        $("#loginForm_vcb").bind("click", function(){
            $("#loginForm_vc").blur();
            if(!$(this).hasClass("pressed")){
                return;
            }
            $(this).removeClass("pressed").val("发送中...");
            var mobile=$("#loginForm_mb").val();
            try{
                $.getJSON('/hxstudio/getMobileVerifyCode?t=' + new Date().getTime(),{mobilePhone:mobile, useType:"hxstudio_login"},function(data){
                    if(!data || data.result != 0){
                        if(data.errcode == "1005"){
                            studioMbPop.showMessage(data.errmsg);
                        }else{
                            console.error("提取数据有误！");
                        }
                        studioMbLogin.resetVerifyCode();
                    }else{
                        studioMbLogin.setVerifyCodeTime();
                    }
                });
            }catch (e){
                studioMbLogin.resetVerifyCode();
                console.error("getMobileVerifyCode->"+e);
            }
        });
    },
    /**
     * 重置页面
     */
    resetFormInput:function(){
        $("#loginForm_mb").val("").trigger("input");
        $("#loginForm_vc").val("");
    },
    /**
     * 检查页面输入
     */
    checkFormInput:function(formDom,filterName){
        var isTrue=true,message="";
        /*if(!$error){
            $error=$(formDom+" .error");
        }
        $error.attr("tId","").hide();*/
        var filterStr=' input[type!=checkbox]';
        if(filterName){
            for(var i in filterName){
                filterStr+='[name!='+filterName[i]+']';
            }
        }
        $(formDom+filterStr).each(function(){
            if(common.isBlank($(this).val())){
                if(this.name=='accountNo'){
                    isTrue = false;
                    message="账号不能为空！";
                }
                if(this.name=='pwd'){
                    isTrue = false;
                    message="密码不能为空！";
                }
                if(this.name=='verMalCode'){
                    isTrue = false;
                    message="验证码不能为空！";
                }
                if(this.name=='mobilePhone'){
                    isTrue = false;
                    message="手机号码不能为空！";
                }
                if(this.name=='verifyCode'){
                    isTrue = false;
                    message="验证码不能为空！";
                }
                if(this.name=='nickname'){
                    isTrue = false;
                    message="昵称不能为空！";
                }
                studioMbPop.showMessage(message);
                return isTrue;
            }else{
                if(this.name=='mobilePhone') {
                    $(this).val($.trim($(this).val()));
                    if(!common.isMobilePhone(this.value)){
                        isTrue = false;
                        message="手机号码输入有误！";
                        studioMbPop.showMessage(message);
                        return isTrue;
                    }
                }
                if(this.name=='nickname'&& !common.isRightName(this.value)) {
                    isTrue = false;
                    message="昵称为2至10位字符(数字/英文/中文/下划线)，不能全数字!";
                    studioMbPop.showMessage(message);
                    return isTrue;
                }
                if(this.name=='verMalCode'){
                    $(this).val(this.value.toLowerCase());
                }
            }
        });
        if(!isTrue){
            $error.show();
        }
        return isTrue;
    },
    /**
     * 重置验证码
     */
    resetVerifyCode:function(){
        if(studioMbLogin.verifyCodeIntervalId) {
            clearInterval(studioMbLogin.verifyCodeIntervalId);
            studioMbLogin.verifyCodeIntervalId=null;
        }
        $("#loginForm_vcb").attr("t",60).val("获取验证码");
        $("#loginForm_mb").trigger("input");
    },
    /**
     * 验证码倒计时
     */
    setVerifyCodeTime:function(){
        var item = $("#loginForm_vcb");
        var t=parseInt(item.attr("t"))||60;
        if(!studioMbLogin.verifyCodeIntervalId){
            studioMbLogin.verifyCodeIntervalId=window.setInterval(studioMbLogin.setVerifyCodeTime,1000);
        }
        if(t>1){
            item.attr("t",t-1).val("重新获取(" + (t-1) + ")");
        }else{
            studioMbLogin.resetVerifyCode();
        }
    },
    /**
     * 检查客户组别
     * @param type
     *  visitor-visitor
     *  vip-vip || active
     *  new-非vip && 非active
     */
    checkClientGroup : function(type){
        var chkResult = false;
        switch(type){
            case "visitor":
                chkResult = (this.clientGroup == "visitor");
                break;
            case "vip":
                chkResult = (this.clientGroup == "vip" || this.clientGroup == "active");
                break;
            case "new":
                chkResult = (this.clientGroup != "vip" && this.clientGroup != "active");
                break;
        }
        return chkResult;
    },

    /**
     * 设置或获取强制登录标志
     * @param [isForceLogin]
     * @returns {*}
     */
    forceLogin : function(isForceLogin){
        var storeObj = LoginAuto.get();
        if(typeof isForceLogin == "boolean"){
            if(storeObj){
                storeObj.forceLogin = isForceLogin;
                return LoginAuto.set(storeObj) && isForceLogin;
            }
        }else{
            return storeObj && (storeObj.forceLogin == true);
        }
        return false;
    }
};

/**
 * 错误消息显示
 */
var studioMbMsg = {
    type : null, //upg-升级成功、logout-异地登录，强制登出

    /**
     * 初始化（页面加载）
     */
    load : function(){
        $("#resultForm_sub").bind("click", function(){
            if(studioMbMsg.type == "logout"){
                studioMbPop.reload();
            }else{
                studioMbPop.popHide();
            }
        });
    },
    /**
     * 初始化（页面初始化）
     */
    init : function(type, msg){
        this.type = type;
        $("#resultForm_msg").html(msg);
        if(studioMbMsg.type == "logout"){
            $("#resultPop .pop-close, #resultForm i").hide();
            $("#resultForm_sub").val("重新登录");
        }else{
            $("#resultPop .pop-close, #resultForm i").show();
            $("#resultForm_sub").val("确认");
        }
    }
};

/**
 * 直播间设置
 */
var studioMbSet = {
    studioChatObj : null,

    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },

    /**
     * 初始化（页面初始化）
     */
    init : function(studioChatObj){
        this.studioChatObj = studioChatObj;
        $("#setForm").trigger("reset");
    },

    /**
     * 绑定事件
     */
    setEvent : function(){
        $("#setForm_sub").bind("click", function(){
            if(!studioMbSet.checkFormInput()){
                return;
            }
            studioMbPop.loadingBlock($("#setPop"));
            common.getJson("/hxstudio/modifyName",$("#setForm").serialize(),function(result){
                studioMbPop.loadingBlock($("#setPop"), true);
                if(!result.isOK){
                    studioMbPop.showMessage(result.msg?result.msg:"修改失败，请联系客服！");
                    return false;
                }else{
                    $("#setPop .pop_close").trigger("click");
                    studioMbSet.studioChatObj.refreshNickname(true, result.nickname);
                    $("#sendBtn").trigger("click");
                }
            },true,function(){
                studioMbPop.loadingBlock($("#setPop"), true);
            });
        });
    },
    /**
     * 检查页面输入
     */
    checkFormInput:function(){
        var isTrue=true,message="";
        var nickname = $("#setForm_nn").val();
        if(common.isBlank(nickname)){
            isTrue = false;
            message="昵称不能为空！";
        }else if(!common.isRightName(nickname)){
            isTrue = false;
            message="昵称为2至10位字符(数字、英文、中文、下划线),不能全是数字";
        }
        studioMbPop.showMessage(message);
        return isTrue;
    }
};

/**
 * 直播间弹出层控制类
 */
var studioMbPop = {
    Person : studioMbPerson,
    Login : studioMbLogin,
    Set : studioMbSet,
    Msg : studioMbMsg,
    onShow : null,
    onHide : null,
    /**
     * 显示提示信息
     */
    showMessage:function(msg){
        if(msg){
            var loc_item = $(".errorbox");
            loc_item.hide().find("div").html(msg);
            loc_item.fadeIn().delay(2000).fadeOut(200);
        }
    },
    /**
     * 遮罩层
     * @param $panel
     * @param [isHide]
     */
    loadingBlock : function($panel, isHide){
        if(isHide){
            $panel.children("div.img-loading").remove();
        }else{
            $panel.append('<div class="img-loading"><i></i></div>')
        }
    },
    /**
     * 显示弹出框
     * @param item
     */
    popShow : function(item){
        if($('.popupbg').is(":hidden")){
            $('.popupbg').fadeIn();
        }
        $('.popupbox').hide();
        if(this.onShow){
            this.onShow.call(null);
        }
        item.show();
    },
    /**
     * 关闭弹出框
     */
    popHide : function(){
        $('.popupbox').hide();
        if(this.onHide){
            this.onHide.call(null);
        }
        $('.popupbg').fadeOut();
    },
    /**
     * 刷新页面
     */
    reload : function(){
        var url = window.location.href;
        var param = "ko=1&t=" + new Date().getTime();
        if(url.indexOf("?") == -1){
            url = url + "?" + param;
        }else{
            url = url.replace(/&(t|ko)=\d*(?=&|$)/g, "");
            if(/\?(t|ko)=\d*(?=&|$)/.test(url)){
                url = url.replace(/\?(t|ko)=\d*(?=&|$)/, "?" + param);
            }else{
                url = url + "&" + param;
            }
        }
        window.location.href = url;
    },
    /**
     * 初始化（页面加载）
     */
    load : function(userInfo, options, events){
        if(events){
            this.onShow = typeof events.onShow == "function" ? events.onShow : null;
            this.onHide = typeof events.onHide == "function" ? events.onHide : null;
        }
        this.Person.load(userInfo, options);
        this.Login.load();
        this.Set.load();
        this.Msg.load();

        /*弹出框关闭*/
        $('.pop-close').click(function(){
            studioMbPop.popHide();
        });
    },
    /**
     * 显示指定窗口
     * @param type
     * @param [ops]
     */
    popBox : function(type, ops){
        switch(type){
            case "person" :
                this.popShow($("#personPop"));
                this.Person.init();
                break;

            case "login" :
                this.popShow($("#loginPop"));
                this.Login.init(ops.platform, ops.groupId, ops.clientStoreId, ops.clientGroup, ops.closeable !== false, ops.showTip, ops.lgTime, ops.spn);
                break;

            case "set" :
                this.popShow($("#setPop"));
                this.Set.init(ops.studioChatObj);
                break;

            case "msg" :
                this.popShow($("#resultPop"));
                this.Msg.init(ops.type, ops.msg);
                break;
        }
    },
    /**
     * 打开CS客服
     */
    openCSBox:function(){
        window.open ('https://www.serve888.com/serve888/chatClient/chatbox.jsp?companyID=217&s=1','Live800Chatindow','height=520,width=740,top=0,left=0,toolbar=no,menubar=no,scrollbars=no, resizable=no,location=no, status=no');
    },
    /**GA统计*/
    studioGA: function(gaArg1,gaArg2,gaArg3,gaArg4,gaArg5,trackDataArg1){
        if(typeof ga === "function" && typeof _trackData === "object" && _trackData instanceof Array){
            ga(gaArg1, gaArg2, gaArg3, gaArg4, gaArg5);
            _trackData.push(trackDataArg1);
        }
    }
};