/**
 * 字典管理实体类
 * Created by Jade.zhu on 2016/6/12.
 */
var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    ,dictSchema=new Schema(
        {
            "_id" : {type:String},
            "code" : {type:String,index:true},//字典编号
            "valid" : {type:Number, default:1}, //是否删除：0 、删除 ；1、正常
            "nameCN" : {type:String},//简体名称
            "nameTW" : {type:String},//繁体名称
            "nameEN" : {type:String},//英文名称
            "sort" : {type:Number, default:0},//排序序列
            "children" : [{
                    "_id" : {type:String},
                    "code" : {type:String},//字典编号
                    "valid" : {type:Number, default:1}, //是否删除：0 、删除 ；1、正常
                    "status" : {type:Number, default:1}, //状态：0 、禁用 ；1、启动
                    "nameCN" : {type:String},//简体名称
                    "nameTW" : {type:String},//繁体名称
                    "nameEN" : {type:String},//英文名称
                    "sort" : {type:Number, default:0}
                }],
            "status" : {type:Number, default:1} //状态：0 、禁用 ；1、启动
        });
module.exports =mongoose.model('boDict',dictSchema,'boDict');