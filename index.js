var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel = require("./posts");
const passport = require('passport');
const path = require('path');
const localStrategy = require ("passport-local");
const UserExistsError = require('passport-local-mongoose').UserExistsError;
const upload = require('./multer');
passport.use(new localStrategy (userModel.authenticate()));

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/profile', isloggedIn, async function(req,res,next){
  const user = await userModel.findOne({
    username: req.session.passport.user
  })
  .populate("posts")
  res.render("profile", {user});
})

router.get("/login",function(req,res,next){
  res.render('login', {error: req.flash('error')});
})
router.post("/register", async (req, res, next) => {
  const { username, email, fullname, password } = req.body;

  try {
    if (!password) {
      return res.status(400).render('register', { error: 'Password is required.' });
    }

    const userData = new userModel({ username, email, fullname });
    await userModel.register(userData, password);

    passport.authenticate("local")(req, res, () => {
      res.redirect('/profile');
    });
  } catch (err) {
    if (err instanceof UserExistsError) {
      // User with the provided email or username already exists
      return res.status(400).render('register', { error: 'The email or username is already in use.' });
    }

    console.error('Error registering user:', err);
    res.status(500).render('register', { error: 'Internal Server Error' }); // Adjust this to your template engine and view
  }
});


router.post('/login', passport.authenticate("local",{
  successRedirect: "/profile",
  failureRedirect: "/login",
  failureFlash: true,
}), function(req,res, next){

})

router.post('/upload', isloggedIn, upload.single('file'),async function (req, res,next){
  // Access the uploaded file details via req.file
  if (!req.file) {
    return res.status(400).send('No files were uploaded.');
  }
 const user = await userModel.findOne({username: req.session.passport.user});
 const postinformation= await postModel.create({
  image: req.file.filename,
  imageText: req.body.filecaption,
  user: user._id
 });
 user.posts.push(postinformation._id);
 await user.save();
 res.render('/profile');
});




router.get("/logout", function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
})


function isloggedIn(req,res, next){
  if(req.isAuthenticated()) return next();
  res.redirect("/");
}

module.exports = router;
