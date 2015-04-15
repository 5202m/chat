/**
 * 在线用户对象(用于数据的传输及记录缓存)
 * @type {{userId: string, userNickname: string, userAvatar: string, userType: number, groupId: string, onlineDate: null}}
 * author：alan.wu
 * date:2015/4/3
 */
var chatOnlineUser={
  userId:'',//用户id
  nickname:'',//用户昵称
  avatar:'',//用户头像
  userType:0,//区分系统用户还是会员，0表示会员，1表示管理员，2、设计师
  groupId:'',//组别Id
  onlineDate:null,//上线时间
  onlineStatus: {type:Number, default:1} //在线状态：0 、下线 ；1、在线
}
module.exports =chatOnlineUser;