var chatSyllabus = require('../models/chatSyllabus');//引入chatSyllabus数据模型
var logger=require('../resources/logConf').getLogger('syllabusService');//引入log4js

/**
 * 课程安排服务类
 * 备注：查询各聊天室的课程安排
 * author Dick.guo
 */
var syllabusService = {

    /**
     * 查询聊天室课程安排
     * @param groupType
     * @param groupId
     * @param callback
     */
    getSyllabus : function(groupType, groupId, callback){
        groupId = groupId || "";
        var loc_dateNow = new Date();
        chatSyllabus.findOne({
            groupType : groupType,
            groupId : groupId,
            isDeleted : 0,
            publishStart : {$lte : loc_dateNow},
            publishEnd : {$gt : loc_dateNow}
        }, function(err, row){
            if(err){
                logger.error("查询聊天室课程安排失败!", err);
                callback(null);
                return;
            }
            callback(!row ? null : row.toObject());
        });
    }
};
//导出服务类
module.exports =syllabusService;

