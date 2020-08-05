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

let id=null;

app.get("/",(req,res)=>
{
  if(req.isAuthenticated())
  {

    res.render("indexx",{vis:"visi",id:id});
  }
  else{

    res.render("indexx",{vis:"invi",id:id});
  }

});
app.get("/login",(req,res)=>
{
  if(!req.isAuthenticated())
  {
    res.render("login");
  }
  else{
    res.redirect("/");
  }
});
app.get("/register",(req,res)=>
{
  if(!req.isAuthenticated())
  {
    res.render("register");
  }
  else{
    res.redirect("/");
  }
});

app.get("/logout",(req,res)=>
{
  req.logout();
  res.redirect("/");
})
app.get("/compose",(req,res)=>{

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
    res.render("home",{id:id});
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
app.post("/:id/:storyid",(req,res)=>{

var url="/"+req.params.id+"/"+req.params.storyid;
  if(req.isAuthenticated())
  {
    if(id===req.params.id)
    {
      User.updateOne({"username":id,"stories._id":req.params.storyid},
      {$set:{"stories.$.title":req.body.title,"stories.$.content":req.body.content}},
    function(err)
  {
    if(!err)
    {
      res.redirect(url);
    }
    else{
      console.log(err);
    }
  });
    }
    else{
      res.send("invald URL");
    }
  }
  else{
    res.redirect("/");
  }

});
app.get("/:id/:storyid",(req,res)=>{

  if(req.isAuthenticated())
  {

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
                res.render("profilepost",{storyid:req.params.storyid,id:id,title:story.title,content:story.content});
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
app.get("/:id/:storyid/edit",(req,res)=>{

  if(req.isAuthenticated())
  {

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
                res.render("edit",{id:id,title:story.title,content:story.content,storyid:story._id});
              }
              else{
                res.send("Invalid Url");
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

              res.render("profile",{stories:result.stories,id:id,name:result.firstname,name2:result.lastname});
            }
           else{

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
    console.log("Error:" ,err);
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
