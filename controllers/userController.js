const User = require('../models/userModel');
const Chat = require('../models/chatModel');
const Group = require('../models/groupModel');
const Member = require('../models/memberModel');
const GroupChat = require('../models/groupChatModel');

const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require("path")


const registerLoad = async (req, res) => {
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
			/*image: 'images/' + req.file.filename,*/
			password: passwordHash
		});

		await user.save();

		res.render('register', { message: 'Registration successfull !!' })

	} catch (error) {
		console.log(error);
	}
}

const loginLoad = (req, res) => {
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

		const userData = await User.findOne({ email: email });

		if (userData) {

			const passwordMatch = await bcrypt.compare(password, userData.password);

			if (passwordMatch) {
				req.session.user = userData;
				res.cookie('user', JSON.stringify(userData));
				res.redirect('/dashboard');
			} else {
				res.render('login', { message: 'Incorrect password !!' });
			}

		} else {
			res.render('login', { message: 'User not registered or wrong credentials !!' })
		}

	} catch (error) {
		console.log(error);
	}
}

const logout = async (req, res) => {
	try {

		res.clearCookie('user');
		req.session.destroy();
		res.redirect('/');

	} catch (error) {
		console.log(error);
	}
}

const dashboard = async (req, res) => {
	try {

		const userList = await User.find({ _id: { $nin: [req.session.user._id] } })
		//console.log(userList);

		res.render('dashboard', { user: req.session.user, userList: userList });

	} catch (error) {
		console.log(error);
	}
}

const notFound = (req, res) => {
	res.redirect('/');
}

