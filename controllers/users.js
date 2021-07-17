const express = require('express')
const router = express.Router()
const permissionCheck = require("../lib/permissionCheck")

const Users = require("../models/users")

//Display all members
router.get("/", function(req,res) {
    Users.find({},{_id: 1, email: 1, name: 1}).exec()
    .then(users => {
        return res.status(200).send({status: "success", users})
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Error occured while getting all members."})
    })
})

//Create user
router.post("/create", permissionCheck.admin(), function(req,res) {
    if(!req.body || !req.body.data || !req.body.data.password) {
        return res.status(400).send({status: "error", message: "Invalid inputs"})
    }
    userData = new Users(req.body.data)
    userData.encryptPassword()
    .then(hashedPassword => {
        userData.password = hashedPassword;
        userData.save()
        .then(user => {
            return res.status(200).send({status: "success", message: "user created successfully"})
        })
        .catch(err => {
            return res.status(400).send({status: "error", message: "Error occured while creating user"})
        })
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Error occured while creating user. Please try again"}) 
    })
})

//Update user information
router.put("/update", function(req,res) {
    let userData = req.body.data;

    //Restriction to update password directly
    if(userData.password) {
        delete userData.password
    }

    if(userData.userType) {
        delete userData.userType
    }

    userData.updatedAt = new Date()

    Users.findByIdAndUpdate({_id: req.user._id}, {
        $set: userData
    })
    .then(user => {
        return res.status(200).send({status: "success", message: "User updated successfully"})
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Error occured while updating user"})
    })
})

//Change user type. Only admin users have access to this route
router.put("/updatePermission", permissionCheck.admin(), function(req,res) {
    let userType = req.body.userType;
    let userId = req.body.userId;

    if(!userType || !userId || (userType != 'normal' && userType != 'admin')) {
        return res.status(400).send({status: "error", message: "Invalid or missing input"})
    } 

    Users.findByIdAndUpdate({_id: userId}, {
        $set: {userType, updatedAt: new Date()}
    })
    .then(user => {
        return res.status(200).send({status: "success", message: "User updated successfully"})
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Error occured while updating user"})
    })
})

//Reset Password
router.put("/resetPassword", function(req,res) {

    if(!req.body || !req.body.oldPassword || !req.body.newPassword) {
        return res.status(400).send({status: "error", message: "Invalid inputs"})
    }

    let oldPassword = req.body.oldPassword;
    let newPassword = req.body.newPassword;
    let user = new Users(req.user);

    user.validatePassword(oldPassword)
    .then(validPassword => {
        if(validPassword) {
            return
        } else {
            return res.status(400).send({status: "error", message: "Old and new passwords did not match. Please try again."}) 
        }
    })
    .then(() => {
        user.password = newPassword
        return user.encryptPassword()
        .then(hashedPassword => {
            return hashedPassword
        })
        .catch(err => {
            return res.status(400).send({status: "error", message: "Something went wrong. Please try again."})
        })
    })
    .then(hashedPassword => {
        Users.findByIdAndUpdate({_id: req.user._id},{$set: {password: hashedPassword}}).exec()
        .then(() => {
            return res.status(200).send({status: "success", message: "user password updated successfully."})
        })
        .catch(err => {
            return res.status(400).send({status: "error", message: "Something went wrong. Please try again."})
        })
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Something went wrong. Please try again."}) 
    })
})

//Search user by email to add to group
router.get("/search", function(req,res) {
    if(!req.query.email) {
        return res.status(400).send({status: "error", message: "Inputs missing"})
    }
    let email = req.query.email;
    Users.findOne({email: email},{_id: 1, name: 1, email: 1}).exec()
    .then(user => {
        if(!user) {
            return res.status(200).send({status: "success", user: {}})
        }
        return res.status(200).send({status: "success", user})
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Something went wrong. Please try again."})
    })
})

module.exports = router