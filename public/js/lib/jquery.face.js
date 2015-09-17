// QQ表情插件
(function($){  
	$.fn.qqFace = function(options){
		var defaults = {
			id : 'facebox',
			path : 'face/',
			assign : 'content',
            top:null,
			tip : ''
		};
		var option = $.extend(defaults, options);
		var assign = $('#'+option.assign);
		var id = option.id;
		var path = option.path;
		var tip = option.tip;
		
		if(assign.length<=0){
			alert('缺少表情赋值对象。');
			return false;
		}
		
		$(this).click(function(e){
            if($('#'+id +':visible').length){
                $('#'+id).hide();
                return false;
            }
			var strFace, labFace;
			if($('#'+id).length<=0){
				strFace = '<div id="'+id+'" style="position:absolute;display:none;z-index:1000;" class="qqFace">' +
							  '<table border="0" cellspacing="0" cellpadding="0"><tr>';
				for(var i=1; i<=75; i++){
					labFace = path+tip+i+'.gif';
					strFace += '<td><img src="'+path+i+'.gif" onclick="$(\'#'+option.assign+'\').insertAtCaret(\'' + labFace + '\');" /></td>';
					if( i % 15 == 0 ) strFace += '</tr><tr>';
				}
				strFace += '</tr></table></div>';
			}
			$(this).parent().append(strFace);
			var offset = $(this).position();
            var cssTop=$('#'+id).css("top");
            if(cssTop.indexOf('px')==-1){
                var top = offset.top + $(this).outerHeight();
                $('#'+id).css('top',top);
            }
			$('#'+id).css('left',offset.left);
			$('#'+id).show();
			e.stopPropagation();
		});
	};

})(jQuery);
jQuery.fn.extend({ 
	insertAtCaret: function(textFeildValue){
	    textFeildValue='<img src="'+textFeildValue+'"/>';
		var textObj = $(this).get(0); 
		textObj.innerHTML+=textFeildValue; 
	} 
});