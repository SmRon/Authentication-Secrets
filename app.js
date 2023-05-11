//jshint esversion:6
require('dotenv').config() //https://www.npmjs.com/package/dotenv
const express = require ("express");
const bodyParser = require ("body-parser");
const ejs = require ("ejs");
const mongoose = require ("mongoose");
const md5 = require ("md5");


mongoose.connect(process.env.MONGO_CONNECT);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});


const User = new mongoose.model("User", userSchema);

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.get("/", function(req, res){
  res.render("home");
});
app.get("/login", function(req, res){
  res.render("login");
})
app.get("/register", function(req, res){
  res.render("register");
})

app.get("/submit", function(req, res){
  res.render("submit");
});

app.post("/register", function(req, res){
  const newUser = new User({
    email: req.body.username,
    password: md5(req.body.password)
  });
  newUser.save()
    .then(() => {
      res.render("secrets");
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/login", function(req, res){
  const username = req.body.username;
  const password = md5(req.body.password);
console.log(username + "  " + password);
User.findOne({email: username})
   .then((foundUser) => {
     if (foundUser.password === password) {
       res.render("secrets");
     } else {
       console.log("Wrong email or password");
     }
   })
   .catch((err) => {
     console.log(err);
   });
});


app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
