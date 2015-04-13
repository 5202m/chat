/**
 * 聊天器客户端操作类
 * @type {{init: Function, setKindEdit: Function, setSocket: Function}}
 * author Alan.wu
 */
var chat={
    socket:null,
    editor:null,
    socketUrl:'http://172.30.6.22:8087',
    userInfo:null,
    init:function(){
        this.setKindEdit();
        this.setSocket();
        this.setEvent();
    },
    /**
     * 设置编辑器
     */
    setKindEdit:function(){
        KindEditor.ready(function(K) {
            chat.editor = K.create('textarea[id=contentText]', {
                resizeType : 0,
                minHeight:30,
                allowPreviewEmoticons : false,
                allowImageUpload : false,
                items : ['fontname', 'fontsize', '|', 'forecolor', 'hilitecolor', 'bold', 'italic', 'underline','emoticons']
            });
        });
    },
    /**
     * 事件设置
     */
    setEvent:function(){
        $("#sendBtn").click(function(){
            chat.editor.sync();
            var msg=$("#contentText").val();
            var fromUser="";
            if(common.isValid(msg)) {
                chat.socket.emit('sendMsg',{fromUser:chat.userInfo,msg:common.escapeHtml(msg)});
            }
            //清空输入框
            $("#contentText").val("");
            chat.editor.html("");
        });
    },
    /**
     * 填充内容
     * @param data
     */
    setContent:function(data,isLoadMsg){
        console.log('receiver message from '+data.msg);
        var fUserInfo=data.fromUser;
        var msg=common.encodeHtml(data.msg);
        var content = $('#contentDiv')[0];
        var p = document.createElement('p');
        p.style.wordWrap = 'break-word';
        p.innerHTML = fUserInfo.userId+":<br/>"+msg;
        if(isLoadMsg){
            $(content).prepend(p);
            $(p).attr("id",fUserInfo._id);
        }else{
            content.appendChild(p);
            $(p).attr("id",fUserInfo.id);
        }
        while (content.childNodes.length > 100) {
            content.removeChild(content.firstChild);
        }
        content.scrollTop = content.scrollHeight;
    },
    /**
     * 设置socket
     */
    setSocket:function(){
        this.socket = io.connect(this.socketUrl);
        //建立连接
        this.socket.on('connect',function(){
            console.log('connected to server'+chat.userInfo);
            chat.socket.emit('login',chat.userInfo);
        });
        //断开连接
        this.socket.on('disconnect',function(){
            console.log('disconnect');
        });
        //信息传输
        this.socket.on('sendMsg',function(data){
            chat.setContent(data,false);
        });
        //信息传输
        this.socket.on('loadMsg',function(data){
            var result=null;
            $('#contentDiv').html("");
            for(var row in data){
                result=data[row];
                chat.setContent({fromUser:result,msg:result.content},true);
            }
        });
    }
};
// 初始化
$(function() {
    chat.init();
});

 