const express = require('express');
const http = require('http')
const dotenv = require("dotenv");
const socketio =  require('socket.io');
const port = process.env.MONGO_URL || 5000
require('./db/conn');
const User = require('./models/userModel');
const Chat = require('./models/chatModel');

dotenv.config();
const app = express();


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/', require('./routes/userRoute'));


const server = http.Server(app);
const io = socketio(server);

const uns = io.of('/user-namespace');

let connectedUsers = {};

uns.on('connection', async (socket) => {

	console.log('User Connected');

	const user_id = socket.handshake.auth.token;
	connectedUsers[user_id] = socket.id;

	await User.findByIdAndUpdate({ _id: user_id }, { $set: { isOnline: true } });

	//Broadcast the online status of the user

	socket.broadcast.emit('getOnlineUser', { user_id : user_id });

	socket.on('disconnect', async () => {
		console.log('User Disconnected');

		await User.findByIdAndUpdate({ _id: user_id }, { $set: { isOnline: false } });

		//await User.collection.updateOne({ _id: user_id }, { $currentDate: { updatedAt: true } });

		//Broadcast the offline status of the user

		socket.broadcast.emit('getOfflineUser', { user_id : user_id })
	})

	//chatting implementation

	socket.on('newChat', (data, receiver_id) => {
		socket.broadcast.to(connectedUsers[receiver_id]).emit('loadNewChat', data);
	})


	//loading old chats

	socket.on('loadOldChat', async (data) => {
	    const oldChats = await Chat.find({ $or: [
			{ sender_id: data.sender_id, receiver_id: data.receiver_id },
			{ sender_id: data.receiver_id, receiver_id: data.sender_id }
		] })

		socket.emit('receiveOldChat', { oldChats : oldChats });
	})


	//Delete Chat

	socket.on('chatDeleted', (chat_id, receiver_id) => {
		socket.broadcast.to(connectedUsers[receiver_id]).emit('deleteChat', chat_id);
	})

});

server.listen(port, () => {
	console.log('Server is running');
});	