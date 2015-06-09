/**
 * 微信聊天室客户端操作类
 * author Alan.wu
 */
var wechat={
    priceUrl:'',
    init:function(){
        chat.init();
        this.setPageUserInfo();
        this.setPrice();
        this.setAdvertisement();
        this.setBulletin();
        this.setEvent();
        this.scrollBulletin();
        setInterval("wechat.setPrice()",5000);	//每间隔3秒刷新下报价信息
    },
    /**
     * 设置页面用户信息
     */
    setPageUserInfo:function(){
       $(".user-name").html(chat.userInfo.nickname);
       $(".user-img img").attr("src",chat.userInfo.avatar);
    },
    /**
     * 功能：公告滚动
     */
    scrollBulletin : function(){
        var scrtime='';
        $("#bulletin").hover(function(){
            clearInterval(scrtime);
        },function(){
            scrtime = setInterval(function(){
                var $ul = $("#bulletin ul");
                var liHeight = $ul.find("li:last").height();
                $ul.animate({marginTop : liHeight + 35 + "px"},1000,function(){
                    $ul.find("li:last").prependTo($ul);
                    $ul.find("li:first").hide();
                    $ul.css({marginTop:0});
                    $ul.find("li:first").fadeIn(500);
                });
            },8000);
        }).trigger("mouseleave");
    },
    setEvent : function(){
        $('.adbox s').click(function(){
            $("#adBox").hide();
            $('.wrapper').addClass('pub-two');
            $('.fxs-ony-box').addClass('fxs-top');
        });
        $('#contentText').focus(function(){
            $('.wrapper').removeClass('pub-top pub-two').addClass('pub-three');
            $('#header').fadeOut('fast');
            $('.fxs-ony-box').addClass('fxs-none');
            $("#content_div")[0].scrollTop = $("#content_div")[0].scrollHeight;
        }).blur(function(){
            $('.wrapper').removeClass('pub-three').addClass('pub-top pub-two');
            $('#header').fadeIn('fast');
            $('.fxs-ony-box').removeClass('fxs-none');
            $("#content_div")[0].scrollTop = $("#content_div")[0].scrollHeight;
        });
        //手势控制
        $('#content_div')[0].addEventListener("touchstart", function(e) {
            var dom=$('.wrapper');
            if(dom.hasClass('pub-three')){
                $('#contentText').blur();
            }
        }, false);
    },
    /**
     * 设置广告
     */
    setAdvertisement:function(){
        try{
            $.getJSON('/getAdvertisement',null,function(data){
                if(data){
                    $("#adBox a").attr("href",(common.isBlank(data.imgUrl)?"javascript:":data.imgUrl));
                    $("#adBox img").attr("src",data.img);
                    window.setTimeout("wechat.fnSmall()",10000);	// 10秒以后自动隐藏广告栏
                }else{
                    wechat.fnSmall();
                }
            });
        }catch (e){
          console.log("setAdvertisement->"+e);
        }
    },
    /**
     * 设置公告
     */
    setBulletin:function(){
        try{
            $.getJSON('/getBulletinList',null,function(data){
                if(data){
                    $.each(data,function(i,obj){
                        if(obj != null){
                            var row=obj.detailList[0];
                            row.content=row.content.replace("/")
                            $("#bulletin ul").append('<li><span txt="txt" style="display:none;">'+row.content+'</span><a href="#">'+row.title+'</a><i>'+ common.formatterDate(obj.createDate,'.')+'</i></li>');
                        }
                    });
                    $("#bulletin ul li").click(function(){
                        wechat.showBulletin($(this).children("a").text(),$(this).children("i").text(),$(this).children("span[txt]").html());
                    });
                }
            });

        }catch (e){
            console.log("setBulletin->"+e);
        }
    },
    /**
     * 设置价格
     */
    setPrice:function(){
        try{
            $.getJSON(wechat.priceUrl).done(function(data){
                if(!data){
                    $("#product_price_ul li .date-sz").text("--");
                    return false;
                }
                var result = data.result.row,subObj=null;
                $.each(result,function(i,obj){
                    if(obj != null){
                        subObj =obj.attr;
                        var gmCode = subObj.gmcode,															 //产品种类
                            bid = subObj.bid,																 //最新
                            change = subObj.change,															 //涨跌0.31
                            direction = ($.trim(change) != '' && change.indexOf('-') !=-1 ? 'down' : 'up'),  //升或降
                            range = change/(bid-change) *100 ;											 	 //幅度0.03%
                        var product = $("#product_price_ul li[name="+gmCode+"]");   //获取对应的code的产品
                        if(direction == 'up'){					     //设置产品的颜色变化
                            product.attr("class","date-up");
                        }else if(direction == 'down'){
                            product.attr("class","date-down");
                        }
                        product.find("p.date-sz").text(Number(bid).toFixed(2));
                        product.find("span:eq(0)").text(Number(change).toFixed(2));
                        product.find("span:eq(1)").text(Number(range).toFixed(2)+'%');
                    }
                });
            });
        }catch (e){
            console.log("setPrice->"+e);
        }
    },
    /**
     * 功能：显示公告
     */
    showBulletin : function(title,date,content){
        $(".gg-h-tt").html(title);
        $(".gg-time").html(date);
        $(".anounce-detail").html(content);
        var imgObj= $(".anounce-detail img");
        imgObj.width("100%").height("auto");
        imgObj.click( function(e) {
            e.preventDefault();
            var _thisImg=$(this);
            $.swipebox( [
                { href:_thisImg.attr("src")},
            ] );
        } );
        $("#bulletinBoxCloseBtn").unbind("click");
        common.showBox("#bulletinBox");
        $("#bulletinBoxCloseBtn").click(function(){
            common.hideBox("#bulletinBox");
        });
    },
    /**
     * 功能：隐藏广告栏
     */
    fnSmall : function(){
        $("#adBox").hide();
        $('.wrapper').addClass('pub-two');
        $('.fxs-ony-box').addClass('fxs-top');
    }
};
// 初始化
$(function() {
    wechat.init();
});

 