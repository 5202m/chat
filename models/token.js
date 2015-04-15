/**token实体类
 * Created by Administrator on 2015/3/4.
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId
    ,tokenSchema = new Schema({//tokenSchema
            _id:ObjectId,
            value:String, //token值
            beginTime:{type:Number, default:0},//开始时间
            endTime:{type:Number, default:0},//结束时间
            createDate: Date //创建时间
     });
module.exports = mongoose.model('token',tokenSchema,"token");