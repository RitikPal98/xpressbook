//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const multer = require("multer");
const cloudinary = require("cloudinary");
const fileupload = require("express-fileupload");

const app = express();

app.use(
  fileupload({
    useTempFiles: true,
  })
);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "This is a very strong secret.",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MDB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const PostSchema = new mongoose.Schema({
  content: String,
  postBy: String,
  likes: { type: Array },
  comments: [
    {
      photo: String,
      by: String,
      text: String,
    },
  ],
  shares: String,
  time: String,
});
const userDataSchema = new mongoose.Schema({
  username: String,
  fullName: String,
  email: String,
  password: String,
  googleId: String,
  userBio: String,
  followers: { type: Array },
  following: { type: Array },
  photo: String,
  notify: String,
  notifications: [
    {
      from: String,
      photo: String,
      what: String,
      idOfPost: String,
    },
  ],
});
userDataSchema.plugin(passportLocalMongoose);
userDataSchema.plugin(findOrCreate);

const User = mongoose.model("user", userDataSchema);
const MyPost = mongoose.model("Post", PostSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://xpressbook.onrender.com/auth/google/secret",
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);

      User.findOrCreate(
        {
          fullName: profile.displayName,
          photo: profile._json.picture,
          username: profile.id,
          googleId: profile.id,
        },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secret",
  passport.authenticate("google", { failureRedirect: "/user/LogIn" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);

app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("compose", {
      userphoto: req.user.photo,
      notify: req.user.notify,
    });
  } else {
    res.redirect("/user/LogIn");
  }
});

app.post("/compose", function (req, res) {
  console.log(req.user.id);
  let d = new Date().getTime();
  const post = new MyPost({
    content: req.body.postBody,
    postBy: req.user.id,
    time: d,
  });
  post.save();
  res.redirect("/notifi/" + "newCompose/" + "newpost/" + req.user.id + "/post");
  // "/notifi/"+"posts/"+req.body.postId+"/likepage"
});
//********************************************************************************
app.get("/", function (req, res) {
  if (req.isAuthenticated()) {
    let i = 0;
    let allposts = [];
    if (req.user.following.length === 0) {
      res.render("homePage", {
        posts: [],
        userphoto: req.user.photo,
        notify: req.user.notify,
      });
    }
    User.findOne({ _id: req.user.id }, function (err, currentUser) {
      if (!err) {
        currentUser.following.forEach(function (followee) {
          // console.log("followee:",followee);
          User.findOne({ username: followee }, function (error, foundFollowee) {
            MyPost.find(
              { postBy: foundFollowee._id },
              function (notFound, followeePosts) {
                followeePosts.forEach(function (singlePost) {
                  allposts.push({
                    followeePost: singlePost,
                    photo: foundFollowee.photo,
                    username: foundFollowee.username,
                  });
                });
                i = i + 1;
                if (i === currentUser.following.length) {
                  // console.log("all the posts of followees",allposts);
                  res.render("homePage", {
                    posts: allposts,
                    User: req.user.username,
                    nopostmessage: "Start Posting by Clicking the plus button",
                    userphoto: req.user.photo,
                    notify: req.user.notify,
                  });
                }
              }
            );
          });
        });
      }
    });
    // console.log(req.user.notify,"NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNnn");
  } else {
    res.redirect("/signup");
  }
});

//********************************************************************************
app.get("/user/:LoginAndSignUP", function (req, res) {
  res.render("login");
});

app.post("/signup", function (req, res) {
  console.log(req.body);
  User.register(
    {
      username: req.body.username,
      fullName: req.body.fullName,
      email: req.body.userEmail,
      photo: "/avengersicon.png",
      userBio: "Hello, It's me.",
    },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/user/LogIN");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/profile");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/");
      });
    }
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/user/LogIn");
});

//********************************************************************************
app.get("/contact", function (req, res) {
  res.render("contact");
});

