const express = require('express');
const http = require('http')
const dotenv = require("dotenv");
const socketio =  require('socket.io');
const port = process.env.MONGO_URL || 5000
require('./db/conn');
const User = require('./models/userModel');

dotenv.config();
const app = express();


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/', require('./routes/userRoute'));


const server = http.Server(app);
const io = socketio(server);

const uns = io.of('/user-namespace');

uns.on('connection', async (socket) => {

	console.log('User Connected');

	const user_id = socket.handshake.auth.token;

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
});

server.listen(port, () => {
	console.log('Server is running');
});	