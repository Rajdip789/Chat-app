# Chatify - Real-Time Chat App

Chatify is a real-time chat application built using NodeJS and Socket.io. It allows users to have one-to-one conversations, group messaging, create and manage groups, view users' status, join groups using unique links, personalize profile views, and secure authentication using Google OAuth.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Technologies Used](#technologies-used)

## Introduction

Chatify is a project that aims to provide a user-friendly and secure real-time chat application. It allows users to interact with other users through one-to-one chats, group messaging or voice & video calls. Additionally, users can create their own groups and invite others to join using unique links.

The application uses Socket.io to enable real-time communication, ensuring that messages are delivered instantly to all participants. Google OAuth is employed for authentication, providing a secure and hassle-free login experience for users. Also WebRTC is used to provide realtime, powerfull voice & video-communication solutions.

## Features

Chatify offers the following key features:

1. **One-to-One Chat**: Users can engage in private conversations with other users.

2. **Group Messaging**: Users can create groups and send messages to all group members simultaneously.

3. **Create and Manage Groups**: Users have the ability to create their own groups and manage group members.

4. **Users Status**: Online and offline status of users are displayed, indicating their availability for communication.

5. **Join Group Using Unique Link**: Users can join groups by clicking on unique invitation links shared by other group members.

6. **One-to-One Voice and Video Calls**: Users can initiate voice and video calls with other users directly within this app.

7. **Personalize Profile View**: Users can personalize their profile view with a profile picture and status message.

8. **Reset Password Functionality**: Users can reset their password if they forget it. They will receive a password reset link via email, allowing them to set a new password securely.

9. **Secure Authentication**: Google OAuth is used for secure and convenient user authentication.

## Installation

To run Chatify locally on your machine, follow these steps:

1. Clone the repository to your local machine.

2. Install the required dependencies.

```bash
cd chatify
npm install
```


3. Set up environment variables.

   - Create a `.env` file in the root directory.
   - Obtain your Google OAuth, momgodb, email credentials and add them to the `.env` file as follows-

```bash
MONGO_URL=your_mongo_atlas_url
PORT=5000
ORIGIN_URL=http://localhost:5000
SGOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_session_secret
EMAIL_HOST=smtp_server_host
EMAIL_USERNAME=your_email_username
EMAIL_PASSWORD=your_email_password
FROM_EMAIL=your_email_from_which_to_send_mail
CLOUDINARY_CLOUD_NAME=cloudinary_cloud_name
CLOUDINARY_API_KEY=cloudinary_api_key
CLOUDINARY_API_SECRET=cloudinary_api_secret
```

4. Run the application.

```bash
npm start
```

## Technologies Used

- NodeJS
- Socket.io
- Express
- Google OAuth
- HTML/CSS
- JavaScript
- JQuery
- WebRTC

---

Thank you for using Chatify! We hope you enjoy the real-time chatting experience. If you encounter any problems or have questions, feel free to reach out to us or create an issue in the repository. Happy chatting! 🎉
