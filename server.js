require('dotenv').load();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');
let upDate;

app.set('_bootstrap', __dirname + '/node_modules/jade-bootstrap/_bootstrap.jade');
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'views')));

app.get('/', (req, res, next) => {
  res.render('index');
});

app.get('/about', (req, res, next) => {
  res.render('about');
});

app.get('/auth', (req, res, next) => {
  res.render('auth');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server is up');
});
