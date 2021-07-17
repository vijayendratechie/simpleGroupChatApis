const mongoose = require('mongoose')

const groupMembersSchema = mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'groups'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    admin: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('groupMembers', groupMembersSchema)