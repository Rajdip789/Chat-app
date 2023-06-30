const express = require('express');
const user_route = express();
const path = require('path');
const multer = require('multer');
const session = require('express-session')
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

user_route.use(express.static('public'));
user_route.use(
	session({
	  resave: false,
	  saveUninitialized: false,
	  secret: process.env.SESSION_SECRET,
	})
  );


user_route.get('/register', auth.isLogout, userController.registerLoad);
user_route.post('/register', upload.single('image'), userController.register);

user_route.get('/', auth.isLogout, userController.loginLoad);
user_route.post('/', userController.login);

user_route.get('/logout', auth.isLogin, userController.logout);

user_route.get('/dashboard', auth.isLogin, userController.dashboard);
user_route.get('*', userController.notFound);


module.exports = user_route;