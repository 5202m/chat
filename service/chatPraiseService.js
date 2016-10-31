var chatPraise = require('../models/chatPraise');//引入chatPraise数据模型
var common = require('../util/common');//引入common类
var constant = require('../constant/constant');//引入constant
/**
 * 聊天室点赞服务类
 * 备注：处理聊天室点赞所有信息及其管理
 * author Alan.wu
 */
var chatPraiseService ={
    /**
     * 提取点赞内容
     */
    getPraiseNum:function(praiseId,type,platfrom,callback){
        var praiseId=praiseId.split(",");
        chatPraise.find({praiseId:{$in:praiseId},praiseType:type,fromPlatform:platfrom},function(err,rows){
            callback(rows);
        });
    },
    /**
     * 设置点赞
     * @param praiseId
     * @param type
     */
    setPraise:function(praiseId,type,fromPlatform,callback){
        chatPraise.findOne({praiseId:praiseId,praiseType:type,fromPlatform:fromPlatform},function(err,row){
           if(row){
               row.praiseNum+=1;
               row.save(function(err,rowTmp){
                   //console.log(err+";rowTmp:"+JSON.stringify(rowTmp));
                   callback({isOK:true});
               });
           }else{
               var chatPraiseModel = new chatPraise({
                   _id:null,
                   praiseId:praiseId,
                   praiseType:type,
                   fromPlatform:fromPlatform,
                   praiseNum:1
               });
               chatPraiseModel.save(function(err){
                   console.log('save chatPraiseModel success!');
                   callback({isOK:true});
               });
           }
        });
    }
};
//导出服务类
module.exports =chatPraiseService;

