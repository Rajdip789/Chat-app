const User = require('../models/userModel');
const bcrypt = require('bcrypt');


const registerLoad = async(req, res) => {
	try {
		res.render('register');
	} catch (error) {
		console.log(error);
	}
}

const register = async (req, res) => {
	try {
		
		const passwordHash = await bcrypt.hash(req.body.password, 10);

		const user = new User({
			username: req.body.name,
			email: req.body.email,
			image: 'images/' + req.file.filename,
			password: passwordHash
		});

		await user.save();

		res.render('register', { message: 'Registration successfull !!' })

	} catch (error) {
		console.log(error);
	}
}

const loginLoad = async (req, res) => {
	try {
		res.render('login');
	} catch (error) {
		console.log(error);
	}
}

const login = async (req, res) => {
	try {
		const email = req.body.email;
		const password = req.body.password;

		console.log(req.body);
		const userData = await User.findOne({ email: email });

		if(userData) {

			const passwordMatch = await bcrypt.compare(password, userData.password);

			if(passwordMatch) {
				req.session.user = userData;
				res.redirect('/dashboard');
			} else {
				res.render('login', { message: 'Incorrect password' });
			}

		} else {
			res.render('login', { message: 'User not registered or wrong credentials' })
		}

	} catch (error) {
		console.log(error);
	}
}

const logout = async (req, res) => {
	try {
		
		req.session.destroy();
		res.redirect('/');

	} catch (error) {
		console.log(error);
	}
}

const dashboard = async (req, res) => {
	try {
		
		const userList = await User.find({ _id: {$nin: [req.session.user._id] } })
		//console.log(userList);

		res.render('dashboard', { user : req.session.user, userList: userList });

	} catch (error) {
		console.log(error);
	}
}

const notFound = (req, res) => {
	res.redirect('/');
} 

module.exports = {
	registerLoad,
	register,
	loginLoad,
	login,
	logout,
	dashboard,
	notFound
}