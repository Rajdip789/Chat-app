const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const dotenv = require("dotenv");
const axios = require('axios');
const fs = require('fs');
const uniqid = require('uniqid');
dotenv.config();

const User = require('./models/userModel');

passport.use(new GoogleStrategy({

	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: `${process.env.ORIGIN_URL}/google/callback`	
	},

	async (accessToken, refreshToken, profile, done) => {

		const currentUser = await User.findOne({ email : profile.emails[0].value});
		if(currentUser) {
						
			done(null, currentUser);

		} else {

			const id = uniqid();
			axios({
				method: 'get',
				url: profile.photos[0].value,
				responseType: 'stream',
			})
			.then(function (response) {
				response.data.pipe(fs.createWriteStream(`public/images/${id}.jpg`));
			})
			.catch(function (error) {
				console.log(error);
			});

			const newUser = new User({
				username : profile.displayName,
				email : profile.emails[0].value,
				password: "98/034#49834r30/u03452#$wu2#$59fse/023",
				image: 'images/' + `${id}.jpg`
			})

			await newUser.save();
			console.log("New user created")
			done(null, newUser);
		}
	}
));

passport.serializeUser((user, done) => {
    done(null, user.id); 
});

// used to deserialize the user
passport.deserializeUser( async (id, done) => {
    const currUser = await User.findById(id)
	done(null, currUser);
});