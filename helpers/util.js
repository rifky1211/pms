module.exports = {
    isLoggedIn: (req, res, next) => {
        console.log('session ',req.session)
        if(req.session.user){
            next()
        }else {
            res.redirect('/')
        }
    } 
}