app.get("/posts/:anypostname", function (req, res) {
  let userphoto = "";
  let likeAndDislike = "/likes";
  let notify = "";
  if (req.isAuthenticated()) {
    userphoto = req.user.photo;
    notify = req.user.notify;
  } else {
    userphoto = "/avengersicon.png";
  }
  let followAndunfollow = "Follow";
  let postUrl = _.lowerCase(req.params.anypostname);
  console.log(req.params.anypostname);
  MyPost.findById({ _id: req.params.anypostname }, function (err, post) {
    if (post == null) {
      res.send("<h1>This post has been deleted</h1>");
    } else {
      if (!err) {
        if (req.user == null || post == null) {
          likeAndDislike = "/likes";
        } else {
          for (i = 0; i <= post.likes.length; i++) {
            if (req.user.username === post.likes[i]) {
              likeAndDislike = "/dislikes";
            }
          }
        }
      }
      // post.likes.forEach(function(userlike){
      User.findById({ _id: post.postBy }, function (error, postuser) {
        if (req.user == null) {
          followAndunfollow = "Follow";
        } else {
          if (post.postBy === req.user.id) {
            followAndunfollow = "You";
          } else {
            postuser.followers.forEach(function (followee) {
              if (followee === req.user.username) {
                followAndunfollow = "Unfollow";
              } else {
                followAndunfollow = "Follow";
              }
            });
          }
        }
        res.render("post", {
          content: post.content,
          time: post.time,
          postBy: postuser.username,
          photo: postuser.photo,
          postId: post._id,
          postComments: post.comments,
          noOfLikes: post.likes.length,
          noOfComments: post.comments.length,
          followButton: followAndunfollow,
          userphoto: userphoto,
          likeAndDislike: likeAndDislike,
          notify: notify,
        });
      });
    }
  });
});
//================================================================================
// MyPost.findOneAndDelete({_id:"5f0bfc101256371c80d61d6c"},function(err,result){
//   if(result){console.log("Successfully DELETED");}
// });
//================================================================================

app.post("/itemlist", function (req, res) {
  let postId = req.body.items;
  MyPost.findByIdAndRemove(postId, function (err) {
    if (!err) {
      console.log("succefully Deleted the item");
      res.redirect("/profile");
    }
  });
});

app.get("/profile", function (req, res) {
  if (req.isAuthenticated()) {
    MyPost.find({ postBy: req.user.id }, function (err, result) {
      res.render("userProfile", {
        posts: result.reverse(),
        username: req.user.username,
        userId: req.user.id,
        fullName: req.user.fullName,
        userBio: req.user.userBio,
        followers: req.user.followers.length,
        following: req.user.following.length,
        uploads: result.length,
        photo: req.user.photo,
        display: "inline-block",
        follow: "people/users/all",
        followBtn: "Find",
        userphoto: req.user.photo,
        notify: req.user.notify,
      });
    });
  } else {
    res.redirect("/user/LogIn");
  }
});

app.post("/comments", function (req, res) {
  if (req.isAuthenticated()) {
    function newComment() {
      return {
        photo: req.user.photo,
        by: req.user.username,
        text: req.body.comment,
      };
    }
    let commentone = newComment();
    MyPost.updateOne(
      { _id: req.body.postId },
      { $push: { comments: commentone } },
      function (err, done) {
        if (err) {
          console.log(err);
        } else {
          console.log("Added the comment");
        }
      }
    );
    let redirectUrl = "posts/" + req.body.postId;
    res.redirect("/notifi/" + redirectUrl + "/likepage/newcomment");
    // res.redirect("/posts/"+req.body.postId);
  } else {
    res.redirect("/user/LogIn");
  }
});
app.get("/:username/profile", function (req, res) {
  if (req.isAuthenticated()) {
    if (req.params.username === "You") {
      res.redirect("/profile");
    } else {
      let editButtonDisplay = "";
      let followRedirectUrl = "";
      let followBtn = "";
      if (req.user.username === req.params.username) {
        followRedirectUrl = "people/users/all";
        editButtonDisplay = "inline-block";
        followBtn = "Find";
      } else {
        followRedirectUrl = "follow";
        editButtonDisplay = "none";
        followBtn = "Follow";
      }

      User.findOne({ username: req.params.username }, function (err, postUser) {
        postUser.followers.forEach(function (followee) {
          if (followee === req.user.username) {
            followRedirectUrl = "Unfollow";
            followBtn = "Unfollow";
          }
        });
        MyPost.find({ postBy: postUser._id }, function (err, posts) {
          res.render("userProfile", {
            posts: posts.reverse(),
            username: postUser.username,
            fullName: postUser.fullName,
            userId: postUser._id,
            userBio: postUser.userBio,
            followers: postUser.followers.length,
            following: postUser.following.length,
            uploads: posts.length,
            photo: postUser.photo,
            display: editButtonDisplay,
            follow: followRedirectUrl,
            followBtn: followBtn,
            userphoto: req.user.photo,
            notify: req.user.notify,
          });
        });
      });
    }
  } else {
    res.redirect("/user/LogIn");
  }
});

