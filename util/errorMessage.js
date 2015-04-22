/**
 * 摘要：错误码公共类
 * author：Gavin.guo
 * date:2015/4/8
 */
var errorMessage = {
    "code_1000" : {'errcode' : '1000','errmsg' : '没有指定参数!'},
    "code_1001" : {'errcode' : '1001','errmsg' : '请输入交易账号、手机号码、验证码!'},
    "code_1002" : {'errcode' : '1002','errmsg' : '验证码有误，请重新输入！'},
    "code_1003" : {'errcode' : '1003','errmsg' : '输入的手机号码有误！'}
};
//导出类
module.exports = errorMessage;
