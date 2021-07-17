var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const { response } = require("express");
const saltRounds = 10;
var path = require("path");
const helpers = require("../helpers/util");
var moment = require("moment");
const { type } = require("os");

module.exports = function (db) {
  const namePage = "projects";
  router.get("/", helpers.isLoggedIn, (req, res) => {
    const url = req.url == "/" ? "/projects/?page=1" : `/projects${req.url}`;
    const findName = req.query.findName;
    const findId = parseInt(req.query.findId);
    const findMember = parseInt(req.query.findMember);
    var page = parseInt(req.query.page) || 1;
    var size = 2;
    var offset = (page - 1) * size;
    let params = [];
    if (findId) {
      params.push(`projects.projectid = ${findId}`);
    }
    if (findName) {
      params.push(`projects.name ilike '%${findName}%'`);
    }
    if (findMember) {
      params.push(`members.userid = ${findMember}`);
    }

    let sql = `select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) group by projects.projectid, projects.name order by projects.projectid limit 2 offset 0;`;

    let sqlCount =
      "select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) group by projects.projectid, projects.name order by projects.projectid;";

    if (page) {
      sql = `select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) group by projects.projectid, projects.name order by projects.projectid limit 2 offset ${offset};`;
    }

    if (params.length > 0) {
      sql =
        "select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid)";
      sqlCount =
        "select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid)";
      sql += ` where ${params.join(
        " and "
      )} group by projects.projectid, projects.name order by projects.projectid limit 2 offset ${offset};`;
      sqlCount += ` where ${params.join(
        " and "
      )} group by projects.projectid, projects.name order by projects.projectid;`;
    }
    db.query(sqlCount, (err, count) => {
      let jumlahData = count.rows.length;
      let jumlahHalaman = Math.ceil(jumlahData / 2);
      db.query(sql, (err, data) => {
        if (err) {
          throw err;
        }
        db.query(
          "select options from users where userid = $1",
          [req.session.user.userid],
          (err, options) => {
            if (err) {
              throw err;
            }
            db.query("select * from users", (err, names) => {
              if (err) {
                throw err;
              }
              res.render("../views/projects/lists", {
                data: data.rows,
                options: options.rows[0].options,
                names: names.rows,
                findId,
                findMember,
                findName,
                jumlahHalaman,
                page,
                url,
                namePage,
                session: req.session.user
              });
            });
          }
        );
      });
    });
  });

  router.post("/", helpers.isLoggedIn, (req, res) => {
    const { projectid, name, members } = req.body;

    db.query(
      "update users set options = $1 where userid = $2",
      [req.body, req.session.user.userid],
      (err, data) => {
        if (err) {
          return res.render(err);
        }
        res.redirect("/projects");
      }
    );
  });

  router.get("/form", helpers.isLoggedIn, (req, res) => {
    db.query("select * from users", (err, users) => {
      res.render("../views/projects/form", {
        users: users.rows,
        namePage,
        session: req.session.user
      });
    });
  });

  router.post("/form", helpers.isLoggedIn, (req, res) => {
    db.query(
      "insert into projects(name) values($1) returning *",
      [req.body.name],
      (err, project) => {
        let projectid = project.rows[0].projectid;
        let sql = "insert into members(userid, role, projectid) values";

        for (let i = 0; i < req.body.userid.length; i++) {
          if (i < req.body.userid.length - 1) {
            sql += `(${req.body.userid[i]}, '', ${projectid}),`;
          }
          if (i == req.body.userid.length - 1) {
            sql += `(${req.body.userid[i]}, '', ${projectid})`;
          }
        }
        db.query(sql, (err) => {
          res.redirect("/projects");
        });
      }
    );
  });

  router.get("/edit/:id", helpers.isLoggedIn, (req, res) => {
    let projectid = req.params.id;
    db.query(
      "select projects.projectid, projects.name, ARRAY_AGG(users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) where projectid = $1 group by projects.projectid, projects.name order by projects.projectid",
      [projectid],
      (err, count) => {
        let name = count.rows[0].members;
        let name1 = [];
        for (let i = 0; i < name.length; i++) {
          if (i == 0) {
            name1.push("'" + name[i] + "'");
          }
          if (i > 0 && i == name.length - 2) {
            name1.push("'" + name[i] + "'");
          }

          if (i == name.length - 1) {
            name1.push("'" + name[i] + "'");
          }
        }
        name1.toString();
        db.query(
          `select * from users where not firstname in(${name1})`,
          (err, name) => {
            db.query(
              `select * from users where firstname in(${name1})`,
              (err, data) => {
                res.render("../views/projects/edit", {
                  data: data.rows,
                  name: name.rows,
                  count: count.rows,
                  namePage,
                  session: req.session.user
                });
              }
            );
          }
        );
      }
    );
  });

  router.post("/edit/:id", helpers.isLoggedIn, (req, res) => {
    let projectid = parseInt(req.params.id);
    db.query("delete from members where projectid = $1", [projectid], (err) => {
      db.query(
        "update projects set name = $1 where projectid= $2",
        [req.body.name, projectid],
        (err) => {
          let sql = "insert into members(userid, role, projectid) values";

          for (let i = 0; i < req.body.userid.length; i++) {
            if (i < req.body.userid.length - 1) {
              sql += `(${req.body.userid[i]}, '', ${projectid}),`;
            }
            if (i == req.body.userid.length - 1) {
              sql += `(${req.body.userid[i]}, '', ${projectid})`;
            }
          }
          db.query(sql, (err) => {
            res.redirect("/projects");
          });
        }
      );
    });
  });

  router.get("/delete/:id", helpers.isLoggedIn, helpers.isAdmin, (req, res) => {
    let projectid = parseInt(req.params.id);
    db.query("delete from members where projectid = $1", [projectid], (err) => {
      db.query(
        "delete from projects where projectid= $1",
        [projectid],
        (err) => {
          if (err) {
            throw err;
          }
          res.redirect("/projects");
        }
      );
    });
  });

  router.get("/overview/:projectid", helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid;
    const nameSidebar = "overview";
    db.query(
      "select projects.projectid, projects.name, ARRAY_AGG(users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) where projectid = $1 group by projects.projectid, projects.name order by projects.projectid",
      [projectid],
      (err, count) => {
        let name = count.rows[0].members;
        let name1 = [];
        for (let i = 0; i < name.length; i++) {
          if (i == 0) {
            name1.push("'" + name[i] + "'");
          }
          if (i > 0 && i == name.length - 2) {
            name1.push("'" + name[i] + "'");
          }

          if (i == name.length - 1) {
            name1.push("'" + name[i] + "'");
          }
        }
        name1.toString();
        db.query(
          `select * from users where firstname in(${name1})`,
          (err, data) => {
            db.query(
              "select count(*) as total from issues where tracker = 'Bug' and projectid = $1",
              [projectid],
              (err, totalBug) => {
                let totalBug1 = totalBug.rows[0].total;
                db.query(
                  "select count(*) as total from issues where tracker = 'Bug' and projectid = $1 and not status ='Closed'",
                  [projectid],
                  (err, uncompletedBug) => {
                    let uncompletedBug1 = uncompletedBug.rows[0].total;
                    db.query(
                      "select count(*) as total from issues where tracker = 'Feature' and projectid = $1",
                      [projectid],
                      (err, totalFeature) => {
                        let totalFeature1 = totalFeature.rows[0].total;
                        db.query(
                          "select count(*) as total from issues where tracker = 'Feature' and projectid = $1 and not status ='Closed'",
                          [projectid],
                          (err, uncompletedFeature) => {
                            let uncompletedFeature1 =
                              uncompletedFeature.rows[0].total;
                            db.query(
                              "select count(*) as total from issues where tracker = 'Support' and projectid = $1",
                              [projectid],
                              (err, totalSupport) => {
                                let totalSupport1 = totalSupport.rows[0].total;
                                db.query(
                                  "select count(*) as total from issues where tracker = 'Support' and projectid = $1 and not status ='Closed'",
                                  [projectid],
                                  (err, uncompletedSupport) => {
                                    let uncompletedSupport1 =
                                      uncompletedSupport.rows[0].total;
                                    res.render(
                                      "../views/projects/project-details/overview/overview",
                                      {
                                        namePage,
                                        data: data.rows,
                                        nameSidebar,
                                        projectid,
                                        totalBug1,
                                        uncompletedBug1,
                                        totalFeature1,
                                        totalSupport1,
                                        uncompletedFeature1,
                                        uncompletedSupport1,
                                        session: req.session.user
                                      }
                                    );
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });

  router.get("/members/:projectid", helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid;
    const url =
      req.url == `/members/${projectid}`
        ? `/projects/members/${projectid}?page=1`
        : `/projects${req.url}`;
    const nameSidebar = "members";
    const { findName, findPosition } = req.query;
    var page = parseInt(req.query.page) || 1;
    var size = 2;
    var offset = (page - 1) * size;
    let params = [];
    if (findName) {
      params.push(`users.firstname ilike '%${findName}%'`);
    }
    if (findPosition) {
      params.push(`members.role = '${findPosition}'`);
    }

    let sql = `select users.firstname, members.userid, members.role, members.projectid from members left join users on members.userid = users.userid where projectid = ${projectid} order by users.firstname limit ${size} offset ${offset}`;

    let sqlCount = `select users.firstname, members.userid, members.role, members.projectid from members left join users on members.userid = users.userid where projectid = ${projectid} order by users.firstname`;

    if (params.length > 0) {
      sql = `select users.firstname, members.userid, members.role, members.projectid from members left join users on members.userid = users.userid where projectid = ${projectid} and `;

      sqlCount = `select users.firstname, members.userid, members.role, members.projectid from members left join users on members.userid = users.userid where projectid = ${projectid} and `;

      sql += ` ${params.join(
        " and "
      )} order by users.firstname limit ${size} offset ${offset}`;
      sqlCount += ` ${params.join(" and ")} order by users.firstname`;
    }
    db.query(sqlCount, (err, count) => {
      let jumlahData = count.rows.length;
      let jumlahHalaman = Math.ceil(jumlahData / 2);
      db.query(sql, (err, data) => {
        db.query(
          "select optionsmember from users where userid = $1",
          [req.session.user.userid],
          (err, optionsmember) => {
            res.render("../views/projects/project-details/members/members", {
              namePage,
              data: data.rows,
              nameSidebar,
              projectid,
              optionsmember: optionsmember.rows[0].optionsmember,
              jumlahHalaman,
              page,
              url,
              size,
              findName,
              findPosition,
              session: req.session.user
            });
          }
        );
      });
    });
  });

  router.post("/members/:projectid", helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    const { id, firstname, position } = req.body;
    db.query(
      "update users set optionsmember = $1 where userid = $2",
      [req.body, req.session.user.userid],
      (err) => {
        res.redirect(`/projects/members/${projectid}`);
      }
    );
  });

  router.get(
    "/members/:projectid/edit/:userid",
    helpers.isLoggedIn,
    (req, res) => {
      const { projectid, userid } = req.params;
      const nameSidebar = "members";
      db.query(
        "select * from members where projectid = $1 and userid = $2",
        [projectid, userid],
        (err, data) => {
          res.render("../views/projects/project-details/members/edit", {
            namePage,
            data: data.rows[0],
            nameSidebar,
            projectid,
            session: req.session.user
          });
        }
      );
    }
  );

  router.post(
    "/members/:projectid/edit/:userid",
    helpers.isLoggedIn,
    (req, res) => {
      const { projectid, userid } = req.params;
      const nameSidebar = "members";
      db.query(
        "update members set role = $1 where userid = $2",
        [req.body.role, userid],
        (err) => {
          res.redirect(`/projects/members/${projectid}`);
        }
      );
    }
  );

  router.get("/members/:projectid/add", helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    const nameSidebar = "members";

    db.query(
      "select projects.projectid, projects.name, ARRAY_AGG(users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) where projectid = $1 group by projects.projectid, projects.name order by projects.projectid",
      [projectid],
      (err, count) => {
        let name = count.rows[0].members;
        let name1 = [];
        for (let i = 0; i < name.length; i++) {
          if (i == 0) {
            name1.push("'" + name[i] + "'");
          }
          if (i > 0 && i == name.length - 2) {
            name1.push("'" + name[i] + "'");
          }

          if (i == name.length - 1) {
            name1.push("'" + name[i] + "'");
          }
        }
        name1.toString();
        console.log(name1);
        db.query(
          `select * from users where not firstname in(${name1})`,
          (err, data) => {
            res.render("../views/projects/project-details/members/add", {
              data: data.rows,
              nameSidebar,
              namePage,
              projectid,
              session: req.session.user
            });
          }
        );
      }
    );
  });

  router.post("/members/:projectid/add", helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    let sql = "insert into members(userid, role, projectid) values";

    for (let i = 0; i < req.body.userid.length; i++) {
      if (i < req.body.userid.length - 1) {
        sql += `(${req.body.userid[i]}, '', ${projectid}),`;
      }
      if (i == req.body.userid.length - 1) {
        sql += `(${req.body.userid[i]}, '', ${projectid})`;
      }
    }
    db.query(sql, (err) => {
      res.redirect(`/projects/members/${projectid}`);
    });
  });

  router.get(
    "/members/:projectid/delete/:userid",
    helpers.isLoggedIn, helpers.isAdmin,
    (req, res) => {
      const { projectid, userid } = req.params;

      db.query(
        "delete from members where projectid = $1 and userid = $2",
        [projectid, userid],
        (err) => {
          res.redirect(`/projects/members/${projectid}`);
        }
      );
    }
  );

  router.get("/issues/:projectid", helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    const url =
      req.url == `/issues/${projectid}`
        ? `/projects/issues/${projectid}?page=1`
        : `/projects${req.url}`;
    const nameSidebar = "issues";
    const { findId, findSubject, findTracker } = req.query;
    var page = parseInt(req.query.page) || 1;
    var size = 2;
    var offset = (page - 1) * size;
    let params = [];

    if (findId) {
      params.push(` issueid = '${findId}'`);
    }
    if (findSubject) {
      params.push(` subject ilike '%${findSubject}%'`);
    }
    if (findTracker) {
      params.push(` tracker = '${findTracker}'`);
    }

    let sql = `select * from issues where projectid = ${projectid} order by issueid limit ${size} offset ${offset}`;
    let sqlCount = `select count(*) as total from issues where projectid = ${projectid}`;

    if (params.length > 0) {
      sql = `select * from issues where projectid = ${projectid} and `;
      sqlCount = `select count(*) as total from issues where projectid = ${projectid} and `;

      sql += ` ${params.join(" and ")} order by issueid limit 2 offset ${offset}`;
      sqlCount += ` ${params.join(" and ")}`;
    }

    db.query(sqlCount, (err, count) => {
      let jumlahData = count.rows[0].total;
      let jumlahHalaman = Math.ceil(jumlahData / 2);
      db.query(sql, (err, data) => {
        db.query(
          "select optionsissue from users where userid = $1",
          [req.session.user.userid],
          (err, options) => {
            res.render("../views/projects/project-details/issues/lists", {
              namePage,
              nameSidebar,
              projectid,
              data: data.rows,
              options: options.rows[0].optionsissue,
              jumlahHalaman,
              url,
              page,
              findId,
              findSubject,
              findTracker,
              session: req.session.user,
            });
          }
        );
      });
    });
  });

  router.post("/issues/:projectid", helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    const { id, subject, tracker } = req.body;

    db.query(
      "update users set optionsissue = $1 where userid = $2",
      [req.body, req.session.user.userid],
      (err) => {
        if (err) throw err;
        res.redirect(`/projects/issues/${projectid}`);
      }
    );
  });

  router.get("/issues/:projectid/add", helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    const nameSidebar = "issues";
    db.query(
      "select * from users where userid in (select userid from members where projectid = $1)",
      [projectid],
      (err, data) => {
        res.render("../views/projects/project-details/issues/add", {
          namePage,
          nameSidebar,
          projectid,
          data: data.rows,
          session: req.session.user
        });
      }
    );
  });

  router.post("/issues/:projectid/add", helpers.isLoggedIn, (req, res) => {
    const { projectid } = req.params;
    const {
      tracker,
      subject,
      description,
      status,
      priority,
      assignee,
      startdate,
      duedate,
      estimatedtime,
      done,
    } = req.body;
    const manyFiles = [];

    if (!req.files) {
      return db.query(
        "insert into issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, createddate) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())",
        [
          projectid,
          req.body.tracker,
          req.body.subject,
          req.body.description,
          req.body.status,
          req.body.priority,
          req.body.assignee,
          req.body.startdate,
          req.body.duedate,
          req.body.estimatedtime,
          req.body.done,
          req.session.user.userid,
        ],
        (err) => {
          if (err) throw err;
          res.redirect(`/projects/issues/${projectid}`);
        }
      );
    } else if (req.files.files.length > 1) {
      req.files.files.forEach((item) => {
        let fileName = `${Date.now()}|${item.name}`;
        let uploadPath = path.join(
          __dirname,
          "..",
          "public",
          "uploaded",
          fileName
        );
        item.mv(uploadPath, (err) => {
          if (err) {
            throw err;
          }
          manyFiles.push({ name: fileName, type: item.mimetype });
        });
        console.log(manyFiles);
      });
    } else if (req.files.files) {
      let fileName = `${Date.now()}|${req.files.files.name}`;
      let uploadPath = path.join(
        __dirname,
        "..",
        "public",
        "uploaded",
        fileName
      );
      req.files.files.mv(uploadPath, (err) => {
        if (err) {
          throw err;
        }
        manyFiles.push({ name: fileName, type: req.files.files.mimetype });
      });
    }
    if (req.files.files) {
      console.log(manyFiles);
      db.query(
        "insert into issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, author, createddate) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())",
        [
          projectid,
          req.body.tracker,
          req.body.subject,
          req.body.description,
          req.body.status,
          req.body.priority,
          req.body.assignee,
          req.body.startdate,
          req.body.duedate,
          req.body.estimatedtime,
          req.body.done,
          manyFiles,
          req.session.user.userid,
        ],
        (err) => {
          res.redirect(`/projects/issues/${projectid}`);
        }
      );
    }
  });

  router.get(
    "/issues/:projectid/edit/:issueid",
    helpers.isLoggedIn,
    (req, res) => {
      const { projectid, issueid } = req.params;
      const nameSidebar = "issues";

      const baseUrl = `http://${req.headers.host}`;
      db.query(
        "select * from issues where issueid = $1",
        [issueid],
        (err, data) => {
          let nameFiles = [];
          if (data.rows[0].files) {
            let files = data.rows[0].files;
            files.forEach((item) => {
              nameFiles.push(item.name);
            });
          }
          db.query(
            "select * from users where userid in (select userid from members where projectid = $1)",
            [projectid],
            (err, names) => {
              res.render("../views/projects/project-details/issues/edit", {
                data: data.rows[0],
                nameSidebar,
                namePage,
                projectid,
                names: names.rows,
                moment: moment,
                baseUrl,
                nameFiles,
                session: req.session.user
              });
            }
          );
        }
      );
    }
  );

  router.post(
    "/issues/:projectid/edit/:issueid",
    helpers.isLoggedIn,
    (req, res) => {
      const { projectid, issueid } = req.params;
      const manyFiles1 = [];

      if (!req.files && !req.body.fileDb) {
        if (req.body.status == "Closed") {
          return db.query(
            "update issues set tracker = $1, subject = $2, description = $3, status = $4, priority = $5, assignee = $6, startdate = $7, duedate = $8, estimatedtime = $9, done = $10, author = $11, closeddate = now(), files = null where issueid = $12 returning *",
            [
              req.body.tracker,
              req.body.subject,
              req.body.description,
              req.body.status,
              req.body.priority,
              req.body.assignee,
              req.body.startdate,
              req.body.duedate,
              req.body.estimatedtime,
              req.body.done,
              req.session.user.userid,
              issueid,
            ],
            (err, edit) => {
              let log = edit.rows[0];
              db.query(
                "insert into activity(time, title, description, author, issueid) values(now(), $1, $2, $3, $4)",
                [log.subject, log.status, log.author, log.issueid],
                (err) => {
                  res.redirect(`/projects/issues/${projectid}`);
                }
              );
            }
          );
        } else {
          return db.query(
            "update issues set tracker = $1, subject = $2, description = $3, status = $4, priority = $5, assignee = $6, startdate = $7, duedate = $8, estimatedtime = $9, done = $10, author = $11, updateddate = now(), files = null where issueid = $12 returning *",
            [
              req.body.tracker,
              req.body.subject,
              req.body.description,
              req.body.status,
              req.body.priority,
              req.body.assignee,
              req.body.startdate,
              req.body.duedate,
              req.body.estimatedtime,
              req.body.done,
              req.session.user.userid,
              issueid,
            ],
            (err, edit) => {
              let log = edit.rows[0];
              db.query(
                "insert into activity(time, title, description, author, issueid) values(now(), $1, $2, $3, $4)",
                [log.subject, log.status, log.author, log.issueid],
                (err) => {
                  res.redirect(`/projects/issues/${projectid}`);
                }
              );
            }
          );
        }
      } else if (!req.body.fileDb && req.files.files.length > 1) {
        req.files.files.forEach((item) => {
          let fileName = `${Date.now()}|${item.name}`;
          let uploadPath = path.join(
            __dirname,
            "..",
            "public",
            "uploaded",
            fileName
          );
          manyFiles1.push({ name: fileName, type: item.mimetype });
          item.mv(uploadPath, (err) => {
            if (err) {
              throw err;
            }
          });
        });
      } else if (!req.body.fileDb && req.files.files) {
        let fileName = `${Date.now()}|${req.files.files.name}`;
        let uploadPath = path.join(
          __dirname,
          "..",
          "public",
          "uploaded",
          fileName
        );
        manyFiles1.push({ name: fileName, type: req.files.files.mimetype });
        req.files.files.mv(uploadPath, (err) => {
          if (err) {
            throw err;
          }
        });
      } else if (typeof req.body.fileDb == "object" && !req.files) {
        for (let i = 0; i < req.body.fileDb.length; i++) {
          manyFiles1.push({
            name: req.body.fileDb[i],
            type: req.body.typeDb[i],
          });
        }
      } else if (typeof req.body.fileDb == "string" && !req.files) {
        manyFiles1.push({ name: req.body.fileDb, type: req.body.typeDb });
      } else if (
        typeof req.body.fileDb == "object" &&
        req.files.files.length > 1
      ) {
        for (let i = 0; i < req.body.fileDb.length; i++) {
          manyFiles1.push({
            name: req.body.fileDb[i],
            type: req.body.typeDb[i],
          });
        }
        req.files.files.forEach((item) => {
          let fileName = `${Date.now()}|${item.name}`;
          let uploadPath = path.join(
            __dirname,
            "..",
            "public",
            "uploaded",
            fileName
          );
          manyFiles1.push({ name: fileName, type: item.mimetype });
          item.mv(uploadPath, (err) => {
            if (err) {
              throw err;
            }
          });
        });
      } else if (req.body.fileDb && req.files.files.length > 1) {
        manyFiles1.push({ name: req.body.fileDb, type: req.body.typeDb });
        req.files.files.forEach((item) => {
          let fileName = `${Date.now()}|${item.name}`;
          let uploadPath = path.join(
            __dirname,
            "..",
            "public",
            "uploaded",
            fileName
          );
          manyFiles1.push({ name: fileName, type: item.mimetype });
          item.mv(uploadPath, (err) => {
            if (err) {
              throw err;
            }
          });
        });
      } else if (typeof req.body.fileDb == "object" && req.files.files) {
        for (let i = 0; i < req.body.fileDb.length; i++) {
          manyFiles1.push({
            name: req.body.fileDb[i],
            type: req.body.typeDb[i],
          });
        }

        let fileName = `${Date.now()}|${req.files.files.name}`;
        let uploadPath = path.join(
          __dirname,
          "..",
          "public",
          "uploaded",
          fileName
        );
        manyFiles1.push({ name: fileName, type: req.files.files.mimetype });
        req.files.files.mv(uploadPath, (err) => {
          if (err) {
            throw err;
          }
        });
      } else if (req.body.fileDb && req.files.files) {
        manyFiles1.push({ name: req.body.fileDb, type: req.body.typeDb });
        let fileName = `${Date.now()}|${req.files.files.name}`;
        let uploadPath = path.join(
          __dirname,
          "..",
          "public",
          "uploaded",
          fileName
        );
        manyFiles1.push({ name: fileName, type: req.files.files.mimetype });
        req.files.files.mv(uploadPath, (err) => {
          if (err) {
            throw err;
          }
        });
      }

      if (req.body.fileDb || req.files.files) {
        if (req.body.status == "Closed") {
          db.query(
            "update issues set tracker = $1, subject = $2, description = $3, status = $4, priority = $5, assignee = $6, startdate = $7, duedate = $8, estimatedtime = $9, done = $10, files = $11, author = $12, closeddate = now() where issueid = $13 returning *",
            [
              req.body.tracker,
              req.body.subject,
              req.body.description,
              req.body.status,
              req.body.priority,
              req.body.assignee,
              req.body.startdate,
              req.body.duedate,
              req.body.estimatedtime,
              req.body.done,
              manyFiles1,
              req.session.user.userid,
              issueid,
            ],
            (err, edit) => {
              let log = edit.rows[0];
              db.query(
                "insert into activity(time, title, description, author, issueid) values(now(), $1, $2, $3, $4)",
                [log.subject, log.status, log.author, log.issueid],
                (err) => {
                  res.redirect(`/projects/issues/${projectid}`);
                }
              );
            }
          );
        } else {
          db.query(
            "update issues set tracker = $1, subject = $2, description = $3, status = $4, priority = $5, assignee = $6, startdate = $7, duedate = $8, estimatedtime = $9, done = $10, files = $11, author = $12, updateddate = now() where issueid = $13 returning *",
            [
              req.body.tracker,
              req.body.subject,
              req.body.description,
              req.body.status,
              req.body.priority,
              req.body.assignee,
              req.body.startdate,
              req.body.duedate,
              req.body.estimatedtime,
              req.body.done,
              manyFiles1,
              req.session.user.userid,
              issueid,
            ],
            (err, edit) => {
              let log = edit.rows[0];
              db.query(
                "insert into activity(time, title, description, author, issueid) values(now(), $1, $2, $3, $4)",
                [log.subject, log.status, log.author, log.issueid],
                (err) => {
                  res.redirect(`/projects/issues/${projectid}`);
                }
              );
            }
          );
        }
      }
    }
  );

  router.get(
    "/issues/:projectid/delete/:issueid",
    helpers.isLoggedIn, helpers.isAdmin,
    (req, res) => {
      const { projectid, issueid } = req.params;
      db.query("delete from activity where issueid = $1", [issueid], (err) => {
        db.query("delete from issues where issueid = $1", [issueid], (err) => {
          if (err) throw err;
          res.redirect(`/projects/issues/${projectid}`);
        });
      });
    }
  );

  router.get("/activity/:projectid", helpers.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid;
    const nameSidebar = "activity";

    db.query(
      "select issues.projectid, activity.time, activity.title, activity.description, activity.author, users.firstname, issues.issueid  from activity left join users on activity.author = users.userid left join issues on activity.issueid = issues.issueid where projectid = $1 and time > current_date - interval '7 days' order by activity.time desc",
      [projectid],
      (err, data) => {
        let result = {};
        data.rows.forEach((item) => {
          if (
            result[moment(item.time).format("dddd")] &&
            result[moment(item.time).format("dddd")].data
          ) {
            result[moment(item.time).format("dddd")].data.push(item);
          } else {
            result[moment(item.time).format("dddd")] = {
              date: moment(item.time).format("YYYY-MM-DD"),
              data: [item],
            };
          }
        });
        let now = new Date();
        let from = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        res.render("../views/projects/project-details/activity/lists", {
          projectid,
          nameSidebar,
          namePage,
          data: data.rows,
          moment: moment,
          result,
          now,
          from,
          session: req.session.user
        });
      }
    );
  });

  return router;
};
