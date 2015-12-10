var ChartFactory=!window.Highcharts?null:(function() {
	var KType = {
		"realtime" : "1min",
		"5min" : "5min",
		"hour" : "1hour",
		"day" : "day"
	};
	var ErrorCode = {
		"ELEMENT_NOTFOUND" : "没有指定画板元素",
		"SERVICE_ERROR" : "服务器出现错误",
		"NO_DATA" : "没有数据"
	};
	var defaultParser = {
		"line" : function(data) {
			var priceData = [];
			for (var i = 0; i < data.length; i++) {
				var point = data[i], date = point.milliseconds, price = parseFloat(point.end);
				if (price == 0) {
					priceData.push({
						x : date,
						y : null
					});
				} else {
					priceData.push({
						x : date,
						y : price
					});
				}
			}
			return priceData;
		},
		"candlestick" : function(data) {
			var priceData = [];
			for (var i = 0; i < data.length; i++) {
				var point = data[i], date = point.milliseconds, high = parseFloat(point.high), low = parseFloat(point.low), close = parseFloat(point.end), open = parseFloat(point.begin);
				priceData.push([ date, open, high, low, close ]);
			}
			return priceData;
		}
	};
	var _symbol = "", _symbol_type = 2;
	if (document.getElementById("symbol") != null
			&& typeof (document.getElementById("symbol")) != 'undefined') {
		_symbol = document.getElementById("symbol").value;
	}
	if (_symbol == "XAGUSD"||_symbol == "USDJPY") {
		_symbol_type = 3;
	} else if (_symbol == "EURUSD" || _symbol == "GBPUSD"
			|| _symbol == "AUDUSD" || _symbol == "USDCHF"
			|| _symbol == "USDCAD") {
		_symbol_type = 4;
	}
	Highcharts.setOptions({
		global : {
			useUTC : false
		}
	});
	return {
		supportWebSocket : window.WebSocket,
		create : function(element, options,loadDom) {
            if(loadDom){
                loadDom.show();
            }
			var def = $.Deferred();
			if (!element || !element.length) {
				def.reject(ErrorCode.ELEMENT_NOTFOUND);
				return def.promise();
			}
			var o = {
				type : "post",
				dataType : "jsonp",
				jsonpCallback : 'jsonpCallback',
				data : {
					kType : KType.realtime
				}
			};
			var _this = this;
			var finalOptions = $.extend(true, {}, o, options);
			this.symbol = finalOptions.data.symbol;
			this.loadData(finalOptions).done(
					function(data) {
                        if(loadDom){
                            loadDom.hide();
                        }
						if (!data || !data.code) {
							return def.reject(ErrorCode.SERVICE_ERROR);
						}
						if (data.code === "OK") {
							if (data.listResult.length == 0) {
								return def.reject(ErrorCode.NO_DATA);
							}
							var ktype = finalOptions.data.dataType;
							var chartType = _this.getChartType(ktype);
							var data = _this.parseData(data.listResult
									.reverse(), chartType, finalOptions);
							_this.createChart(element, chartType, ktype, data);
							def.resolve();
						} else {
							return def.reject(ErrorCode.SERVICE_ERROR);
						}
					});
			return def.promise();
		},
		add : function(element, data, ktype) {
			var chartType = this.getChartType(ktype);
			data = this.parseData(data, chartType);
			if (chartType === "line") {
				this.addPoint(element, data);
			} else {
				this.addPoint(element, data);
			}
		},
		parseData : function(data, chartType, options) {
			var parser = (options && options.parser && options.parser[chartType])
					|| defaultParser[chartType];
			return parser(data);
		},
		getChartType : function(ktype) {
			if (ktype === KType.realtime) {
				return "line";
			} else {
				return "candlestick";
			}
		},
		createChart : function(element, chartType, ktype, data) {
			if (chartType === "line") {
				this.createLineChart(element, data);
			} else if (chartType == "candlestick") {
				this.createCandlestickChart(element, ktype, data);
			}
		},
		createLineChart : function(element, data) {
			var options = {
				colors : [ '#b59130' ],
				chart : {
					marginTop : 20,
					marginBottom : 20,
					spacingLeft : 0,
					spacingRight : 0,
					spacingTop : 0,
					spacingBottom : 0,
					borderWidth : 0,
					pinchType : ""
				},
				credits : {
					enabled : true,
					text : this.symbol + " 1min",
					position : {
						align : 'left',
						verticalAlign : "top",
						x : 70,
						y : 35
					}
				},
				plotOptions : {
					line : {
						dataGrouping : {
							enabled : false
						},
						cropThreshold : 300
					}
				},
				xAxis : {
					type : "datetime",
					tickLength : 0,
					tickPixelInterval : 70
				},
				yAxis : [ {
					labels : {
						y : 3,
						formatter : function() {
							return parseFloat(this.value).toFixed(_symbol_type);
						}
					},
					opposite : false,
					showLastLabel : true,
					tickLength : 0,
					lineWidth : 1
				} ],
				rangeSelector : {
					enabled : false
				},
				scrollbar : {
					enabled : false
				},
				navigator : {
					enabled : false
				},
				tooltip : {
					formatter : function() {
						var html = [ "<span>"
								+ Highcharts.dateFormat("%Y-%m-%d %H:%M",
										this.x) + "</span><br/>" ];
						html.push("<span>价格:<strong>" + this.y
								+ "</strong></span><br/>");
						return html.join("");
					}
				},
				series : [ {
					name : '价位',
					type : 'line',
					data : data
				} ]
			};
			element.highcharts('StockChart', options);
		},
		addPoint : function(element, data) {
			var chart = element.highcharts();
			chart.series[0].addPoint(data[0], false);
			chart.redraw();
		},
		createCandlestickChart : function(element, ktype, data) {
			var format = "%Y-%m-%d";
			if (ktype === KType["5min"]) {
				format = "%Y-%m-%d %H:%M";
			} else if (ktype === KType.hour) {
				format = "%Y-%m-%d %H:%M";
			}
			var options = {
				chart : {
					marginTop : 20,
					marginBottom : 20,
					spacingLeft : 0,
					spacingRight : 0,
					spacingTop : 0,
					spacingBottom : 0,
					borderWidth : 0,
					pinchType : ""
				},
				credits : {
					enabled : true,
					text : this.symbol + " " + ktype,
					position : {
						align : 'left',
						verticalAlign : "top",
						x : 70,
						y : 35
					}
				},
				plotOptions : {
					candlestick : {
						upColor : "#F00",
						upLineColor : "#F00",
						color : "#00a004",
						lineColor : "#00a004"
					}
				},
				xAxis : {
					type : "datetime",
					tickPixelInterval : 70,
					tickLength : 0,
					dateTimeLabelFormats : {
						day : '%m-%d',
						week : '%m-%d',
						month : '%y-%m'
					}
				},
				yAxis : [ {
					labels : {
						y : 3,
						formatter : function() {
							return parseFloat(this.value).toFixed(_symbol_type);
						}
					},
					lineWidth : 1,
					opposite : false,
					showLastLabel : true,
					endOnTick : false
				} ],
				rangeSelector : {
					enabled : false
				},
				scrollbar : {
					enabled : false
				},
				navigator : {
					enabled : false
				},
				tooltip : {
					formatter : function() {
						var otherData = this.points[0].point;
						var html = [ "<span>"
								+ Highcharts.dateFormat(format, this.x)
								+ "</span><br/>" ];
						html.push("<span>开盘价:<strong>" + (otherData.open)
								+ "</strong></span><br/>");
						html.push("<span>最高价:<strong>" + (otherData.high)
								+ "</span></span><br/>");
						html.push("<span>最低价:<strong>" + (otherData.low)
								+ "</strong></span><br/>");
						html.push("<span>收盘价:<strong>" + (otherData.close)
								+ "</strong></span><br/>");
						return html.join("");
					}
				},
				series : [ {
					name : '价格',
					type : 'candlestick',
					data : data
				} ]
			};
			if (ktype === KType.day) {
				options.xAxis.datafor = []
			}
			element.highcharts('StockChart', options);
		},
		loadData : function(options) {
			var lineNumber = getLineNumberByScreenWidth();
			var ktype = options.data.dataType;
			$.extend(options.data, {
				startTime : formatDate(new Date()),
				num : ktype === KType.realtime ? 120 : lineNumber,
				flag : 0
			});
			return $.ajax(options);
		}
	};
	function formatDate(date) {
		return date.getFullYear() + "-" + (date.getMonth() + 1) + "-"
				+ date.getDate() + " " + date.getHours() + ":"
				+ date.getMinutes() + ":" + date.getSeconds();
	}
	function getLineNumberByScreenWidth() {
		var width = $(window).width();
		if (width < 540) {
			return 30;
		} else if (width >= 540 && width < 1080) {
			return 40;
		} else {
			return 80;
		}
	}
})();

