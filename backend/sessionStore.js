
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

const sessionStore = new MongoStore({
    url: 'mongodb+srv://user:user@cluster0-lwvqu.mongodb.net/test?retryWrites=true&w=majority',
});

module.exports = sessionStore;
