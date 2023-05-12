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
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://titkos.herokuapp.com/auth/google/secrets",
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
    res.redirect("/secrets");
  });
app.get("/login", function(req, res){
  res.render("login");
});
app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  if (req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});
app.get("/logout", function(req, res){
  req.logout(function(err){
    if (err) {
      console.log(err);
      res.redirect("secrets");
    } else {
      res.redirect("/");
    }
  });
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
   } else {
     passport.authenticate("local")(req, res, function(){
       res.redirect("/secrets");
     });
   };
 });
});


app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