// MyPost.find({},function(err,posts){
//   posts.forEach(function(post){
//   MyPost.updateOne({_id:post._id},{likes:[]},function(err,done){
//     if(done){console.log("done")}
//   });
//   });})

app.post("/likes", function (req, res) {
  if (req.isAuthenticated()) {
    // MyPost.findOne({_id:req.body.postId},function(err,post){
    //   post.likes.forEach(function(userlike){
    //     if(userlike===req.user.username){res.redirect("/dislikes");}});});
    MyPost.updateOne(
      { _id: req.body.postId },
      { $push: { likes: req.user.username } },
      function (err, done) {
        if (err) {
          console.log(err);
        } else {
          console.log("like Successful");
          let redirectUrl = "posts/" + req.body.postId;
          res.redirect("/notifi/" + redirectUrl + "/likepage/like");
        }
      }
    );
  } else {
    res.redirect("/user/LogIn");
  }
});
//============================================================================
app.post("/dislikes", function (req, res) {
  if (req.isAuthenticated()) {
    MyPost.updateOne(
      { _id: req.body.postId },
      { $pull: { likes: req.user.username } },
      function (err, done) {
        if (err) {
          console.log(err);
        } else {
          console.log("Dislike Successful");
          // let redirectUrl="posts/"+req.body.postId;
          // res.redirect("/notifi/"+redirectUrl+"/likepage/like");
          // res.redirect("/posts/"+req.body.postId);
        }
      }
    );
  } else {
    res.redirect("/user/LogIn");
  }
});

app.post("/share", function (req, res) {
  res.json("https://xpressbook.onrender.com/posts/" + req.body.postId);
});

app.get("/people/:user/:all", function (req, res) {
  if (req.isAuthenticated()) {
    let allthefollowers = [];
    let i = 0;
    // console.log(req.params.all);
    if (req.params.user === "users") {
      User.find({}, function (err, allusers) {
        res.render("people", {
          users: allusers.reverse(),
          userphoto: req.user.photo,
          notify: req.user.notify,
        });
      });
    } else if (req.params.all === "followers") {
      User.findOne({ _id: req.params.user }, function (err, theuser) {
        if (theuser.followers.length === 0) {
          res.render("people", {
            users: [],
            userphoto: req.user.photo,
            notify: req.user.notify,
          });
        } else {
          theuser.followers.forEach(function (follower) {
            User.findOne({ username: follower }, function (err, thefollower) {
              allthefollowers.push(thefollower);
              i += 1;
              if (i === theuser.followers.length) {
                res.render("people", {
                  users: allthefollowers,
                  userphoto: req.user.photo,
                  notify: req.user.notify,
                });
              }
            });
          });
        }
      });
    } else if (req.params.all === "following") {
      User.findOne({ _id: req.params.user }, function (err, theuser) {
        if (theuser.following.length === 0) {
          res.render("people", {
            users: [],
            userphoto: req.user.photo,
            notify: req.user.notify,
          });
        } else {
          theuser.following.forEach(function (following) {
            User.findOne({ username: following }, function (err, thefollowee) {
              allthefollowers.push(thefollowee);
              i += 1;
              if (i === theuser.following.length) {
                res.render("people", {
                  users: allthefollowers,
                  userphoto: req.user.photo,
                  notify: req.user.notify,
                });
              }
            });
          });
        }
      });
    }
  } else {
    res.redirect("/user/LogIn");
  }
});

app.post("/follow", function (req, res) {
  if (req.isAuthenticated()) {
    let redirectUrl = "";
    //page teller method, profile page\
    if (req.body.postId === req.body.postuser) {
      redirectUrl = req.body.postuser + "/profile";
    } else {
      redirectUrl = "posts/" + req.body.postId;
    }

    User.updateOne(
      { username: req.body.postuser },
      { $push: { followers: req.user.username } },
      function (err, done) {
        if (err) {
          console.log(err);
        } else {
          console.log("new follower added Successfully");
        }
      }
    );
    //Adding user to following
    User.updateOne(
      { username: req.user.username },
      { $push: { following: req.body.postuser } },
      function (err, done) {
        if (err) {
          console.log(err);
        } else {
          console.log(" Now you are following to", req.body.postuser);
          res.redirect(
            "/notifi/" + redirectUrl + "/followpage/" + req.body.postuser
          );
        }
      }
    );
  } else {
    res.redirect("/user/LogIn");
  }
});

