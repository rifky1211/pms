var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session')
var flash = require('connect-flash');

const productionDB = {
  user: 'xxelajunoseaql',
  host: 'ec2-35-169-188-58.compute-1.amazonaws.com',
  database: 'dee3gdokbj6gu6',
  password: 'c12d3de69655f5c95684feb3c319bd2a31b26421cb6aa6eb8c00e80801490583',
  port: 5432,
}
const developmentDB = {
  user: 'postgres',
  host: 'localhost',
  database: 'batch25',
  password: '12345',
  port: 5432,
}

const isDevelompent = false
const { Pool } = require('pg')
let pool = null
if(isDevelompent){
  pool = new Pool(developmentDB)
}else{
  pool = new Pool(productionDB)
}

var indexRouter = require('./routes/index')(pool);
var usersRouter = require('./routes/users');
var projectsRouter = require('./routes/projects')(pool);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'pms'
}))
app.use(flash())

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/projects', projectsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
