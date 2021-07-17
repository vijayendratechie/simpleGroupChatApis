const express = require('express')
const passport = require('passport')
const router = express.Router()
const permissionCheck = require("../lib/permissionCheck")

//Log in the user
router.post('/login', function(req, res) {
    if(!req.body.email || !req.body.password) {
        return res.status(400).send({status: "error", message: "Username or password missing"})
    }
    passport.authenticate('local', function(err, user) {
        if (err) { 
            return res.status(400).send({status: "error", message: "Error occured while logging in. Please try again."}) 
        }
        if (!user) { return res.redirect('/'); }

        req.logIn(user, function(err) {
            if (err) { 
                return res.status(400).send({status: "error", message: "Error occured while logging in. Please try again."})
            }
            return res.redirect('/group');
        });
    })(req, res);
});

//Log out the user
router.post("/logout", permissionCheck.authentication(), function(req,res) {
    req.session.destroy();
    req.logout()
    return res.status(200).json({ data: { message: 'Logged out' }, status: 'success' })
 })

module.exports = router