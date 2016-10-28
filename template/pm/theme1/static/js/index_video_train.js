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
        common.getJson('/studio/getTrainRoomList', {groupType:indexJS.userInfo.groupType}, function(result){
                if(result!=null){
                    $('#trainsnum').text(result.length);
                }else{
                    $('#trainsnum').text(0);
                }
        });
    },

    /**
     * 获取培训班列表
     */
    getTrainList: function(){
        common.getJson('/studio/getTrainRoomList', {groupType:indexJS.userInfo.groupType}, function(result){
            if(result!=null){
                var trainHtml = "",trainFormatHtml = videosTrain.formatHtml('train');
                $.each(result, function(key, row){
                    var introduction = common.trim(row.defaultAnalyst.introduction);
                    trainHtml += trainFormatHtml.formatStr(row.defaultAnalyst.avatar,row.name, row.defaultAnalyst.userName, introduction,row.defaultAnalyst.userNo,row.clientGroup);
                });
                $('.pop_train .scrollbox .trainlist').empty().prepend(trainHtml);
                $('.pop_train .scrollbox .trainlist .traindetails').click(function(){
                    common.openPopup('.blackbg,.train_detail')
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
                formatHtmlArr.push('     <a href="javascript:void(0)" class="trainbtn" userno="{4}" group= "{5}" onclick="chatTeacher.trainRegis(this);_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'left_pxb_Signup\', \'{1}\', 1, true]);">报名</a>');
                formatHtmlArr.push('     <a href="javascript:void(0)" class="trainbtn traindetails" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'left_pxb_Details\', \'{1}\', 1, true]);">详情</a>');
                formatHtmlArr.push('</li>');
                break;
        }
        return formatHtmlArr.join("");
    }
};