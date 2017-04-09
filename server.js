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
const github = require('./modules/github');
const _ = require('underscore');
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
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

app.get('/', async (req, res, next) => { res.render('index', { user: req.user, projects: await mongo.db.getProjects() }); });

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
app.get('/auth/github', passport.authenticate('github', { successRedirect: '/profile', failureRedirect: '/auth' }));
app.post('/auth/in', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/auth' }));
app.post('/auth/up', passport.authenticate('local-signup', { successRedirect: '/profile', failureRedirect: '/auth?action=signup'}));

app.get('/profile/project', authCheck, async (req, res, next) => {
  res.render('projectAdd');
});

app.get('/profile/:id', async (req, res, next) => {
  const user = await mongo.db.getUser({ _id: mongo.ObjectId(req.params.id) });
  const userProjects = await mongo.db.getProjects(user);
  res.render('publicProfile', { user: user, repos: userProjects || [] });
});

app.get('/profile', authCheck, async (req, res, next) => {
  const userProjects = await mongo.db.getProjects(req.user);
  res.render('profile', { user: req.user, action: req.query.action, repos: userProjects || [] });
});

app.post('/profile', authCheck, async (req, res, next) => { 
  req.body.stack = req.body.stack ? req.body.stack.split(',') : [];
  if (!req.body.hasOwnProperty('status')) {
    req.body.status = "off";
  }
  const result = await mongo.db.updateUser({ _id: mongo.ObjectId(req.user._id)}, req.body );
  res.redirect('/profile');
});

app.get('/project', async (req, res, next) => {
  const project = await mongo.db.getProject({ _id: mongo.ObjectId(req.query.id) });
  const projectOwner = await mongo.db.getUser({ _id: project.owner });
  project.owner = _.pick(projectOwner, 'name', '_id');
  if (req.user) {
    if (!project.owner._id.equals(req.user._id)) {
      req.query.action = "view";
    }
  } else {
    req.query.action = "view";
  }
  res.render('project', { user: req.user, action: req.query.action, project: project });
});

app.post('/project', authCheck, async (req, res, next) => {
  const validProject = _.pick(req.body, 'name', 'html_url', 'description', 'positions');
  if (validProject.positions) {
    validProject.positions = Array.isArray(validProject.positions) ? validProject.positions : validProject.positions.split(',');
  } else {
    validProject.positions = [];
  }
  const result = await mongo.db.insertProject(req.user, validProject);
  res.redirect('/profile');
});

app.post('/project/:id', authCheck, async (req, res, next) => {
  const validObject = _.pick(req.body, 'name', 'html_url', 'description', 'positions');
  console.log(validObject);
  validObject.positions = validObject.positions ? validObject.positions.split(',') : [];
  validObject._id = req.params.id;
  const result = await mongo.db.updateProject(validObject);
  res.redirect('/profile');
});

app.get('/project/rm', authCheck, async (req, res, next) => {
  const project = await mongo.db.getProject({ _id: mongo.ObjectId(req.query.id) });
  const projectOwner = await mongo.db.getUser({ _id: mongo.ObjectId(project.owner) });
  if (req.user.email === projectOwner.email) {
    mongo.db.deleteProject(project._id);
    res.redirect('/profile');
  } else {
    res.sendStatus(403);
  }
});

app.get('/project/import', authCheck, async (req, res, next) => {
  if (req.user && req.user.origin === 'github') {
    const repos = await github.getUserRepos(req.user);
    repos.map(repo => _.pick(repo, 'name', 'html_url', 'description', 'language'))
    .forEach(async (repo) => {
      let result = await mongo.db.getProject({ owner: mongo.ObjectId(req.user._id), name: repo.name });
      if (!result) {
        repo.owner = req.user._id;
        await mongo.db.insertProject(req.user, repo);
      }
    });
  }
  res.redirect('/profile');
});

app.get('/logout', (req, res, next) => {
  req.logout();
  req.session.destroy();
  res.redirect('/');
})

app.listen(process.env.PORT || 3000, () => {
  console.log('Server is up');
});

function authCheck(req, res, next) {
  if (!req.user){
    return res.redirect('/auth');
  }
  return next();
}
