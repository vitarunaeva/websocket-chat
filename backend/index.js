const [{ Server: h1 }, x] = [require('http'), require('express')];
const socketIO = require('socket.io');
const Router = x.Router();
const cors = require('cors');
const parseCookie = require('cookie').parse;
const session = require('express-session');
const sessionStore = require('./sessionStore');

const mg = require('mongoose');

mg.Promise = global.Promise;
const conn = mg.createConnection('mongodb+srv://user:user@cluster0-lwvqu.mongodb.net/test?retryWrites=true&w=majority', {
    useNewUrlParser: true,
});

const MessageSchema = new mg.Schema({
    room: {
        type: 'String'
    },
    name: {
        type: 'String'
    },
    message: {
        type: 'String'
    },
}, {"collection": "messages"});

// модель пользователя
const UserSchema = new mg.Schema({
        "login": {
            "type": "string"
        },
        "password": {
            "type": "string"
        }
    }, {"collection": "users"}
);

const User = conn.model('User', UserSchema);
const Message = conn.model('Message', MessageSchema);

//----

let s;
const PORT = 1234;
const { log } = console;
const hu = { 'Content-Type': 'text/html; charset=utf-8' };
const app = x();


app
    .use(x.static('./client/build'))
    .use(session({
        secret: 'mysecret',
        resave: true,
        saveUninitialized: true,
        store: sessionStore
    }))
    .use(Router)

    .use(({ res: r }) => r.status(404).end('Пока нет!'))
    .use((e, r, rs, n) => rs.status(500).end(`Ошибка: ${e}`))
    .set('view engine', 'pug')
    .set('x-powered-by', false);


Router
    .use(cors())
    .use(x.json())
    .use(x.urlencoded({ extended: true }));

Router
    .route('/login')
    .get((req, res) =>  res.render('login'))
    .post(async (req,res) => {
        const {login, password} = req.body;

        const user = await User.findOne({login});


        if (user) {
            if (user.password === password)	{

                res.cookie('auth', 'ok');
                res.cookie('login', login);

                await res.json('ok');
            } else {
                await res.json('Неверный пароль!');
            }
        } else {
            await res.json('Пользователь не существует!');
        }
    });


Router
    .route('/registration')
    .get((req, res) =>  res.render('register'))
    .post(async (req,res) => {
        const {login, password} = req.body;

        const x  = await User.findOne({login});

        if (x) return res.json('Пользователь с таким логином уже существует');

        const newUser = new User({login, password});

        try {
            res.status(201).json(await newUser.save());//сохранение пользователя в БД

        } catch (e) {
            await res.status(500).json('Internal Server Error');
        }
    });

Router
    .route('/logout')
    .get((req, res) => {
        res.clearCookie('auth');
        res.clearCookie('login');
        res.redirect('/');
    });


Router.route('/').get((req, res) => res.sendFile('index.html'));



module.exports = s = h1(app)
    .listen(process.env.PORT || PORT, () => log(process.pid));

const ws = socketIO(s);
const cb = (d) => log(d);


ws.on('connection', (wsock) => {

    if (wsock.handshake.headers.cookie) {
        const login = parseCookie(wsock.handshake.headers.cookie).login;

        if (login) {
            wsock.emit('login', login);
        } else {
            wsock.emit('login', '');
        }

    } else {
        wsock.emit('login', '');
    }



    log('Новый пользователь!');
    wsock.emit('serv', 'Добро пожаловать!', cb);




    wsock.on('disconnect', () => log('Пользователь отвалился!'));
});

ws.on('connect', async (wsock) => {
    wsock.on('getMessages', async () => {
        const recentMessages = await Message.find();
        wsock.emit('messages', recentMessages);
    });

    wsock.on('typing', async (name) => {
        wsock.broadcast.emit('typing', name);
    });

    wsock.on('messages', async ({name, message}) => {
        const nm = new Message({ name, message });
        await nm.save();
        wsock.emit('messages', [nm]);
        wsock.broadcast.emit('messages', [nm]);
    });
});
