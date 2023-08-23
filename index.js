const express = require('express');
const http = require('http')
const dotenv = require("dotenv");
const socketio =  require('socket.io');
const port = process.env.PORT || 5000
require('./passport')
require('./db/conn');

const User = require('./models/userModel');
const Chat = require('./models/chatModel');
const GroupChat = require('./models/groupChatModel');

dotenv.config();
const app = express();


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/', require('./routes/userRoute'));


const server = http.Server(app);
const io = socketio(server);

const uns = io.of('/user-namespace');

let connectedUsers = {};

/**
 * Socket-IO server implementation on connection
 */

uns.on('connection', async (socket) => {

	const user_id = socket.handshake.auth.token;

	// Whenever a user connects store his socket id for future use
	connectedUsers[user_id] = socket.id;

	Object.keys(connectedUsers).forEach(function(key) {
		console.log("user_id: " + connectedUsers[key]);
	});

	// Update the online status of user whenever connects and broadcast the status

	await User.findByIdAndUpdate({ _id: user_id }, { $set: { isOnline: true } });
	socket.broadcast.emit('getOnlineUser', { user_id : user_id });

	//This event triggers when the user logs out, closes the browser tab or internet disconnected

	socket.on('disconnect', async () => {
		console.log('User Disconnected');

		//delete the socket id of the disconnected user from the list
		delete connectedUsers.user_id;

		await User.findByIdAndUpdate({ _id: user_id }, { $set: { isOnline: false } });

		await User.collection.updateOne({ _id: user_id }, { $currentDate: { updatedAt: true } });

		//Broadcast the offline status of the user

		socket.broadcast.emit('getOfflineUser', { user_id : user_id, lastSeen: new Date() })
	})


	/**
	 * One-to-one Chatting implementation 
	 */

	socket.on('newChat', (data, receiver_id) => {
		socket.broadcast.to(connectedUsers[receiver_id]).emit('loadNewChat', data);
	})

	// Loading old chats

	socket.on('loadOldChat', async (data) => {
	    const oldChats = await Chat.find({ $or: [
			{ sender_id: data.sender_id, receiver_id: data.receiver_id },
			{ sender_id: data.receiver_id, receiver_id: data.sender_id }
		] })

		socket.emit('receiveOldChat', { oldChats : oldChats });
	})

	// Delete Chat

	socket.on('chatDeleted', (chat_id, receiver_id) => {
		socket.broadcast.to(connectedUsers[receiver_id]).emit('deleteChat', chat_id);
	})

	/**
	 * Group Chatting implementation
	 */

	socket.on('newGroupChat', (data) => {
		socket.broadcast.emit('loadNewGroupChat', data);
	})

	// Loading old group chats

	socket.on('loadOldGroupChat', async (data) => {
	    const oldGroupChats = await GroupChat.find({ group_id: data.group_id }).populate('sender_id');

		socket.emit('receiveOldGroupChat', { oldGroupChats : oldGroupChats });
	})

	// Delete Group Chat

	socket.on('groupChatDeleted', (chat_id) => {
		socket.broadcast.emit('deleteGroupChat', chat_id);
	})


	/**
	 * Signaling Server Implementation for WebRTC
	 */

	socket.on('mediaOffer', async (data) => {
		const user = await User.findOne({ _id: data.from});
		const { password, ...callerData } = user._doc;

		socket.broadcast.to(connectedUsers[data.to]).emit('mediaOffer', { from: data.from, caller: callerData, offer: data.offer, callType: data.callType });
	});

	socket.on('mediaAnswer', data => {
		socket.broadcast.to(connectedUsers[data.to]).emit('mediaAnswer', { from: data.from, answer: data.answer });
	});

	socket.on('iceCandidate', data => {
		socket.broadcast.to(connectedUsers[data.to]).emit('remotePeerIceCandidate', { candidate: data.candidate });
	})

	socket.on('muteNotification', data => {
		socket.broadcast.to(connectedUsers[data.to]).emit('muteNotification', { from: data.from, muteState: data.muteState });
	});

	socket.on('callDisconnect', data => {
		socket.broadcast.to(connectedUsers[data.to]).emit('callDisconnect', { from: data.from, callType: data.callType });
	})
	
});

server.listen(port, () => {
	console.log('Server is running');
});	