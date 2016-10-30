/**
 * 直播间视频区培训班选项卡操作类
 * author Jade.zhu
 */
var videosTrain = {
    init: function(){
        this.setEvent();
        this.initTraninNum();
    },
    setEvent: function(){
        $('#trains').click(function(){
            videosTrain.getTrainList();
            common.openPopup('.blackbg,.pop_train');
        });
    },

    /**
     * 初始化培训班数
     */
    initTraninNum:function(){
        $.getJSON('/studio/getTrainRoomNum', {groupType:indexJS.userInfo.groupType}, function(result){
            if(result!=null && result.num>0){
                $('#trainsnum').show().text(result.num);
            }else{
                $('#trainsnum').hide();
            }
        });
    },

    /**
     * 获取培训班列表
     */
    getTrainList: function(){
        $.getJSON('/studio/getTrainRoomList', {groupType:indexJS.userInfo.groupType}, function(result){
            if(result!=null){
                var trainHtml = "",trainFormatHtml = videosTrain.formatHtml('train');
                $.each(result, function(key, row){
                    var introduction = common.trim(row.defaultAnalyst.introduction);
                    trainHtml += trainFormatHtml.formatStr(row.defaultAnalyst.avatar,row.name, row.defaultAnalyst.userName, introduction,row.defaultAnalyst.userNo,row.clientGroup,row.allowInto,row.allowInto?"进入":"报名",row._id);
                });
                $('.pop_train .scrollbox .trainlist').html(trainHtml);
                $('.pop_train .scrollbox .trainlist .traindetails').click(function(){
                    $('.train_detail .pop_tit label').text($(this).parent().parent().find(".train_name").text());
                    var userNo=$(this).prev().attr("userno");
                    $("#train_info_id").empty().load("/studio/getTrDetail?uid="+userNo,function(){
                        $('#train_info_id .scrollbox[tid="'+userNo+'"]').show();
                    });
                    common.openPopup('.blackbg,.train_detail');
                });
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
            case '':
                formatHtmlArr.push('<div class="textlive" pt="{0}">');
                formatHtmlArr.push('</div>');
                break;
        }
        switch(region) {
            case 'train':
                formatHtmlArr.push('<li>');
                formatHtmlArr.push('     <div class="headimg"><img src="{0}" alt=""></div>');
                formatHtmlArr.push('     <div class="train_name">{1}</div>');
                formatHtmlArr.push('     <span class="slogan">{2}</span>');
                formatHtmlArr.push('     <p>{3}</p>');
                formatHtmlArr.push('     <a href="javascript:void(0)" class="trainbtn" userno="{4}" group= "{5}" onclick="chatTeacher.trainRegis(this)" awi="{6}" rmid="{8}">{7}</a><a href="javascript:void(0)" class="trainbtn traindetails">详情</a>');
                formatHtmlArr.push('</li>');
                break;
        }
        return formatHtmlArr.join("");
    }
};