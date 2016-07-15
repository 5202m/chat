/**
 * 后台聊天室主页操作类
 * author Alan.wu
 */
var index={
    currNwWin:null,
    winOpenObj:[],
    isNw: false,
    /**
     * 初始化
     */
    init:function(){
        this.setEvent();
    },
    setEvent:function(){
        this.joinRoom();
        $('.lst_p .rm_p label').click(function(){
            if($(this).next('.rm_list').is(':hidden')){
                $(this).next('.rm_list').show();
                $(this).parent().addClass("on");
            }else {
                $(this).parent().removeClass("on");
                $(this).next('.rm_list').hide();
            }
        });
        $('#logBtnSub').click(function(){
            index.login();
        });
        $("#loginForm input").keydown(function(e){
            if(e.keyCode==13){//按回车键直接提交登录
                index.login();
            }
        });
        $('.mod_left1 .title a').click(function(){
            index.logout();
        });
    },
    /**
     * 登录
     */
    login:function(){
        var userId = $.trim($('#loginForm input[name="userId"]').val());
        var password = $.trim($('#loginForm input[name="password"]').val());
        if(common.isBlank(userId)) {
            $('#loginForm .error').text('请输入用户名');
        }else if(common.isBlank(password)){
            $('#loginForm .error').text('请输入登录密码');
        }else{
            $('#loginForm .error').text('');
            common.getJson('/admin/login',{userId:userId,password:password},function(data){
                if(data.isOK){
                    location.reload();
                }else{
                    $('#loginForm .error').text(data.msg);
                }
            });
        }
    },
    /**
     * 进入房间
     */
    joinRoom:function(){
        $('.lst_p .rm_p .rm_list li').click(function(){
            $('.lst_p .rm_p .rm_list li').removeClass('on');
            $(this).addClass('on');
            var groupId = $(this).attr('r'),groupType=$(this).attr('t'),groupName =$(this).parent().prev().text(),roomName=$(this).children('span').text();
            var iframeSrc = "/admin/room?groupId="+ groupId+"&groupType="+groupType+"&roomName="+groupName+"【"+roomName+"】";
            if(index.isNw){
                iframeSrc += "&nw="+index.isNw;
            }
            var winOpen = window.open(iframeSrc, groupId, "location=no,resizable=yes");
            index.winOpenObj.push(winOpen);
        });
    },
    /**
     * 登出并关闭窗口
     */
    logout:function(){
        var url = '/admin/logout';
        if(index.isNw){
            url += '?nw='+index.isNw;
        }
        $.getJSON(url,null,function(data){
            if(data.isOK){
                if(data.isNw){
                    index.closeOpenWin(true);
                } else {
                    index.closeOpenWin(false);
                    location.reload();
                }
            }
        });
    },
    /**
     * 关闭主、子窗口
     */
    closeOpenWin:function(isNw){
        if(isNw){
            index.currNwWin.removeAllListeners('close');
            index.currNwWin.close();
        }
        if(index.winOpenObj!=[]){
            var len = index.winOpenObj.length;
            for(var i= 0;i<len;i++){
                index.winOpenObj[i].close();
            }
        }
    }
};

// 初始化
$(function() {
    index.init();
});