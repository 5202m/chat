/** 用户服务类
 * Created by Alan.wu on 2015/3/4.
 */
var member = require('../models/member');//引入member数据模型

/**
 * 定义用户服务类
 * @type {{getMemberList: Function, updateMemberInfo: Function}}
 */
var userService = {
    /**
     * 提取会员信息
     */
    getMemberList:function(id,callback){
        member.findById(id,function (err,members) {
            if(err!=null){
                callback(null);
            }
            callback(members);
        });
    },
    /**
     * 更新会员信息
     */
    saveChatUserGroupInfo:function(userInfo,callback){
        var jsonStr={_id:userInfo.groupId,onlineStatus:userInfo.onlineStatus,onlineDate:userInfo.onlineDate,avatar:userInfo.avatar,nickname:userInfo.nickname};
       member.findOneAndUpdate({'_id':userInfo.userId,'loginPlatform.chatUserGroup._id':{$ne:userInfo.groupId}},{'$push':{'loginPlatform.chatUserGroup':jsonStr}},function(err,row){
            if(!err && !row){
                member.findOneAndUpdate({'_id':userInfo.userId,'loginPlatform.chatUserGroup._id':userInfo.groupId},
                    {'$set':{'loginPlatform.chatUserGroup.$.onlineDate':userInfo.onlineDate,'loginPlatform.chatUserGroup.$.onlineStatus':userInfo.onlineStatus}},function(err){
                        callback(err);
                    });
            }else{
                callback(err);
            }
        });
    },
    /**
     *更新会员状态
     */
    updateChatUserGroupStatus:function(userInfo,chatStatus,callback){
        member.findOneAndUpdate({'_id':userInfo.userId,'loginPlatform.chatUserGroup._id':userInfo.groupId},
            {'$set':{'loginPlatform.chatUserGroup.$.onlineStatus':chatStatus}},function(err){
            callback(err);
        });
    }
};

//导出服务类
module.exports =userService;