function getMarketpriceCrossDomainIndex(url,selfOptions) {
	$.ajax({
		type : "GET",
		url : url,
		dataType : "jsonp",
		success : function(data) {
			if ("OK" == data.code) {
				parseMarketpriceIndex(data,selfOptions);
			}
		},
		error : function() {
		}
	});
}
function parseMarketpriceIndex(data,selfOptions) {
    var _index_price_type = 2,symbol='',deltaPrice= 0,deltaPercent= 0,price=0;
    for (var i = 0; i < data.listResult.length; i++) {
        symbol=data.listResult[i].symbol;
        deltaPrice=data.listResult[i].deltaPrice;
        price=data.listResult[i].price;
        deltaPercent=data.listResult[i].deltaPercent;
        if (symbol == "XAGUSD"||symbol == "USDJPY") {
            _index_price_type = 3;
        } else if(symbol == "EURUSD"){
            _index_price_type = 3;
        } else{
            _index_price_type = 2;
        }
        $("#price_" +symbol).html(parseFloat(price).toFixed(_index_price_type));
        var percentDom=$("#deltaPercent_" +symbol);
        percentDom.text((deltaPercent * 100).toFixed(2) + "%");
        if(!selfOptions){
            if (deltaPrice > 0) {
                $("#price_" +symbol).parent().removeClass("date-down").addClass("date-up");
            } else {
                $("#price_" + symbol).parent().removeClass("date-up").addClass("date-down");
            }
            $("#deltaPrice_" +symbol).html(parseFloat(deltaPrice).toFixed(_index_price_type));
        }else{
            if (deltaPrice > 0) {
                if(percentDom.attr("changeCss")=="true"){
                    percentDom.removeClass(selfOptions.downCss).addClass(selfOptions.upCss);
                }
            } else {
                if(percentDom.attr("changeCss")=="true"){
                    percentDom.removeClass(selfOptions.upCss).addClass(selfOptions.downCss);
                }
            }
        }
    }
}

function getAllMarketpriceIndex(wsUrl, wsData, httpUrl,selfOptions) {
    try{
        var socket;
        if (!window.WebSocket) {
            window.WebSocket = window.MozWebSocket;
        }
        if (window.WebSocket) {
            socket = new WebSocket(wsUrl);
            socket.onmessage = function (event) {
                var retData = JSON.parse(event.data);
                if ("OK" == retData.code) {
                    parseMarketpriceIndex(retData,selfOptions);
                }
            };
            socket.onopen = function (event) {
                if (socket.readyState == WebSocket.OPEN) {
                    socket.send(wsData);
                }
            };
        } else {
            setInterval(function () {
                getMarketpriceCrossDomainIndex(httpUrl,selfOptions)
            }, 1000 * 2);
        }
    }catch(e){
        console.log("get price has error!");
    }
}