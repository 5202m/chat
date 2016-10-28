/**
 * 摘要：错误码公共类
 * author：Gavin.guo
 * date:2015/4/8
 */
var errorMessage = {
    "code_10" : {'errcode' : '10','errmsg' : '操作失败，请联系客服!'},
    "code_11" : {'errcode' : '11','errmsg' : '没有登录系统，请登录后再操作!'},
    "code_1000" : {'errcode' : '1000','errmsg' : '没有指定参数!'},
    "code_1001" : {'errcode' : '1001','errmsg' : '请输入交易账号、手机号码、验证码!'},
    "code_1002" : {'errcode' : '1002','errmsg' : '验证码有误，请重新输入！'},
    "code_1003" : {'errcode' : '1003','errmsg' : '输入的手机号码有误！'},
    "code_1004" : {'errcode' : '1004','errmsg' : '该账号已被使用！'},
    "code_1005" : {'errcode' : '1005','errmsg' : '请输入手机号码、用户密码、验证码!'},
    "code_1006" : {'errcode' : '1006','errmsg' : '请输入用户名、手机号、邮箱、验证码!'},
    "code_1007" : {'errcode' : '1007','errmsg' : '手机验证码有误！'},
    "code_1008" : {'errcode' : '1008','errmsg' : '请输入正确的用户信息！'},
    "code_1010" : {'errcode' : '1010','errmsg' : '你已经是与该操作相同等级的用户，无需升级！'},
    "code_1011" : {'errcode' : '1011','errmsg' : '还未开通金道相关账户，请联系客服！'},
    "code_1012" : {'errcode' : '1012','errmsg' : '该昵称已被使用！'},
    "code_1013" : {'errcode' : '1013','errmsg' : '请输入账号、密码!'},
    "code_1014" : {'errcode' : '1014','errmsg' : '交易账号输入有误！'},
    "code_1015" : {'errcode' : '1015','errmsg' : '账号或密码输入有误！'},
    "code_1016" : {'errcode' : '1016','errmsg' : '密码错误次数太多,请联系客服！'},
    "code_1017" : {'errcode' : '1017','errmsg' : '请输入用户名、手机号、邮箱、密码!'},
    "code_3000" : {'errcode' : "3000", 'errmsg' : "积分配置信息不存在！"},
    "code_3001" : {'errcode' : "3001", 'errmsg' : "积分已达上限!"},
    "code_3002" : {'errcode' : "3002", 'errmsg' : "今天已经签到了!"},
    "code_3003" : {'errcode' : "3003", 'errmsg' : "已经培训报名了!"},
    "code_3004" : {'errcode' : "3004", 'errmsg' : "有效积分不足!"},
    "code_3005" : {'errcode' : "3005", 'errmsg' : "您操作该培训班的权限受限，请联系客服!"}
};
//导出类
module.exports = errorMessage;
