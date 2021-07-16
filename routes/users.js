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
  const { findId, findName, findPosition } = req.query;
  const url = req.url == "/" ? "/users/?page=1" : `/users${req.url}`;
  var page = parseInt(req.query.page) || 1;
    var size = 2;
    var offset = (page - 1) * size;
    let params = [];

    if(findId){
      params.push(` userid = '${findId}'`)
    }
    if(findName){
      params.push(` firstname ilike '%${findName}%'`)
    }
    if(findPosition){
      params.push(` position = '${findPosition}'`)
    }

    let sql = `select * from users order by userid limit ${size} offset ${offset}`
    let sqlCount = `select count(*) as total from users`

    if(params.length > 0){
      sql = `select * from users where `
      sqlCount = `select count(*) as total from users where `

      sql += ` ${params.join(" and ")} order by userid limit 2 offset ${offset}`
      sqlCount += ` ${params.join(" and ")}`
    }
db.query(sqlCount, (err, count) => {
  let jumlahData = count.rows[0].total;
      let jumlahHalaman = Math.ceil(jumlahData / 2);
  db.query(sql, (err, data) => {
    db.query('select optionsuser from users where userid = $1', [req.session.user.userid], (err, options) => {
      res.render("../views/users/lists", {namePage, session: req.session.user, data: data.rows, options: options.rows[0].optionsuser, jumlahHalaman, page, url, findId, findName, findPosition})
    })
  })
})
});

router.post('/', (req, res) => {
  const { userid, name, position } = req.body

  db.query('update users set optionsuser = $1 where userid = $2', [req.body, req.session.user.userid], (err) => {
    if(err) throw err
    res.redirect('/users')
  })
})

router.get('/add', helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
  res.render("../views/users/add", {namePage, session: req.session.user})
})
router.post('/add', helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    db.query("insert into users(email, password, firstname, lastname, position, options, optionsmember, optionsissue, optionsuser, isfulltime, isparttime) values($1, $2, $3, $4, $5, '{}', '{}', '{}', '{}', false, false)", [req.body.email, hash, req.body.firstname, req.body.lastname, req.body.position], (err) => {
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