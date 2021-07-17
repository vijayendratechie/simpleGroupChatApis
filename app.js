const express = require('express')
const mongoose = require('mongoose')
const passport = require('passport')
const bodyparser = require('body-parser')
const session = require("express-session")
const localStrategy = require('passport-local').Strategy;
const mongoStore = require('connect-mongo');
const permissionCheck = require("./lib/permissionCheck")


const Users = require("./models/users")


const userController = require('./controllers/users')
const groupController = require('./controllers/groups')
const authController = require('./controllers/auth')

dbUrl = 'mongodb+srv://vijju:vijju@cluster0-ex1xq.mongodb.net/staticGroupChat?retryWrites=true&w=majority&ssl=true'

var app = express()

app.use(session({
	secret : 'key',
	resave : false,
	saveUninitialized : false,
    store: mongoStore.create({ 
        mongoUrl: dbUrl,
        ttl: 24 * 60 * 60 * 1000
    }),
    cookie: { maxAge: 60 * 60 * 1000}
}));

app.use(bodyparser());
app.use(passport.initialize());
app.use(passport.session());


const port=process.env.PORT || 3000
app.listen(port,function()
{
	console.log(`listen to port ${port}`);
});

//Db connection
mongoose.connect(dbUrl, 
				{ useNewUrlParser: true, useUnifiedTopology: true})
                .catch(err => {
                    console.log("===mongo connection error: ",err)
                });                
                
passport.use(new localStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
    },
    function(request, email, password, done) {
        Users.findOne({ email }, function(err, user) {
            if (err) { return done(err); }
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            user.validatePassword(password)
            .then(validPassword => {
                if(validPassword) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Incorrect password.' });
                }
            })
            .catch(err => {
                return done(null, false, { message: 'Password validation failed. Please try again' });
            })
        });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
    
passport.deserializeUser(function(id, done) {
    Users.findById(id, function(err, user) {
        done(err, user);
    });
});

app.get("/", function(req,res) {
    res.status("200").send({status: "success", message: "Home Page Loaded"})
})

app.use('/auth', authController)

//Middleware to check if user is authenticated before accessing any of the below routes
app.use(permissionCheck.authentication())

app.use('/user', userController)
app.use('/group', groupController)
