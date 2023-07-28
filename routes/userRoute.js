const express = require('express');
const user_route = express();
const path = require('path');
const multer = require('multer');
const session = require('express-session')
const cookieParser = require('cookie-parser');
const passport = require('passport');

const userController = require('../controllers/userController');
const auth = require('../middlewares/auth')


const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, '../public/images'));
	},
	filename: (req, file, cb) => {
		const name = Date.now()+'-'+file.originalname;
		cb(null, name);
	}
});

const upload = multer({ storage: storage });


user_route.set('view engine', 'ejs');
user_route.set('views', './views');

user_route.use(cookieParser());
user_route.use(express.static('public'));
user_route.use(
	session({
	  resave: false,
	  saveUninitialized: false,
	  secret: process.env.SESSION_SECRET,
	})
);

user_route.use(passport.initialize())
user_route.use(passport.session());

user_route.get("/google", passport.authenticate("google", { scope : ["profile", "email"] }));

user_route.get("/google/callback", passport.authenticate("google"), (req, res) => {

	req.session.user = req.user;
	res.cookie('user', JSON.stringify(req.user));
	res.redirect('/dashboard');

})


user_route.get('/register', auth.isLogout, userController.registerLoad);
user_route.post('/register', userController.register);

user_route.get('/', auth.isLogout, userController.loginLoad);
user_route.post('/', userController.login);

user_route.get('/logout', auth.isLogin, userController.logout);

user_route.get('/dashboard', auth.isLogin, userController.dashboard);

user_route.post('/save-chat', userController.saveChat);
user_route.post('/delete-chat', userController.deleteChat);
user_route.post('/update-chat', userController.updateChat);

user_route.get('/groups', auth.isLogin, userController.loadGroups);
user_route.post('/groups', auth.isLogin, upload.single('image'), userController.createGroup);

user_route.post('/update-group', auth.isLogin, upload.single('image'), userController.updateGroup);
user_route.post('/delete-group', auth.isLogin, userController.deleteGroup);

user_route.post('/get-members', auth.isLogin, userController.getMembers);
user_route.post('/add-members', auth.isLogin, userController.addMembers);

user_route.get('/share-group/:id', auth.isLogin, userController.shareGroup);
user_route.post('/join-group', auth.isLogin, userController.joinGroup);
user_route.post('/leave-group', auth.isLogin, userController.leaveGroup);

user_route.post('/save-group-chat', userController.saveGroupChat);
user_route.post('/delete-group-chat', userController.deleteGroupChat);

user_route.get('/profile', auth.isLogin, userController.loadProfile);
user_route.post('/update-profile', upload.single('image'), userController.updateProfile);
user_route.post('/delete-profile', auth.isLogin, userController.deleteProfile);


user_route.get('*', userController.notFound);

module.exports = user_route;