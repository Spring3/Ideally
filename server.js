require('dotenv').load();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const uuid = require('uuid');
const mongo = require('./modules/mongo');
const helmet = require('helmet');
const passport = require('./modules/passport');
const security = require('./modules/security');
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'views')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({
    dbPromise: mongo.connect()
  }),
  cookie: {
    maxAge: ONE_WEEK
  }
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res, next) => { res.render('index', { user: req.user }); });
app.get('/about', (req, res, next) => { res.render('about'); });

app.get('/auth', (req, res, next) => {
  if (req.user) {
    res.redirect('/');
  } else if (req.query.type === 'gh') {
    res.redirect('/auth/gh');
  } else {
    res.render('auth', { action: req.query.action });
  }
});

app.get('/auth/gh', passport.authenticate('github', { scope: [ 'user:email', 'repo:status' ] }));
app.get('/auth/github', passport.authenticate('github', { successRedirect: '/', failureRedirect: '/auth' }));
app.post('/auth/in', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/auth' }));
app.post('/auth/up', passport.authenticate('local-signup', { successRedirect: '/profile', failureRedirect: '/auth?action=signup'}));

app.get('/project', authCheck, (req, res, next) => {
  res.render('project', { user: req.user, action: req.query.action });
});
app.get('/profile', authCheck, (req, res, next) => {
  res.render('profile', { user: req.user, action: req.query.action });
});

app.post('/project/new', (req, res, next) => {
});

app.post('/project/:id/apply', (req, res, next) => {
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server is up');
});

function authCheck(req, res, next) {
  if (!req.user){
    return res.redirect('/auth');
  }
  return next();
}
