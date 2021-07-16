var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { response } = require("express");
const saltRounds = 10;
var path = require("path");
const helpers = require("../helpers/util");
var moment = require("moment");

module.exports = function(db){
  const namePage = 'users'
router.get('/',helpers.isLoggedIn, helpers.isAdmin, function(req, res, next) {
  db.query('select * from users where not userid = $1 order by userid', [req.session.user.userid], (err, data) => {
    res.render("../views/users/lists", {namePage, session: req.session.user, data: data.rows})
  })
});

router.get('/add', helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
  res.render("../views/users/add", {namePage, session: req.session.user})
})
router.post('/add', helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    db.query("insert into users(email, password, firstname, lastname, options, optionsmember, optionsissue, optionsuser, isfulltime, isparttime) values($1, $2, $3, $4, '{}', '{}', '{}', '{}', false, false)", [req.body.email, hash, req.body.firstname, req.body.lastname], (err) => {
      if(err) throw err
      res.redirect('/users')
    })
  })
})
router.get('/delete/:userid', helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
  const userid = req.params.userid
  db.query('delete from users where userid = $1', [userid], err => {
    if(err) throw err
    res.redirect('/users')
  })
})

router.get('/edit/:userid',helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
  const userid = req.params.userid

  db.query('select * from users where userid = $1', [userid], (err, data) => {
    res.render("../views/users/edit", {namePage, data: data.rows[0], session: req.session.user, userid, success: req.flash('success')})
  })
})

router.post('/edit/:userid',helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
  const userid = req.params.userid

  db.query('update users set email = $1, firstname = $2, lastname = $3 where userid = $4', [req.body.email, req.body.firstname, req.body.lastname, userid], (err) => {
    if(err) throw err
    res.redirect(`/users`)
  })
})

router.get('/edit/:userid/change-password', helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
  res.render("../views/users/change-password", {namePage, session: req.session.user, error: req.flash("error")})
})
router.post('/edit/:userid/change-password', helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
  const userid = req.params.userid

  if(req.body.newpassword == req.body.confirmpassword){
    bcrypt.hash(req.body.newpassword, saltRounds, (err, hash) => {
      db.query('update users set password = $1 where userid = $2', [hash, userid], err => {
        if(err) throw err
        req.flash("success", "Data Updated Successfully");
        res.redirect(`/users/edit/${userid}`)
      })
    })
  }else {
    req.flash("error", "Confirm Password and Re - Type Password not equal");
    return res.redirect(`/users/edit/${userid}/change-password`)
  }
})
 return router;
}