/**
 * Created by Administrator on 2015/3/4.
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,ObjectId = Schema.ObjectId
    ,chatPraiseSchema = new Schema({//点赞Schema
        _id:ObjectId,
        praiseId : String,
        praiseType : String,
        fromPlatform:String,
        praiseNum:{type:Number, default:0},
        remark:String
   });
module.exports = mongoose.model('chatPraise',chatPraiseSchema,"chatPraise");