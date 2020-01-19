//
// const User = require('./index.js');
//
// module.exports = async (req,res) => {
//     const {login, password} = req.body;
//
//     const user = await User.findOne({login});
//     console.log(user);
//     if (user) {
//         if (user.password === password)	{
//             console.log(req.session);
//             req.session.auth = 'ok';
//             req.session.login = login;
//             res.json('ok');
//         } else {
//             res.json('Неверный	пароль!');
//         }
//     } else {
//         res.json('Пользователь не существует!');
//     }
//
// };
