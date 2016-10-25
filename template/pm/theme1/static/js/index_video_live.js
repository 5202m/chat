/**
 * 直播间视频区直播选项卡操作类
 * author Jade.zhu
 */
var videosLive = {
    init: function(){
        this.setEvent();
        this.getMarketPrice();
        this.setCftcCot();
        this.setSymbolOpenPositionRatios();
    },
    setEvent: function(){
        /**
         * 切换房间
         */
        $(".tabcont .main_tab .s1 a").click(function(){
            if($(this).hasClass('on')){
                return false;
            }
            var thiz = $(this);
            var cgs=$(this).attr("cgs");
            if(thiz.attr("av") == "false" && indexJS.checkClientGroup('visitor')){
                //不允许游客进入，但当前是游客，直接要求登录，且登录框不允许关闭
                $("#login_a").trigger("click", {groupId : thiz.attr("rid")});
                return false;
            }
            if(!common.containSplitStr(cgs,indexJS.userInfo.clientGroup)){
                if(indexJS.checkClientGroup("vip")){
                   // alert("该房间仅对新客户开放，如有疑问，请联系老师助理。");
                    box.showMsg({title:thiz.find("b").text(),msg:"该房间仅对新客户开放,"});
                    $("#popMsgTxt").append("<a class='contactContact' style='color:#2980d1; font-size:14px;text-decoration:none;cursor:pointer' onclick='videosLive.contactTeacher()'>如有疑问请联系老师助理</a>。");
                    $("#popMsgCont .yesbtn").bind("click", function(){
                        videosLive.contactTeacher();
                    });
                }else{
                    //alert("已有真实账户并激活的客户才可进入Vip专场，您还不满足条件。如有疑问，请联系老师助理。");
                    box.showMsg({title:thiz.find("b").text(),msg:"已有真实账户并激活的客户才可进入Vip专场，您还不满足条件,"});
                    $("#popMsgTxt").append("<a class='contactContact' style='color:#2980d1; font-size:14px;text-decoration:none;cursor:pointer' onclick='videosLive.contactTeacher()'>如有疑问请联系老师助理</a>。");
                    $("#popMsgCont .yesbtn").bind("click", function(){
                        videosLive.contactTeacher();
                    });
                }
                return false;
            }
            common.getJson("/studio/checkGroupAuth",{groupId:thiz.attr("rid")},function(result){
                if(!result.isOK){
                    if(indexJS.checkClientGroup("vip")){
                        //alert("该房间仅对新客户开放，如有疑问，请联系老师助理。");
                        box.showMsg({title:thiz.find("b").text(),msg:"该房间仅对新客户开放,"});
                        $("#popMsgTxt").append("<a class='contactContact' style='color:#2980d1; font-size:14px;text-decoration:none;cursor:pointer' onclick='videosLive.contactTeacher()'>如有疑问请联系老师助理</a>。");
                        $("#popMsgCont .yesbtn").bind("click", function(){
                            videosLive.contactTeacher();
                        });
                    }else if(thiz.attr("rt")=='train') {
                       common.getJson("/studio/getchatGroupByGroupId",{groupId:thiz.attr("rid")},function(result){
                          var traninClients =  result.traninClient;
                           var flag = false;
                           for(var i = 0;i<traninClients.length;i++){
                               var traninClient = traninClients[i];
                               if(indexJS.userInfo.userId == traninClient.clientId){
                                   flag = true;
                                   break;
                               }
                           }
                           if(flag){
                               box.showMsg({title:thiz.find("b").text(),msg:"您未报名培训班或者未通过审核，是否消耗"+result.point+"积分直接进入房间？"});
                               $("#popMsgTxt").append("<a class='contactContact' style='color:#2980d1; font-size:14px;text-decoration:none;cursor:pointer' onclick='videosLive.contactTeacher()'>如有疑问请联系老师助理</a>。");
                               $("#popMsgCont .yesbtn").bind("click", function(){
                                   var params = {groupType:indexJS.userInfo.groupType,item:"prerogative_room",tag:'user_'+indexJS.userInfo.userId,val:-result.point,groupId:thiz.attr("rid")};
                                   common.getJson('/studio/addPointsInfo',{params:JSON.stringify(params)}, function(result) {
                                       if (!result.isOK) {
                                           box.showTipBox(result.msg);
                                       }else{
                                           common.getJson('/studio/updateSession',{params:JSON.stringify(params)}, function(result) {
                                               if(result.isOK){
                                                   indexJS.toRefreshView();
                                               }
                                           });
                                       }
                                   })
                               });
                           }
                        });

                       // alert("该房间仅对新客户开放，如有疑问，请联系老师助理。");
                    }else{
                        //alert("已有真实账户并激活的客户才可进入Vip专场，您还不满足条件。如有疑问，请联系老师助理。");
                        box.showMsg({title:thiz.find("b").text(),msg:"已有真实账户并激活的客户才可进入Vip专场，您还不满足条件,"});
                        $("#popMsgTxt").append("<a class='contactContact' style='color:#2980d1; font-size:14px;text-decoration:none;cursor:pointer' onclick='videosLive.contactTeacher()'>如有疑问请联系老师助理</a>。");
                        $("#popMsgCont .yesbtn").bind("click", function(){
                            videosLive.contactTeacher();
                        });
                    }
                }else{
                    indexJS.toRefreshView();
                }
            },true,function(err){
                if("success"!=err) {
                    //alert("操作失败，请联系客服！" );
                    box.showMsg({title:thiz.find("b").text(),msg:"操作失败,"});
                    $("#popMsgTxt").append("<a class='contactContact' style='color:#2980d1; font-size:14px;text-decoration:none;cursor:pointer' onclick='videosLive.contactTeacher()'>如有疑问请联系老师助理</a>。");
                    $("#popMsgCont .yesbtn").bind("click", function(){
                        videosLive.contactTeacher();
                    });
                }
            });
        });
        indexJS.setListScroll($(".tabcont .main_tab .infocont .rbox .scrollbox"));//行情持仓比例未平仓品种比率滚动条

    },
    /**
     * 获取行情
     */
    getMarketPrice: function() {
        var url = "ws://kdata.gwfx.com:8087/websocket.do",
            data = "service=HqDataWebSocketService&method=pushMarketprice&symbol=XAGUSD|XAUUSD|USDX|CLWTI&dataType=simpleMarketPrice",
            httpUrl = "http://kdata.gwfx.com:8099/gateway.do?service=HqDataService&method=getMarkrtPriceDataFromCache",
            selfOptions = {from:'studio',fall:'fall'};
        getAllMarketpriceIndex(url, data, httpUrl, selfOptions);
        /*行情数据*/
    },
    /*CFTC持仓比例*/
    setCftcCot:function(){
        $.getJSON('/studio/get24kCftc',null,function(data){
            var cftcName = {'gold':'伦敦金', 'silver':'伦敦银'};
            if(data != null && data){
                var percHtml = '';
                var percFormat = videosLive.formatHtml('cftcperc');
                $.each(cftcName, function(key, value){
                    var l = data[key].long;
                    var s = data[key].short;
                    var total = parseInt(l) + parseInt(s);
                    var longPerc = Math.round(parseInt(l) / total * 100);
                    var shortPerc = Math.round(parseInt(s) / total * 100);
                    percHtml += percFormat.formatStr(longPerc, shortPerc, value);
                    $('#ratioInfoUpdateTime').text('上次更新时间：' + data[key].updatetime + ' '+common.getHHMM(new Date()) + ' GMT+0800');
                });
                $('.rbox .infobox .ratioInfo').html(percHtml);
                videosLive.initEasyPieChart(function(){});
            }else{
                videosLive.setCftcCot();
            }
        });
    },
    /**
     * 行情投票环形饼图初始化
     */
    initEasyPieChart:function(callback){
        if(!$('.tabnav .live').hasClass('initEasyPieChart')) {
            var jsFileArr = [];
            if ($.browser.msie) {
                jsFileArr.push('/base/lib/excanvas.compiled.js');
            }
            jsFileArr.push('/base/lib/jquery.easy-pie-chart.min.js');
            /*行情投票环形饼图初始化*/
            LazyLoad.js(jsFileArr, function () {
                $('.percentage').easyPieChart({
                    barColor: '#e34b51',
                    trackColor: '#2bb38a',
                    scaleColor: false,
                    lineCap: 'square',
                    lineWidth: 2,
                    animate: 1000,
                    size: 65
                });
                callback();
            });
        }else{
            callback();
        }
    },
    /**
     * 未平仓品种比率
     */
    setSymbolOpenPositionRatios: function(){
        var symbol = {'LLS':'伦敦银', 'LLG':'伦敦金'};
        $.getJSON('/studio/getSymbolOpenPositionRatios',null,function(data){
            if(data!=null && data.code=='SUCCESS'){
                var result = data.result;
                var soprHtml = [], soprFormat = videosLive.formatHtml('symbolOpenPositionRatios');
                $.each(result, function(key, row){
                    soprHtml.push(soprFormat.formatStr(symbol[row.symbol], row.openPositionRatios));
                    $('#percentInfoUpdateTime').text('上次更新时间：' + common.formatterDate(row.date.time) + ' '+common.getHHMM(new Date()) + ' GMT+0800');
                });
                $('.rbox .infobox .percentInfo').html(soprHtml.join(''));
            }else{
                //videosLive.setSymbolOpenPositionRatios();
            }
        });
    },
    /**
     * 根据传入的模块域标识返回待处理的html模板
     * @param region 模块域
     * @returns {string} html模板
     */
    formatHtml: function(region){
        var formatHtmlArr = [];
        switch (region){
            case 'cftcperc':
                formatHtmlArr.push('<div class="ratiobox">');
                formatHtmlArr.push('    <div class="data">');
                formatHtmlArr.push('        <span>多头<b>{0}</b>%</span><br>');
                formatHtmlArr.push('        <span class="b">空头<b>{1}</b>%</span>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('    <div class="percentage easyPieChart" data-percent="{1}">');
                formatHtmlArr.push('        <b class="rationame">{2}</b>');
                formatHtmlArr.push('    </div>');
                formatHtmlArr.push('</div>');
                break;
            case 'symbolOpenPositionRatios':
                formatHtmlArr.push('<div class="perbox">');
                formatHtmlArr.push('    <span class="pname">{0}</span>');
                formatHtmlArr.push('    <span class="pervalue">{1}%</span>');
                formatHtmlArr.push('    <div class="main"><b class="bar" style="width:{1}%"></b></div>');
                formatHtmlArr.push('</div>');
        }
        return formatHtmlArr.join('');
    },
    contactTeacher:function(){
        if($(".pletter_win .mult_dialog a[utype=3]").length==0) {
            chat.getCSList();//设置所有客服
        }
        if($(this).hasClass('nocs')){
            box.showTipBox('助理失联中');
        }else {
            common.openPopup('.blackbg,.pletter_win');
        }

        $("#popMsgBox").hide();
    }
};
