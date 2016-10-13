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
            $.getJSON('/fxstudio/getClientGroupList',null,function(data){
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
                        common.getJson("/fxstudio/upgrade",{clientGroup : loc_upLevel},function(result){
                            studioMbPop.loadingBlock($("#personPop"), true);
                            if(result.isOK){
                                var msg = "升级成功！刷新页面后，您可享用更多权限。";
                                if(result.clientGroup === "active" && "notActive" === loc_upLevel){
                                    msg += "<br/>注：你已经激活真实交易账户，直接为你升级到A级别。"
                                }
                                studioMbPop.popBox("msg", {
                                    msg : msg,
                                    type : "upg"
                                });
                            }else{
                                if("active" === loc_upLevel){
                                    studioMbPop.showMessage("很遗憾，您未激活金道真实交易账户，升级失败！如有疑问请联系客服！");
                                }else if("notActive" === loc_upLevel){
                                    studioMbPop.showMessage("很遗憾，您未开通金道真实交易账户，升级失败！如有疑问请联系客服！");
                                }else if("simulate" === loc_upLevel){
                                    studioMbPop.showMessage("很遗憾，您未开通金道模拟交易账户，升级失败！如有疑问请联系客服！");
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
                window.location.href="/fxstudio/logout";
            });

            /**
             * 修改密码
             */
            $("#personPop_repwd").bind("click", {
                clientStoreId : userInfo.clientStoreId,
                groupId : userInfo.groupId,
                platform : options.platform
            }, function(e){
                studioMbPop.popBox("pwd1", e.data);
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
        var userLevelIco = "/fx/theme2/img/user_c.png";
        switch(clientGroup) {
            case "vip" :
                userLevelIco = "/fx/theme2/img/user_v.png";
                break;
            case "active" :
                userLevelIco = "/fx/theme2/img/user_r.png";
                break;
            case "notActive" :
                userLevelIco = "/fx/theme2/img/user_r.png";
                break;
            case "simulate" :
                userLevelIco = "/fx/theme2/img/user_d.png";
                break;
            case "register" :
                userLevelIco = "/fx/theme2/img/user_m.png";
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
 * 验证码控制
 */
var studioMbVC = {
    defaultTime : 120,
    /**配置信息：{$btn : $obj, $input : $obj, intervalId : Id, time : 120}*/
    verifyCodeMap : {}, //{reg:{useType : "studio_login", $btn : $obj, $input : $obj, intervalId : Id, time : 120}}

    /**
     * 初始化
     * @param key
     * @param useType
     * @param $btn
     * @param $input
     */
    init : function(key, useType, $btn, $input){
        if(studioMbVC.verifyCodeMap[key]){
            return;
        }else{
            studioMbVC.verifyCodeMap[key] = {
                useType : useType,
                $btn : $btn,
                $input : $input,
                intervalId : null,
                time : studioMbVC.defaultTime
            };

            //手机号输入

            //手机校验
            $input.bind("input propertychange", key, function(e){
                var config = studioMbVC.verifyCodeMap[e.data];
                if(!config || config.intervalId){
                    return;
                }
                if(common.isMobilePhone(this.value)){
                    config.$btn.addClass("pressed");
                }else{
                    config.$btn.removeClass("pressed");
                }
            });

            //获取验证码
            $btn.bind("click", key, function(e){
                var vcKey = e.data;
                var config = studioMbVC.verifyCodeMap[vcKey];
                if(!config || !$(this).hasClass("pressed")){
                    return;
                }
                $(this).removeClass("pressed").text("发送中...");
                var mobile=config.$input.val();
                var useType=config.useType;
                try{
                    $.getJSON('/fxstudio/getMobileVerifyCode?t=' + new Date().getTime(),{mobilePhone:mobile, useType:useType},function(data){
                        if(!data || data.result != 0){
                            if(data.errcode == "1005"){
                                studioMbPop.showMessage(data.errmsg);
                            }else{
                                console.error("提取数据有误！");
                            }
                            studioMbVC.resetVerifyCode(vcKey);
                        }else{
                            studioMbVC.setVerifyCodeTime(vcKey);
                        }
                    });
                }catch (e){
                    studioMbVC.resetVerifyCode();
                    console.error("getMobileVerifyCode->"+e);
                }
            });
        }
    },

    /**
     * 重置验证码
     */
    resetVerifyCode:function(key){
        if(studioMbVC.verifyCodeMap[key]) {
            var config = studioMbVC.verifyCodeMap[key];
            if(config.intervalId){
                clearInterval(config.intervalId);
                config.intervalId = null;
            }
            config.time = studioMbVC.defaultTime;
            config.$btn.text("获取验证码");
            config.$input.trigger("input");
        }
    },

    /**
     * 验证码倒计时
     */
    setVerifyCodeTime:function(key){
        if(studioMbVC.verifyCodeMap[key]) {
            var config = studioMbVC.verifyCodeMap[key];
            if(!config.intervalId){
                config.intervalId=window.setInterval('studioMbVC.setVerifyCodeTime("'+key+'")', 1000);
            }
            if(config.time > 1){
                config.time--;
                config.$btn.text("重新获取(" + (config.time-1) + ")");
            }else{
                studioMbVC.resetVerifyCode(key);
            }
        }
    }
};

/**
 * 登录
 */
var studioMbLogin = {
    verifyCodeIntervalId : 0,
    groupId : null,
    clientStoreId : null,
    clientGroup : null,
    platform : null,

    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },
    /**
     * 初始化（页面初始化）
     */
    init : function(platform, groupId, clientStoreId, clientGroup, closeable, showTip){
        this.platform = platform;
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
        }else{
            $("#login_tip").hide();
        }
        if(platform == "wechat"){
            $("#loginForm .auto_login").hide();
        }
    },
    /**
     * 绑定事件
     */
    setEvent : function(){
        //登录
        $("#loginForm_sub").bind("click", function(){
            if(!studioMbLogin.checkFormInput()){
                return;
            }
            studioMbPop.loadingBlock($("#loginPop"));
            common.getJson("/fxstudio/login",$("#loginForm").serialize(),function(result){
                if(!result.isOK){
                    studioMbPop.loadingBlock($("#loginPop"), true);
                    studioMbPop.showMessage(result.error.errmsg);
                    return false;
                }else{
                    studioMbLogin.clientGroup = result.userInfo.clientGroup;
                    if(studioMbLogin.groupId){
                        common.getJson("/fxstudio/checkGroupAuth",{groupId:studioMbLogin.groupId},function(result){
                            if(!result.isOK){
                                if(result.error && result.error.errcode === "1000"){
                                    studioMbPop.showMessage("您长时间未操作，请刷新页面后重试！");
                                }else if(studioMbLogin.checkClientGroup("vip")){
                                    studioMbPop.showMessage("该房间仅对新客户开放。");
                                }else{
                                    studioMbPop.showMessage("已有真实账户并激活的客户方可进入【特别专场】，您还不满足条件。");
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

        //登录方式切换
        $("#loginForm_tab li").bind("click", function(){
            var type = $(this).attr("lt");
            $("#loginForm_tab li.li-on").removeClass("li-on");
            $(this).addClass("li-on");
            $("#loginForm .inp[lt]").hide();
            $("#loginForm .inp[lt='" + type + "']").show();
            $("#loginForm .fr[lt]").hide();
            $("#loginForm .fr[lt='" + type + "']").show();
            $("#loginForm_lt").val(type);
        });

        //记住我
        $("#loginForm_alBtn").bind("click", function(){
            var isChecked = $("#loginForm_al").prop("checked");
            $("#loginForm_al").prop("checked", !isChecked);
            if(isChecked){
                $(this).children("s").removeClass("sel-on");
            }else{
                $(this).children("s").addClass("sel-on");
            }
        });

        //忘记密码
        $("#loginForm_pwdBtn").bind("click", function(){
            studioMbPop.popBox("pwd2", {
                groupId : studioMbLogin.groupId,
                clientStoreId : studioMbLogin.clientStoreId,
                platform : studioMbLogin.platform
            });
        });

        //注册
        $("#loginForm_reg").bind("click", function(){
            studioMbPop.popBox("reg", {
                groupId : studioMbLogin.groupId,
                clientStoreId : studioMbLogin.clientStoreId,
                platform : studioMbLogin.platform
            });
        });

        //登录页面验证码功能
        studioMbVC.init("login", "fxstudio_login", $("#loginForm_vcb"), $("#loginForm_mb"));
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
    checkFormInput:function(){
        var isTrue=true,message="";
        var params = {
            loginType : $("#loginForm_lt").val(),
            mobilePhone : $("#loginForm_mb").val(),
            verifyCode : $("#loginForm_vc").val(),
            password : $("#loginForm_pwd").val()
        };
        if(common.isBlank(params.mobilePhone)){
            isTrue = false;
            message="手机号码不能为空！";
        }else if(!common.isMobilePhone(params.mobilePhone)){
            isTrue = false;
            message="手机号码输入有误！";
        }else if(params.loginType == "verify" && common.isBlank(params.verifyCode)){
            isTrue = false;
            message="手机验证码不能为空！";
        }else if(params.loginType == "pwd" && common.isBlank(params.password)){
            isTrue = false;
            message="密码不能为空！";
        }
        studioMbPop.showMessage(message);
        return isTrue;
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
                window.location.href="/fxstudio";
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
 * 设置
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
            common.getJson("/fxstudio/modifyName",$("#setForm").serialize(),function(result){
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
 * 直播间注册
 */
var studioMbReg = {
    groupId : null,
    clientStoreId : null,
    platform : null,

    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },

    /**
     * 初始化（页面初始化）
     */
    init : function(groupId, clientStoreId, platform){
        this.groupId = groupId;
        this.clientStoreId = clientStoreId;
        this.platform = platform;
        $("#regForm").trigger("reset");
        $("#regForm_mb").trigger("input");
    },

    /**
     * 绑定事件
     */
    setEvent : function(){
        $("#regForm_sub").bind("click", function(){
            if(!studioMbReg.checkFormInput()){
                return;
            }
            studioMbPop.loadingBlock($("#regPop"));
            common.getJson("/fxstudio/reg",$("#regForm").serialize(),function(result){
                studioMbPop.loadingBlock($("#regPop"), true);
                if(!result.isOK){
                    studioMbPop.showMessage(result.msg?result.msg:"注册失败，请联系客服！");
                    return false;
                }else{
                    studioMbPop.showMessage("注册成功");
                    studioMbPop.popShow($("#reg1Pop"));
                }
            },true,function(){
                studioMbPop.loadingBlock($("#setPop"), true);
            });
        });

        //登录
        $("#regForm_login").bind("click", function(){
            studioMbPop.popBox("login", {
                groupId: studioMbReg.groupId,
                clientStoreId: studioMbReg.clientStoreId,
                platform : studioMbReg.platform
            });
        });

        //注册成功页面关闭
        $("#reg1Pop .pop-close, #reg1Form_sub").bind("click", function(){
            studioMbPop.reload();
        });

        //注册页面验证码功能
        studioMbVC.init("reg", "fxstudio_reg", $("#regForm_vcb"), $("#regForm_mb"));
    },
    /**
     * 检查页面输入
     */
    checkFormInput:function(){
        var isTrue=true,message="";
        var params = {
            mobilePhone : $("#regForm_mb").val(),
            password : $("#regForm_pwd").val(),
            password1 : $("#regForm_pwd1").val(),
            verifyCode : $("#regForm_vc").val()
        };
        if(common.isBlank(params.mobilePhone)){
            isTrue = false;
            message="手机号码不能为空！";
        }else if(common.isBlank(params.password)){
            isTrue = false;
            message="密码不能为空！";
        }else if(common.isBlank(params.password1)){
            isTrue = false;
            message="确认密码不能为空！";
        }else if(common.isBlank(params.verifyCode)){
            isTrue = false;
            message="验证码不能为空！";
        }else if(!common.isMobilePhone(params.mobilePhone)){
            isTrue = false;
            message="手机号码输入有误！";
        }else if(!/^.{6,20}$/.test(params.password)){
            isTrue = false;
            message="密码由6至20数字、字母、符号组成！";
        }else if(params.password != params.password1){
            isTrue = false;
            message="两次密码输入不一致！";
        }
        studioMbPop.showMessage(message);
        return isTrue;
    }
};

/**
 * 直播间修改密码
 */
var studioMbPwd1 = {
    groupId : null,
    clientStoreId : null,
    platform : null,

    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },

    /**
     * 初始化（页面初始化）
     */
    init : function(groupId, clientStoreId, platform){
        this.groupId = groupId;
        this.clientStoreId = clientStoreId;
        this.platform = platform;
        $("#pwd1Form input[type='password']").val("");
    },

    /**
     * 绑定事件
     */
    setEvent : function(){
        $("#pwd1Form_sub").bind("click", function(){
            if(!studioMbPwd1.checkFormInput()){
                return;
            }
            studioMbPop.loadingBlock($("#pwd1Pop"));
            common.getJson("/fxstudio/resetPwd",$("#pwd1Form").serialize(),function(result){
                studioMbPop.loadingBlock($("#pwd1Pop"), true);
                if(!result.isOK){
                    studioMbPop.showMessage(result.msg?result.msg:"修改密码失败，请联系客服！");
                    return false;
                }else{
                    studioMbPop.showMessage("修改密码成功，请使用新密码登录！");
                    studioMbPop.popBox("login", {
                        groupId: studioMbPwd1.groupId,
                        clientStoreId: studioMbPwd1.clientStoreId,
                        platform : studioMbPwd1.platform
                    });
                }
            },true,function(){
                studioMbPop.loadingBlock($("#pwd1Pop"), true);
            });
        });

        //忘记密码
        $("#pwd1Form_pwdBtn").bind("click", function(){
            studioMbPop.popBox("pwd2", {
                groupId : studioMbPwd1.groupId,
                clientStoreId : studioMbPwd1.clientStoreId,
                platform : studioMbPwd1.platform
            });
        });
    },

    /**
     * 检查页面输入
     */
    checkFormInput:function(){
        var isTrue=true,message="";
        var params = {
            password0 : $("#pwd1Form_pwd0").val(),
            password : $("#pwd1Form_pwd").val(),
            password1 : $("#pwd1Form_pwd1").val()
        };
        if(common.isBlank(params.password0)){
            isTrue = false;
            message="原始密码不能为空！";
        }else if(common.isBlank(params.password)){
            isTrue = false;
            message="新的密码不能为空！";
        }else if(common.isBlank(params.password1)){
            isTrue = false;
            message="确认密码不能为空！";
        }else if(!/^.{6,20}$/.test(params.password)){
            isTrue = false;
            message="密码由6至20数字、字母、符号组成！";
        }else if(params.password != params.password1){
            isTrue = false;
            message="两次密码输入不一致！";
        }
        studioMbPop.showMessage(message);
        return isTrue;
    }
};

/**
 * 直播间忘记密码
 */
var studioMbPwd2 = {
    groupId : null,
    clientStoreId : null,
    platform : null,

    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },

    /**
     * 初始化（页面初始化）
     */
    init : function(groupId, clientStoreId, platform){
        this.groupId = groupId;
        this.clientStoreId = clientStoreId;
        this.platform = platform;
        $("#pwd2Form input[type='text']").val("");
        $("#pwd2Form_mb").trigger("input");
    },

    /**
     * 绑定事件
     */
    setEvent : function(){
        $("#pwd2Form_sub").bind("click", function(){
            if(!studioMbPwd2.checkFormInput()){
                return;
            }
            studioMbPop.loadingBlock($("#pwd2Pop"));
            common.getJson("/fxstudio/resetPwd",$("#pwd2Form").serialize(),function(result){
                studioMbPop.loadingBlock($("#pwd2Pop"), true);
                if(!result.isOK){
                    studioMbPop.showMessage(result.msg?result.msg:"验证手机号失败，请联系客服！");
                    return false;
                }else{
                    studioMbPop.popBox("pwd3", {
                        groupId: studioMbPwd2.groupId,
                        clientStoreId: studioMbPwd2.clientStoreId,
                        platform : studioMbPwd2.platform,
                        mobilePhone : result.mobilePhone
                    });
                }
            },true,function(){
                studioMbPop.loadingBlock($("#pwd2Pop"), true);
            });
        });

        //登录页面验证码功能
        studioMbVC.init("pwd", "fxstudio_resetPWD", $("#pwd2Form_vcb"), $("#pwd2Form_mb"));
    },

    /**
     * 检查页面输入
     */
    checkFormInput:function(){
        var isTrue=true,message="";
        var params = {
            mobilePhone : $("#pwd2Form_mb").val(),
            verifyCode : $("#pwd2Form_vc").val()
        };
        if(common.isBlank(params.mobilePhone)){
            isTrue = false;
            message="手机号码不能为空！";
        }else if(common.isBlank(params.verifyCode)){
            isTrue = false;
            message="验证码不能为空！";
        }else if(!common.isMobilePhone(params.mobilePhone)){
            isTrue = false;
            message="手机号码输入有误！";
        }
        studioMbPop.showMessage(message);
        return isTrue;
    }
};

/**
 * 直播间重置密码
 */
var studioMbPwd3 = {
    groupId : null,
    clientStoreId : null,
    platform : null,

    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },

    /**
     * 初始化（页面初始化）
     */
    init : function(groupId, clientStoreId, platform, mobilePhone){
        this.groupId = groupId;
        this.clientStoreId = clientStoreId;
        this.platform = platform;
        $("#pwd3Form_mb").val(mobilePhone);
        $("#pwd3Form input[type='password']").val("");
    },

    /**
     * 绑定事件
     */
    setEvent : function(){
        $("#pwd3Form_sub").bind("click", function(){
            if(!studioMbPwd3.checkFormInput()){
                return;
            }
            studioMbPop.loadingBlock($("#pwd3Pop"));
            common.getJson("/fxstudio/resetPwd",$("#pwd3Form").serialize(),function(result){
                studioMbPop.loadingBlock($("#pwd3Pop"), true);
                if(!result.isOK){
                    studioMbPop.showMessage(result.msg?result.msg:"重置密码失败，请联系客服！");
                    return false;
                }else{
                    studioMbPop.showMessage("重置密码成功，请使用新密码登录！");
                    studioMbPop.popBox("login", {
                        groupId: studioMbPwd3.groupId,
                        clientStoreId: studioMbPwd3.clientStoreId,
                        platform : studioMbPwd3.platform
                    });
                }
            },true,function(){
                studioMbPop.loadingBlock($("#pwd3Pop"), true);
            });
        });
    },

    /**
     * 检查页面输入
     */
    checkFormInput:function(){
        var isTrue=true,message="";
        var params = {
            password : $("#pwd3Form_pwd").val(),
            password1 : $("#pwd3Form_pwd1").val()
        };
        if(common.isBlank(params.password)){
            isTrue = false;
            message="密码不能为空！";
        }else if(common.isBlank(params.password1)){
            isTrue = false;
            message="确认密码不能为空！";
        }else if(!/^.{6,20}$/.test(params.password)){
            isTrue = false;
            message="密码由6至20数字、字母、符号组成！";
        }else if(params.password != params.password1){
            isTrue = false;
            message="两次密码输入不一致！";
        }
        studioMbPop.showMessage(message);
        return isTrue;
    }
};

/**
 * 弹出层控制类
 */
var studioMbPop = {
    Person : studioMbPerson,
    Login : studioMbLogin,
    Set : studioMbSet,
    Reg : studioMbReg,
    Pwd1 : studioMbPwd1,
    Pwd2 : studioMbPwd2,
    Pwd3 : studioMbPwd3,
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
        this.Reg.load();
        this.Pwd1.load();
        this.Pwd2.load();
        this.Pwd3.load();
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
                this.Login.init(ops.platform, ops.groupId, ops.clientStoreId, ops.clientGroup, ops.closeable !== false, ops.showTip);
                break;

            case "set" :
                this.popShow($("#setPop"));
                this.Set.init(ops.studioChatObj);
                break;

            case "reg" :
                this.popShow($("#regPop"));
                this.Reg.init(ops.groupId, ops.clientStoreId, ops.platform);
                break;

            case "pwd1" :
                this.popShow($("#pwd1Pop"));
                this.Pwd1.init(ops.groupId, ops.clientStoreId, ops.platform);
                break;

            case "pwd2" :
                this.popShow($("#pwd2Pop"));
                this.Pwd2.init(ops.groupId, ops.clientStoreId, ops.platform);
                break;

            case "pwd3" :
                this.popShow($("#pwd3Pop"));
                this.Pwd3.init(ops.groupId, ops.clientStoreId, ops.platform, ops.mobilePhone);
                break;

            case "msg" :
                this.popShow($("#resultPop"));
                this.Msg.init(ops.type, ops.msg);
                break;
        }
    }
};