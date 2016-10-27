/**
 * 直播间视频区教学选项卡操作类
 * author Jade.zhu
 */
var videosTeach = {
    init: function(){
        this.setEvent();
    },
    setEvent: function(){
        /**
         * 教学视频列表切换
         */
        $('#teachVideoId a').bind("click", function(e, callback, isAll){
            $('#teachVideoId a').removeClass('on');
            var $this = $(this);
            videosTeach.setVideoList($this.addClass("on").attr("t"), function(){
                if(typeof callback === "function"){
                    callback(isAll);
                }
                $('#teachVideoPanel .sub_tab .courseNum .numbox .inner .c_num:first a').click();
            });
        });
    },
    /**
     * 设置视频
     * @param categoryId
     * @param callback
     */
    setVideoList:function(categoryId, callback){
        var cateDiv=$('#teachVideoPanel .sub_tab .numbox .inner');
        var cateDivt = $('#teachVideoPanel').attr('t');
        if(cateDivt == categoryId){
            return;
        }
        $('#teachVideoPanel').attr('t',categoryId);
        cateDiv.html("");
        indexJS.getArticleList(categoryId,indexJS.userInfo.groupId,0,1,100,'{"sequence":"desc","publishStartDate":"desc"}',null,function(dataList){
            if(dataList && dataList.result==0){
                var data=dataList.data;
                var row;
                for(var i in data){
                    row=data[i].detailList[0];
                    cateDiv.append('<div title="'+row.title+'" class="c_num"><a href="javascript:void(0);" title="'+row.title+'" ct="'+data[i].categoryId+'" id="'+data[i]._id+'" t="'+((common.isValid(data[i].mediaUrl) && data[i].mediaUrl.indexOf('.mp4')!=-1)?'mp4':'')+'" vUrl="'+data[i].mediaUrl+'" onclick="_gaq.push([\'_trackEvent\', \'pmchat_studio\', \'video_play\',\''+row.title+'\']);">'+(parseInt(i)+1)+'</a></div>');
                }
                //播放视频
                $("#teachVideoPanel .numbox .c_num a").click(function(){
                    $("#teachVideoPanel .numbox .c_num a").removeClass("on");
                    $(this).addClass("on");
                    videos.player.play($(this).attr("vurl"), $(this).attr("title"));
                    //videos.setVideo($(this));
                    //显示课程简述
                    var vdId=$(this).attr("id");
                    if($("#tvInfoId").attr("tid")==vdId){
                        return;
                    }
                    indexJS.getArticleInfo(vdId,function(row){
                        if(row){
                            $("#tvInfoId").attr("tid",row._id);
                            var detail=row.detailList[0];
                            if(common.isBlank(row.mediaImgUrl)){
                                $('#tvInfoId .cpic img').hide();
                            }else {
                                $('#tvInfoId .cpic img').attr('src', row.mediaImgUrl).show();
                            }
                            $("#tvInfoId .introtext p").text(detail.remark);
                        }
                    });
                    indexJS.setListScroll('#tvInfoId .introtext');//设置滚动
                    chatAnalyze.setUTM(false,{courseId:vdId});//统计教学视频点击数
                });
                if(typeof callback === "function"){
                    callback();
                }
            }
        });
    },

    /**
     * 获取随机一个教学视频
     * @param autoPlay true-自动播放，false-仅显示列表，不随机播放
     * @param [isAll] 仅autoPlay=true时有效：true-所有教学视频随机，false-mp4随机，
     */
    playRandomTeach : function(autoPlay, isAll){
        var loc_playFunc = function(isAll){
            var loc_items = $("#teachVideoPanel .numbox .c_num a");
            if(!isAll){
                loc_items = loc_items.filter("[t='mp4']");
            }
            if(loc_items.size() > 0){
                var loc_index = common.randomIndex(loc_items.size());
                var loc_item = loc_items.eq(loc_index);
                loc_item.trigger("click");
            }
        };
        if($("#teachVideoId a.on").size() > 0){
            loc_playFunc(isAll);
        }else{
            var loc_items = $("#teachVideoId a");
            var loc_index = common.randomIndex(loc_items.size());
            if(autoPlay){
                loc_items.eq(loc_index).trigger("click", [loc_playFunc, isAll]);
            }else{
                loc_items.eq(loc_index).trigger("click");
            }
        }
        if(!$('.tabnav a.teach').is(".on")){
            $('.tabnav a.teach').trigger("click");
        }
    }
};
