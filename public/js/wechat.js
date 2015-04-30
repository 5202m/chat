/**
 * 微信聊天室客户端操作类
 * author Alan.wu
 */
var wechat={
    priceUrl:'',
    init:function(){
        chat.init();
        this.setPrice();
        this.setAdvertisement();
        this.setBulletin();
        this.setEvent();
        this.scrollBulletin();
        window.setTimeout("wechat.fnSmall()",10000);	// 10秒以后自动隐藏广告栏
        setInterval("wechat.setPrice()",5000);		//每间隔3秒刷新下报价信息
    },
    /**
     * 功能：公告滚动
     */
    scrollBulletin : function(){
        var scrtime='';
        $("#quotation").hover(function(){
            clearInterval(scrtime);
        },function(){
            scrtime = setInterval(function(){
                var $ul = $("#quotation ul");
                var liHeight = $ul.find("li:last").height();
                $ul.animate({marginTop : liHeight + 35 + "px"},1000,function(){
                    $ul.find("li:last").prependTo($ul);
                    $ul.find("li:first").hide();
                    $ul.css({marginTop:0});
                    $ul.find("li:first").fadeIn(500);
                });
            },3000);
        }).trigger("mouseleave");
    },
    setEvent : function(){
        $('.adbox s').click(function(){
            $('#adBox').fadeOut();
            $('.wrapper').addClass('pub-two');
        });
        $('#contentText').focus(function(){
            $('.wrapper').removeClass('pub-top pub-two').addClass('pub-three');
            $('#header').fadeOut();
            $('.fxs-ony-box').addClass('fxs-none');
        }).blur(function(){
            $('.wrapper').removeClass('pub-three').addClass('pub-top pub-two');
            $('#header').fadeIn();
            $('.fxs-ony-box').removeClass('fxs-none');
        });
    },
    /**
     * 设置广告
     */
    setAdvertisement:function(){
        $.get('/getAdvertisement',null,function(data){
            $("#adBox a").attr("href",data.imgUrl);
            $("#adBox img").attr("src",data.img);
        },"json");
    },
    /**
     * 设置公告
     */
    setBulletin:function(){
        $.get('/getBulletinList',null,function(data){
            $.each(data,function(i,obj){
                if(obj != null){
                    var row=obj.detailList[0];
                    $("#quotation ul").append('<li txt="'+row.content+'"><a href="#">'+row.title+'</a><i>'+obj.createDate+'</i></li>');
                }
            });
            $("#quotation ul li").click(function(){
                wechat.showBulletin($(this).children("a").text(),$(this).children("i").text(),$(this).attr("txt"));
            });
        },"json");
    },
    /**
     * 设置价格
     */
    setPrice:function(){
        $.get(wechat.priceUrl,null,function(data){
            var result = data.result.row,subObj=null;
            $.each(result,function(i,obj){
                if(obj != null){
                    subObj =obj.attr;
                    var gmCode = subObj.gmcode,															 //产品种类
                        bid = subObj.bid,																 //最新
                        change = subObj.change,															 //涨跌0.31
                        direction = ($.trim(change) != '' && change.indexOf('-') >= 0 ? 'up' : 'down'),  //升或降
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
        },"json");
    },
    /**
     * 功能：显示公告
     */
    showBulletin : function(title,date,content){
        $(".gg-h-tt").html(title);
        $(".gg-time").html(date);
        $(".anounce-detail").html(content);
        $("#bulletinBox").slideDown();
        $("#bulletinBoxCloseBtn").click(function(){
            $("#bulletinBox").slideUp();
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

 