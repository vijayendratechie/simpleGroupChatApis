const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    userType: {
        type: String,
        required: true,
        default: 'normal',
        enum: ['normal', 'admin']
    },
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

userSchema.methods.encryptPassword = function() {
    return new Promise((resolve,reject) => {
        bcrypt.hash(this.password, 10, function(err, hash) {
            if(err) {
                reject(err)
            } 
            resolve(hash)
        });
    })
}

userSchema.methods.validatePassword = function(password) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(password, this.password, function(err, result) {
            if(err) {
                reject(err)
            } 
            resolve(result)
        });
    })
}

module.exports = mongoose.model('users', userSchema)