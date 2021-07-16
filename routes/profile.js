var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { response } = require("express");
const saltRounds = 10;
const helpers = require("../helpers/util");

module.exports = function (db) {
  const namePage = 'profile'
  router.get("/", helpers.isLoggedIn, (req, res) => {
    const url = req.url == "/" ? "/profile" : `/profile${req.url}`;
    db.query(
      "select * from users where email = $1",
      [req.session.user.email],
      (err, data) => {
        if (err) {
          throw err;
        }
        res.render("../views/profile/form", {
          email: req.session.user.email,
          data: data.rows[0],
          success: req.flash('success'),
          namePage,
          session: req.session.user
        });
      }
    );
  });

  router.post("/", helpers.isLoggedIn, (req, res) => {
    if (req.body.isfulltime == undefined) {
      return db.query(
        "update users set position = $1, isfulltime = false, isparttime = true where email = $2",
        [req.body.position, req.session.user.email],
        (err) => {
          req.flash("success", "Data Updated Successfully");
          res.redirect("/profile");
        }
      );
    }
    db.query(
      "update users set position = $1, isfulltime = true, isparttime = false where email = $2",
      [req.body.position, req.session.user.email],
      (err) => {
        req.flash("success", "Data Updated Successfully");
        res.redirect("/profile");
      }
    );
  });

  router.get("/change-password", helpers.isLoggedIn, (req, res) => {
    res.render("../views/profile/change-password", {error: req.flash("error"), namePage, session: req.session.user});
  });

  router.post("/change-password", helpers.isLoggedIn, (req, res) => {
    db.query(
      "select * from users where email = $1",
      [req.session.user.email],
      (err, data) => {
        bcrypt.compare(
          req.body.oldpassword,
          data.rows[0].password,
          (err, result) => {
            if(err){
              req.flash("error", "something wrong");
              return res.redirect('/profile/change-password')
            }
            if(req.body.newpassword !== req.body.confirmpassword){
              req.flash("error", "Confirm Password and Re - Type Password not equal");
              return res.redirect('/profile/change-password')
            }
            if (result) {
              if (req.body.newpassword == req.body.confirmpassword) {
                bcrypt.hash(req.body.newpassword, saltRounds, (err, hash) => {
                  db.query(
                    "update users set password = $1 where email = $2",
                    [hash, req.session.user.email],
                    (err) => {
                      req.flash("success", "Password has been changed");
                      res.redirect("/profile");
                    }
                  );
                });
              }
            }
          }
        );
      }
    );
  });
  return router;
};