const saveChat = async (req, res) => {
	try {

		const chat = new Chat({
			sender_id: req.body.sender_id,
			receiver_id: req.body.receiver_id,
			message: req.body.message
		})

		const newChat = await chat.save();
		res.status(200).send({ success: true, message: 'Chat stored successfully !!', data: newChat });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const deleteChat = async (req, res) => {
	try {

		await Chat.deleteOne({ _id: req.body.chat_id });

		res.status(200).send({ success: true, message: 'Chat deleted successfully !!' });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const updateChat = async (req, res) => {
	try {

		await Chat.findByIdAndUpdate({ _id: req.body.chat_id }, {
			$set: {
				message: req.body.message
			}
		});

		res.status(200).send({ success: true, message: 'Message updated successfully !!' });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const loadGroups = async (req, res) => {
	try {

		const myGroups = await Group.find({ admin_id: req.session.user._id });
		const joinedGroups = await Member.find({ member_id: req.session.user._id }).populate('group_id');

		res.render('group', { user: req.session.user, myGroups: myGroups, joinedGroups: joinedGroups });

	} catch (error) {
		console.log(error);
	}
}

const createGroup = async (req, res) => {
	try {

		const group = new Group({
			admin_id: req.session.user._id,
			name: req.body.name,
			description: req.body.description,
			image: 'images/' + req.file.filename
		})

		await group.save();

		console.log('Group createddddddddd');
		// const groups = await Group.find({ admin_id: req.session.user._id });

		// res.render('group', { success: true, message: 'Group created successfully', user: req.session.user, groupList: groups });
		res.status(303).redirect('/groups');
	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const getMembers = async (req, res) => {
	try {

		const allUsers = await User.aggregate([
			{
				$lookup: {
					from: "members",
					localField: "_id",
					foreignField: "member_id",
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ["$group_id", new ObjectId(req.body.group_id)] }
									]
								}
							}
						}
					],
					as: "member"
				}
			},
			{
				$match: {
					"_id": {
						$nin: [new ObjectId(req.session.user._id)]
					}
				}
			}
		]);

		res.status(200).send({ success: true, message: 'Get users successfully !!', data: allUsers });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const addMembers = async (req, res) => {
	try {

		if (!req.body.members) {

			res.status(200).send({ success: false, message: 'No members to add' });

		} else if (req.body.members.length > 10) {

			res.status(200).send({ success: false, message: 'Cannot add more than 10 members' });

		} else {

			console.log(req.body.group_id);
			await Member.deleteMany({ group_id: req.body.group_id });

			let data = [];
			const members = req.body.members;

			for (let i = 0; i < members.length; i++) {
				data.push({
					group_id: req.body.group_id,
					member_id: members[i]
				});
			}

			await Member.insertMany(data);

			res.status(200).send({ success: true, message: 'Members added successfully !!' });
		}

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const updateGroup = async (req, res) => {
	try {

		let updateObj;

		updateObj = {
			name: req.body.name,
			description: req.body.description
		}

		if (req.file != undefined) {
			updateObj['image'] = 'images/' + req.file.filename
		}

		await Group.findByIdAndUpdate({ _id: req.body.group_id }, {
			$set: updateObj
		});

		res.status(200).send({ success: true, message: 'Group updated successfully' });
	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const deleteGroup = async (req, res) => {
	try {

		const groupData = await Group.findOne({ _id: req.body.group_id });
		const filePath = path.resolve("./") + "/public/" + groupData.image;

		fs.unlink(filePath, (err) => {
			if (err) {
				console.error(err);
				return;
			}
		});

		await Group.deleteOne({ _id: req.body.group_id });
		await Member.deleteMany({ group_id: req.body.group_id });

		res.status(200).send({ success: true, message: 'Group deleted successfully' });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const shareGroup = async (req, res) => {
	try {

		let groupData = await Group.findOne({ _id: req.params.id });


		if (!groupData) {

			res.render('notfound', { message: '404 group not found' });

		} else if (req.session.user == undefined) {

			res.render('notfound', { message: 'You should be logged in for joining group' });

		} else {

			let totalMembers = await Member.count({ group_id: req.params.id });
			let available = 10 - totalMembers;

			let isAdmin = groupData.admin_id == req.session.user._id ? true : false;
			let isJoind = await Member.count({ group_id: req.params.id, member_id: req.session.user._id });

			let resData = {
				group: groupData,
				totalMembers: totalMembers,
				available: available,
				isAdmin: isAdmin,
				isJoined: isJoind
			};

			res.render('group', { user: req.session.user, GroupJoinResData: resData });
		}


	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const joinGroup = async (req, res) => {
	try {

		const member = new Member({
			group_id: req.body.group_id,
			member_id: req.session.user._id
		});

		await member.save();

		res.send({ success: true, message: 'Joined the Group Successfully !' });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const leaveGroup = async (req, res) => {
	try {

		await Member.deleteOne({ group_id: req.body.group_id, member_id: req.session.user._id });

		res.send({ success: true, message: 'Left Group Successfully !' });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const saveGroupChat = async (req, res) => {
	try {

		const chat = new GroupChat({
			sender_id: req.body.sender_id,
			group_id: req.body.group_id,
			message: req.body.message
		})

		const newChat = await chat.save();

		const chatDetailed = await GroupChat.find({ _id: newChat._id }).populate('sender_id');

		res.status(200).send({ success: true, message: 'Chat stored successfully !!', data: chatDetailed });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const deleteGroupChat = async (req, res) => {
	try {

		await GroupChat.deleteOne({ _id: req.body.chat_id });

		res.status(200).send({ success: true, message: 'Group chat deleted successfully !!' });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const loadProfile = async (req, res) => {
	try {
		res.render('profile', { user: req.session.user });
	} catch (error) {
		console.log(error);
	}
}

const deleteProfile = async (req, res) => {
	try {

		const image = req.session.user.image;
		const user_id = req.session.user._id;
		console.log(image);

		if(image !== "images/default.png") {
			const filePath = path.resolve("./") + "/public/" + image;

			fs.unlink(filePath, (err) => {
				if (err) {
					console.error(err);
					return;
				}
			});
		}

		await User.deleteOne({ _id: user_id });
		await Member.deleteMany({ member_id: user_id });
		
		await Group.deleteMany({ admin_id: user_id });
		await GroupChat.deleteMany({ sender_id: user_id });
		await Chat.deleteMany({ $or: [{ sender_id : user_id }, { receiver_id: user_id }] });

		res.clearCookie('user');
		req.session.destroy();
		
		res.status(200).send({ success: true, message: 'Pofile deleted successfully !!' });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

const updateProfile = async (req, res) => {
	try {

		const image = req.session.user.image;
		const user_id = req.session.user._id;

		const filePath = path.resolve("./") + "/public/" + image;

		fs.unlink(filePath, (err) => {
			if (err) {
				console.error(err);
				return;
			}
		});

		await User.findByIdAndUpdate({ _id: user_id }, {
			$set: {
				image: 'images/' + req.file.filename
			}
		});

		res.status(200).send({ success: true, message: 'Pofile updated successfully !!' });

	} catch (error) {
		console.log(error);
		res.status(400).send({ success: false, message: error.message })
	}
}

module.exports = {
	registerLoad,
	register,
	loginLoad,
	login,
	logout,
	dashboard,
	notFound,
	saveChat,
	deleteChat,
	updateChat,
	loadGroups,
	createGroup,
	getMembers,
	addMembers,
	updateGroup,
	deleteGroup,
	shareGroup,
	joinGroup,
	leaveGroup,
	saveGroupChat,
	deleteGroupChat,
	loadProfile,
	deleteProfile,
	updateProfile
}