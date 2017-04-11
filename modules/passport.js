const mongo = require('./mongo');
const passport = require('passport');
const security = require('./security');
const Validator = require('validatorjs');
const github = require('./github');
const _ = require('underscore');
const GitHubStrategy = require('passport-github2').Strategy;
const LocalStrategy = require('passport-local').Strategy;

// GitHub
passport.use(new GitHubStrategy({
  clientID: process.env.GH_CLIENT_ID,
  clientSecret: process.env.GH_CLIENT_SECRET,
  callbackURL: 'https://ideallyapp.herokuapp.com/auth/github'
}, async (accessToken, refreshToken, profile, done) => {
  const email = github.getEmail(accessToken);
  const payload = {
    name: profile.displayName,
    url: profile.profileUrl,
    country: profile._json.location,
    bio: profile._json.bio,
    avatar: profile._json.avatar_url,
    origin: 'github',
    token: accessToken,
    email
  };
  let user = await mongo.db.updateUser({ email: payload.email }, { token: payload.token, origin: 'github' });
  if (!user) {
    const result = await mongo.db.insertUser(payload);
    if (!result.ok) {
      return done (null, false, new Error(result.data));
    }
    user = result.data;
  }
  return done(null, user);
}));

// Local sign in
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
}, async (email, password, done) => {
  const user = await mongo.db.getUser({ email: email });
  if (!user || ! await security.compare(password, user.password)) {
    console.log('User with such credentials does not exist');
    return done(null, false, new Error('User with such credentials does not exist'));
  }
  return done(null, user);
}));

// Local sign up
passport.use('local-signup', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, email, password, done) => {
  const validation = new Validator(req.body, {
    email: 'required|email',
    password: 'required|string',
    passwordRepeat: 'required|string|same:password'
  });

  if (validation.passes()) {
    let user = await mongo.db.getUser({ email: req.body.email });
    if (!user) {
      const passwordHash = await security.hash(req.body.password);
      const insertionResult = await mongo.db.insertUser({
        email: req.body.email,
        password: passwordHash
      });
      if (insertionResult.ok) {
        return done(null, insertionResult.data);
      }
      return done(null, false, new Error(insertionResult.data));
    } else {
      return done(null, false, new Error('User with such email already exists'));
    }
  }
  return done(null, false, validation.errors.all())
}));

passport.serializeUser((user, done) => { done(null, { id: user._id }); });
passport.deserializeUser(async (data, done) => {
  const user = await mongo.db.getUser({ _id: mongo.ObjectId(data.id)});
  done(null, user);
});

module.exports = passport;
