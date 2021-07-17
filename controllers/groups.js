const express = require('express')
const router = express.Router()

const Users = require("../models/users")
const Groups = require("../models/groups")
const groupMembers = require("../models/groupMembers")
const groupMessages = require("../models/groupMessages")

//Get all groups of a user
router.get("/", function(req,res) {
    userId = req.user._id

    groupMembers.find({userId},{groupId: 1}).exec()
    .then(groups => {
        if(groups.length) {
            let groupIds =  groups.map(group => {
                                return group.groupId;
                            })
            Groups.find({_id: {$in: groupIds}},{name: 1}).exec()
            .then(groups => {
                return res.status(200).send({status: "success", groups})
            })
            .catch(err => {
                return res.status(400).send({status: "error", message: "Error occured while getting your groups"})
            })          
        } else {
            return res.status(200).send({status: "success", groups: []})
        }
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Error occured while getting your groups"})
    })
})

//Get all the members of a group
router.get("/members", function(req,res) {
    let groupId = req.query.groupId;

    groupMembers.find({groupId},{userId: 1}).exec()
    .then(members => {
        return members.map(member => {
                 return member.userId
               })
    })
    .then(userIds => {
        Users.find({_id: {$in: userIds}},{_id: 1, email: 1, name: 1}).exec()
        .then(users => {
            return res.status(200).send({status: "success", users})
        })
        .catch(err => {
            return res.status(400).send({status: "error", message: "Error occured while getting members of a group"})
        })
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Error occured while getting members of a group."})
    })
})

//Create a group with logged in user as admin of group
router.post("/create", function(req,res) {
    if(!req.body.groupName) {
        return res.status(400).send({status: "error", message: "Required input missing"})
    }

    let group = new Groups({name: req.body.groupName});

    //Creating Group
    group.save()
    .then((savedGroup) => {
        //Adding user to group as 'group admin' 
        groupMembers.create({userId: req.user._id, groupId: savedGroup._id, admin: true}, function(err, result) {
            if(err) {
                return res.status(400).send({status: "error", message: "Error occured while creating group"})
            } else{
                return res.status(200).send({status: "success", message: "Group created successfully"})
            }
        })
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Error occured while creating group"})
    })
})

//Delete a Group. Only group admin can delete a group
router.delete("/", function(req,res) {
    if(!req.body.groupId) {
        return res.status(400).send({status: "error", message: "Required input missing"})
    }
    let groupId = req.body.groupId;
    
    let group$ = Groups.findById(groupId).exec()
    let groupMembers$ = groupMembers.find({groupId}).exec();

    Promise.all([group$, groupMembers$]).then(([group, gMembers]) => {
        if(!group) {
            return res.status(400).send({status: "error", message: "Group does not exists."})
        } 
        let isAdmin = false;

        //Check to see if logged in user is admin of the group
        for(let i=0;i<gMembers.length;i++) {
            if(gMembers[i]['userId'].toString() == req['user']['_id'].toString() && gMembers[i]['admin']) {
                isAdmin = true
                break;
            }
        }
        if(!isAdmin) {
            return res.status(400).send({status: "error", message: "Only group admin can delete group."})
        }

        let deleteGroupMembers$ = groupMembers.deleteMany({groupId: groupId});
        let deleteGroup$ = Groups.deleteOne({_id: groupId});

        //Delete group and all members of the group
        Promise.all([deleteGroupMembers$,deleteGroup$]).then(() => {
            return res.status(200).send({status: "success", message: "Group deleted successfully"})
        })
        .catch(err =>{
            return res.status(400).send({status: "error", message: "Something went wrong while deleting group."})
        })
    })
    .catch(err =>{
        return res.status(400).send({status: "error", message: "Something went wrong while deleting group."})
    })
})


//Add members to the group
router.post("/addMember", function(req,res) {
    if(!req.body.members || Array.isArray(req.body)) {
        return res.status(400).send({status: "error", message: "Invalid inputs"})
    }

    let groupId = req.body.groupId
    let members = req.body.members // An array of userIds
    
    //Get logged in user's details wrt to the group
    groupMembers.findOne({userId: req.user._id, groupId},{admin: 1}).exec()
    .then(member => {
        if(!member) {
            return res.status(400).send({status: "error", message: "User is not part of the group."})
        } else if(!member.admin) {
            //Throw error if user is not admin of group
            return res.status(400).send({status: "error", message: "Only group admin can add member to a group."})
        } else {
            return
        }
    })
    .then(() => {
        let membersArr = members.map(userId => {
                            return {
                                groupId,
                                userId
                            }
                        })
        //Adding multiple users to group                 
        groupMembers.create(membersArr, function(err, response) {
            if(err) {
                return res.status(400).send({status: "error", message: "Error occured while adding member to group"})
            }
            return res.status(200).send({status: "success", message: "Members added successfully"})
        })
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Error occured while adding member to group"})
    })
})

