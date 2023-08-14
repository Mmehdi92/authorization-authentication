import dotenv from "dotenv";
dotenv.config();
import bodyParser from "body-parser";
import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import passportLocalMonogoose from "passport-local-mongoose";
import GoogleStrategy from "passport-google-oauth20";
import OutlookStrategy from "passport-outlook";
import findOrCreate from "mongoose-findorcreate";

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);
      User.findOrCreate({ Id: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

passport.use(
  new OutlookStrategy(
    {
      clientID: process.env.OUTLOOK_CLIENT_ID,
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/outlook/secrets",
      passReqToCallback: true,
    },
    function (req, accessToken, refreshToken, profile, done) {
      var user = {
        Id: profile.id,
        name: profile.DisplayName,
        email: profile.EmailAddress,
        accessToken: accessToken,
      };
      if (refreshToken) user.refreshToken = refreshToken;
      if (profile.MailboxGuid) user.mailboxGuid = profile.MailboxGuid;
      if (profile.Alias) user.alias = profile.Alias;
      User.findOrCreate({ Id: profile.id }, function (err, user) {
        return done(err, user);
      });
    }
  )
);

mongoose.connect(process.env.DBCONNECTION);
const secretSchema = new mongoose.Schema({
  title: String
})
const userSchema = new mongoose.Schema({
  username: {
    type:String,
    unique: true,
  },
  Id: String,
  email: String,
  password: String,
  secrets: {
    type: Array
  }
});

userSchema.plugin(passportLocalMonogoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);
const Secret = new mongoose.model("Secret", secretSchema)

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/outlook",
  passport.authenticate("windowslive", {
    scope: [
      "openid",
      "profile",
      "offline_access",
      "https://outlook.office.com/Mail.Read",
    ],
  })
);

app.get(
  "/auth/outlook/secrets",
  passport.authenticate("windowslive", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secret.
    res.redirect("/secrets");
  }
);

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secret.
    res.redirect("/secrets");
  }
);

app.get("/secrets", async (req, res) => {
  try {
    const allUsersWithSecrets = await User.find({ secrets: { $ne: [] } });
    const allSecrets = allUsersWithSecrets.flatMap(user => user.secrets);
    
    res.render("secrets", { secrets: allSecrets });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.post("/register", async (req, res) => {
  const newUser = {
    // Other necessary fields like email, password, etc.
  };

  // Determine which authentication strategy was used
  if (req.body.authStrategy === "google") {
    newUser.googleId = req.body.profileId; // Use the appropriate field from the Google profile
  } else if (req.body.authStrategy === "outlook") {
    newUser.outlookId = req.body.profileId; // Use the appropriate field from the Outlook profile
  }

  User.register(newUser, req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/login", async (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.logIn(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", async (req, res) => {
  const secret = req.body.secret;

  try {
    const foundUser = await User.findById(req.user.id);
    if (foundUser) {
     foundUser.secrets.push(secret)
      await foundUser.save();
    }
  } catch (error) {
    console.log(error);
  }

  res.redirect("/secrets");
});
