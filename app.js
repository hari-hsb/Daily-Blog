//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportlocal = require('passport-local-mongoose');
const dotenv=require('dotenv');
dotenv.config();

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: "our little secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI,{useNewUrlParser:true,useUnifiedTopology: true});


mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const storySchema=new mongoose.Schema({
  title:String,
  content:String
});
const Story=mongoose.model("Story",storySchema);

const userSchema=new mongoose.Schema({
  username:String,
  password:String,
  firstname:String,
  lastname:String,
   stories:[storySchema]
});
userSchema.plugin(passportlocal);
const User=new mongoose.model("User",userSchema);
userSchema.plugin(passportlocal);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

let id;

app.get("/",(req,res)=>
{
  res.render("home");
});
app.get("/login",(req,res)=>
{
  res.render("login");
});
app.get("/register",(req,res)=>
{
  res.render("register");
});


app.get("/compose",(req,res)=>{
  console.log("get compose");
  if(req.isAuthenticated())
  {
    res.render("compose",{"id":id});
  }
  else{
    res.redirect("/");
  }
});

app.get("/home",(req,res)=>
{
  if(req.isAuthenticated())
  {
    res.render("index",{id:id});
  }
  else{
    res.redirect("/");
  }
});


app.post("/compose",(req,res)=>
{
  const username=req.body.id;
  const title=_.lowerCase(req.body.title);
  const content=req.body.content;
  User.findOne({username:username},function(err,found)
{
  if(!err)
  {
    if(found)
    {
      console.log(found.username);

      const story=new Story({
        title:title,
        content:content
      });
      found.stories.push(story);
      found.save();
      res.redirect("/"+id);

    }
  }
});

});
app.get("/:id/:storyid",(req,res)=>{

  if(req.isAuthenticated())
  {
    console.log(req.params);
    console.log(req.params.id);
    User.findOne({username:req.params.id},(err,result)=>{
      if(!err)
      {
        if(result)
        {
          result.stories.forEach(story=>
          {
            if(story.id===req.params.storyid)
            {
              if(id===req.params.id)
              {
                res.render("profilepost",{id:id,title:story.title,content:story.content});
              }
              else{
                res.render("otherspost",{id:id,title:story.title,content:story.content});
              }
            }
          });

        }
        else{
          res.send(" no user present with given username")
        }
      }
    });
  }
  else{
    res.redirect("/");
  }

});
app.get("/:id",(req,res)=>
{
console.log(req.params.id);
  if(req.isAuthenticated())
  {

    User.findOne({username:req.params.id},function(err,result)
     {
       if(!err)
       {
         if(result)
         {
           if(id===req.params.id)
           {
             console.log("self profile");
              res.render("profile",{stories:result.stories,id:id});
            }
           else{
             console.log("other profile");
               res.render("otherprofile",{id:id,name:result.firstname,stories:result.stories});
           }
         }
         else{
           res.send("Invalid URL");
         }
       }else{
         console.log(err);
       }

     });
  }
  else{
    res.redirect("/");
  }

});

app.post("/login",(req,res)=>
{
  const user=new User({
     username:req.body.username,
  password:req.body.password
});

req.login(user,function(err){
  if(!err)
  {
    passport.authenticate("local")(req, res, function() {
      id=req.body.username;

    res.redirect("/home")
    });
  }
  else{
    console.log("ERror:" ,err);
    res.redirect("/register");
  }
});

});
app.post("/register",(req,res)=>
{
  const newUser=new User({
    username:req.body.username,
    firstname:req.body.firstname,
    lastname:req.body.lastname
  });
  console.log(newUser);
  User.register(newUser,req.body.password,(err,user)=>{
    if(!err)
    {
      passport.authenticate("local")(req, res, function() {
        id=req.body.username;
        res.render("welcome",{id:id});
      });
    }
    else{
      console.log("ERror:" ,err);
      res.redirect("/register");
    }
  });
});

app.listen(3000,(req,res)=>
{
  console.log("listening at port 3000");
});
