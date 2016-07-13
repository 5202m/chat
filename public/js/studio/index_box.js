/**
 * 直播间弹框操作类
 * author Alan.wu
 */
var box={
    verifyCodeIntId:null,
    toRoomId:null,
    enable : true, //是否使用store
    storeInfoKey : "storeInfo_VerifyCodeTime",
    /**
     * 方法入口
     */
    init:function(){
       this.setEvent();
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
        //继续上一次的获取验证码间隔时间，防刷新
        //this.contVerifyCodeTime();
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
                $.getJSON('/studio/getClientGroupList',null,function(data){
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
                            common.getJson("/studio/upgrade",{clientGroup : loc_upLevel},function(result){
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
        // 弹出登录框
        $('#login_a').bind("click", function(e, ops){
            ops = ops || {};
            box.toRoomId = ops.groupId;
            box.openLgBox(ops.closeable, ops.showTip);
            if(common.isValid($(this).attr("tp"))){
                _gaq.push(['_trackEvent', 'pmchat_studio', 'login', $(this).attr("tp"), 1, true]);
            }
        });
        if(indexJS.userInfo.clientGroup=='visitor'){
            if(!indexJS.currStudioAuth){
                $("#login_a").trigger("click", {closeable : false}); //弹出登录框，隐藏关闭按钮
            }else if(this.forceLogin()){
                $("#login_a").trigger("click", {closeable : false, showTip:true}); //弹出登录框，不允许关闭
            }else{
                //3分钟后强制要求登录
                window.setTimeout(function(){
                    if(indexJS.userInfo.clientGroup=='visitor'){
                        box.forceLogin(true);
                        $("#login_a").trigger("click", {closeable : false, showTip:true}); //弹出登录框，不允许关闭
                    }
                }, 180000);

                if(!indexJS.userInfo.isLogin){
                    $(".blackbg,#main_ad_box").show();
                    window.setTimeout(function(){
                        if($(".blackbg").is(":hidden")){
                            $(".blackbg,#main_ad_box").show();
                        }
                    }, 300000);
                    /**
                     * 进入VIP专场
                     */
                    $('#mainAdBtn1').click(function(){
                        $("#main_ad_box .pop_close").trigger("click");
                        $(".rooms .enterbtn:first").trigger("click");
                    });
                    /**
                     * 进入新手专场
                     */
                    $('#mainAdBtn2').click(function(){
                        $("#main_ad_box .pop_close").trigger("click");
                        $("#login_a").trigger("click");
                    });
                }
            }
        }
        /**
         * 注销
         */
        $(".logout").bind("click", function(){
            LoginAuto.setAutoLogin(false);
            window.location.href="/studio/logout?platform=" + indexJS.fromPlatform;
        });
        //手机号码输入控制
        $("#loginForm input[name=mobilePhone],#loginForm input[name=verifyCode],#setNkForm input[name=nickname]").bind("input propertychange", function() {
            if(common.isValid(this.value)){
                $(".popup_box .error").hide();
            }
        });
        //验证码事件
        $('#loginForm .rbtn').click(function(){
            if($(this).hasClass("pressed")){
                return;
            }
            var mobile=$("#loginForm input[name=mobilePhone]").val();
            if(!common.isMobilePhone(mobile)){
                $("#loginForm .error").html("<i></i>手机号码有误，请重新输入！").show();
                return;
            }
            $(this).addClass("pressed").html("发送中...");
            try{
                $.getJSON('/studio/getMobileVerifyCode?t=' + new Date().getTime(),{mobilePhone:mobile, useType:$(this).attr("ut")},function(data){
                    if(!data || data.result != 0){
                        if(data.errcode == "1005"){
                            $("#loginForm .error").html("<i></i>"+data.errmsg).show();
                        }else{
                            console.error("提取数据有误！");
                        }
                        box.resetVerifyCode();
                    }else{
                        $("#loginForm .error").hide();
                        box.setVerifyCodeTime('#loginForm .rbtn');
                    }
                });
            }catch (e){
                box.resetVerifyCode();
                console.error("setMobileVerifyCode->"+e);
            }
        });
        /**
         * 按钮按回车键事件
         */
        $("#loginForm input[name=verifyCode],#setNkForm input[name=nickname]").keydown(function(e){
            if(e.keyCode==13){
                $(this).parents("form").find(".set_submit").click();
                return false;
            }
        });
        /**
         * 登录按钮事件
         */
        $("#logBtnSub").click(function(){
            $('#loginForm input[name=clientStoreId]').val(indexJS.userInfo.clientStoreId);
            if(!box.checkFormInput("#loginForm")){
                return;
            }
            $(this).attr('disabled',true);
            var _this=this;
            $('#formBtnLoad').show();
            common.getJson("/studio/login",$("#loginForm").serialize(),function(result){
                $("#loginForm .error").hide();
                $(_this).attr('disabled',false);
                $('#formBtnLoad').hide();
                if(!result.isOK){
                    $("#loginForm .error").html("<i></i>"+result.error.errmsg).show();
                    return false;
                }else{
                    $(".blackbg,#loginBox").hide();
                    LoginAuto.setAutoLogin($("#autoLogin").prop("checked"));
                    indexJS.userInfo.clientGroup = result.userInfo.clientGroup;
                    if(box.toRoomId){
                        common.getJson("/studio/checkGroupAuth",{groupId:box.toRoomId},function(checkGroupRes){
                            if(!checkGroupRes.isOK){
                                if(indexJS.checkClientGroup("vip")){
                                    alert("您已具备进入Vip专场的条件，我们将为您自动进入VIP专场。");
                                }else{
                                    alert("已有真实账户并激活的客户才可进入Vip专场，您还不满足条件。我们将为您自动进入新手专场。");
                                }
                            }
                            indexJS.toRefreshView();
                        },true,function(err){
                            if("success"!=err) {
                                box.preGroupId = null;
                                alert("操作失败，请联系客服！" );
                            }
                        });
                    }else{
                        if(indexJS.checkClientGroup("vip")){
                            alert("您已具备进入Vip专场的条件，我们将为您自动进入VIP专场。");
                        }
                        indexJS.toRefreshView();
                    }
                }
            },true,function(err){
                $(_this).attr('disabled',false);
                $('#formBtnLoad').hide();
            });
        });
        /**
         * 设置昵称信息
         */
        $("#setNkBtn").click(function(){
            if(!box.checkFormInput("#setNkForm")){
                return;
            }
            $(this).prop('disabled',true);
            var _this=this;
            $('#setNkLoad').show();
            common.getJson("/studio/modifyName",$("#setNkForm").serialize(),function(result){
                $("#setNkForm .error").hide();
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
    checkFormInput:function(formDom,$error){
        var isTrue=true;
        if(!$error){
            $error=$(formDom+" .error");
        }
        $error.attr("tId","").hide();
        $(formDom+" input").each(function(){
            if(common.isBlank($(this).val())){
                if(this.name=='mobilePhone'){
                    $error.attr("tId",this.name).html("<i></i>手机号码不能为空！").show();
                }
                if(this.name=='verifyCode'){
                    $error.attr("tId",this.name).html("<i></i>验证码不能为空！").show();
                }
                if(this.name=='nickname'){
                    $error.attr("tId",this.name).html("<i></i>昵称不能为空！").show();
                }
                isTrue=false;
                return isTrue;
            }else{
                if(this.name=='mobilePhone') {
                    $(this).val($.trim($(this).val()));
                    if(!common.isMobilePhone(this.value)){
                        $error.attr("tId",this.name).html("<i></i>手机号码输入有误！").show();
                        isTrue=false;
                        return isTrue;
                    }
                }
                if(this.name=='nickname'&& !common.isRightName(this.value)) {
                    $error.attr("tId",this.name).html("<i></i>昵称为2至10位字符(数字/英文/中文/下划线)，不能全数字!").show();
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
     */
    setVerifyCodeTime:function(tId){
        var t=parseInt($(tId).attr("t"))||120;
        var key = this.storeInfoKey + $("#loginForm input[name=mobilePhone]").val();
        this.enable && store.set(key , t-1);
        if(!this.verifyCodeIntId){
            this.verifyCodeIntId=setInterval("box.setVerifyCodeTime('"+tId+"')",1000);
        }
        if(t>1){
            $(tId).attr("t",t-1).html("重新获取(" + (t-1) + ")");
        }else{
            clearInterval(this.verifyCodeIntId);
            this.verifyCodeIntId="";
            $(tId).attr("t",120).html("获取验证码").removeClass("pressed");
        }
    },
    /**
     * 重置验证码
     */
    resetVerifyCode:function(){
        if(this.verifyCodeIntId) {
            clearInterval(this.verifyCodeIntId);
            this.verifyCodeIntId='';
        }
        $("#loginForm .rbtn").attr("t",120).html("获取验证码").removeClass("pressed");
    },
    /**
     * 弹出登录框
     */
    openLgBox:function(closeable, showTip){
        if(closeable === false){
            $("#loginBox .pop_close").hide();
        }else{
            $("#loginBox .pop_close").show();
        }
        if(showTip){
            $("#login_tip").show();
        }else{
            $("#login_tip").hide();
        }
        $(".popup_box").hide();
        $("#loginBox,.blackbg").show();
    },
    /**
     * 打开昵称设置框
     */
    openSetNameBox:function(){
        $(".nk_box,.blackbg").show();
    },
    /**
     * 提取验证码
     */
    refreshVerifyCode:function(){
        var groupType = LoginAuto.sessionUser['groupType'];
        $("#verifyCodeId img").attr("src",'/'+groupType+'/getVerifyCode?v='+Math.random());
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
            if($.trim($('#mailFrom').val())==''){
                $('.expert_box .error').html('<i></i>发件人不能为空！').show();
            }
            else if($.trim($('#mailContent').val())==''){
                $('.expert_box .error').html('<i></i>输入内容有误，请重新输入！').show();
            }
            else if($.trim($('#mailImgCode').val())==''){
                $('.expert_box .error').html('<i></i>验证码不能为空！').show();
            }
            else{
                $('.expert_box .error').hide();
                var param = {};
                param.content = $.trim($('#mailContent').val());
                param.email = $.trim($('#mailFrom').val());
                param.code = $.trim($('#mailImgCode').val());
                common.getJson('/studio/email', {key:'studio',data: JSON.stringify(param)}, function(result){
                    if(result.isOK){
                        box.showMsg(result.msg);
                        $('.expert,.blackbg').hide();
                        $('#mailFrom,#mailContent').val('');
                    }
                    else{
                        box.showMsg(result.msg);
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
    },
    /**
     * 防止刷新获取手机验证码
     */
    contVerifyCodeTime:function(){
        var mobile =  $("#loginForm input[name=mobilePhone]").val();
        if(mobile && this.enable){
            var key = this.storeInfoKey + mobile;
            var t = store.get(key);
            if(t>1){
                var tId = "#loginForm .rbtn";
                $(tId).attr("t",t).addClass("pressed");
                box.setVerifyCodeTime(tId);
            }
        }
    }
};
// 初始化
$(function() {
    box.init();
});