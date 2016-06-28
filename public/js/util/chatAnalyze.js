/**
 *  数据统计通用方法
 * create by alan.wu
 * 2015-10-21
 */
var _gaq = _gaq || [];

/**百度统计*/
var _hmt = _hmt || [];
function UUID() {
    this.id = this.createUUID();
}
UUID.prototype.valueOf = function() {
    return this.id;
};
UUID.prototype.toString = function() {
    return this.id;
};
UUID.prototype.createUUID = function() {
    var dg = new Date(1582, 10, 15, 0, 0, 0, 0);
    var dc = new Date();
    var t = dc.getTime() - dg.getTime();
    var tl = UUID.getIntegerBits(t, 0, 31);
    var tm = UUID.getIntegerBits(t, 32, 47);
    var thv = UUID.getIntegerBits(t, 48, 59) + '1';
    var csar = UUID.getIntegerBits(UUID.rand(4095), 0, 7);
    var csl = UUID.getIntegerBits(UUID.rand(4095), 0, 7);
    var n = UUID.getIntegerBits(UUID.rand(8191), 0, 7)
        + UUID.getIntegerBits(UUID.rand(8191), 8, 15)
        + UUID.getIntegerBits(UUID.rand(8191), 0, 7)
        + UUID.getIntegerBits(UUID.rand(8191), 8, 15)
        + UUID.getIntegerBits(UUID.rand(8191), 0, 15);
    return "G"+tl + tm + thv + csar + csl + n;
};
UUID.getIntegerBits = function(val, start, end) {
    var base16 = UUID.returnBase(val, 16);
    var quadArray = new Array();
    var quadString = '';
    var i = 0;
    for (i = 0; i < base16.length; i++) {
        quadArray.push(base16.substring(i, i + 1));
    }
    for (i = Math.floor(start / 4); i <= Math.floor(end / 4); i++) {
        if (!quadArray[i] || quadArray[i] == '')
            quadString += '0';
        else
            quadString += quadArray[i];
    }
    return quadString;
};
UUID.returnBase = function(number, base) {
    return (number).toString(base).toUpperCase();
};
UUID.rand = function(max) {
    return Math.floor(Math.random() * (max + 1));
};
// 初始化
var chatAnalyze = {
    COOKIE_NAME:'GWAFLGPHONECOOIKETRACK',
    localHref:window.location.href,
    /**
     * 初始化
     */
    init:function(){
        //引入GA分析
        var type = "";
        if(chatAnalyze.localHref.indexOf("pmchat.24k.hk")!=-1){
            type = "studio";
        }else if(chatAnalyze.localHref.indexOf("chat.gwfx.com")!=-1){
            type = "fxstudio"
        }
        if(type) {
            this.initGA(type);
            this.setGA();
            this.setBaidu();
        }
        //引入utm分析
        //this.setUTM();
    },
    //初始化GA
    initGA : function(type){
        if(type == "fxstudio"){
            _gaq.push([ '_setAccount', 'UA-49389835-1' ]);
            _gaq.push([ '_setDomainName', 'gwfx.com' ]);
            _gaq.push([ '_addIgnoredRef', 'gwfx.com' ]);
        }else{
            _gaq.push(['_setAccount', 'UA-31478987-1']);
            _gaq.push(['_setDomainName', '24k.hk']);
            _gaq.push(['_addIgnoredRef', '24k.hk']);
        }
        _gaq.push(['_setAllowLinker', true]);
        _gaq.push(['_addOrganic', 'soso', 'w']);
        _gaq.push(['_addOrganic', 'sogou', 'query']);
        _gaq.push(['_addOrganic', 'youdao', 'q']);
        _gaq.push(['_addOrganic', 'baidu', 'word']);
        _gaq.push(['_addOrganic', 'baidu', 'q1']);
        _gaq.push(['_addOrganic', 'ucweb', 'keyword']);
        _gaq.push(['_addOrganic', 'ucweb', 'word']);
        _gaq.push(['_addOrganic', '114so', 'kw']);
        _gaq.push(['_addOrganic', '360', 'q']);
        _gaq.push(['_addOrganic', 'so', 'q']);
        _gaq.push(['_trackPageview']);
    },
    /**
     * 设置GA
     */
    setGA:function(){
        try{
            var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
            ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
        }catch(e){
            console.log("Set GA fail!"+e);
        }
    },
    setBaidu:function(){
        try{
            var hm = document.createElement("script");
            hm.src = "//hm.baidu.com/hm.js?52a2828b884f1a2ba8a3e25efe98eb65";
            var s = document.getElementsByTagName("script")[0];
            s.parentNode.insertBefore(hm, s);
        }catch(e){
            console.log("Set GA fail!"+e);
        }
    },
    /**
     * 设置utm系统所需行为
     */
    setUTM:function(flagTmp){
        try{
            var c = this.getCookie();
            if (c == null || typeof (c) == "undefined" || $.trim(c) == "") {
                c=UUID.prototype.createUUID();
                this.setCookie(c);
            }
            var flag=flagTmp||'';
            _gaq.push(function() {
                $.getJSON('http://chaxun.1616.net/s.php?type=ip&output=json&callback=?&_='+ Math.random(), function(datas) {
                    var sendData={data:[{user_id: c,businessPlatform:"2",visit_time:new Date(),behavior_type:6
                        ,ip:datas.Ip,url:chatAnalyze.localHref,flag:flag,gacookiesTrack:'' }]};
                    var sendUrl =chatAnalyze.localHref.indexOf("pmchat.24k.hk") != -1? "http://utm.gwfx.com/putData/ajax/ajaxTrackData": "http://testweb.gwfx.com:8088/GwUserTrackingManager_NEW/putData/ajax/ajaxTrackData";
                    $.ajax({
                        async : true,
                        url : sendUrl,
                        cache : false,
                        dataType : 'jsonp',
                        data : {
                            data : sendData
                        },
                        success : function(t) {}
                    });
                });
            });
        }catch(e){
            console.log("Set UTM fail!"+e);
        }
    },
    setCookie : function(cval) {
        this.setHC(this.COOKIE_NAME, cval);
    },
    getCookie : function() {
        var cval = this.getHC(this.COOKIE_NAME);
        if (typeof (cval) != 'undefined' && cval != null && cval != '') {
            this.setCookie(cval);
        }
        return cval;
    },
    setHC : function(cname, cval) {
        if (typeof (cval) != "undefined") {
            document.cookie = cname+ '=; expires=Mon, 20 Sep 2010 00:00:00 UTC; path=/;domain=.24k.hk';
            document.cookie = cname+ '='+ escape(cval)+ '; expires=Tue, 31 Dec 2030 00:00:00 UTC; path=/;domain=.24k.hk';
        }
    },
    getHC : function(cname) {
        var strCookie = document.cookie;
        var arrCookie = strCookie.split(/[;&]/);
        for ( var i = 0; i < arrCookie.length; i++) {
            var arr = arrCookie[i].split("=");
            if ($.trim(arr[0]) == $.trim(cname)) {
                return arr[1];
            }
        }
    }
};
$(function() {
    chatAnalyze.init();
});
