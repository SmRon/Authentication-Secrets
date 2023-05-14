//jshint esversion:6
require('dotenv').config() //https://www.npmjs.com/package/dotenv
const express = require ("express");
const bodyParser = require ("body-parser");
const ejs = require ("ejs");
const mongoose = require ("mongoose");
const session = require ("express-session"); //https://www.npmjs.com/package/express-session
const passport = require ("passport"); //https://www.passportjs.org/concepts/authentication/login/
const passportLocalMongoose = require ("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_CONNECT);


const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String,
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"]})
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}).exec()
  .then(foundUsers => {
    if (foundUsers) {
      res.render("secrets", {usersWithSecrets: foundUsers});
    }
  }).catch(err => {console.log(err);})

});
app.get("/logout", function(req, res){
  req.logout(function(err) {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
      });
    };
  });
});

app.post("/login", function(req, res){
 const user = new User({
   username: req.body.username,
   password: req.body.password
 });

 req.login(user, function(err){
   if (err) {
     console.log(err);
     res.redirect("/register");
   } else {
     passport.authenticate("local")(req, res, function(){
       res.redirect("/secrets");
     });
   }
 });
});

app.post("/submit", function(req, res){
const subbmittedSecret = req.body.secret;
console.log(req.user);
User.findById(req.user.id).exec()
.then(foundUser => {
  console.log(foundUser);
  if(foundUser){
    foundUser.secret = subbmittedSecret;
    foundUser.save()
    .then(() => {
      res.redirect("/secrets");
    })
    .catch(err => {
      console.log(err);
    });
  }
}).catch(err => {console.log(err);});
});


app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
