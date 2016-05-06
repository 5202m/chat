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
     * 备注：如果groupId是逗号分隔的多个id,则返回多条记录，否则返回一条记录
     * @param groupType
     * @param groupId
     * @param callback
     */
    getSyllabus : function(groupType, groupId, callback){
        groupId = groupId || "";
        var loc_dateNow = new Date();
        console.log("groupId：",groupId);
        var groupIdArr=groupId.split(",");
        chatSyllabus.find({
            groupType : groupType,
            groupId : {$in:groupIdArr},
            isDeleted : 0,
            publishStart : {$lte : loc_dateNow},
            publishEnd : {$gt : loc_dateNow}
        }, function(err, row){
            if(err){
                logger.error("查询聊天室课程安排失败!", err);
                callback(null);
                return;
            }
            callback(row ?(groupIdArr.length>1?row:row[0]): null);
        });
    }
};
//导出服务类
module.exports =syllabusService;

