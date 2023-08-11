import dotenv from "dotenv"
dotenv.config()
import bcrypt from 'bcrypt'
import bodyParser from "body-parser";
import express from "express";
import mongoose from "mongoose";

const saltRounds = 10

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});



const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.post("/register", async (req, res) => {
  bcrypt.hash(req.body.password,saltRounds, (err,hash)=>{
    const newUser = new User({
      email: req.body.username,
      password: hash,
    });
    console.log(newUser);
    try {
       newUser.save();
      console.log("User succesfully added");
      res.render("secrets");
    } catch (error) {
      console.log(err);
    }
  })
 
});

app.post("/login", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;
  console.log(email, password);

  try {
    const username = await User.findOne({ email: email });

    if (username) {
      bcrypt.compare(password, username.password, function(err, result) {
        if(result === true){
          res.render('secrets')
        }
    });
    } else {
      console.log("handle whatever");
    }
  } catch (error) {
    console.log(error);
  }
});
