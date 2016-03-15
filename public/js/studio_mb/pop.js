/**
 * 个人基本信息
 */
var studioMbPerson = {
    /**
     * 初始化（页面加载）
     */
    load : function(userInfo){
        if(userInfo && userInfo.isLogin){
            $("#person_nn").html(userInfo.nickname);
            $("#person_hp").attr("src", studioMbPerson.getUserLevelIco(userInfo.clientGroup));
            $("#upg_tbody_id").html("");
            studioMbPop.loadingBlock($("#upg_tbody_id"));
            $.getJSON('/studio/getClientGroupList',null,function(data){
                studioMbPop.loadingBlock($("#upg_tbody_id"), true);
                if(data){
                    var currLevel='',seq=0,rowTmp=null;
                    for(var t in data){//找出对应排序号，按排序号分等级
                        if(data[t]._id==userInfo.clientGroup){
                            seq=data[t].sequence;
                        }
                    }
                    var trDomArr=[];
                    var trCls;
                    for(var i in data){
                        rowTmp=data[i];
                        trCls = '';
                        if(rowTmp._id==userInfo.clientGroup){
                            trCls = ' class="on"';
                            currLevel="当前级别";
                        }else if(rowTmp._id!="visitor" && seq<rowTmp.sequence){
                            currLevel=rowTmp._id=='vip'?'联系客服升级':'<a href="javascript:void(0)" t="' + rowTmp._id + '">升级</a>';
                        }else{
                            currLevel='---';
                        }
                        trDomArr.push('<tr' + trCls + '><td width="17%"><img src="'+studioMbPerson.getUserLevelIco(rowTmp._id)+'"></td>');
                        trDomArr.push('<td width="20%"><b>'+common.trim(rowTmp.remark)+'</b></td>');
                        trDomArr.push('<td width="43%">'+common.trim(rowTmp.authorityDes)+'</td>');
                        trDomArr.push('<td width="20%">'+currLevel+'</td></tr>');
                    }
                    $("#upg_tbody_id").append(trDomArr.join(""));

                    //点击事件
                    $("#upg_tbody_id a").click(function(){
                        var loc_upLevel = $(this).attr("t");
                        studioMbPop.loadingBlock($("#personPop"));
                        common.getJson("/studio/upgrade",{clientGroup : loc_upLevel},function(result){
                            studioMbPop.loadingBlock($("#personPop"), true);
                            if(result.isOK){
                                studioMbPop.popBox("msg", {
                                    msg : "升级成功！重新登录后，您可享用更多直播间权限。",
                                    type : "upg"
                                });
                            }else{
                                if("real" === loc_upLevel){
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
     * @returns {string}
     */
    getUserLevelIco : function(clientGroup){
        var userLevelIco = "/images/studio_mb/user1.png";
        switch(clientGroup) {
            case "vip" :
                userLevelIco = "/images/studio_mb/user2.png";
                break;
            case "real" :
                userLevelIco = "/images/studio_mb/user3.png";
                break;
            case "simulate" :
                userLevelIco = "/images/studio_mb/user4.png";
                break;
            case "register" :
                userLevelIco = "/images/studio_mb/user5.png";
                break;
        }
        return userLevelIco;
    }
};

/**
 * 注册用户登录
 */
var studioMbLogin = {
    groupId : null,
    clientStoreId : null,
    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },
    /**
     * 初始化（页面初始化）
     */
    init : function(groupId, clientStoreId){
        this.groupId = groupId;
        this.clientStoreId = clientStoreId;
        this.resetFormInput();
        $("#loginForm_csi").val(clientStoreId);
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
            common.getJson("/studio/login",$("#loginForm").serialize(),function(result){
                if(!result.isOK){
                    studioMbPop.loadingBlock($("#loginPop"), true);
                    studioMbPop.showMessage(result.error.errmsg);
                    studioMbLogin.resetFormInput();
                    return false;
                }else{
                    if(studioMbLogin.groupId){
                        common.getJson("/studio/checkGroupAuth",{groupId:studioMbLogin.groupId},function(){
                            studioMbPop.loadingBlock($("#loginPop"), true);
                            studioMbPop.reload();
                        },true,function(err){
                            studioMbPop.loadingBlock($("#loginPop"), true);
                            if("success"!=err) {
                                studioMbPop.showMessage("操作失败，请联系客服！");
                            }
                        });
                    }else{
                        studioMbPop.loadingBlock($("#loginPop"), true);
                        studioMbPop.reload();
                    }
                }
            },true,function(){
                studioMbLogin.resetFormInput();
                studioMbPop.loadingBlock($("#loginPop"), true);
            });
        });

        //忘记密码
        $("#loginForm_prc").bind("click", function(){
            studioMbPop.popBox("resetChk");
        });

        //金道用户免注册
        $("#loginForm_plp").bind("click", function(){
            studioMbPop.popBox("loginPM", {
                groupId: studioMbLogin.groupId,
                clientStoreId: studioMbLogin.clientStoreId
            });
        });

        //还没有注册？
        $("#loginForm_pr").bind("click", function(){
            studioMbPop.popBox("reg", {
                clientStoreId: studioMbLogin.clientStoreId,
                clientGroup: "",
                mobilePhone: "",
                verifyCode: "",
                isPM: false,
                groupId : studioMbLogin.groupId
            });
        });
    },
    /**
     * 重置页面
     */
    resetFormInput:function(){
        $("#loginForm").trigger("reset");
    },
    /**
     * 检查页面输入
     */
    checkFormInput:function(){
        var isTrue=true,message="";
        var mobilePhone,pwd;
        mobilePhone = $("#loginForm_mb").val();
        pwd = $("#loginForm_pwd").val();
        if(common.isBlank(mobilePhone)){
            isTrue = false;
            message="手机号码不能为空！";
        }else if(common.isBlank(pwd)){
            isTrue = false;
            message="密码不能为空！";
        }else if(!common.isMobilePhone(mobilePhone)){
            isTrue = false;
            message="手机号码输入有误！";
        }
        studioMbPop.showMessage(message);
        return isTrue;
    }
};

/**
 * 金道用户登录
 */
var studioMbLoginPm = {
    verifyCodeIntervalId : 0,
    groupId : null,
    clientStoreId : null,

    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },
    /**
     * 初始化（页面初始化）
     */
    init : function(groupId, clientStoreId){
        this.groupId = groupId;
        this.clientStoreId = clientStoreId;
        this.resetFormInput();
        $("#loginPmForm_csi").val(clientStoreId);
    },
    /**
     * 绑定事件
     */
    setEvent : function(){
        //登录
        $("#loginPmForm_sub").bind("click", function(){
            if(!studioMbLoginPm.checkFormInput()){
                return;
            }
            studioMbPop.loadingBlock($("#loginPmPop"));
            common.getJson("/studio/login",$("#loginPmForm").serialize(),function(result){
                if(!result.isOK){
                    studioMbPop.loadingBlock($("#loginPmPop"), true);
                    if(result.hasPM){
                        studioMbPop.popBox("reg", {
                            clientStoreId: studioMbLoginPm.clientStoreId,
                            clientGroup: result.clientGroup,
                            mobilePhone: result.mobilePhone,
                            verifyCode: result.verifyCode,
                            isPM: true,
                            groupId : studioMbLoginPm.groupId
                        });
                        return false;
                    }else{
                        studioMbPop.showMessage(result.error.errmsg);
                        return false;
                    }
                }else{
                    if(studioMbLoginPm.groupId){
                        common.getJson("/studio/checkGroupAuth",{groupId:studioMbLoginPm.groupId},function(){
                            studioMbPop.loadingBlock($("#loginPmPop"), true);
                            studioMbPop.reload();
                        },true,function(err){
                            studioMbPop.loadingBlock($("#loginPmPop"), true);
                            if("success"!=err) {
                                studioMbPop.showMessage("操作失败，请联系客服！");
                            }
                        });
                    }else{
                        studioMbPop.loadingBlock($("#loginPmPop"), true);
                        studioMbPop.reload();
                    }
                }
            },true,function(){
                studioMbLoginPm.resetFormInput();
                studioMbPop.loadingBlock($("#loginPmPop"), true);
            });
        });

        //手机校验
        $("#loginPmForm_mb").bind("input propertychange", function(){
            var domBtn=$("#loginPmForm_vcb");
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
        $("#loginPmForm_vcb").bind("click", function(){
            $("#loginPmForm_vc").blur();
            if(!$(this).hasClass("pressed")){
                return;
            }
            $(this).removeClass("pressed").val("发送中...");
            var mobile=$("#loginPmForm_mb").val();
            try{
                $.getJSON('/studio/getMobileVerifyCode?t=' + new Date().getTime(),{mobilePhone:mobile, useType:"studio_login"},function(data){
                    if(!data || data.result != 0){
                        if(data.errcode == "1005"){
                            studioMbPop.showMessage(data.errmsg);
                        }else{
                            console.error("提取数据有误！");
                        }
                        studioMbLoginPm.resetVerifyCode();
                    }else{
                        studioMbLoginPm.setVerifyCodeTime();
                    }
                });
            }catch (e){
                studioMbLoginPm.resetVerifyCode();
                console.error("getMobileVerifyCode->"+e);
            }
        });
    },
    /**
     * 重置页面
     */
    resetFormInput:function(){
        $("#loginPmForm_mb").val("").trigger("input");
        $("#loginPmForm_vc").val("");
    },
    /**
     * 检查页面输入
     */
    checkFormInput:function(){
        var isTrue=true,message="";
        var mobilePhone,verifyCode;
        mobilePhone = $("#loginPmForm_mb").val();
        verifyCode = $("#loginPmForm_vc").val();
        if(common.isBlank(mobilePhone)){
            isTrue = false;
            message="手机号码不能为空！";
        }else if(common.isBlank(verifyCode)){
            isTrue = false;
            message="手机验证码不能为空！";
        }else if(!common.isMobilePhone(mobilePhone)){
            isTrue = false;
            message="手机号码输入有误！";
        }
        studioMbPop.showMessage(message);
        return isTrue;
    },
    /**
     * 重置验证码
     */
    resetVerifyCode:function(){
        if(studioMbLoginPm.verifyCodeIntervalId) {
            clearInterval(studioMbLoginPm.verifyCodeIntervalId);
            studioMbLoginPm.verifyCodeIntervalId=null;
        }
        $("#loginPmForm_vcb").attr("t",60).val("获取验证码");
        $("#loginPmForm_mb").trigger("input");
    },
    /**
     * 验证码倒计时
     */
    setVerifyCodeTime:function(){
        var item = $("#loginPmForm_vcb");
        var t=parseInt(item.attr("t"))||60;
        if(!studioMbLoginPm.verifyCodeIntervalId){
            studioMbLoginPm.verifyCodeIntervalId=window.setInterval(studioMbLoginPm.setVerifyCodeTime,1000);
        }
        if(t>1){
            item.attr("t",t-1).val((t-1)+"秒后重新获取");
        }else{
            studioMbLoginPm.resetVerifyCode();
        }
    }
};

/**
 * 用户注册
 */
var studioMbReg = {
    verifyCodeIntervalId : 0,
    groupId : null,

    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },
    /**
     * 初始化（页面初始化）
     */
    init : function(clientStoreId, clientGroup, mobilePhone, verifyCode, isPM, groupId){
        this.groupId = groupId;
        $("#regForm").trigger("reset");
        $("#regForm_csi").val(clientStoreId);
        $("#regForm_cg").val(clientGroup);
        $("#regForm_mb").val(mobilePhone).trigger("input");
        $("#regForm_vc").val(verifyCode);
        var titleDom = $("#regPop").find(".mtit span");
        var pmField = $("#regForm").find(".pm");
        if(isPM){
            titleDom.html("直播间设置");
            pmField.hide();
        }else{
            titleDom.html("直播间注册");
            pmField.show();
        }
    },
    /**
     * 绑定事件
     */
    setEvent : function(){
        //确认
        $("#regForm_sub").bind("click", function(){
            if(!studioMbReg.checkFormInput()){
                return;
            }
            studioMbPop.loadingBlock($("#regPop"));
            common.getJson("/studio/reg",$("#regForm").serialize(),function(result){
                studioMbPop.loadingBlock($("#regPop"), true);
                if(!result.isOK){
                    studioMbPop.showMessage(result.error.errmsg);
                    return false;
                }else{
                    studioMbPop.popBox("msg",{
                        msg : "恭喜你注册成功！",
                        type : "reg",
                        groupId : studioMbReg.groupId
                    });
                }
            },true,function(){
                studioMbPop.loadingBlock($("#regPop"), true);
            });
        });

        //手机校验
        $("#regForm_mb").bind("input propertychange", function(){
            var domBtn=$("#regForm_vcb");
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
        $("#regForm_vcb").bind("click", function(){
            $("#regForm_vc").blur();
            if(!$(this).hasClass("pressed")){
                return;
            }
            $(this).removeClass("pressed").val("发送中...");
            var mobile=$("#regForm_mb").val();
            try{
                $.getJSON('/studio/getMobileVerifyCode?t=' + new Date().getTime(),{mobilePhone:mobile, useType:"studio_reg"},function(data){
                    if(!data || data.result != 0){
                        if(data.errcode == "1005"){
                            studioMbPop.showMessage(data.errmsg);
                        }else{
                            console.error("提取数据有误！");
                        }
                        studioMbReg.resetVerifyCode();
                    }else{
                        studioMbReg.setVerifyCodeTime();
                    }
                });
            }catch (e){
                studioMbReg.resetVerifyCode();
                console.error("getMobileVerifyCode->"+e);
            }
        });
    },
    /**
     * 检查页面输入
     */
    checkFormInput:function(){
        var isTrue=true,message="";
        var mobilePhone,verifyCode,nickname,firstPwd,pwd;
        mobilePhone = $("#regForm_mb").val();
        verifyCode = $("#regForm_vc").val();
        nickname = $("#regForm_nn").val();
        firstPwd = $("#regForm_pwd1").val();
        pwd = $("#regForm_pwd").val();
        if(common.isBlank(mobilePhone)){
            isTrue = false;
            message="手机号码不能为空！";
        }else if(!common.isMobilePhone(mobilePhone)){
            isTrue = false;
            message="手机号码输入有误！";
        }else if(common.isBlank(verifyCode)){
            isTrue = false;
            message="手机验证码不能为空！";
        }else if(common.isBlank(firstPwd) || common.isBlank(pwd)){
            isTrue = false;
            message="密码不能为空！";
        }else if(firstPwd != pwd){
            isTrue = false;
            message="两次密码不一致！";
        }else if(!(/^[A-Za-z0-9]{6,16}$/.test(pwd))){
            isTrue = false;
            message="密码输入有误，请输入6至16位字母或数字组合！";
        }else if(!(/^.{2,10}$/.test(nickname))){
            isTrue = false;
            message="昵称输入有误，请输入2至10位字符！";
        }
        studioMbPop.showMessage(message);
        return isTrue;
    },
    /**
     * 重置验证码
     */
    resetVerifyCode:function(){
        if(studioMbReg.verifyCodeIntervalId) {
            clearInterval(studioMbReg.verifyCodeIntervalId);
            studioMbReg.verifyCodeIntervalId=null;
        }
        $("#regForm_vcb").attr("t",60).val("获取验证码");
        $("#regForm_mb").trigger("input");
    },
    /**
     * 验证码倒计时
     */
    setVerifyCodeTime:function(){
        var item = $("#regForm_vcb");
        var t=parseInt(item.attr("t"))||60;
        if(!studioMbReg.verifyCodeIntervalId){
            studioMbReg.verifyCodeIntervalId=window.setInterval(studioMbReg.setVerifyCodeTime,1000);
        }
        if(t>1){
            item.attr("t",t-1).val((t-1)+"秒后重新获取");
        }else{
            studioMbReg.resetVerifyCode();
        }
    }
};
/**
 * 重置密码验证手机
 */
var studioMbResetChk = {
    verifyCodeIntervalId : 0,
    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },
    /**
     * 初始化（页面初始化）
     */
    init : function(){
        $("#resetChkForm_mb").val("").trigger("input");
        $("#resetChkForm_vc").val("");
    },
    /**
     * 绑定事件
     */
    setEvent : function(){
        //下一步
        $("#resetChkForm_sub").bind("click", function(){
            if(!studioMbResetChk.checkFormInput()){
                return;
            }
            var loc_data = {
                mobilePhone : $("#resetChkForm_mb").val(),
                verifyCode : $("#resetChkForm_vc").val(),
                isCheck : 'true'
            };
            studioMbPop.loadingBlock($("#resetChkPop"));
            common.getJson("/studio/getPwd", loc_data, function(result){
                studioMbPop.loadingBlock($("#resetChkPop"), true);
                if(!result.isOK){
                    studioMbPop.showMessage(result.error.errmsg);
                    return false;
                }else{
                    studioMbPop.popBox("reset", loc_data);
                }
            },true,function(){
                studioMbPop.loadingBlock($("#resetChkPop"), true);
            });
        });

        //手机校验
        $("#resetChkForm_mb").bind("input propertychange", function(){
            var domBtn=$("#resetChkForm_vcb");
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
        $("#resetChkForm_vcb").bind("click", function(){
            $("#resetChkForm_vc").blur();
            if(!$(this).hasClass("pressed")){
                return;
            }
            $(this).removeClass("pressed").val("发送中...");
            var mobile=$("#resetChkForm_mb").val();
            try{
                $.getJSON('/studio/getMobileVerifyCode?t=' + new Date().getTime(),{mobilePhone:mobile, useType:"studio_resetPWD"},function(data){
                    if(!data || data.result != 0){
                        if(data.errcode == "1005"){
                            studioMbPop.showMessage(data.errmsg);
                        }else{
                            console.error("提取数据有误！");
                        }
                        studioMbResetChk.resetVerifyCode();
                    }else{
                        studioMbResetChk.setVerifyCodeTime();
                    }
                });
            }catch (e){
                studioMbResetChk.resetVerifyCode();
                console.error("getMobileVerifyCode->"+e);
            }
        });
    },
    /**
     * 检查页面输入
     */
    checkFormInput:function(){
        var isTrue=true,message="";
        var mobilePhone,verifyCode;
        mobilePhone = $("#resetChkForm_mb").val();
        verifyCode = $("#resetChkForm_vc").val();
        if(common.isBlank(mobilePhone)){
            isTrue = false;
            message="手机号码不能为空！";
        }else if(common.isBlank(verifyCode)){
            isTrue = false;
            message="手机验证码不能为空！";
        }else if(!common.isMobilePhone(mobilePhone)){
            isTrue = false;
            message="手机号码输入有误！";
        }
        studioMbPop.showMessage(message);
        return isTrue;
    },
    /**
     * 重置验证码
     */
    resetVerifyCode:function(){
        if(studioMbResetChk.verifyCodeIntervalId) {
            clearInterval(studioMbResetChk.verifyCodeIntervalId);
            studioMbResetChk.verifyCodeIntervalId=null;
        }
        $("#resetChkForm_vcb").attr("t",60).val("获取验证码");
        $("#resetChkForm_mb").trigger("input");
    },
    /**
     * 验证码倒计时
     */
    setVerifyCodeTime:function(){
        var item = $("#resetChkForm_vcb");
        var t=parseInt(item.attr("t"))||60;
        if(!studioMbResetChk.verifyCodeIntervalId){
            studioMbResetChk.verifyCodeIntervalId=window.setInterval(studioMbResetChk.setVerifyCodeTime,1000);
        }
        if(t>1){
            item.attr("t",t-1).val((t-1)+"秒后重新获取");
        }else{
            studioMbResetChk.resetVerifyCode();
        }
    }
};
/**
 * 重置密码
 */
var studioMbReset = {
    /**
     * 初始化（页面加载）
     */
    load : function(){
        this.setEvent();
    },
    /**
     * 初始化（页面初始化）
     */
    init : function(mobilePhone, verifyCode){
        $("#resetForm_mb").val(mobilePhone);
        $("#resetForm_vc").val(verifyCode);
    },
    /**
     * 绑定事件
     */
    setEvent : function(){
        //确认
        $("#resetForm_sub").bind("click", function(){
            if(!studioMbReset.checkFormInput()){
                return;
            }
            studioMbPop.loadingBlock($("#resetPop"));
            common.getJson("/studio/getPwd",$("#resetForm").serialize(),function(result){
                studioMbPop.loadingBlock($("#resetPop"), true);
                if(!result.isOK){
                    studioMbPop.showMessage(result.error.errmsg);
                }else{
                    studioMbPop.reload();
                }
            },true,function(){
                studioMbPop.loadingBlock($("#resetPop"), true);
            });
        });
    },
    /**
     * 检查页面输入
     */
    checkFormInput:function(){
        var isTrue=true,message="";
        var firstPwd,pwd;
        firstPwd = $("#resetForm_pwd1").val();
        pwd = $("#resetForm_pwd").val();
        if(common.isBlank(firstPwd) || common.isBlank(pwd)){
            isTrue = false;
            message="密码不能为空！";
        }else if(firstPwd != pwd){
            isTrue = false;
            message="两次密码不一致！";
        }else if(!(/^[A-Za-z0-9]{6,16}$/.test(pwd))){
            isTrue = false;
            message="密码输入有误，请输入6至16位字母或数字组合！";
        }
        studioMbPop.showMessage(message);
        return isTrue;
    }
};
/**
 * 错误消息显示
 */
var studioMbMsg = {
    type : null, //reg-注册成功 upg-升级成功
    groupId : null,

    /**
     * 初始化（页面加载）
     */
    load : function(){
        $("#resultForm_sub").bind("click", function(){
            if(studioMbMsg.type === "reg"){
                if(!studioMbMsg.groupId){
                    studioMbPop.reload();
                }else{
                    common.getJson("/studio/checkGroupAuth",{groupId:studioMbMsg.groupId},function(){
                        studioMbPop.reload();
                    },true,function(err){
                        if("success"!=err) {
                            studioMbPop.reload();
                        }
                    });
                }
            }else{
                studioMbPop.popHide();
            }
        });
    },
    /**
     * 初始化（页面初始化）
     */
    init : function(type, msg, groupId){
        this.type = type;
        this.groupId = groupId;
        $("#resultForm_msg").html(msg);
    }
};
/**
 * 直播间弹出层控制类
 */
var studioMbPop = {
    Person : studioMbPerson,
    Login : studioMbLogin,
    LoginPM : studioMbLoginPm,
    Reg : studioMbReg,
    ResetChk : studioMbResetChk,
    Reset : studioMbReset,
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
            loc_item.fadeIn().delay(1000).fadeOut(200);
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
        window.location.href = "/studio?t=" + new Date().getTime();
    },
    /**
     * 初始化（页面加载）
     */
    load : function(userInfo, events){
        if(events){
            this.onShow = typeof events.onShow == "function" ? events.onShow : null;
            this.onHide = typeof events.onHide == "function" ? events.onHide : null;
        }
        this.Person.load(userInfo);
        this.Login.load();
        this.LoginPM.load();
        this.Reg.load();
        this.ResetChk.load();
        this.Reset.load();
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
                this.Login.init(ops.groupId, ops.clientStoreId);
                break;

            case "loginPM" :
                this.popShow($("#loginPmPop"));
                this.LoginPM.init(ops.groupId, ops.clientStoreId);
                break;

            case "reg" :
                this.popShow($("#regPop"));
                this.Reg.init(ops.clientStoreId, ops.clientGroup, ops.mobilePhone, ops.verifyCode, ops.isPM, ops.groupId);
                break;

            case "resetChk" :
                this.popShow($("#resetChkPop"));
                this.ResetChk.init();
                break;

            case "reset" :
                this.popShow($("#resetPop"));
                this.Reset.init(ops.mobilePhone, ops.verifyCode);
                break;

            case "msg" :
                this.popShow($("#resultPop"));
                this.Msg.init(ops.type, ops.msg, ops.groupId);
                break;
        }
    }
};