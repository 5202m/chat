var chatMessage = require('../models/chatMessage');//引入chatMessage数据模型
/**
 * 聊天室服务类
 * 备注：处理聊天室接受发送的所有信息及其管理
 * author Alan.wu
 */
var messageService ={
    maxRows:100,
    /**
     * 从数据库中加载已有的聊天记录
     */
    loadMsg:function(groupId,roleNo,callback){
        var selectSQL='userId nickname avatar userType groupId content.msgType content.value content.needMax publishTime status';
        chatMessage.find({groupId:groupId,status:1,valid:1,userType:2}).select(selectSQL).limit(this.maxRows).sort({'publishTime':'desc'}).exec(function (err,approvalList) {
            if(roleNo){//如果是审核角色登录，则加载审核通过的以及指定该角色执行的待审核信息
                var beginDate=new Date(),endDate=new Date();
                beginDate.setHours(0,0,0);
                endDate.setHours(23,59,59);
                chatMessage.find({groupId:groupId,approvalRoleArr:roleNo,status:0,valid:1,createDate:{ "$gte":beginDate,"$lte":endDate}}).select(selectSQL).sort({'publishTime':'desc'}).exec(function (unErr,unApprovalList) {
                    if(!approvalList){
                        approvalList=[];
                    }
                    if(!unErr && unApprovalList){
                        callback(unApprovalList.concat(approvalList));
                    }else{
                        callback(approvalList);
                    }
                });
            }else{
                callback(approvalList);
            }
        });
    },
    /**
     * 加载大图
     * @param publishTime
     * @param callback
     */
    loadBigImg:function(userId,publishTime,callback){//{'content.maxValue':1}
        chatMessage.findOne({userId:userId,publishTime:publishTime},{'content.maxValue':1},function (err,data) {
            if(!err && data) {
                callback(data.content.maxValue);
            }else{
                callback('');
            }
        });
    },
    /**
     * 更新信息状态
     * @param data
     * @param callback
     */
    updateMsgStatus:function(data,callback){
        //存在则更新上线状态及上线时间
        var fromUser=data.fromUser;
        chatMessage.update({'groupId':fromUser.groupId,'publishTime':{ '$in':data.publishTimeArr}},{$set:{ status: data.status,approvalUserNo:fromUser.userId}},{ multi: true },function(err,row){
                if(!err && row){
                    console.log("updateMsgStatus->update chatMessage success!");
                    chatMessage.find({'groupId':data.fromUser.groupId,'publishTime':{ '$in':data.publishTimeArr}},function(err,rowList){
                        if(!err && rowList && rowList.length>0){
                            if(data.status==1){//审批通过后，同步信息到客户端
                                callback({status:data.status,data:rowList});
                            }else{
                                callback({status:data.status,data:rowList[0].approvalRoleArr});
                            }
                        }else{
                            callback(false);
                        }
                    });
                }else{
                    callback(false);
                }
        });
    },
    /**
     * 保存内容到数据库中
     */
    saveMsg:function(data,roleNoArr){
        var userInfo=data.fromUser;
        var content=data.content;
        var chatMessageModel = new chatMessage({
            _id:null,
            userId:userInfo.userId,
            nickname:userInfo.nickname||'',
            avatar:userInfo.avatar||'',
            userType:userInfo.userType||0,
            approvalRoleArr:roleNoArr,
            groupId:userInfo.groupId,
            mobilePhone:userInfo.mobilePhone,
            accountNo:userInfo.accountNo,
            content:{
                msgType:content.msgType,
                value:content.value,
                maxValue:content.maxValue,
                needMax:content.needMax
            },
            fromPlatform:userInfo.fromPlatform,//平台来源
            status:content.status, //内容状态：0、等待审批，1、通过 ；2、拒绝
            publishTime:userInfo.publishTime, //发布日期
            createUser:userInfo.userId,
            createIp:userInfo.createIp,//新增记录的Ip
            createDate:new Date(),//创建日期
            valid:1
        });
        chatMessageModel.save(function(){
            console.log('save chatMessage success!');
        });
    }
};
//导出服务类
module.exports =messageService;

