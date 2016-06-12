var chatSyllabus = require('../models/chatSyllabus');//引入chatSyllabus数据模型
var logger=require('../resources/logConf').getLogger('syllabusService');//引入log4js
var common = require('../util/common');//引入common类
var userService = require('../service/userService');//引入userService
var async = require('async');//引入async
var chatPraiseService = require('../service/chatPraiseService');//引入chatPraiseService
var constant = require('../constant/constant');//引入constant
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
        var searchObj={
            groupType : groupType,
            isDeleted : 0,
            publishStart : {$lte : loc_dateNow},
            publishEnd : {$gt : loc_dateNow}
        };
        var groupIdArr=null;
        if(common.isValid(groupId)){
            groupIdArr=groupId.split(",");
            searchObj.groupId={$in:groupIdArr};
        }
        chatSyllabus.find(searchObj,"groupType groupId courseType studioLink courses updateDate", function(err, row){
            if(err){
                logger.error("查询聊天室课程安排失败!", err);
                callback(null);
                return;
            }
            callback(row?((groupIdArr && groupIdArr.length>1)?row:row[0]):null);
        });
    },
    /**
     * 移除课程内容
     * @param coursesObj
     */
    removeContext:function(coursesObj){
        var tmArr=coursesObj.timeBuckets,courseTmp=null;
        for(var i in tmArr){
            courseTmp=tmArr[i].course;
            for(var k in courseTmp){
                delete courseTmp[k].context;
            }
        }
        return coursesObj;
    },
    /**
     * 通过参数提取课程信息,包括课程分析师的个人信息
     * @param params
     */
    getCourseInfo:function(params,outCallback){
        var result={remark:'',authors:[]};
        async.parallel({
                courseRemark: function(callback){
                    syllabusService.getSyllabus(params.groupType,params.groupId,function(rows){
                        var remark='';
                        if(rows){
                            var courses=rows.courses;
                            if(courses){
                                courses=JSON.parse(courses);
                                var days=courses.days,tmArr=courses.timeBuckets,tmObj=null;
                                for(var i in days){
                                    if(days[i].day==params.day){
                                        for(var k in tmArr){
                                            tmObj=tmArr[k];
                                            if(tmObj.startTime==params.startTime && tmObj.endTime==params.endTime){
                                                remark=tmObj.course[i].context;
                                                break;
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                        callback(null,remark);
                    });
                },
                courseAuthors: function(callback){
                    userService.getUserList(params.authorId,function(rows){
                        callback(null,rows);
                    });
                },
                getPraise:function(callback){
                    chatPraiseService.getPraiseNum(params.authorId,constant.chatPraiseType.user,params.groupType,function(rows){
                        callback(null,rows);
                    });
                }
            },
            function(err, datas) {
                if(!err){
                    result.remark=datas.courseRemark;
                    var crs=datas.courseAuthors;
                    var pre=datas.getPraise;
                    var crow=null,praiseNum=0;
                    if(crs){
                        for(var i in crs){
                            crow=crs[i];
                            if(pre){
                                for(var k in pre){
                                    if(pre[k].praiseId==crow.userNo){
                                        praiseNum=pre[k].praiseNum;
                                        break;
                                    }
                                }
                            }
                            result.authors.push({userId:crow.userNo,name:crow.userName,position:crow.position,avatar:crow.avatar,praiseNum:praiseNum});
                        }
                    }
                }
                outCallback(result);
            });
    }
};
//导出服务类
module.exports =syllabusService;

