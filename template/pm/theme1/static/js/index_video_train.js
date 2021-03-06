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
                    var txt = '报名/详情',cls='traindetails trainbtn',numTxt=row.clientSize || 0,clk='onclick="chatTeacher.trainDetails(this);" ';
                    if(row.allowInto){
                        txt = '进入';
                        clk = 'onclick="chatTeacher.trainRegis(this);" ';
                    }else if(row.isEnd){
                        txt = '已结束';
                        cls += ' b2';
                        clk = '';
                    }
                    trainHtml += trainFormatHtml.formatStr(row.defaultAnalyst.avatar,row.name,row.label, row.remark,row.defaultAnalyst.userNo,row.clientGroup,row.allowInto,txt ,row._id, numTxt, clk, cls);
                });
                $('.pop_train .scrollbox .trainlist').html(trainHtml);
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
            case 'train':
                formatHtmlArr.push('<li>');
                formatHtmlArr.push('     <div class="headimg"><img src="{0}" alt=""></div>');
                formatHtmlArr.push('     <div class="train_name">{1}</div>');
                formatHtmlArr.push('     <span class="slogan">{2}</span>');
                formatHtmlArr.push('     <p>{3}</p>');
                formatHtmlArr.push('     <a href="javascript:void(0);" class="{11}" userno="{4}" cgs= "{5}" isDetail="true" {10}sp="{6}" rid="{8}">{7}</a>');
                // formatHtmlArr.push('     <a href="javascript:void(0)" class="trainbtn traindetails">详情</a>');
                formatHtmlArr.push('     <span class="bm">已报名{9}人</span>');
                formatHtmlArr.push('</li>');
                break;
        }
        return formatHtmlArr.join("");
    }
};