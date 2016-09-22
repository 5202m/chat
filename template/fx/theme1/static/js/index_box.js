/**
 * 弹框操作类
 * author Alan.wu
 */
var box={
    verifyCodeIntMap:{},
    toRoomId:null,
    /**
     * 方法入口
     */
    init:function(){
        this.setEvent();
        if (indexJS.checkClientGroup('visitor') && indexJS.options.preReg) {
            box.openSettingBox("reg");
        }
    },
    /**
     * 设置事件
     */
    setEvent:function(){
        /*弹出框关闭按钮*/
        $('.popup_box .pop_close,.formbtn[t=close]').click(function(){
            $(this).parent().parent().hide();
            $(".blackbg").hide();
            $(".blackbg form").each(function(){
                this.reset();
            });
        });
        //登录相关事件
        this.loginEvent();
        //账号升级事件
        this.upgradeEvent();
        //专家咨询事件
        this.expertMailEvent();
    },
    /**
     * 账号升级事件
     */
    upgradeEvent:function(){
        /**
         * 等级说明提示
         */
        $("#tipbtnId").hover(function(){
            $(".upg_tip").show();
        },function(){
            $(".upg_tip").hide();
        });
        /**
         * 升级事件
         */
        $(".upgradebtn").click(function(){
            try{
                $(".upgrade,#up_loading").show();
                $.getJSON('/fxstudio/getClientGroupList',null,function(data){
                    $("#up_loading").hide();
                    if(data){
                        $("#upg_tbody_id").html("");
                        var currLevel='',seq=0,rowTmp=null,curCls='';
                        for(var t in data){//找出对应排序号，按排序号分等级
                            if(data[t].clientGroupId==indexJS.userInfo.clientGroup){
                                seq=data[t].sequence;
                            }
                        }
                        for(var i=0;i<data.length;i++){
                            rowTmp=data[i];
                            curCls='';
                            if(rowTmp.clientGroupId==indexJS.userInfo.clientGroup){
                                currLevel="当前级别";
                                curCls="current";
                            }else if(rowTmp.clientGroupId!="visitor" && seq<rowTmp.sequence){
                                currLevel=rowTmp.clientGroupId=='vip'?'联系客服升级':'<a href="javascript:" t="' + rowTmp.clientGroupId + '">升级</a>';
                            }else{
                                currLevel='---';
                            }
                            if(common.isBlank(common.trim(rowTmp.remark))){
                                continue;
                            }
                            var trDomArr=[];
                            trDomArr.push('<tr class="'+curCls+'"><td><p>'+box.getUserLevelShortName(rowTmp.clientGroupId)+'</p></td><td><p class="p2">'+common.trim(rowTmp.remark)+'</p></td><td><p>'+common.trim(rowTmp.authorityDes)+'</p></td><td>'+currLevel+'</td></tr>');
                            $("#upg_tbody_id").append(trDomArr.join(""));
                        }
                        //升级点击事件
                        $("#upg_tbody_id a").click(function(){
                            var _this=$(this);
                            var loc_upLevel = _this.attr("t");
                            common.getJson("/fxstudio/upgrade",{clientGroup : loc_upLevel},function(result){
                                _this.attr('disabled',false);
                                if(result.isOK){
                                    if(result.clientGroup === "active" && "notActive" === loc_upLevel){
                                        $("#studioUpgA").show();
                                    }else{
                                        $("#studioUpgA").hide();
                                    }
                                    $(".upgrade,.upgrade_result .fail").hide();
                                    $(".upgrade_result,.upgrade_result .succ").show();
                                }else{
                                    var loc_msg = "";
                                    if("active" === loc_upLevel) {
                                        loc_msg = "很遗憾，您未激活金道真实交易账户，升级失败！<br>如有疑问请联系客服！";
                                    }else if("notActive" === loc_upLevel){
                                        loc_msg = "很遗憾，您未开通金道真实交易账户，升级失败！<br>如有疑问请联系客服！";
                                    }else if("simulate" === loc_upLevel){
                                        loc_msg = "很遗憾，您未开通金道模拟交易账户，升级失败！<br>如有疑问请联系客服！";
                                    }
                                    $(".upgrade_result .succ").hide();
                                    $(".upgrade_result,.upgrade_result .fail").show();
                                    $(".upgrade_result .fail>span").html(loc_msg);
                                }
                            },true,function(err){
                                _this.attr('disabled',false);
                            });
                        });
                    }
                });
            }catch (e){
                $("#up_loading").hide();
                console.error("getClientGroupList->"+e);
            }
        });
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
    },
    /**
     * 登录相关事件
     */
    loginEvent:function(){
        //登录界面控制
        $("#loginForm .login_option a").bind("click", function(){
            var type = $(this).attr("lt");
            $("#loginForm .login_option a.selected").removeClass("selected");
            $(this).addClass("selected");
            $("#loginForm .in_line[lt]").hide();
            $("#loginForm .in_line[lt='" + type + "']").show();
            $("#loginForm .fr[lt]").hide();
            $("#loginForm .fr[lt='" + type + "']").show();
            $("#loginType").val(type);
        });
        //忘记密码
        $("#preSetPwdBtn,#preSetPwdBtn2").bind("click", function(){
            box.openSettingBox("password2");
        });

        /**
         * 忘记密码1
         */
        $("#popBoxPassword1 .set_submit").click(function(){
            if($(this).prop("disabled") || !box.checkFormInput($("#popBoxPassword1"))){
                return;
            }
            $(this).prop('disabled',true);
            $('#popBoxPassword1 .img-loading').show();
            var _this=this;
            common.getJson("/fxstudio/resetPwd", $("#popBoxPassword1 form").serialize(),function(result){
                box.showBoxError($("#popBoxPassword1"));
                $(_this).prop('disabled',false);
                $('#popBoxPassword1 .img-loading').hide();
                if(!result.isOK){
                    box.showBoxError($("#popBoxPassword1"), "<i></i>"+result.msg);
                    return false;
                }else{
                    box.showTipBox("修改密码成功，请使用新密码登录！");
                    box.openLgBox();
                }
            },true,function(err){
                $(_this).prop('disabled',false);
                $('#popBoxPassword3 .img-loading').hide();
            });
        });

        /**
         * 忘记密码2
         */
        $("#popBoxPassword2 .set_submit").click(function(){
            if($(this).prop("disabled") || !box.checkFormInput($("#popBoxPassword2"))){
                return;
            }
            $(this).prop('disabled',true);
            $('#popBoxPassword2 .img-loading').show();
            var _this=this;
            common.getJson("/fxstudio/resetPwd", $("#popBoxPassword2 form").serialize(),function(result){
                box.showBoxError($("#popBoxPassword2"));
                $(_this).prop('disabled',false);
                $('#popBoxPassword2 .img-loading').hide();
                if(!result.isOK){
                    box.showBoxError($("#popBoxPassword2"), "<i></i>"+result.msg);
                    return false;
                }else{
                    $("#popBoxPassword3_mb").val(result.mobilePhone);
                    box.openSettingBox("password3");
                }
            },true,function(err){
                $(_this).prop('disabled',false);
                $('#popBoxPassword2 .img-loading').hide();
            });
        });

        /**
         * 忘记密码3
         */
        $("#popBoxPassword3 .set_submit").click(function(){
            if($(this).prop("disabled") || !box.checkFormInput($("#popBoxPassword3"))){
                return;
            }
            $(this).prop('disabled',true);
            $('#popBoxPassword3 .img-loading').show();
            var _this=this;
            common.getJson("/fxstudio/resetPwd", $("#popBoxPassword3 form").serialize(),function(result){
                box.showBoxError($("#popBoxPassword3"));
                $(_this).prop('disabled',false);
                $('#popBoxPassword3 .img-loading').hide();
                if(!result.isOK){
                    box.showBoxError($("#popBoxPassword3"), "<i></i>"+result.msg);
                    return false;
                }else{
                    box.showTipBox("重置密码成功，请使用新密码登录！");
                    box.openLgBox();
                }
            },true,function(err){
                $(_this).prop('disabled',false);
                $('#popBoxPassword3 .img-loading').hide();
            });
        });

        //用户注册
        $("#preRegBtn").bind("click", function(){
            box.openSettingBox("reg");
        });
        //注册页面登录按钮
        $("#reg_login").bind("click", function(){
            box.openLgBox();
        });
        /**
         * 用户注册
         */
        $("#popBoxRegister .set_submit").click(function(){
            if($(this).prop("disabled") || !box.checkFormInput($("#popBoxRegister"))){
                return;
            }
            $(this).prop('disabled',true);
            $('#popBoxRegister .img-loading').show();
            var _this=this;
            common.getJson("/fxstudio/reg", $("#popBoxRegister form").serialize(),function(result){
                box.showBoxError($("#popBoxRegister"));
                $(_this).prop('disabled',false);
                $('#popBoxRegister .img-loading').hide();
                if(!result.isOK){
                    box.showBoxError($("#popBoxRegister"), "<i></i>"+result.msg);
                    return false;
                }else{
                    $(".blackbg,#popBoxRegister").hide();
                    $("#regLpBtn").attr("href", "http://www.gwfx.com/activity/studioLottery/index.html?userId=" + result.userId + "#ba");
                    $(".register_result").show();
                }
            },true,function(err){
                $(_this).prop('disabled',false);
                $('#popBoxRegister .img-loading').hide();
            });
        });
        //注册成功
        $(".register_result .pop_close").bind("click", function(){
            indexJS.toRefreshView();
        });
        // 弹出登录框
        $('#login_a').bind("click", function(e, ops){
            ops = ops || {};
            box.toRoomId = ops.groupId;
            box.openLgBox(ops.closeable, ops.showTip,ops.loginTime);
            if(common.isValid($(this).attr("tp"))){
                _gaq.push(['_trackEvent', 'fx_studio', 'login', $(this).attr("tp"), 1, true]);
            }
        });
        //当前房间未授权，并且是游客
        if(indexJS.userInfo.clientGroup=='visitor'){
            var lgt = $('#roomInfoId').attr("lgt");//后台控制登录弹框时间
            if(common.isValid(lgt)) {
                if (!indexJS.currStudioAuth) {
                    $("#login_a").trigger("click", {closeable: false, loginTime: lgt}); //弹出登录框，隐藏关闭按钮
                } else if (this.forceLogin()) {
                    $("#login_a").trigger("click", {closeable: false, showTip: true, loginTime: lgt}); //弹出登录框，不允许关闭
                } else {
                    //3分钟后强制要求登录
                    window.setTimeout(function () {
                        if (indexJS.userInfo.clientGroup == 'visitor') {
                            box.forceLogin(true);
                            $("#login_a").trigger("click", {closeable: false, showTip: true, loginTime: lgt}); //弹出登录框，不允许关闭
                        }
                    }, lgt * 60 * 1000);
                }
            }
        }
        /**
         * 注销
         */
        $(".logout").bind("click", function(){
            LoginAuto.setAutoLogin(false);
            window.location.href="/fxstudio/logout";
        });
        //手机号码输入控制
        $("#loginForm input[name=mobilePhone],#loginForm input[name=verifyCode],#setNkForm input[name=nickname]").bind("input propertychange", function() {
            if(common.isValid(this.value)){
                $(".popup_box .error").hide();
            }
        });
        //验证码事件
        $('#loginForm .rbtn,#popBoxPassword2 .rbtn,#popBoxRegister .rbtn').click(function(){
            if($(this).hasClass("pressed")){
                return;
            }
            var boxPanel = $(this).parents(".popup_box:first");
            var mobile=boxPanel.find("input[name=mobilePhone]").val();
            if(!common.isMobilePhone(mobile)){
                box.showBoxError(boxPanel, "<i></i>手机号码有误，请重新输入！");
                return;
            }
            $(this).addClass("pressed").html("发送中...");
            try{
                $.getJSON('/fxstudio/getMobileVerifyCode?t=' + new Date().getTime(),{mobilePhone:mobile, useType:$(this).attr("ut")},function(data){
                    if(!data || data.result != 0){
                        if(data.errcode == "1005"){
                            box.showBoxError(boxPanel, "<i></i>"+data.errmsg);
                        }else{
                            console.error("提取数据有误！");
                        }
                        box.resetVerifyCode(boxPanel);
                    }else{
                        box.showBoxError(boxPanel);
                        box.setVerifyCodeTime(boxPanel.attr("id"));
                    }
                });
            }catch (e){
                box.resetVerifyCode(boxPanel);
                console.error("setMobileVerifyCode->"+e);
            }
        });
        /**
         * 按钮按回车键事件
         */
        $("#loginForm input[name='verifyCode'],#setNkForm input[name='nickname'],#popBoxRegister input[name='password1']").keydown(function(e){
            if(e.keyCode==13){
                $(this).parents("form").find(".set_submit").click();
                return false;
            }
        });
        /**
         * 登录按钮事件
         */
        $("#logBtnSub").click(function(){
            if($(this).prop("disabled")){
                return;
            }
            $('#loginForm input[name=clientStoreId]').val(indexJS.userInfo.clientStoreId);
            if(!box.checkFormInput($("#loginForm"))){
                return;
            }
            $(this).prop('disabled',true);
            var _this=this;
            $('#formBtnLoad').show();
            common.getJson("/fxstudio/login",$("#loginForm").serialize(),function(result){
                $("#loginForm .error").hide();
                $(_this).prop('disabled',false);
                $('#formBtnLoad').hide();
                if(!result.isOK){
                    $("#loginForm .error").html("<i></i>"+result.error.errmsg).show();
                    return false;
                }else{
                    $(".blackbg,#loginBox").hide();
                    LoginAuto.setAutoLogin($("#autoLogin").prop("checked"));
                    indexJS.userInfo.clientGroup = result.userInfo.clientGroup;
                    indexJS.toRefreshView();
                }
            },true,function(err){
                $(_this).prop('disabled',false);
                $('#formBtnLoad').hide();
            });
        });
        /**
         * 设置昵称信息
         */
        $("#setNkBtn").click(function(){
            if(!box.checkFormInput($("#setNkForm"))){
                return;
            }
            $(this).prop('disabled',true);
            var _this=this;
            $('#setNkLoad').show();
            common.getJson("/fxstudio/modifyName",$("#setNkForm").serialize(),function(result){
                $("#setNkForm .error").hide("");
                $(_this).attr('disabled',false);
                $('#setNkLoad').hide();
                if(!result.isOK){
                    $("#setNkForm .error").html('<i></i>'+(result.msg?result.msg:"修改失败，请联系客服！")).show();
                    return false;
                }else{
                    $("#setNkForm").parent().find(".pop_close").click();
                    indexJS.refreshNickname(true, result.nickname);
                    $("#sendBtn").click();
                }
            },true,function(err){
                $(_this).attr('disabled',false);
                $('#setNkLoad').hide();
            });
        });
    },
    /**
     * 提取用户等级简称
     * @param clientGroup
     */
    getUserLevelShortName:function(clientGroup){
        var levelClsName='';
        switch(clientGroup){
            case "vip":
                levelClsName = "l4";
                break;
            case "real":
                levelClsName = "l3";
                break;
            case "active":
                levelClsName = "l3";
                break;
            case "notActive":
                levelClsName = "l3";
                break;
            case "simulate":
                levelClsName = "l2";
                break;
            case "register":
                levelClsName = "l1";
                break;
            default:
                levelClsName = "l0";
        }
        return '<i class="level ' + levelClsName + '"></i>';
    },
    /**
     * 检查页面输入
     */
    checkFormInput:function(formDom){
        var isTrue=true;
        box.showBoxError(formDom);
        formDom.find("input").each(function(){
            if(!$(this).is(":visible")){
                return;
            }
            if(common.isBlank($(this).val())){
                if(this.name=='mobilePhone' || this.name=='userId'){
                    box.showBoxError(formDom, "<i></i>手机号码不能为空！");
                }
                if(this.name=='verifyCode'){
                    box.showBoxError(formDom, "<i></i>验证码不能为空！");
                }
                if(this.name=='nickname'){
                    box.showBoxError(formDom, "<i></i>昵称不能为空！");
                }
                if(this.name=='password0'){
                    box.showBoxError(formDom, "<i></i>原始密码不能为空！");
                }
                if(this.name=='password'){
                    box.showBoxError(formDom, "<i></i>密码不能为空！");
                }
                if(this.name=='password1'){
                    box.showBoxError(formDom, "<i></i>确认密码不能为空！");
                }
                isTrue=false;
                return isTrue;
            }else{
                if(this.name=='mobilePhone') {
                    $(this).val($.trim($(this).val()));
                    if(!common.isMobilePhone(this.value)){
                        box.showBoxError(formDom, "<i></i>手机号码输入有误！");
                        isTrue=false;
                        return isTrue;
                    }
                }
                if(this.name=='nickname'&& !common.isRightName(this.value)) {
                    box.showBoxError(formDom, "<i></i>昵称为2至10位字符(数字/英文/中文/下划线)，不能全数字!");
                    isTrue=false;
                    return isTrue;
                }
                if(this.name=="password"){
                    if(!/^.{6,20}$/.test(this.value) && formDom.attr("id") != "loginForm"){
                        box.showBoxError(formDom, "<i></i>密码由6至20数字、字母、符号组成！");
                        isTrue=false;
                        return isTrue;
                    }
                }
            }
        });
        if(!isTrue){
            return isTrue;
        }
        var pwdInputs = formDom.find("input[type='password']");
        var size = pwdInputs.size();
        if(size == 2 && pwdInputs.eq(size-2).val() != pwdInputs.eq(size-1).val()){
            box.showBoxError(formDom, "<i></i>两次密码输入不一致！");
            isTrue=false;
            return isTrue;
        }
        return isTrue;
    },
    /**
     * 设置验证码
     * @param tId
     */
    setVerifyCodeTime:function(tId){
        var rbtn = $("#" + tId + " .rbtn");
        var t=parseInt(rbtn.attr("t"))||120;
        if(!this.verifyCodeIntMap[tId]){
            this.verifyCodeIntMap[tId]=setInterval("box.setVerifyCodeTime('"+tId+"')",1000)
        }
        if(t>1){
            rbtn.attr("t",t-1).html("重新获取(" + (t-1) + ")");
        }else{
            clearInterval(this.verifyCodeIntMap[tId]);
            this.verifyCodeIntMap[tId] = null;
            rbtn.attr("t",120).html("获取验证码").removeClass("pressed");
        }
    },
    /**
     * 重置验证码
     */
    resetVerifyCode:function(boxPanel){
        var tId = boxPanel.attr("id");
        if(this.verifyCodeIntMap[tId]) {
            clearInterval(this.verifyCodeIntMap[tId]);
            this.verifyCodeIntMap[tId]=null;
        }
        boxPanel.find(".rbtn").attr("t",120).html("获取验证码").removeClass("pressed");
    },
    /**
     * 弹出登录框
     */
    openLgBox:function(closeable, showTip, lgTime){
        if(closeable === false){
            $("#loginBox .pop_close").hide();
        }else{
            $("#loginBox .pop_close").show();
        }
        if(showTip){
            lgTime=lgTime||1;
            $("#login_tip").show().text($('#setlogintip').text());
        }else{
            $("#login_tip").hide();
        }
        $(".popup_box").hide();
        $("#loginBox,.blackbg").show();
    },
    /**
     * 打开用户相关设置框（注册框、重设密码）
     * @param type reg password1 password2 password3 nickname
     */
    openSettingBox:function(type){
        $(".popup_box").hide();
        var boxPanel = null;
        switch(type){
            case "reg":
                boxPanel = $("#popBoxRegister");
                break;
            case "password1":
                boxPanel = $("#popBoxPassword1");
                break;
            case "password2":
                boxPanel = $("#popBoxPassword2");
                break;
            case "password3":
                boxPanel = $("#popBoxPassword3");
                break;
            case "nickname":
                boxPanel = $("#popBoxNickname");
                break;
        }
        if(box){
            box.showBoxError(boxPanel);
            boxPanel.find("input[type='text'],input[type='password']").each(function(){
                $(this).val("");
            });
            boxPanel.show();
            $(".blackbg").show();
        }
    },
    /**
     * 显示错误消息
     * @param panel
     * @param [message]
     */
    showBoxError : function(panel, message){
        if(message){
            panel.find(".error").html(message).show();
        }else{
            panel.find(".error").html("").hide();
        }
    },
    /**
     * 提取验证码
     */
    refreshVerifyCode:function(){
        var groupType = LoginAuto.sessionUser['groupType'];
        $("#verifyCodeId img").attr("src",'/'+groupType+'/getVerifyCode?code=email&v='+Math.random());
    },
    /**
     * 专家咨询相关事件
     */
    expertMailEvent:function(){
        $('.expert_box .error').hide();
        $('#expert').click(function(){
            box.refreshVerifyCode();
            $('.expert,.blackbg').removeClass('dn').show();
        });
        /**
         * 发送按钮事件
         */
        $('#btnSendMail').click(function(){
            if(common.isBlank($('#mailFrom').val())){
                $('.expert_box .error').html('<i></i>发件人不能为空！').show();
            }else if(common.isBlank($('#mailContent').val())){
                $('.expert_box .error').html('<i></i>输入内容有误，请重新输入！').show();
            }else if(common.isBlank($('#mailImgCode').val())){
                $('.expert_box .error').html('<i></i>验证码不能为空！').show();
            }
            else{
                $('.expert_box .error').hide();
                var param = {};
                param.content = $.trim($('#mailContent').val());
                param.email = $.trim($('#mailFrom').val());
                param.code = $.trim($('#mailImgCode').val());
                common.getJson('/fxstudio/email', {key:'fxstudio',data: JSON.stringify(param)}, function(result){
                    if(result.isOK){
                        box.showMsg(result.msg);
                        $('.expert,.blackbg').hide();
                        $('#mailFrom,#mailContent').val('');
                    }
                    else{
                        //box.showMsg(result.msg);
                        $('.expert_box .error').html('<i></i>'+result.msg).show();
                    }
                });
            }
        });
        /**
         * 按回车键登录
         */
        $("#btnSendMail").keydown(function(e){
            if(e.keyCode==13){
                $("#btnSendMail").click();
                return false;
            }
        });
        /**
         * 更新图片验证码
         */
        $("#verifyCodeId img").click(function(){
            box.refreshVerifyCode();
        });
    },
    /**隐藏消息*/
    hideMsg : function(){
        if($("#popMsgBox").is(":visible")){
            $("#popMsgBox").fadeOut("normal", "swing", function(){
                $(".blackbg").hide();
            });
        }
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
                    box.hideMsg();
                }
            }]
        }, ops);
        $("#popMsgTit").text(ops.title || "");
        $("#popMsgTxt").text(ops.msg);
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
                box.hideMsg();
            }, ops.delay);
        }
    },
    /**
     * 信息浮动提示
     * @param msg
     */
    showTipBox:function(msg){
        $(".tipsbox").fadeIn().delay(1000).fadeOut(200).find(".cont").text(msg);
    }
};
