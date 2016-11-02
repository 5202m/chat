/** obsplayer 播放器**/
var obsPlayer=(function() {
    var obsConfig={
        hk:['rtmp://hk.hhkcdn.com/live','rtmp://hk.vpcdn.com/live','rtmp://h6.phgse.cn/live','rtmp://ct.phgsa.cn:1935/live'],
        sz:['rtmp://sz.hhkcdn.com/live','rtmp://sz.vpcdn.com/live','rtmp://sz6.phgse.cn/live','rtmp://ct1.phgsa.cn:1935/live']
    };
    var toPlay=function(url,domId){
        swfobject.obsConfig=[];
        var urlGroupArr=/(.*)\/([0-9]+)$/g.exec(url);
        if(!urlGroupArr || urlGroupArr.length<3){
            return;
        }
        var obsRow=null;
        for(var i in obsConfig){
            obsRow=obsConfig[i];
            if(obsRow && obsRow.join(";").indexOf(urlGroupArr[1])!=-1){
                for(var k in obsRow){
                    if(obsRow[k]){
                        swfobject.obsConfig.push({url:obsRow[k]+"/",id:urlGroupArr[2]}) ;
                    }
                }
                break;
            }
        }
        swfobject.embedSWF("/base/lib/obsplayer/VPlayer.swf",domId, "100%", "100%", "10.0.0","/base/lib/obsplayer/expressInstall.swf",{}, {
            menu: "false",
            scale: "noScale",
            allowFullscreen: "true",
            allowScriptAccess: "always",
            bgcolor: "",
            wmode: "direct" // can cause issues with FP settings & webcam
        },{
            id:"VPlayer"
        });
    };
    return {
        init:function(url,domId,clearDom){
            if(clearDom){
                $("#"+domId).empty();
            }
            var divId='js_obs_'+domId;
            if($("#"+divId).length==0){
                $("#"+domId).append('<div id="'+divId+'"></div>');
            }
            toPlay(url,divId);
        }
    };
})();