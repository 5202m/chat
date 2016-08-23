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
UUID.prototype.createUUID = function(prefix) {
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
    return (prefix||'')+tl + tm + thv + csar + csl + n;
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
    localHref:window.location.href,
    utmStore:{//utm 数据统计全局数据
        ip:'',
        storeKey:'GWAFLGPHONECOOIKETRACK',//userId key
        userId:'',//用户id
        roomId:'',//房间编号
        groupType:'',//房间大类
        speakCount:0,//发言条数
        onlineSTM:new Date().getTime(),//上线开始时间
        onlineETM:0//上线结束时间
    },
    /**
     * 是否本地访问
     * @returns {boolean}
     */
    isLocalHref:function(){
       return /^https?:\/\/(\d{1,3}\.){3}\d{1,3}.+/.test(chatAnalyze.localHref);
    },
    /**
     * 初始化
     */
    init:function(){
        //引入GA分析
        if(!this.isLocalHref()){
            var type = "";
            if(chatAnalyze.localHref.indexOf("/studio")!=-1){
                type = "studio";
            }else if(chatAnalyze.localHref.indexOf("/fxstudio")!=-1){
                type = "fxstudio"
            }else if(chatAnalyze.localHref.indexOf("/hxstudio")!=-1){
                type = "hxstudio"
            }
            if(type!="") {
                this.initGA(type);
                this.setGA();
                this.setBaidu();
                window.setTimeout(chatAnalyze.sendUTM(),1000*10);
            }
        }
    },
    //初始化GA
    initGA : function(type){
        if(type == "studio"){
            _gaq.push(['_setAccount', 'UA-31478987-1']);
            _gaq.push(['_setDomainName', '24k.hk']);
            _gaq.push(['_addIgnoredRef', '24k.hk']);
        }
        if(type == "fxstudio"){
            _gaq.push([ '_setAccount', 'UA-49389835-1' ]);
            _gaq.push([ '_setDomainName', 'gwfx.com' ]);
            _gaq.push([ '_addIgnoredRef', 'gwfx.com' ]);
        }
        if(type == "hxstudio"){
        	 _gaq.push(['_setAccount', '']);
             _gaq.push(['_setDomainName', 'handan.hx9999']);
             _gaq.push(['_addIgnoredRef', 'handan.hx9999']);
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
     * 获取ip
     * @param callback
     */
    getIp:function(callback){
        $.getJSON('http://chaxun.1616.net/s.php?type=ip&output=json&callback=?&_='+ Math.random(), function(datas) {
            chatAnalyze.utmStore.ip=datas.Ip;
            if(callback){
                callback();
            }
        });
    },
    /**
     * 获取utm cookie
     * @param cval
     * @param type
     */
    getUTMCookie : function() {
        var strCookie = document.cookie;
        var arrCookie = strCookie.split(/[;&]/);
        for ( var i = 0; i < arrCookie.length; i++) {
            var arr = arrCookie[i].split("=");
            if ($.trim(arr[0]) == this.utmStore.storeKey) {
                return arr[1];
            }
        }
        var dm='127.0.0.1';
        if(chatAnalyze.localHref.indexOf("/studio")!=-1){
            dm='.24k.hk';
        }else if(chatAnalyze.localHref.indexOf("/fxstudio")!=-1){
            dm='.gwfx.com';
        }
        var cval=UUID.prototype.createUUID(dm.indexOf("gwfx")!=-1?'':'G');
        document.cookie = this.utmStore.storeKey+ '='+ escape(cval)+ '; expires=Tue, 31 Dec 2030 00:00:00 UTC; path=/;domain='+dm;
        return cval;
    },
    /**
     * 设置utm系统所需行为
     */
    setUTM:function(init,data){
        try{
            this.getIp();
            if(init){
                this.utmStore.roomId=data.groupId;
                this.utmStore.userId=data.userId;
                this.utmStore.userTel=data.userTel;
                this.utmStore.clientGroup=data.clientGroup;
                this.utmStore.groupType=data.groupType;
                $(window).unload(function(){
                    chatAnalyze.utmStore.onlineETM=new Date().getTime();
                    chatAnalyze.sendUTM(null);
                    window.event.returnValue=true;
                });
            }else{
                if(data.speakCount){
                    this.utmStore.speakCount+=data.speakCount;
                }else{
                    if(chatAnalyze.utmStore.ip){
                        chatAnalyze.sendUTM(data);
                    }else{
                        this.getIp(function(){
                            chatAnalyze.sendUTM(data);
                        });
                    }
                }
            }
        }catch(e){
            console.log("Set UTM fail!"+e);
        }
    },
    /**
     * utm AJAX
     * @param url
     */
    utmAjax:function(url,sendData,async){
        $.ajax({
            async : async,
            url : url+'?t='+new Date().getTime(),
            cache : false,
            dataType : (async?'jsonp':'json'),
            data : {data:JSON.stringify(sendData)},
            success : function(t) {}
        });
    },
    /**
     * 发送utm数据
     */
    sendUTM:function(data){
        try{
            if (!store.enabled){
                console.log('Local storage is not supported by your browser.');
                return;
            }
            var tmpData=chatAnalyze.utmStore;
            if(!tmpData.roomId||!tmpData.groupType){
                return;
            }
            if(!tmpData.userTel && !tmpData.userId){
                var st=store.get('storeInfo_'+tmpData.groupType);
                if(!st){
                   return;
                }
                tmpData.userId=st.userId;
            }
            var bPlatform=tmpData.groupType.indexOf('fx')!=-1?1:2;
            var userId = this.getUTMCookie();
            var isLocal=this.isLocalHref();
            var sendData={
                userId:userId,
                customerType: tmpData.clientGroup,
                ip:tmpData.ip,
                businessPlatform:bPlatform,
                platformType:(common.isMobile()?1:0),
                roomId:tmpData.roomId
            };
            if(tmpData.userTel){
                sendData.operationTel=tmpData.userTel;
            }else{
                sendData.visitorId=tmpData.userId;
            }
            var sendUrl=isLocal?"http://testweb.gwfx.com:8088/GwUserTrackingManager_NEW/put/insertChart":"http://das.gwfx.com/put/insertChart";
            if(data && data.courseId){
                sendData.courseId=data.courseId;
                this.utmAjax(sendUrl,sendData,true);
            }else{
                sendData.startDateTime=tmpData.onlineSTM;
                sendData.endDateTime=tmpData.onlineETM;
                sendData.speakCount=tmpData.speakCount;
                if(navigator.sendBeacon){
                    navigator.sendBeacon(sendUrl+"Close",JSON.stringify(sendData));
                }else{
                    this.utmAjax(sendUrl,sendData,false);
                }
            }
        }catch(e){
            console.log("send UTM fail!"+e);
        }
    }
};
$(function() {
    chatAnalyze.init();
});
