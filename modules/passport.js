const mongo = require('./mongo');
const passport = require('passport');
const security = require('./security');
const Validator = require('validatorjs');
const GitHubStrategy = require('passport-github2').Strategy;
const LocalStrategy = require('passport-local').Strategy;

// GitHub
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
    avatar: profile._json.avatar_url,
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

// Local sign in
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
}, async (email, password, done) => {
  const searchResult = await mongo.db.collection('Users').findOne({ email: email });
  let user = searchResult.value;
  if (!user || !security.compare(password, user.password)) {
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
    let user = await mongo.db.collection('Users').findOne({ email: req.body.email });
    if (!user) {
      const passwordHash = await security.hash(req.body.password);
      const insertionResult = await mongo.db.collection('Users').insert({
        email: req.body.email,
        password: passwordHash
      });
      user = insertionResult.ops[0];
      return done(null, user);
    } else {
      return done(null, false, new Error('User with such email already exists'));
    }
  }
  return done(null, false, validation.errors.all())
}));

passport.serializeUser((user, done) => { done(null, { id: user._id }); });
passport.deserializeUser(async (data, done) => {
  const user = await mongo.db.collection('Users')
    .findOne({ _id: mongo.ObjectId(data.id) });
  done(null, user);
});

module.exports = passport;