//Send message to a group
router.post("/sendMessage", function(req,res) {
    if(!req.body.groupId || !req.body.message) {
        return res.status(400).send({status: "error", message: "Missing inputs"})
    }

    let userId = req.user._id;
    let groupId = req.body.groupId;
    let message = req.body.message;

    let group$ = Groups.findById({_id: groupId},{_id: 1}).exec();
    let groupMembers$ = groupMembers.find({userId, groupId},{_id: 1}).exec();

    Promise.all([group$, groupMembers$]).then(([group, gMembers]) => {
        if(!group) {
            return res.status(400).send({status: "error", message: "Group not found"})
        } else if(!gMembers.length) {
            return res.status(400).send({status: "error", message: "You are not a member of the group"})
        } else {
            groupMessages.create({groupId, userId, message})
            .then(() => {
                return res.status(200).send({status: "success", message: "Message sent"})
            })
            .catch(err => {
                return res.status(400).send({status: "error", message: "Error occured while sending message"})
            })
        }
    })
})

//Get messages sent to a group in batches ordered in descending order
router.get("/getMessages", function(req,res) {

    let limit = parseInt(req.query.limit) || 2;
    let page = parseInt(req.query.page) || 1;

    if(!req.query.groupId) {
        return res.status(400).send({status: "error", message: "Missing inputs"})
    }

    let userId = req.user._id;
    let groupId = req.query.groupId;

    let group$ = Groups.findById({_id: groupId},{_id: 1}).exec();
    let groupMembers$ = groupMembers.find({userId, groupId},{_id: 1}).exec();

    Promise.all([group$, groupMembers$]).then(([group, gMembers]) => {
        if(!group) {
            return res.status(400).send({status: "error", message: "Group not found"})
        } else if(!gMembers.length) {
            return res.status(400).send({status: "error", message: "You are not a member of the group"})
        } else {
            groupMessages.aggregate([
                {
                    $match: {
                        groupId: group._id
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind: "$user"
                },
                {
                    $addFields: {
                        userName: "$user.name",
                        userEmail: "$user.email"
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $limit: limit*page
                },
                {
                    $skip: limit*(page-1)
                },
                {
                    $project: {
                        _id: 1,
                        groupId: 1,
                        userId: 1,
                        message: 1,
                        createdAt: 1,
                        userName: 1,
                        userEmail: 1,
                        likedBy: 1
                    }
                }
            ]).exec()
            .then(gMessages => {
                let prom = []
                gMessages.map(message => {
                    prom.push(
                        new Promise((resolve,reject) => {
                            let likedByUserIds = message['likedBy'] ? Object.keys(message['likedBy']) : []
                            if(likedByUserIds.length) {
                                return Users.find({_id: {$in: likedByUserIds}},{_id: 1, name: 1}).exec()
                                       .then(usersArr => {
                                            message['likedBy'] = usersArr
                                            resolve()
                                        })
                                        .catch(err => {
                                            resolve()
                                        })
                            } else {
                                resolve()
                            }
                        })
                    )
                })
                Promise.all(prom).then(() => {
                    res.status(200).send({status: "success", messages: gMessages})
                })
                .catch(err => {
                    return res.status(400).send({status: "error", message: "Error occured while fetching messages"})
                })
            })
            .catch(err => {
                return res.status(400).send({status: "error", message: "Error occured while fetching messages"})
            })
        }
    })
})

//Like and unlike message depending on current status
router.put("/likeMessage", function(req, res) {
    if(!req.body.messageId || !req.body.groupId) {
        return res.status(400).send({status: "error", message: "Missing inputs"})
    }
    let messageId = req.body.messageId;
    let groupId = req.body.groupId;
    let userId = req.user._id;

    let group$ = Groups.findById({_id: groupId},{_id: 1}).exec();
    let groupMembers$ = groupMembers.find({userId, groupId},{_id: 1}).exec();
    let groupMessage$ = groupMessages.findById({_id: messageId},{likedBy: 1}).exec();

    Promise.all([group$, groupMembers$, groupMessage$]).then(([group, gMembers, gMessages]) => {
        if(!group) {
            return res.status(400).send({status: "error", message: "Group not found"})
        } else if(!gMembers.length) {
            return res.status(400).send({status: "error", message: "You are not a member of the group"})
        } else {
            if(gMessages['likedBy'] && gMessages['likedBy'][userId]) {
                delete gMessages['likedBy'][userId]
            } else {
                if(gMessages['likedBy']) {
                    gMessages['likedBy'][userId] = 1
                } else {
                    gMessages['likedBy'] = {
                        [userId]: 1
                    }
                }
            }
            groupMessages.updateOne({_id: messageId}, {
                $set: {
                    likedBy: gMessages['likedBy']
                }
            }).exec()
            .then(() => {
                res.status(200).send({status: "success", messages: ""})
            })
        }
    })
    .catch(err => {
        return res.status(400).send({status: "error", message: "Something went wrong"})
    })
})

module.exports = router