app.post("/unfollow", function (req, res) {
  if (req.isAuthenticated()) {
    let redirectUrl = "";
    //page teller method, profile page\
    if (req.body.postId === req.body.postuser) {
      redirectUrl = "/" + req.body.postuser + "/profile";
    } else {
      redirectUrl = "/posts/" + req.body.postId;
    }

    //deleting user from followers
    User.updateOne(
      { username: req.body.postuser },
      { $pull: { followers: req.user.username } },
      function (err, done) {
        if (err) {
          console.log(err);
        } else {
          console.log("Unfollowed Successfully");
        }
      }
    );
    //deleting user from following
    User.updateOne(
      { username: req.user.username },
      { $pull: { following: req.body.postuser } },
      function (error, removed) {
        if (error) {
          console.log(err);
        } else {
          console.log("Deleted the user from following list");
          res.redirect(redirectUrl);
        }
      }
    );
  } else {
    res.redirect("/user/LogIn");
  }
});
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
app.get("/edit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("profileEdit", {
      photo: req.user.photo,
      fullName: req.user.fullName,
      username: req.user.username,
      email: req.user.email,
      userBio: req.user.userBio,
      userphoto: req.user.photo,
      notify: req.user.notify,
    });
  } else {
    res.redirect("/user/LogIn");
  }
});
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
app.post("/You", function (req, res) {
  res.redirect("/posts/" + req.body.postId);
});
//==============================================================================
app.post("/update-profile-photo", function (req, res) {
  if (req.isAuthenticated()) {
    const file = req.files.image;
    cloudinary.uploader.upload(file.tempFilePath, function (result, error) {
      // console.log("result:",result);
      // console.log("error:", error);
      //croping photo
      if (result.url === undefined) {
        res.send("<h2>Check your internet connection and try again.</h2>");
      } else {
        let photoUrl =
          result.url.slice(0, 58) +
          "c_thumb,g_center,h_250,w_250/" +
          result.url.slice(58);

        //send photo url string to our database
        User.updateOne(
          { _id: req.user.id },
          { photo: photoUrl },
          function (err, updated) {
            if (!err) {
              console.log("succefully updated");
              res.redirect("/profile");
            }
          }
        );
      }
    });
  } else {
    res.redirect("/user/LogIn");
  }
});
//==============================================================================
app.post("/remove", function (req, res) {
  if (req.isAuthenticated()) {
    User.updateOne(
      { _id: req.user.id },
      { photo: "/avengersicon.png" },
      function (err, removed) {
        if (removed) {
          res.redirect("/edit");
        }
      }
    );
  }
});

app.post("/update-userdetails", function (req, res) {
  if (req.isAuthenticated()) {
    let start = "notset";
    User.findOne({ username: req.body.username }, function (err, foundUser) {
      if (req.user.username === req.body.username) {
        start = "YES";
      }
      if (!foundUser) {
        start = "YES";
      }
      if (start === "YES") {
        User.updateOne(
          { _id: req.user.id },
          {
            username: req.body.username,
            fullName: req.body.fullName,
            email: req.body.email,
            userBio: req.body.userBio,
          },
          function (err, updated) {
            if (!err) {
              console.log("succefully updated");
              res.redirect("/profile");
            }
          }
        );
      } else {
        res.send(
          "<h4 style='color:red'>Please choose another username.This username has already taken.</h4>"
        );
      }
    });
  } else {
    res.redirect("/user/LogIn");
  }
});

app.post("/people/users/all", function (req, res) {
  res.redirect("/people/users/all");
});
app.get("/notifications", function (req, res) {
  res.render("notificationPage", {
    notifications: req.user.notifications,
    userphoto: req.user.photo,
    notify: req.user.notify,
  });
});

