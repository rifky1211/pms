module.exports = {
    isLoggedIn: (req, res, next) => {
        if(req.session.user){
            next()
        }else {
            res.redirect('/')
        }
    },
    isAdmin: (req, res, next) => {
        if(req.session.user.role == 'ADMIN'){
            next()
        }else{
            res.redirect('/projects')
        }
    },

    isNotClosed: (req, res, next) => {
        if(item.status !== 'Closed'){
            next();
        }else{
            res.redirect(`/projects/issues/${projectid}`)
        }
    }
}