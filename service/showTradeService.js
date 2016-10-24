var chatShowTrade = require('../models/chatShowTrade');//引入chatShowTrade数据模型
var logger=require('../resources/logConf').getLogger('showTradeService');//引入log4js
var chatPraiseService = require('../service/chatPraiseService');//引入chatPraiseService
var constant = require('../constant/constant');//引入constant
var common = require('../util/common');//引入common类
/**
 * 晒单服务类
 * 备注：查询各分析师的晒单数据
 * author Dick.guo
 */
var showTradeService = {

    /**
     * 查询分析师晒单数据
     * @param groupType
     * @param userNo 如果有多个分析师，只取第一个
     * @param callback
     */
    getShowTrade : function(groupType, userNo, callback){
        userNo = userNo.replace(/,.*$/g, "");
        chatShowTrade.find({
            "boUser.userNo" : userNo,
            "groupType" : groupType,
            "valid" : 1,
            "tradeType":1
        }).sort({"showDate":-1}).exec("find", function(err, data){
            if(err){
                logger.error("查询晒单数据失败!>>getShowTrade:", err);
                callback(null);
                return;
            }
            var result = null;
            if(data && data.length > 0){
                result = {
                    analyst : data[0].toObject().boUser,
                    tradeList : []
                };
                var tradeInfo = null;
                for(var i = 0,lenI = data.length; i < lenI;i++){
                    tradeInfo = data[i].toObject();
                    delete tradeInfo["boUser"];
                    result.tradeList.push(tradeInfo);
                }
                if(result.analyst){
                    result.analyst.praiseNum = 0;
                    chatPraiseService.getPraiseNum(result.analyst.userNo,constant.chatPraiseType.user,groupType,function(rows){
                        if(rows && rows.length > 0){
                            result.analyst.praiseNum = rows[0].praiseNum;
                        }
                        callback(result);
                    });
                    return;
                }
            }
            callback(result);
        });
    },
    /**
     * 查询指定条数数据
     * @param params
     * @param callback
     */
    getShowTradeList:function(params, callback){
        var searchObj = {"groupType":params.groupType, "valid":1, "status":1,"tradeType":2};
        if(common.isValid(params.userNo)){
            searchObj = {"groupType":params.groupType, "valid":1,"tradeType":2,"boUser.userNo":params.userNo};
        }
        //var from = (params.pageNo-1) * params.pageSize;
        var orderByJsonObj={"showDate": 'desc' };
        if(common.isValid(params.skipLimit)){
            callback(null);
            return;
        }
        chatShowTrade.find(searchObj)
            .sort(orderByJsonObj)
            //.skip(from)
            .limit(params.pageSize)
            .exec("find",function(err, data){
            if(err){
                logger.error("查询晒单数据失败! >>getShowTradeList:", err);
                callback(null);
                return;
            }
            var result = null;
            if(data && data.length > 0){
                result = {
                    tradeList : []
                };
                var tradeInfo = null;
                for(var i = 0,lenI = data.length; i < lenI;i++){
                    tradeInfo = data[i].toObject();
                    tradeInfo.user = data[i].boUser.toObject();
                    delete tradeInfo["boUser"];
                    result.tradeList.push(tradeInfo);
                }
            }
            callback(result);
        });
    },
    /**
     * 新增晒单
     * @param params
     * @param callback
     */
    addShowTrade:function(params, callback){
        var insertModel = {
            _id : null,
            groupType : params.groupType, //聊天室组别
            boUser : {
                _id : null,   //userId
                userNo : params.userNo,//userNo
                avatar : params.avatar,//头像
                userName : params.userName,//分析师姓名
                telephone : params.telePhone,//手机号
                wechatCode : '',//分析师微信号
                wechatCodeImg : '',//分析师微信二维码
                winRate : ''//分析师胜率
            },
            showDate : new Date(), //晒单时间
            tradeImg : params.tradeImg, //晒单图片
            profit : '', //盈利
            remark : params.remark,//心得
            valid : 1, //是否删除 1-有效 0-无效
            updateDate : new Date(),
            createUser: params.userName,
            createIp: params.Ip,
            createDate: new Date(),
            title: params.title,//标题
            tradeType: params.tradeType,//类别：1 分析师晒单，2 客户晒单
            status: 0, //状态：0 待审核， 1 审核通过， -1 审核不通过
            praise: 0 //点赞数
        };
        new chatShowTrade(insertModel).save(function(err){
            if (err) {
                logger.error("保存晒单数据失败! >>addShowTrade:", err);
                callback({isOK:false, msg:'晒单失败'});
            }else{
                callback({isOK:true, msg: ''});
            }
        });
    },
    /**
     * 更新点赞数
     * @param params
     * @param callback
     */
    setShowTradePraise:function(params, callback){
        var searchObj = {_id:params.praiseId};
        chatShowTrade.findOne(searchObj, function(err, row){
            if(err){
                logger.error("查询数据失败! >>setShowTradePraise:", err);
                callback({isOK:false, msg:'点赞失败'});
            }else{
                if(common.isBlank(row.praise)){
                    row.praise = 1;
                }else{
                    row.praise += 1;
                }
                var setObj = { '$set': {'praise': row.praise}};
                chatShowTrade.findOneAndUpdate(searchObj, setObj, function(err1, row1){
                    if (err1) {
                        logger.error('setShowTradePraise=>fail!' + err1);
                        callback({isOK: false,  msg: '点赞失败'});
                    }else{
                        callback({isOK: true, msg: ''});
                    }
                });
            }
        });
    },
    /**
     * 根据晒单id查询晒单数据
     * @param tradeIds
     * @param callback
     */
    getShowTradeByIds:function(tradeIds, callback){
        var searchObj = {_id:{$in:tradeIds}};
        chatShowTrade.find(searchObj,function(err, row){
            if(err){
                logger.error('查询数据失败！>>getShowTradeByIds:',err);
                callback(null);
            }else{
                callback(row);
            }
        });
    }
};
//导出服务类
module.exports =showTradeService;