app.get("/notifi/:page/:for/:where/:nameofuser", function (req, res) {
  if (req.isAuthenticated()) {
    let pagelink = "/" + req.params.page + "/" + req.params.for;
    let message = "";
    if (req.params.for === "newpost") {
      message = "has posted something new";
      pagelink = "/";
      User.findOne({ _id: req.user.id }, function (err, foundUser) {
        if (!err) {
          if (foundUser.followers.length === 0) {
            res.redirect("/profile");
          } else {
            foundUser.followers.forEach(function (follower) {
              User.updateOne(
                { username: follower },
                {
                  $push: {
                    notifications: {
                      from: req.user.username,
                      photo: req.user.photo,
                      what: message,
                      idOfPost: "newpost",
                    },
                  },
                },
                function (err, notified) {
                  if (notified) {
                    // console.log("notified all the users ");

                    User.updateOne(
                      { username: follower },
                      { notify: "yes" },
                      function (er, dn) {
                        // if(dn){console.log("dn notified by composing notify");}
                      }
                    );
                  }
                }
              );
            });
            res.redirect(pagelink);
          }
        }
      });
    } else {
      if (req.params.where === "likepage") {
        // console.log(req.params.for);
        MyPost.findOne({ _id: req.params.for }, function (err, foundPost) {
          if (req.params.nameofuser === "newcomment") {
            message = "commented on your post.";
            // pagelink="/"+req.params.page+"/"+req.params.for+"/#commentBox";
          } else {
            message = "❤️liked your post.";
            // pagelink="/"+req.params.page+"/"+req.params.for+"/#likebutton"
          }
          let by = req.user.username;
          if (foundPost.postBy === req.user.id) {
            by = "You";
          }

          User.updateOne(
            { _id: foundPost.postBy },
            {
              $push: {
                notifications: {
                  from: by,
                  photo: req.user.photo,
                  what: message,
                  idOfPost: req.params.for,
                },
              },
            },
            function (err, done) {
              if (done) {
                // console.log("notified","By liking");
                //Notify the user
                User.updateOne(
                  { _id: foundPost.postBy },
                  { notify: "yes" },
                  function (er, notified) {
                    //if(notified){console.log("yup Notify");}
                  }
                );

                // res.redirect(pagelink);
              }
            }
          );
        });
      } else if (req.params.where === "followpage") {
        message = "start following you";
        User.updateOne(
          { username: req.params.nameofuser },
          {
            $push: {
              notifications: {
                from: req.user.username,
                photo: req.user.photo,
                what: message,
                idOfPost: "I am a follower",
              },
            },
          },
          function (err, done) {
            if (done) {
              //Notify the user
              User.updateOne(
                { username: req.params.nameofuser },
                { notify: "yes" },
                function (er, notified) {
                  // if(notified){console.log("yup Notify");}
                }
              );
              // console.log("notified","by following");
              res.redirect(pagelink);
            }
          }
        );
      }
    }
    // console.log("redirected and notified");
  } else {
    res.redirect("/user/LogIn");
  }
});

app.get("/search", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("search", {
      userphoto: req.user.photo,
      notify: req.user.notify,
      users: [],
    });
  } else {
    res.redirect("/user/LogIn");
  }
});

app.post("/search", function (req, res) {
  let enteredValue = _.lowerCase(req.body.searchValue);
  if (req.isAuthenticated()) {
    let foundUsers = [];

    User.find({}, function (err, allusers) {
      if (!err) {
        allusers.forEach(function (user) {
          if (enteredValue === _.lowerCase(user.username)) {
            foundUsers.push(user);
          }
        });
      }
      if (1) {
        User.find({}, function (err, result) {
          if (!err) {
            result.forEach(function (foundname) {
              if (enteredValue === _.lowerCase(foundname.fullName)) {
                foundUsers.push(foundname);
                // console.log(foundname,":added to the list");
              }
            });
            res.render("search", {
              userphoto: req.user.photo,
              users: foundUsers,
              notify: req.user.notify,
            });
          }
        });
      }
    });
  } else {
    res.redirect("/user/LogIn");
  }
});
app.post("/searchpeople", function (req, res) {
  res.redirect("/search");
});
app.post("/clearNotifications", function (req, res) {
  if (req.isAuthenticated()) {
    User.updateOne(
      { _id: req.user.id },
      { notifications: [] },
      function (err, cleared) {
        if (cleared) {
          // console.log("cleared all the notifications");
          res.redirect("/notifications");
        }
      }
    );
  } else {
    res.redirect("/user/LogIn");
  }
});
// =============================================================================
app.post("/disnotify", function (req, res) {
  User.updateOne({ _id: req.user.id }, { notify: "no" }, function (err, done) {
    if (done) {
      console.log("disnotified");
      res.redirect("/notifications");
    }
  });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function () {
  console.log("Server started Successfully.");
});
