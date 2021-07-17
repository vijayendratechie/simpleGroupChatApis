
const Users = require("../models/users")

//Middleware function to check if user is authenticated
const authentication = function() {
    return (req,res,next) => {
		if(req.isAuthenticated())
		{
			return next();
		}
		return res.status(400).send({status: "error", message: "Please login."}) //If not authenticated, throw error or redirect to login page
	}	
}

//Middleware function to check if user is admin rights
const admin = function() {
    return (req,res,next) => {
		Users.findById({_id: req.user._id},{_id: 1, userType: 1}).exec()
        .then(user => {
            if(!user) {
                return res.status(400).send({status: "error", message: "User not found."})
            } else if(user.userType != 'admin'){
                return res.status(400).send({status: "error", message: "User does not have admin permissions."})
            } else {
                return next()
            }
        })
        .catch(err => {
            return res.status(400).send({status: "error", message: "Error occured while performing operation. Please try again."})
        })
	}	
}

module.exports = {
    authentication,
    admin
}