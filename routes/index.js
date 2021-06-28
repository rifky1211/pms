var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const { response } = require('express');
const saltRounds = 10;


module.exports = function(db){
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/projects', (req, res) => {
  res.render('projects')
})

router.get('/login', (req, res) => {
  res.render('login')
})

router.post('/login', (req, res) => {
  db.query('select * from users where email = $1', [req.body.email], (err, data) => {
    if(err) return res.send(err)
    if(data.rows.length == 0) return res.send('email tidak di temukan')

    bcrypt.compare(req.body.password, data.rows[0].password, function(err, result) {
      if(result){
        res.redirect('/projects')
      }
  });

  })
})

router.get('/register', (req, res) => {
  res.render('register')
})

router.post('/register', (req, res) => {
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  db.query(`insert into users(email, password, firstname, lastname) values($1, $2, $3, $4)`, [req.body.email, hash, req.body.firstname, req.body.lastname], (err, data) => {
res.redirect('/login')
  })
});
})

  return router;
}