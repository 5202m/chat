/**
 * 课程安排历史<BR>
 * ------------------------------------------<BR>
 * <BR>
 * Copyright© : 2016 by Dick<BR>
 * Author : Dick <BR>
 * Date : 2016年10月08日 <BR>
 * Description :<BR>
 * <p>
 *     课程安排历史
 * </p>
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var chatSyllabusHisSchema = new Schema({
    _id : ObjectId,
    groupType : {type:String,index:true}, //聊天室组别
    groupId : {type:String,index:true},   //聊天室编号
    date : {type:Date,index:true},
    startTime : String,
    endTime : String,
    courseType : String,
    lecturerId : String,
    lecturer : String,
    title : String,
    context : String,
    updateDate : Date
});
module.exports = mongoose.model('chatSyllabusHis',chatSyllabusHisSchema,"chatSyllabusHis");