/**
 * 课程安排<BR>
 * ------------------------------------------<BR>
 * <BR>
 * Copyright© : 2015 by Dick<BR>
 * Author : Dick <BR>
 * Date : 2015年12月29日 <BR>
 * Description :<BR>
 * <p>
 *     课程安排
 * </p>
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var smsInfoSchema = new Schema({
    _id : ObjectId,
    groupType : String, //聊天室组别
    groupId : String,   //聊天室编号
    courses : String,   //课程json字符串：{days : [{day: Integer, status : Integer}], timeBuckets : [startTime : String, endTime : String, course : [{lecturer : String, title : String, status : Integer}]]}；备注： status 0-休市, 1-有效, 2-无效
    updateDate : Date
});
module.exports = mongoose.model('chatSyllabus',smsInfoSchema,"chatSyllabus");