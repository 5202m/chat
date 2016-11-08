/**
 * 直播间聊天区晒单墙选项卡操作类
 * author Jade.zhu
 */
var chatShowTrade = {
    tradeForUser:null,//指定用户的晒单(userNo)
    tradeList:[],//晒单数据
    tradeLoadAll:false,
    init: function(){
        this.setEvent();
    },
    setEvent: function(){
        /**
         * 如果已经登录，则直接取积分
         */
        if(indexJS.userInfo.isLogin) {
            chatShowTrade.getPointsInfo();
        }
        /*我要晒单按钮事件*/
        $('#wantShowTrade').click(function(){
            if(indexJS.userInfo.isLogin){
                if(common.isBlank(indexJS.userInfo.isSetName) || indexJS.userInfo.isSetName) {
                    $('#userName').val(indexJS.userInfo.nickname).attr('readonly', 'readonly');
                }
                common.openPopup('.pop_addsd,.blackbg');
            }else{
                var ops = ops || {};
                box.openLgBox(ops.closeable, ops.showTip);
            }
        });
        /*我的晒单按钮事件*/
        $('#myShowTrade').click(function(){
            if(indexJS.userInfo.isLogin){
                $('.pop_mysd .sd_list .sd_ul').empty();
                chatShowTrade.getPointsInfo();
                chatShowTrade.tradeForUser = indexJS.userInfo.userId;
                chatShowTrade.initShowTrade();
                $('.pop_mysd .personal_info .headimg img').attr('src',$('#avatarInfoId').attr('src'));
                $('.pop_mysd .personal_info .username').text(indexJS.userInfo.nickname);
                $('.pop_mysd .personal_info .infobar').removeClass('dn');
                common.openPopup('.pop_mysd,.blackbg');
            }else{
                var ops = {};
                box.openLgBox(ops.closeable, ops.showTip);
            }
        });
        /*上传晒单图片*/
        $("#flTradeImg").change(function (){
            var _this=this;
            var img = _this.files[0];
            // 判断是否图片
            if(!img){
                return false;
            }
            // 判断图片格式
            if(!(img.type.indexOf('image')==0 && img.type && /\.(?:jpg|png|gif)$/.test(img.name.toLowerCase())) ){
                alert('目前暂支持jpg,gif,png格式的图片！');
                return false;
            }
            var fileSize=img.size;
            if(fileSize>=1024*512){
                alert('上传的图片大小不要超过512KB.');
                return false ;
            }
            try{
                var formData = new FormData($("#showTradeForm")[0]);
                $.ajax({
                    url: indexJS.apiUrl+'/upload/uploadFile',
                    type: 'POST',
                    data: formData,
                    async: false,
                    cache: false,
                    contentType: false,
                    processData: false,
                    success: function (dataRt) {
                        if(dataRt.result==0){
                            var data=dataRt.data?dataRt.data[0]:null;
                            if(data){
                                $('#tradeImg').val(data.fileDomain+data.filePath);
                                $(_this).val('');
                            }
                        }else{
                            alert("上传图片失败，请联系在线客服！");
                        }
                    },
                    error: function (result) {
                        console.error("error:",result);
                    }
                });
            }catch(es){
                console.error("上传图片失败",es);
            }
        });
        /*提交晒单数据*/
        $('#tradeSubmit').click(function(){
            chatShowTrade.showTrade();
        });
    },
    /**
     * 获取晒单数据
     * @param pageNo
     * @param pageSize
     */
    initShowTrade:function(){
        var params = {groupType:indexJS.userInfo.groupType};
        if(common.isValid(chatShowTrade.tradeForUser)){
            params.userNo = chatShowTrade.tradeForUser;
        }
        common.getJson('/studio/getShowTrade',{data:JSON.stringify(params)},function(data){
            if(data.isOK && common.isValid(data.data)){
                if(common.isValid(chatShowTrade.tradeForUser)) {
                    $('.pop_mysd .sd_list .sd_ul').empty();
                }
                chatShowTrade.tradeList = data.data.tradeList || [];
                chatShowTrade.tradeLoadAll = false;
                chatShowTrade.setShowTrade();
            }
        });
    },
    /**
     * 设置晒单墙数据显示
     * @returns {boolean}
     */
    setShowTrade:function(){
        if(chatShowTrade.tradeLoadAll){
            return false;
        }
        var start = common.isBlank(chatShowTrade.tradeForUser) ? $("#showTradeDiv .scrollbox ul.sd_ul li").size() : $(".pop_mysd .sd_list .sd_ul li").size();
        var listData = chatShowTrade.tradeList;
        var row = null;
        var length = listData.length;
        var tradeHtml='',tradeFormat = common.isBlank(chatShowTrade.tradeForUser) ? chatShowTrade.formatHtml('showTradeAll') : chatShowTrade.formatHtml('showTradeUser'),cls;
        for(var i = start; i < length && i < start + 20; i++){
            row = listData[i];
            if($('#showTradeDiv .sd_ul li[sid="'+row._id+'"]').length>0 && common.isBlank(chatShowTrade.tradeForUser)){
                continue;
            }
            switch (row.status){
                case 1:
                    cls = '';
                    break;
                case 0:
                    cls = ' class="checking"';
                    break;
                case -1:
                    cls = ' class="failed"';
                    break;
            }
            var showTradeDate = common.formatterDateTime(row.showDate,'/').substr(5,11);
            if(common.isBlank(chatShowTrade.tradeForUser)){
                tradeHtml += tradeFormat.formatStr(row.title, row.user.userName, showTradeDate, row.tradeImg, row.remark, common.isBlank(row.praise)?0:row.praise, row._id, row.user.userNo, row.user.avatar);
            }else{
                tradeHtml += tradeFormat.formatStr(row.title, showTradeDate, row.tradeImg, row.remark, common.isBlank(row.praise)?0:row.praise, row._id, cls);
            }
        }
        if(common.isBlank(chatShowTrade.tradeForUser)) {
            $('#showTradeDiv .scrollbox ul.sd_ul li').removeClass('r');
            $('#showTradeDiv .scrollbox ul.sd_ul').append(tradeHtml);
            $('#showTradeDiv .scrollbox ul.sd_ul li:odd').addClass('r');
        }else{
            $('.pop_mysd .sd_list .sd_ul li').removeClass('r');
            $('.pop_mysd .sd_list .sd_ul').append(tradeHtml);
            $('.pop_mysd .sd_list .sd_ul li:odd').addClass('r');
        }
        if(i >= length - 1){
            chatShowTrade.tradeLoadAll = true;
        }
        chatShowTrade.setUserShowTrade();
        chatShowTrade.showTradePraise();
        if(common.isBlank(chatShowTrade.tradeForUser)) {
            indexJS.setListScroll('#showTradeDiv .scrollbox', null, {callbacks : {onTotalScroll : function(){chatShowTrade.setShowTrade();}}});/*设置滚动条*/
        }else{
            $('.pop_mysd .sd_list .scrollbox').height(340);
            indexJS.setListScroll('.pop_mysd .sd_list .scrollbox', null, {callbacks : {onTotalScroll : function(){chatShowTrade.setShowTrade();}}});/*设置滚动条*/
        }
    },
    /**
     * 用户晒单数据
     */
    setUserShowTrade:function(){
        $('#showTradeDiv .sd_ul li .sd_tit .dep a').unbind("click").click(function(){
            chatShowTrade.tradeForUser = $(this).attr('userId');
            chatShowTrade.initShowTrade();
            $('.pop_mysd .personal_info .headimg img').attr('src',$(this).attr('avatar'));
            $('.pop_mysd .personal_info .username').text($(this).text());
            $('.pop_mysd .personal_info .infobar').addClass('dn');
            common.openPopup('.pop_mysd,.blackbg');
        });
    },
    /**
     * 我要晒单提交
     */
    showTrade:function(){
        var title = $('#title').val();
        var userName = $('#userName').val();
        var tradeImg = $('#tradeImg').val();
        var remark = $('#remark').val();
        if(common.isBlank(title)){
            $('#trade_error').text('请输入标题').show();
        }else if(common.isBlank(userName)){
            $('#trade_error').text('请输入晒单人').show();
        }else if(!common.isRightName(userName)){
            $('#trade_error').text('晒单人为2至10位字符(数字/英文/中文/下划线)，不能全数字!');
        }else if(common.isBlank(tradeImg)){
            $('#trade_error').text('请上传晒单图片').show();
        }else{
            var params = {groupType:indexJS.userInfo.groupType,
                groupId:indexJS.userInfo.groupId,
                userNo:indexJS.userInfo.userId,
                avatar:$('#avatarInfoId').attr('src'),
                userName:userName,
                tradeImg:tradeImg,
                remark:remark,
                title:title,
                tradeType:2
            };
            common.getJson('/studio/addShowTrade',{data:JSON.stringify(params)},function(data){
                if(data.isOK){
                    box.showMsg('您的晒单已成功提交，等待系统审核！');
                    if(!indexJS.userInfo.isSetName){
                        $('#myNickName').val(userName);
                        $('#setNkBtn').click();
                    }
                    $('.pop_addsd').hide();
                    $('.pop_addsd input[type="text"],.pop_addsd textarea').empty();
                }else{
                    box.showMsg(data.msg);
                }
            });
        }
    },
    /**
     * 晒单墙点赞事件
     */
    showTradePraise:function(){
        $('#showTradeDiv .scrollbox ul li .support,.pop_mysd .sd_list .sd_ul li .support').unbind("click").click(function(){
            var $this = $(this);
            var params = {clientId:indexJS.userInfo.userId, praiseId:$(this).attr('id')};
            common.getJson("/studio/setTradePraise",{data:JSON.stringify(params)},function(result){
                if(result.isOK) {
                    //$this.find('i').fadeIn().delay(400).fadeOut();
                    var sp= $this.find("span");
                    sp.text(common.isValid(sp.text())?(parseInt(sp.text())+1):0);
                }else{
                    box.showTipBox('亲，已点赞，当天只能点赞一次！');
                }
                $this.addClass('supported');
                $this.attr('title','已点赞');
            },true);
        });
    },
    /**
     * 获取积分
     */
    getPointsInfo:function(sendGet){
        common.getJson('/studio/getPointsInfo',{params:JSON.stringify({groupType:indexJS.userInfo.groupType})},function(data){
            if(data){
                var levelPointObj={},nextPointObj={};
                for(var i=indexJS.pointLevel.length-1;i>=0;i--){
                    var obj = indexJS.pointLevel[i];
                    if(data.pointsGlobal >= obj.points){
                        levelPointObj=obj;
                        nextPointObj=indexJS.pointLevel[i+1];
                        break;
                    }
                }
                $('#myLevel,#sdLevel').text(levelPointObj.name);
                $('.personal_center .levelbar .progress b,.pop_mysd .levelbar .progress b').css('width',(data.pointsGlobal/nextPointObj.points*100)+'%');
                $('.personal_center .levelbar .le_detail,.pop_mysd .levelbar .le_detail').attr({'pg':data.pointsGlobal,'sendget':sendGet}).text(data.pointsGlobal+'/'+nextPointObj.points);
                $('#mypoints,#sdPoints').text(data.points);
                var pointsGetDetail = [], pointsConsumeDetail = [],
                    pointsGetHtml = chatShowTrade.formatHtml('getPoint'),
                    pointsConsumeHtml = chatShowTrade.formatHtml('pointConsume');
                $.each(data.journal,function(i,row){
                    if(row.change>0){
                        pointsGetDetail.unshift(pointsGetHtml.formatStr(common.formatterDate(row.date,'.'), (row.remark?row.remark+'，':''), row.change));
                    }else if(row.change<0){
                        pointsConsumeDetail.unshift(pointsConsumeHtml.formatStr(common.formatterDate(row.date,'.'), (row.remark?row.remark+'，':''), Math.abs(row.change)));
                    }
                });
                $('#myPointsDetail .get .borbox table tbody').html(pointsGetDetail.join(''));
                $('#myPointsDetail .consume .borbox table tbody').html(pointsConsumeDetail.join(''));
                $('#myPointsDetail').css('height','280px');
                indexJS.setListScroll($('#myPointsDetail'));
            }else{
                $('#myLevel,#sdLevel').text('L0');
                $('.personal_center .levelbar .progress b,.pop_mysd .levelbar .progress b').css('width','0%');
                $('.personal_center .levelbar .le_detail,.pop_mysd .levelbar .le_detail').text('0/0');
                $('#mypoints,#sdPoints').text('0');
            }
        });
    },
    /**
     * 聊天室 推送用户晒单提示消息
     * @param data
     */
    pushShowTradeInfo:function(data) {
        var tradeHtml='',tradeFormat = chatShowTrade.formatHtml('showTradeAll'),row = null,txt=null;
        var html = chatShowTrade.formatHtml('pushShowTradeInfo');
        for(var i = 0, length=data.length; i < length; i++){
            row = data[i];
            if($('#showTradeDiv .sd_ul li[sid="'+row.id+'"]').length==0){
                var showTradeDate = common.formatterDateTime(row.showDate.time,'/').substr(5,11);
                tradeHtml += tradeFormat.formatStr(row.title, row.boUser.userName, showTradeDate, row.tradeImg, row.remark, (common.isBlank(row.praise)?0:row.praise), row.id, row.boUser.userNo, row.boUser.avatar);
                $('#showTradeDiv .scrollbox ul.sd_ul li').removeClass('r');
                $('#showTradeDiv .scrollbox ul.sd_ul').prepend(tradeHtml);
                $('#showTradeDiv .scrollbox ul.sd_ul li:odd').addClass('r');
                indexJS.setListScroll('#showTradeDiv .scrollbox', null, {callbacks : {onTotalScroll : function(){chatShowTrade.setShowTrade();}}});/*设置滚动条*/
            }
            txt = row.boUser.userName + '在晒单墙晒了一单，' + (common.isBlank(row.title)?'...':row.title);
            $('#chatMsgContentDiv .dialoglist').append(html.formatStr(txt, row.id));
            chat.showSystemTopInfo("class_note", row.id, txt);
        }
        chat.setTalkListScroll(true);
        $('#chatMsgContentDiv .dialoglist .pushclose').unbind('click');
        $('#chatMsgContentDiv .dialoglist .pushclose').click(function(){
            $(this).parent().hide();
        });
        $('#chatMsgContentDiv .dialoglist .showtrade').unbind('click');
        $('#chatMsgContentDiv .dialoglist .showtrade').click(function(){
            chatShowTrade.gotoLook($(this).attr('_id'));
        });
    },
    /**去看看-晒单*/
    gotoLook : function(showTradeId){
        $('.main_tabnav a[t="showtrade"]').click();
        indexJS.setListScroll('#showTradeDiv .scrollbox', $('#showTradeDiv .sd_ul li[sid="'+showTradeId+'"]').offset().top);/*滚动到指定位置*/
    },
    /**
     * 根据传入的模块域标识返回待处理的html模板
     * @param region 模块域
     * @returns {string} html模板
     */
    formatHtml: function(region) {
        var formatHtmlArr = [];
        switch (region) {
            case 'showTradeAll':
                formatHtmlArr.push('<li sid="{6}">');
                formatHtmlArr.push('    <div class="cont">');
                formatHtmlArr.push('        <div class="sd_summary">{0}</div>');
                formatHtmlArr.push('        <div class="sd_tit">');
                formatHtmlArr.push('            <span class="dep">晒单人：<a href="javascript:void(0);" class="sd_author" userId="{7}" avatar="{8}">{1}</a></span>');
                formatHtmlArr.push('            <span class="sdtime">晒单时间: {2}</span>');
                formatHtmlArr.push('        </div>');
                formatHtmlArr.push('        <a href="{3}" data-rel="sd-img" data-title="{0}" data-lightbox="dialog-img">');
                formatHtmlArr.push('            <img src="{3}" alt="{0}" class="mCS_img_loaded"><i class="i-zoom"></i>');
                formatHtmlArr.push('        </a>');
                formatHtmlArr.push('        <p class="sd_p">{4}</p>');
                formatHtmlArr.push('        <div class="sd_bot">');
                formatHtmlArr.push('            <span class="from"><b>&nbsp;</b></span>');
                formatHtmlArr.push('            <a href="javascript:void(0)" class="support" id="{6}"><i></i>(<span>{5}</span>)</a>');
                formatHtmlArr.push('        </div>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</li>');
                break;
            case 'showTradeUser':
                formatHtmlArr.push('<li{6}>');
                formatHtmlArr.push('    <div class="cont">');
                formatHtmlArr.push('        <div class="sd_summary">{0}<i class="status"></i></div>');
                formatHtmlArr.push('        <div class="sd_tit"><span class="sdtime">晒单时间: {1}</span></div>');
                formatHtmlArr.push('        <a href="{2}" data-rel="sd-img" data-title="{0}" data-lightbox="my-dialog-img"><img src="{2}" alt="{0}" class="mCS_img_loaded"><i class="i-zoom"></i></a>');
                formatHtmlArr.push('        <p class="sd_p">{3}</p>');
                formatHtmlArr.push('        <div class="sd_bot">');
                formatHtmlArr.push('          <span class="from"><b>&nbsp;</b></span>');
                formatHtmlArr.push('            <a href="javascript:void(0)" class="support" id="{5}"><i></i>(<span>{4}</span>)</a>');
                formatHtmlArr.push('        </div>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</li>');
                break;
            case 'getPoint':
                formatHtmlArr.push('<tr>');
                formatHtmlArr.push('<td><span class="date">{0}</span></td>');
                formatHtmlArr.push('<td>{1}获得<b>{2}</b>积分</td>');
                formatHtmlArr.push('</tr>');
                break;
            case 'pointConsume':
                formatHtmlArr.push('<tr>');
                formatHtmlArr.push('<td><span class="date">{0}</span></td>');
                formatHtmlArr.push('<td>{1}消费<b>{2}</b>积分</td>');
                formatHtmlArr.push('</tr>');
                break;
            case 'pushShowTradeInfo':
                formatHtmlArr.push('<div class="info_push">');
                formatHtmlArr.push('    <div class="pushcont">系统：{0}</div>');
                formatHtmlArr.push('    <a href="javascript:void(0);" class="detailbtn showtrade" _id="{1}" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'right_lts_QuKankan\', \'content_right\', 1, true]);">去看看</a>');
                formatHtmlArr.push('    <a href="javascript:void(0);" class="pushclose"><i></i></a>');
                formatHtmlArr.push('</div>');
                break;
        }
        return formatHtmlArr.join('');
    }
};