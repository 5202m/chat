var chatMessage = require('../models/chatMessage');//引入chatMessage数据模型
var common = require('../util/common');//引入common类
var constant = require('../constant/constant');//引入constant
var visitorService=require('../service/visitorService');
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
    loadMsg:function(userInfo,lastPublishTime,allowWhisper,callback){
        var groupType = userInfo.groupType,groupId = userInfo.groupId;
        var selectSQL='userId nickname avatar clientGroup position toUser userType groupId content.msgType content.value content.needMax publishTime status';
        var searchObj={groupType:groupType,groupId:groupId,status:1,valid:1};
        var selectRows=this.maxRows;
        if(allowWhisper){
            selectRows=50;
            searchObj["toUser.talkStyle"]=1;
            if(userInfo.userType==constant.roleUserType.member){
                visitorService.getUserArrByUserId(userInfo.userType,userInfo.clientStoreId,groupType,groupId,userInfo.userId,function(userArr){
                    searchObj.$or = [{"userId" : userInfo.toUser.userId,"toUser.userId" :{$in:userArr}},
                        {"userId" :{$in:userArr}, "toUser.userId" : userInfo.toUser.userId}];
                    messageService.findMessageList(userInfo,searchObj,selectSQL,selectRows,function(result){
                        callback(result);
                    });
                });
            }else if(userInfo.userType==constant.roleUserType.visitor){
                searchObj.$or = [{"userId" : userInfo.userId,"toUser.userId" :userInfo.toUser.userId},
                    {"userId" :userInfo.toUser.userId, "toUser.userId" : userInfo.userId}];
                messageService.findMessageList(userInfo,searchObj,selectSQL,selectRows,function(result){
                    callback(result);
                });
            }else{
                visitorService.getUserArrByUserId(userInfo.toUser.userType,null,groupType,groupId,userInfo.toUser.userId,function(userArr){
                    searchObj.$or = [{"userId" : userInfo.userId,"toUser.talkStyle": 1,"toUser.userId" :{$in:userArr}},
                        {"userId" :{$in:userArr},"toUser.talkStyle" : 1, "toUser.userId" : userInfo.userId}];
                    messageService.findMessageList(userInfo,searchObj,selectSQL,selectRows,function(result){
                        callback(result);
                    });
                });
            }
        }else{
            if(common.isValid(lastPublishTime)){
                searchObj.publishTime = { "$gt":lastPublishTime};
            }
            //非直播间(微解盘)信息提示
            if(constant.fromPlatform.studio!=groupType) {
                if(constant.roleUserType.cs==userInfo.userType){
                    //客服
                    searchObj.userType={$in:[0,3]};
                    searchObj["toUser.talkStyle"] = 1;
                }else{
                    searchObj.userType=2;
                    searchObj["toUser.talkStyle"] = 0;
                }
            }else{
                searchObj["toUser.talkStyle"] = 0;
            }
            this.findMessageList(userInfo,searchObj,selectSQL,selectRows,function(result){
                callback(result);
            });
        }
    },
    /**
     * 查询信息通用方法
     * @param searchObj
     * @param selectSQL
     * @param selectRows
     */
    findMessageList:function(userInfo,searchObj,selectSQL,selectRows,callback){
        chatMessage.db().find(searchObj).select(selectSQL).limit(selectRows).sort({'publishTime':'desc'}).exec(function (err,approvalList) {
            messageService.getUnApprovalList(approvalList,userInfo,selectSQL,function(resultList){
                var diffLength=selectRows-resultList.length;
                if(diffLength>0){//往上一年查询
                    var year=new Date().getFullYear();
                    chatMessage.db(year<=2015?2015:year-1).find(searchObj).select(selectSQL).limit(diffLength).sort({'publishTime':'desc'}).exec(function (err,oldList) {
                        callback(resultList.concat(oldList));
                    });
                }else{
                    callback(resultList);
                }
            });
        });
    },
    /**
     * 是否存在符合条件的记录
     * @param searchObj
     */
    existRecord:function(searchObj,callback){
        chatMessage.db().find(searchObj).count(function (err,rows) {
            callback(rows&&rows>0);
        });
    },
    /**
     * 从数据库中加载已有的聊天记录
     * @param groupType
     * @param groupId
     * @param fromUserTypeArr
     * @param toUserId
     * @param lastOfflineDate
     * @param callback
     */
    getWhUseMsgCount:function(groupType,groupId,userType,whUserTypeArr,toUserId,lastOfflineDate,callback){
        var searchObj={groupType:groupType,groupId:groupId,status:1,valid:1,"toUser.talkStyle": 1,"toUser.userId":toUserId,"content.msgStatus":0,createDate:{"$gte":lastOfflineDate}};
        if(constant.roleUserType.member<parseInt(userType)){//后台用户发起，则验证自己是否匹配私聊授权角色
            searchObj["toUser.userType"]={"$in":whUserTypeArr};
        }else{//前台客户发起，则验证对方是否匹配私聊授权角色
            searchObj.userType={"$in":whUserTypeArr};
        }
        chatMessage.db().find(searchObj).select('avatar userId nickname userType clientGroup').exec(function (err,resultList) {
            if(!err && resultList){
                var userInfoList={},row=null;
                for(var i in resultList){
                    row=resultList[i];
                    if(userInfoList.hasOwnProperty(row.userId)){
                        userInfoList[row.userId].count+=1;
                    }else{
                        userInfoList[row.userId]={clientGroup:row.clientGroup,userType:row.userType,nickname:row.nickname,avatar:row.avatar,count:0};
                    }
                }
                callback(userInfoList);
            }else{
                callback(null);
            }
        });
    },
    /**
     * 提取待审核的记录
     * @param approvalList
     * @param userInfo
     * @param selectSQL
     * @param callback
     */
    getUnApprovalList:function(approvalList,userInfo,selectSQL,callback){
        if(userInfo.userType != 0 && userInfo.userType!=3){//如果是审核角色登录，则加载审核通过的以及指定该角色执行的待审核信息
            var beginDate=new Date(),endDate=new Date();
            beginDate.setHours(0,0,0);
            endDate.setHours(23,59,59);
            chatMessage.db().find({groupId: userInfo.groupId,approvalUserArr:userInfo.userId,status:0,valid:1,createDate:{ "$gte":beginDate,"$lte":endDate}}).select(selectSQL).sort({'publishTime':'desc'}).exec(function (unErr,unApprovalList) {
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
    },
    /**
     * 加载大图
     * @param publishTime
     * @param callback
     */
    loadBigImg:function(userId,publishTime,callback){
        chatMessage.db().findOne({userId:userId,publishTime:publishTime},{'content.maxValue':1},function (err,data) {
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
        var fromUser=data.fromUser;
        chatMessage.db().update({'groupId':fromUser.groupId,'publishTime':{ '$in':data.publishTimeArr}},{$set:{ status: data.status,approvalUserNo:fromUser.userId}},{ multi: true },function(err,row){
                if(!err && row){
                    console.log("updateMsgStatus->update chatMessage success!");
                    chatMessage.db().find({'groupId':data.fromUser.groupId,'publishTime':{ '$in':data.publishTimeArr}},function(err,rowList){
                        if(!err && rowList && rowList.length>0){
                            if(data.status==1){//审批通过后，同步信息到客户端
                                callback({status:data.status,data:rowList});
                            }else{
                                callback({status:data.status,data:rowList[0].approvalUserArr});
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
    saveMsg:function(data,userNoArr){
        var userInfo=data.fromUser;
        var content=data.content;
        var chatMessageModel = new chatMessage.db()({
            _id:null,
            userId:userInfo.userId,
            nickname:userInfo.nickname||'',
            avatar:userInfo.avatar||'',
            userType:userInfo.userType||0,
            position:userInfo.position,
            approvalUserArr:userNoArr,
            groupId:userInfo.groupId,
            groupType:userInfo.groupType,
            clientGroup:userInfo.clientGroup,
            mobilePhone:userInfo.mobilePhone,
            accountNo:userInfo.accountNo,
            toUser:userInfo.toUser,
            content:{
                msgStatus:(content.msgStatus==null || content.msgStatus==undefined)?1:content.msgStatus,//信息状态，默认为在线(1)，离线为0
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
        chatMessageModel.save(function(err){
            console.log('save chatMessage success!');
            
        });
    }
};
//导出服务类
module.exports =messageService;

