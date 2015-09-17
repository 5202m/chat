/**
 * 摘要：错误码公共类
 * author：Gavin.guo
 * date:2015/4/8
 */
var errorMessage = {
    "code_10" : {'errcode' : '10','errmsg' : '操作失败，请联系客户!'},
    "code_11" : {'errcode' : '11','errmsg' : '没有登录系统，请登录后再操作!'},
    "code_1000" : {'errcode' : '1000','errmsg' : '没有指定参数!'},
    "code_1001" : {'errcode' : '1001','errmsg' : '请输入交易账号、手机号码、验证码!'},
    "code_1002" : {'errcode' : '1002','errmsg' : '验证码有误，请重新输入！'},
    "code_1003" : {'errcode' : '1003','errmsg' : '输入的手机号码有误！'},
    "code_1004" : {'errcode' : '1004','errmsg' : '该账号已被使用！'},
    "code_1005" : {'errcode' : '1005','errmsg' : '请输入手机号码、用户密码、验证码!'},
    "code_1006" : {'errcode' : '1006','errmsg' : '请输入手机号码、验证码!'},
    "code_1007" : {'errcode' : '1007','errmsg' : '手机验证码有误！'},
    "code_1008" : {'errcode' : '1008','errmsg' : '用户不存在，请检查输入是否正确！'},
    "code_1009" : {'errcode' : '1009','errmsg' : '原密码输入有误！'},
    "code_1010" : {'errcode' : '1010','errmsg' : '你已经是与该操作相同等级的用户，无需升级！'},
    "code_1011" : {'errcode' : '1011','errmsg' : '还未开通金道相关账户，请联系客服！'},
    "code_1012" : {'errcode' : '1012','errmsg' : '该昵称已被使用！'}
};
//导出类
module.exports = errorMessage;
