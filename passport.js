const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const passport = require('passport');
const dotenv = require("dotenv");
const cloudinary = require('./config/cloudinaryConfig');
dotenv.config();

const User = require('./models/userModel');

function generateRandomPassword(length) {
	return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

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

			const res = await cloudinary.uploader.upload(profile.photos[0].value, {  
				folder: 'user-profiles'
			});

			const passwordHash = await bcrypt.hash(generateRandomPassword(22), 10);

			const newUser = new User({
				username : profile.displayName,
				email : profile.emails[0].value,
				password: passwordHash,
				image: res.secure_url
			})

			await newUser.save();
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