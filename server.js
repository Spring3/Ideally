require('dotenv').load();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const uuid = require('uuid');
const mongo = require('./modules/mongo');
const helmet = require('helmet');
const GitHubStrategy = require('passport-github2').Strategy;
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

passport.use(new GitHubStrategy({
  clientID: process.env.GH_CLIENT_ID,
  clientSecret: process.env.GH_CLIENT_SECRET,
  callbackURL: 'https://ideallyapp.herokuapp.com/auth/github'
}, async (accessToken, refreshToken, profile, done) => {
  const payload = {
    name: profile.displayName,
    url: profile.profileUrl,
    email: profile.emails[0].value,
    country: profile._json.location,
    bio: profile._json.bio,
    origin: 'github',
    token: accessToken
  };
  const queryResult = await mongo.db.collection('Users').findOneAndUpdate(
    { email: payload.email },
    { $set: { token: payload.token } },
    { returnOriginal: false }
  );
  let user = queryResult.value;
  if (!user) {
    const insertion = await mongo.db.collection('Users').insert(payload);
    if (!insertion.result.ok) {
      return done (insertion.writeError, null);
    }
    user = insertion.ops[0];
  }
  return done(null, user);
}));

passport.serializeUser((user, done) => {
  done(null, { id: user._id });
});

passport.deserializeUser(async (data, done) => {
  const user = await mongo.db.collection('Users').findOne({ _id: mongo.ObjectId(data.id) });
  done(null, user);
});

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

app.get('/', (req, res, next) => {
  res.render('index', { session: req.session });
});

app.get('/about', (req, res, next) => {
  res.render('about', { session: req.session });
});

app.get('/auth', (req, res, next) => {
  if (req.query.type === 'gh') {
    res.redirect('/auth/gh');
  } else {
    res.render('auth');
  }
});

app.get('/auth/gh', passport.authenticate('github', { scope: [ 'user:email', 'repo:status' ] }), (req, res) => {});
app.get('/auth/github', passport.authenticate('github', { successRedirect: '/', failureRedirect: '/auth' }), (req, res) => {
  res.render('index', { session: req.session });
});

app.get('/project', (req, res, next) => {
  res.render('project', { session: req.session });
});

app.get('/profile', ensureAuthenticated, (req, res, next) => {
  res.render('profile', { session: req.session });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server is up');
});

function ensureAuthenticated(req, res, next) {
  if (!req.user){
    return res.redirect('/auth');
  }
  return next();
}
