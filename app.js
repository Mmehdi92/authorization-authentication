import dotenv from "dotenv"
dotenv.config()
import md5 from "md5";
import bodyParser from "body-parser";
import express, { response } from "express";
import mongoose from "mongoose";
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
  const newUser = new User({
    email: req.body.username,
    password: md5(req.body.password),
  });
  console.log(newUser);
  try {
    await newUser.save();
    console.log("User succesfully added");
    res.render("secrets");
  } catch (error) {
    console.log(err);
  }
});

app.post("/login", async (req, res) => {
  const email = req.body.username;
  const password = md5(req.body.password);
  console.log(email, password);

  try {
    const username = await User.findOne({ email: email });

    if (username) {
      if(username.password === password){
        res.render("secrets");
      }
    } else {
      console.log("handle whatever");
    }
  } catch (error) {
    console.log(error);
  }
});
