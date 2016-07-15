/**
 * 通用dateTimeWeek插件
 * 调用方式：	$("#studioTimeDiv").dateTimeWeek({data:dataTmp});
 * 数据格式：{beginDate:yyyy-MM-dd,endDate:yyyy-MM-dd,weekTime:[{week:0..6,beginTime:'HH:mm:ss',endTime:'HH:mm:ss'}]}
 * create by alan.wu
 * date:2015/08/12
 */
(function($) {  
  //插件的定义  
  $.fn.dateTimeWeek = function(options) {
	  var _this=this;
      if(options && (typeof options!="object")){
          var getData=function(){
              var id="#"+$(_this).attr("id"),
                  bDate=$.trim($(id+"_start_date").val()),
                  eDate=$.trim($(id+"_end_date").val()),
                  weekTimeArr=$(id+" .date-time-week-each div[n]").map(function(){
                      var result={week:$(this).find("select[name=week]").val(),beginTime:$(this).find("input[id*=start_time]").val(),endTime:$(this).find("input[id*=end_time]").val()};
                      if($.trim(result.week)=="" && $.trim(result.beginTime)=="" && $.trim(result.endTime)==""){
                          return null;
                      }else{
                          return result;
                      }
                  }).get();
              if(weekTimeArr && weekTimeArr.length==0){
                  weekTimeArr=null;
              }else{
                  weekTimeArr.sort($.fn.dateTimeWeek.arraySort("week",false));
              }
              if(bDate=="" && eDate=="" && !weekTimeArr){
                  return '';
              }else{
                  return JSON.stringify({beginDate:bDate,endDate:eDate,weekTime:weekTimeArr});
              }
          };
          //提供外部方法,提取数据
          if(options=="getData"){
              return getData();
          }else{
              return null;
          }
      }
	  //声明类对象
	  var dateTimeWeekDom={
			    id:'',
			    srcId:'',
			    data:null,
			    init:function(idTmp,dataTmp){
			       this.id="#"+idTmp;
			       this.srcId=idTmp;
			       this.data=dataTmp;
			       $(this.id).append(this.getTemplate());
			       this.setEvent();
			    },
			    setEvent:function(){
			    	$(dateTimeWeekDom.id+" .date-time-week-each div[n=1] a[t=add]").click(function(){
			     		  var lastDom=$(dateTimeWeekDom.id+" .date-time-week-each div[n]:last"),lastHtml=lastDom.html();
			     		  var lastN=parseInt(lastDom.attr("n")),n=lastN+1;
			     		  if(lastN>1){
			     			 lastDom.find("a[t=add]").hide();
			     		  }
			     		  lastHtml=lastHtml.replace(/(start_time|end_time)_\d/g,'$1_'+n);
			     		  $(dateTimeWeekDom.id+" .date-time-week-each").append('<div n="'+n+'">'+lastHtml+'</div>');
                          $(dateTimeWeekDom.id+" .date-time-week-each div[n]:last").find("a[t=add]").hide();
			     		  var notFirstDom=$(dateTimeWeekDom.id+" .date-time-week-each div[n!=1]");
			     		  notFirstDom.find("a[t=remove]").show();
			     		  $(dateTimeWeekDom.id+" .date-time-week-each div[n]:last").find("a[t]").click(function(){
			     			  var eachDivDom=$(this).parents("[n]");
			     			  if($(this).attr("t")=='add'){
			     				$(dateTimeWeekDom.id+" .date-time-week-each div[n=1] a[t=add]").click();
			     			  }
			     			  if($(this).attr("t")=='remove'){
			     				 eachDivDom.remove();
			     				//$(dateTimeWeekDom.id+" .date-time-week-each div:last").find("a[t=add]").show();
			   			      } 
			      	      });
			     	  });
			    	  //设置数据
			     	  if(this.data){
				  	   	 var dateTimeWeekTime=this.data.weekTime,dateTimeRow=null;
				  	   	 $(dateTimeWeekDom.id+"_start_date").val(this.data.beginDate||"");
				  	   	 $(dateTimeWeekDom.id+"_end_date").val(this.data.endDate||"");
				  	   	 if(!dateTimeWeekTime){
				  	   		return; 
				  	   	 }
				  	   	 for(var i=0;i<dateTimeWeekTime.length;i++){
				  	   		 if(i>0){
				  	   			 $(dateTimeWeekDom.id+" .date-time-week-each div[n=1] a[t=add]").click();
				  	   		 }
				  	   		 var dateTimeIndex=i+1,dateTimeRow=dateTimeWeekTime[i];
				  	   		 if(!dateTimeRow){
				  	   			 continue;
				  	   		 }
				  	   		 $(dateTimeWeekDom.id+" .date-time-week-each div[n="+dateTimeIndex+"] input,"+dateTimeWeekDom.id+" .date-time-week-each div[n="+dateTimeIndex+"] select").each(function(){
				  	   			 if("week"==$(this).attr("name")){
				  	   			    $(this).find("option[value="+dateTimeRow.week+"]").attr("selected",true); 
				  	   			 }
				  	   			 if(this.id){
				  	   				if(this.id.indexOf("start_time")!=-1){
				  	   					$(this).val(dateTimeRow.beginTime);
				  	   				}
				  	   				if(this.id.indexOf("end_time")!=-1){
				  	   					$(this).val(dateTimeRow.endTime);
				  	   				}
				  	   			 }
				  	   		 });
				  	   	 }
			     	 }
			    },
				getTemplate:function(){
					return '<div class="date-time-week-body"><div class="date-time-week">'+
				      '<span>日期：</span><input  id="'+dateTimeWeekDom.srcId+'_start_date" class="Wdate"  onFocus="WdatePicker({maxDate:\'#F{$dp.$D(\\\''+dateTimeWeekDom.srcId+'_end_date\\\')}\',dateFmt:\'yyyy-MM-dd\'});$(\'#_my97DP\').css(\'z-index\',\'100020\');" style="width:150px"/>'+
				      '&nbsp;到&nbsp;<input id="'+dateTimeWeekDom.srcId+'_end_date" class="Wdate" onFocus="WdatePicker({minDate:\'#F{$dp.$D(\\\''+dateTimeWeekDom.srcId+'_start_date\\\')}\',dateFmt:\'yyyy-MM-dd\'});$(\'#_my97DP\').css(\'z-index\',\'100020\');" style="width:150px"/>'+
				     '</div>'+                        
				      '<div class="date-time-week-each">'+    
				   	   '<div n="1">'+
					      '<span>星期：</span>'+
					      '<span>'+
						      '<select name="week">'+
							    '<option value="">--请选择--</option>'+
							    '<option value="1">一</option>'+
							    '<option value="2">二</option>'+
							    '<option value="3">三</option>'+
							    '<option value="4">四</option>'+
						 		'<option value="5">五</option>'+
						 		'<option value="6">六</option>'+
						 		'<option value="0">日</option>'+
						      '</select>'+
						      '<span>&nbsp;&nbsp;时间：</span>'+
						      '<span>'+    
						        '<span>'+    
						        	'<input style="width:80px;" id="'+dateTimeWeekDom.srcId+'_start_time_1" class="Wdate"  onFocus="WdatePicker({maxDate:\'#F{$dp.$D(\\\''+dateTimeWeekDom.srcId+'_end_time_1\\\')}\',dateFmt:\'HH:mm:ss\'});$(\'#_my97DP\').css(\'z-index\',\'100020\');"/>'+
						        	'&nbsp;到&nbsp;<input style="width:80px;" id="'+dateTimeWeekDom.srcId+'_end_time_1" class="Wdate" onFocus="WdatePicker({minDate:\'#F{$dp.$D(\\\''+dateTimeWeekDom.srcId+'_start_time_1\\\')}\',dateFmt:\'HH:mm:ss\'});$(\'#_my97DP\').css(\'z-index\',\'100020\');"/>'+
						   	     '</span>'+
						   	     '<span style="margin-left:8px;">'+
						   	        '<a class="ope-remove" t="remove" style="display:none;"></a>'+
						   	        '<a class="ope-add" t="add"></a>' + 
						   	    '</span>'+    
						   	   '</span>'+
					   	  '</span>' +
				   	 '</div>' +               
				   '</div></div>';
				}
			};
	   return this.each(function() {    
		   dateTimeWeekDom.init(this.id, options?options.data:null); 
	   }); 
    }; 
    //排序方法
    $.fn.dateTimeWeek.arraySort=function(key,desc){
        return function(a,b){
            return desc? (a[key] < b[key]) : (a[key] > b[key]);
        }
    };
})(jQuery);

