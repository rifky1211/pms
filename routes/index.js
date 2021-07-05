var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { response } = require("express");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {


  router.get("/login", (req, res) => {
    res.render("login", {info: req.flash('info')});
  });

  router.post("/login", (req, res) => {
    db.query(
      "select * from users where email = $1",
      [req.body.email],
      (err, data) => {
        if (err) {
          req.flash("info", "something wrong");
          res.redirect("/login");
        }
        if (data.rows.length == 0) {
          req.flash("info", "email or password wrong");
          res.redirect("/");
        }

        bcrypt.compare(
          req.body.password,
          data.rows[0].password,
          function (err, result) {
            if (result) {
              req.session.user = data.rows[0];
              res.redirect("/projects");
            } else {
              req.flash("info", "email or password wrong");
              res.redirect("/");
            }
          }
        );
      }
    );
  });

  router.get("/register", (req, res) => {
    res.render("register");
  });

  router.post("/register", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
      db.query(
        `insert into users(email, password, firstname, lastname, isfulltime, isparttime, position, role) values($1, $2, $3, $4, true, false, 'Programmer', 'ADMIN')`,
        [req.body.email, hash, req.body.firstname, req.body.lastname],
        (err, data) => {
          res.redirect("/login");
        }
      );
    });
  });

  router.get("/logout", (req, res, next) => {
    req.session.destroy(function (err) {
      res.redirect("/login");
    });
  });

  return router;
};
