/**
 * 直播间视频区订阅选项卡操作类
 * author Jade.zhu
 */
var videosSubscribe = {
    subscribeData:null,
    init: function(){
        this.setEvent();
    },
    setEvent: function(){
        $('#subscribe').click(function(){
            if(indexJS.userInfo.isLogin){
                common.openPopup('.blackbg,.personal_center');
                $('#infotab a[t="mySubscribe"]').click();
            }else{
                common.openPopup('.blackbg,.login');
            }
        });
    },
    /**
     * 获取已订阅列表
     */
    setSubscribe:function(){
        common.getJson('/studio/getSubscribe',{params:JSON.stringify({groupType:indexJS.userInfo.groupType})},function(data){
            if(data!=null){
                videosSubscribe.subscribeData = data;
                $.each(data,function(i, row){
                    var analystsArr = row.analyst.split(',');
                    var noticeTypeArr = row.noticeType.split(',');
                    $('input[name="'+row.type+'_analysts"]').val(row.analyst);
                    $('input[name="'+row.type+'_noticeTypes"]').val(row.noticeType);
                    $.each(analystsArr, function(k, v){
                        $('#'+v+'_'+row.type).prop('checked', true);
                    });
                    $.each(noticeTypeArr, function(k, v){
                        $('#'+v+'_'+row.type).prop('checked', true);
                    });
                    var weekParentDiv = $('#week_'+row.type).parent().parent().parent();
                    var monthParentDiv = $('#month_'+row.type).parent().parent().parent();
                    if(common.getDateDiff(row.startDate, row.endDate)>7){
                        $('#month_'+row.type).prop('checked',true);
                        monthParentDiv.children('div.item').hide();
                        monthParentDiv.children('div.item').hide();
                        monthParentDiv.children('div.mydytime').html(common.formatterDate(row.startDate,'/')+' <b>至</b> '+common.formatterDate(row.endDate,'/')).removeClass('dn');
                    }else{
                        $('#week_'+row.type).prop('checked',true);
                        weekParentDiv.children('div.item').hide();
                        weekParentDiv.children('div.item').hide();
                        weekParentDiv.children('div.mydytime').html(common.formatterDate(row.startDate,'/')+' <b>至</b> '+common.formatterDate(row.endDate,'/')).removeClass('dn');
                    }
                    $('.dytable .'+row.type+' a[t="'+row.type+'"]').attr({'id':row._id,'orip':row.point});
                });
            }
        });
    },
    /**
     * 获取订阅服务类型
     */
    setSubscribeType:function(){
        common.getJson('/studio/getSubscribeType',{params:JSON.stringify({groupType:indexJS.userInfo.groupType})},function(data){
            if(data!=null){
                var subscribeTypeHtml=[],//noticeCycleObj={'week':'1周','month':'1月'},noticeTypesObj={'email':'邮件','sms':'短信','wechat':'微信'},
                    subscribeType=videosSubscribe.formatHtml('subscribeType'),
                    analysts=videosSubscribe.formatHtml('analysts'),
                    analyst=videosSubscribe.formatHtml('analyst'),
                    noticeTypes=videosSubscribe.formatHtml('noticeTypes'),
                    noticeType=videosSubscribe.formatHtml('noticeType'),
                    noticeCycle=videosSubscribe.formatHtml('noticeCycle'),
                    subscribeBtn=videosSubscribe.formatHtml('subscribeBtn');
                    cls1=cls2='';
                $.each(data,function(i,row){
                    var analystsHtml=[],noticeTypesHtml=[],noticeCycleHtml=[],subscribeBtnHtml=[];
                    var analystsArr = JSON.parse(row.analysts),
                        analystSize = analystsArr.length;
                    $.each(analystsArr, function(key, row1){
                        var analystName = row1.name;
                        if(row1.name.indexOf('(')>-1){
                            analystName = row1.name.substring(0,row1.name.indexOf('('));
                        }
                        analystsHtml.push(analysts.formatStr(row1.userId, analystName, row1.point, row.code));
                    });
                    var noticeTypesArr = JSON.parse(row.noticeTypes),
                        noticeTypeSize = noticeTypesArr.length;
                    $.each(noticeTypesArr, function(key, row1){
                            if(key==0){
                                noticeTypesHtml.push('<div class="itembox w1">');
                            }
                            noticeTypesHtml.push(noticeTypes.formatStr(row1.type, row1.name, row1.point, row.code));
                            if(key==noticeTypeSize-1){
                                noticeTypesHtml.push('</div>');
                                subscribeBtnHtml.push(subscribeBtn.formatStr(row.code, row.name,row.analysts,row.noticeTypes,row.noticeCycle));
                            }
                    });
                    if(common.isValid(row.noticeCycle)) {
                        cls2=' w1';
                        var noticeCycleArr = JSON.parse(row.noticeCycle);
                        $.each(noticeCycleArr, function (key, row1) {
                            noticeCycleHtml.push(noticeCycle.formatStr(row1.cycle, row1.name, row1.point, row.code));
                        });
                    }
                    subscribeTypeHtml.push(subscribeType.formatStr(row.name,analystsHtml.join(''), noticeTypesHtml.join(''), noticeCycleHtml.join(''),subscribeBtnHtml.join(''), cls1, cls2, row.code));
                });
                $('.dytable .tody tbody').html(subscribeTypeHtml.join(''));
                indexJS.setListScroll($("#dy-scbox"));//我的订阅
                videosSubscribe.setSubscribeEvent();
                videosSubscribe.setSubscribe();
            }
        });
    },
    /**
     * 订阅按钮事件
     */
    setSubscribeEvent:function(){
        /**
         * 计算订阅所需积分
         */
        $('.dytable .tody input[type="checkbox"],.dytable .tody input[type="radio"],.dytable .pdbox a').unbind('click');
        $('.dytable .tody input[type="checkbox"],.dytable .tody input[type="radio"],.dytable .pdbox a').click(function(){
            var totalPoint = 0,analystsArr = [], noticeTypesArr = [];
            $('.dytable .tody tr[t="'+$(this).attr('t')+'"] input[t="'+$(this).attr('t')+'"]').each(function(){
                if($(this).is(':checked')){
                    totalPoint += parseInt($(this).attr('p'));
                    if($(this).attr('name')=='analyst'){
                        analystsArr.push($(this).val());
                    }
                    if($(this).attr('name')=='noticeType'){
                        noticeTypesArr.push($(this).val());
                    }
                }
            });
            $('input[name="'+$(this).attr('t')+'_analysts"]').val(analystsArr.join(','));
            $('input[name="'+$(this).attr('t')+'_noticeTypes"]').val(noticeTypesArr.join(','));
            $('.dytable .'+$(this).attr('t')+' b').text(totalPoint+'分');
            $('.dytable .'+$(this).attr('t')+' a[t="'+$(this).attr('t')+'"]').attr('p',totalPoint);
        });
        /**
         * 订阅结算按钮
         */
        $('.dytable .pdbox a').unbind('click');
        $('.dytable .pdbox a').click(function(){
            var $this = $(this);
            if($this.hasClass('clicked')){
                return false;
            }
            $this.addClass('clicked');
            var params = {groupType:indexJS.userInfo.groupType,type:$this.attr('t'),point:(common.isBlank($this.attr('p'))?0:parseInt($this.attr('p')))};
            params.noticeCycle = common.isBlank($('input[name="noticeCycle_'+$this.attr('t')+'"]:checked').val())?'':$('input[name="noticeCycle_'+$this.attr('t')+'"]:checked').val();
            params.analyst = $('input[name="'+$this.attr('t')+'_analysts"]').val();
            params.noticeType = common.isBlank($('input[name="'+$this.attr('t')+'_noticeTypes"]').val())?$this.attr('nts'):$('input[name="'+$this.attr('t')+'_noticeTypes"]').val();
            params.pointsRemark = '订阅'+$this.attr('tn');
            params.id = common.isBlank($this.attr('id'))?'':$this.attr('id');
            params.orip = common.isBlank($this.attr('orip'))?0:$this.attr('orip');
            if(common.isBlank($('#myEmail').val()) && $.inArray('email', params.noticeType.split(','))>-1){
                box.showMsg('请先绑定邮箱！');
                $('#infotab a[t="accountInfo"]').click();
            }else if(common.isBlank(params.id) && common.isBlank(params.analyst)){
                box.showMsg('请选择订阅老师！');
            }else if(common.isBlank(params.id) && common.isBlank(params.noticeType)){
                box.showMsg('请选择订阅方式！');
            }else if(common.isBlank(params.id) && common.isBlank(params.noticeCycle)){
                box.showMsg('请选择订阅周期！');
            }else{
                if(common.isBlank(params.analyst) || common.isBlank(params.noticeType)){
                    params.point = 0;
                    params.analyst = '';
                    params.noticeType = '';
                    params.noticeCycle = '';
                }
                var lecturerIdArr = [], manyUid = null;
                $('#course_panel .main_tab .live_prevlist li').each(function(){
                    var tuid = $(this).attr('tuid');
                    if(common.isValid(tuid)) {
                        if (tuid.indexOf(',') > -1) {
                            manyUid = tuid.split(',');
                            lecturerIdArr = $.merge(lecturerIdArr, manyUid);
                        } else {
                            lecturerIdArr.push(tuid);
                        }
                    }
                });
                $.unique(lecturerIdArr);
                var analystArr = params.analyst.split(','), notInAnalyst = [], isModify = true;
                if(common.isValid(params.analyst)) {
                    $.each(analystArr, function (k, v) {
                        if ($.inArray(v, lecturerIdArr) < 0) {
                            notInAnalyst.push($('#' + v + '_' + $this.attr('t')).attr('cval'));
                        }
                    });
                }
                $.each(videosSubscribe.subscribeData, function(i, row){
                    if($this.attr('t') == row.type && params.analyst == row.analyst && params.noticeType == row.noticeType){
                        var cycle = common.getDateDiff(row.startDate, row.endDate)>7?'month':'week';
                        if(params.noticeCycle == cycle) {
                            isModify = false;
                            return false;
                        }
                    }
                });
                if(isModify) {
                    if (notInAnalyst.length > 0 && $.inArray($this.attr('t'), ['live_reminder', 'shout_single_strategy', 'trading_strategy']) > -1) {
                        var msgOps = {
                            title: '温馨提醒',
                            msg: notInAnalyst.join(',') + '老师没有课程安排，确定订阅？',
                            btns: [{
                                txt: "确定",
                                fn: function () {
                                    videosSubscribe.saveSubscribe(params, $this);
                                }
                            },
                                {
                                    txt: '取消',
                                    fn: function () {
                                        box.hideMsg();
                                        $this.removeClass('clicked');
                                    }
                                }]
                        };
                        box.showMsg(msgOps);
                    } else {
                        videosSubscribe.saveSubscribe(params, $this);
                    }
                }else {
                    box.showMsg('你已订阅相关课程，无需重复订阅！');
                }
            }
        });
    },
    /**
     * 保存订阅数据
     * @param params
     * @param $this
     */
    saveSubscribe: function(params, $this){
        if(parseInt(params.point) != parseInt(params.orip) || params.analyst != $this.attr('a') || params.noticeType != $this.attr('t') || params.noticeCycle != $this.attr('c')) {
            common.getJson('/studio/subscribe', {params: JSON.stringify(params)}, function (data) {
                if (data.isOK) {
                    chatShowTrade.getPointsInfo();
                    if(common.isBlank(params.analyst) || common.isBlank(params.noticeType)){
                        box.showMsg('取消订阅成功！');
                    } else if(common.isValid(params.id)) {
                        box.showMsg('修改订阅成功！');
                    }else{
                        box.showMsg('订阅成功！');
                    }
                    videosSubscribe.setSubscribeType();
                } else {
                    box.showMsg(data.msg);
                }
                $this.removeClass('clicked');
            });
        }else{
            box.showMsg('订阅内容无变化！');
            $this.removeClass('clicked');
        }
    },
    /**
     * 根据内容域模块名返回内容模板
     * @param region 内容域模块名
     * @returns {string}
     */
    formatHtml:function(region){
        var formatHtmlArr = [];
        switch(region) {
            case 'subscribe':
                formatHtmlArr.push('<tr>');
                formatHtmlArr.push('    <td><span class="fz12">{0}</span></td>');
                formatHtmlArr.push('    <td><span class="fz12">{1}</span></td>');
                formatHtmlArr.push('    <td>{2}</td>');
                formatHtmlArr.push('    <td>{3}</td>');
                formatHtmlArr.push('    <td>{4}</td>');
                formatHtmlArr.push('    <td>{5}</td>');
                formatHtmlArr.push('</tr>');
                break;
            case 'subscribeType':
                formatHtmlArr.push('<tr t="{7}">');
                formatHtmlArr.push('    <td>{0}</td>');
                formatHtmlArr.push('    <td><div class="itembox{5}">{1}</div><input type="hidden" name="{7}_analysts" /></td>');
                formatHtmlArr.push('    <td>{2}<input type="hidden" name="{7}_noticeTypes" /></td>');
                formatHtmlArr.push('    <td><div class="itembox{6}">');
                formatHtmlArr.push('    <div class="mydytime dn"></div>');
                formatHtmlArr.push('    {3}</div></td>');
                formatHtmlArr.push('    <td>{4}</td>');
                formatHtmlArr.push('</tr>');
                break;
            case 'analysts':
                formatHtmlArr.push('<div class="item">');
                formatHtmlArr.push('    <span class="inp_checkbox">');
                formatHtmlArr.push('        <input type="checkbox" name="analyst" id="{0}_{3}" p="{2}" value="{0}" cval="{1}" t="{3}" />');
                formatHtmlArr.push('        <label for="{0}_{3}"><i></i></label>');
                formatHtmlArr.push('    </span>');
                formatHtmlArr.push('    <span class="tname">{1}</span>');
                formatHtmlArr.push('    <span class="point">（{2}积分）</span>');
                formatHtmlArr.push('</div>');
                break;
            case 'analyst':
                formatHtmlArr.push('<div class="item">');
                formatHtmlArr.push('    <span class="inp_checkbox">');
                formatHtmlArr.push('    <input type="checkbox" name="analyst" id="{0}_{3}" value="{0}" p="{2}" cval="{1}" t="{3}" />');
                formatHtmlArr.push('    <label for="{0}_{3}"><i></i></label>');
                formatHtmlArr.push('    </span>');
                formatHtmlArr.push('    <span class="tname">{1}</span>');
                formatHtmlArr.push('</div>');
                break;
            case 'noticeTypes':
                formatHtmlArr.push('<div class="item">');
                formatHtmlArr.push('    <span class="inp_checkbox">');
                formatHtmlArr.push('        <input type="checkbox" name="noticeType" id="{0}_{3}" value="{0}" p="{2}" cval="{1}" t="{3}" />');
                formatHtmlArr.push('        <label for="{0}_{3}"><i></i></label>');
                formatHtmlArr.push('    </span>');
                formatHtmlArr.push('    <span class="tname">{1}</span>');
                formatHtmlArr.push('    <span class="point">（{2}积分）</span>');
                formatHtmlArr.push('</div>');
                break;
            case 'noticeType':
                formatHtmlArr.push('<div class="pdbox {0}"><a href="javascript:void(0);" class="dybtn" t="{0}" tn="{1}" nts="email"');
                formatHtmlArr.push(' onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'header_dy_{0}\', \'content_top\', 1, true]);">');
                formatHtmlArr.push('邮件订阅</a></div>');
                break;
            case 'noticeCycle':
                formatHtmlArr.push('<div class="item">');
                formatHtmlArr.push('    <span class="inp_radio">');
                formatHtmlArr.push('        <input type="radio" name="noticeCycle_{3}" id="{0}_{3}" value="{0}" p="{2}" cval="{1}" t="{3}" />');
                formatHtmlArr.push('        <label for="{0}_{3}"><i></i></label>');
                formatHtmlArr.push('    </span>');
                formatHtmlArr.push('    <span class="tname">{1}</span>');
                formatHtmlArr.push('    <span class="point">（{2}积分）</span>');
                formatHtmlArr.push('</div>');
                break;
            case 'subscribeBtn':
                formatHtmlArr.push('<div class="pdbox {0}">共计：<b>0分</b><a href="javascript:void(0);" class="dybtn" t="{0}" tn="{1}" a="{2}" t="{3}" c="{4}"');
                formatHtmlArr.push(' onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'header_dy_{0}\', \'content_top\', 1, true]);">');
                formatHtmlArr.push('订阅/结算</a></div>');
                break;
        }
        return formatHtmlArr.join("");
    }
};