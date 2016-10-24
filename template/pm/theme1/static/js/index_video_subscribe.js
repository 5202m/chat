/**
 * 直播间视频区订阅选项卡操作类
 * author Jade.zhu
 */
var videosSubscribe = {
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
                    if(common.getDateDiff(row.startDate, row.endDate)>7){
                        $('#month_'+row.type).prop('checked',true);
                    }else{
                        $('#week_'+row.type).prop('checked',true);
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
                        if(analystSize>1){
                            analystsHtml.push(analysts.formatStr(row1.userId, row1.name, row1.point, row.code));
                        }else{
                            cls1=' w2';
                            analystsHtml.push(analyst.formatStr(row1.userId, row1.name, row1.point, row.code));
                        }
                    });
                    var noticeTypesArr = JSON.parse(row.noticeTypes),
                        noticeTypeSize = noticeTypesArr.length;
                    $.each(noticeTypesArr, function(key, row1){
                        if(noticeTypeSize>1 || analystSize>1){
                            if(key==0){
                                noticeTypesHtml.push('<div class="itembox w1">');
                            }
                            noticeTypesHtml.push(noticeTypes.formatStr(row1.type, row1.name, row1.point, row.code));
                            if(key==noticeTypeSize-1){
                                noticeTypesHtml.push('</div>');
                                subscribeBtnHtml.push(subscribeBtn.formatStr(row.code, row.name,row.analysts,row.noticeTypes,row.noticeCycle));
                            }
                        }else{
                            noticeTypesHtml.push(noticeType.formatStr(row.code, row.name));
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
        $('.dytable .pdbox a').click(function(){
            var params = {groupType:indexJS.userInfo.groupType,type:$(this).attr('t'),point:(common.isBlank($(this).attr('p'))?0:parseInt($(this).attr('p')))};
            params.noticeCycle = common.isBlank($('input[name="noticeCycle_'+$(this).attr('t')+'"]:checked').val())?'month':$('input[name="noticeCycle_'+$(this).attr('t')+'"]:checked').val();
            params.analyst = $('input[name="'+$(this).attr('t')+'_analysts"]').val();
            params.noticeType = common.isBlank($('input[name="'+$(this).attr('t')+'_noticeTypes"]').val())?$(this).attr('nts'):$('input[name="'+$(this).attr('t')+'_noticeTypes"]').val();
            params.pointsRemark = '订阅'+$(this).attr('tn');
            //params.orip = common.isBlank($(this).attr('orip'))?0:$(this).attr('orip');
            params.id = common.isBlank($(this).attr('id'))?'':$(this).attr('id');
            var orip = common.isBlank($(this).attr('orip'))?0:$(this).attr('orip');
            if(common.isBlank(params.analyst) || common.isBlank(params.noticeType)){
                params.point = 0;
                params.analyst = '';
                params.noticeType = '';
                params.noticeCycle = '';
            }
            if(parseInt(params.point) != parseInt(orip) || params.analyst != $(this).attr('a') || params.noticeType != $(this).attr('t') || params.noticeCycle != $(this).attr('c')) {
                common.getJson('/studio/subscribe', {params: JSON.stringify(params)}, function (data) {
                    if (data.isOK) {
                        if (parseInt(params.point) > parseInt(orip)) {
                            var myPoints = parseInt($('#mypoints').text());
                            var onsume = parseInt(params.point) - parseInt(orip);
                            $('#mypoints,#sdPoints').text(myPoints - onsume);
                        }
                        if(common.isBlank(params.analyst) || common.isBlank(params.noticeType)){
                            box.showMsg('取消订阅成功！');
                        } else {
                            box.showMsg('订阅成功！');
                        }
                        videosSubscribe.setSubscribeType();
                    } else {
                        box.showMsg(data.msg);
                    }
                });
            }else{
                box.showMsg('订阅内容无变化！');
            }
        });
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
                formatHtmlArr.push('    <td><div class="itembox{6}">{3}</div></td>');
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
                formatHtmlArr.push('<div class="pdbox {0}"><a href="javascript:void(0);" class="dybtn" t="{0}" tn="{1}" nts="email">邮件订阅</a></div>');
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
                formatHtmlArr.push('<div class="pdbox {0}">共计：<b>0分</b><a href="javascript:void(0);" class="dybtn" t="{0}" tn="{1}" a="{2}" t="{3}" c="{4}">订阅/结算</a></div>');
                break;
        }
        return formatHtmlArr.join("");
    }
};