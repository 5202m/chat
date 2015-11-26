/**
 *  数据统计通用方法
 * create by alan.wu
 * 2015-10-21
 */
var _gaq = _gaq || [];
 _gaq.push(['_setAccount', 'UA-31478987-4']);
 _gaq.push(['_setDomainName', '24k.hk']);
 _gaq.push(['_addIgnoredRef', '24k.hk']);
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
// 初始化
var chatGA = {
    init:function(){
        //引入GA分析
        try{
            var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
            ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
        }catch(e){
            console.log("import GA fail!"+e);
        }
    }
};
$(function() {
    if(window.location.href.indexOf("24k")!=-1) {
        chatGA.init();
    }
});
