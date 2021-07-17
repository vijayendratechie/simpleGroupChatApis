const mongoose = require('mongoose')

const groupMessagesSchema = mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'groups'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    message: {
        type: String
    },
    likedBy: {
        type: Object
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('groupMessage', groupMessagesSchema)