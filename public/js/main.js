function getCookie(name) {
	let matches = document.cookie.match(new RegExp(
		"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	));
	return matches ? decodeURIComponent(matches[1]) : undefined;
}

function getFullDateTime(chatTime) {
	let date = new Date(chatTime);
	let cDate = date.getDate();
	let cMonth = date.getMonth() > 8 ? date.getMonth()+1 : '0'+(date.getMonth()+1);
	let cYear = date.getFullYear();
	let cHour = date.getHours();
	let cMinute = date.getMinutes();

	let ampm = cHour >= 12 ? 'pm' : 'am';
	cHour = cHour % 12;
	cHour = cHour ? cHour : 12; // the hour '0' should be '12'
	cMinute = cMinute < 10 ? '0'+cMinute : cMinute;

	let fullDateTime = cDate+'-'+cMonth+'-'+cYear+'  '+cHour + ':' + cMinute + ' ' + ampm;

	return fullDateTime;
}

$('.fa-sign-out').click(function() {
	Swal.fire({
		title: 'Are you sure your want to log out?',
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		confirmButtonText: 'Yes!'
	}).then((result) => {
		if (result.isConfirmed) {
			window.location.href = '/logout';
		}
	})
})
  

/**
 * Connect to the socket
 */

const userData = JSON.parse(getCookie('user'));

const sender_id = userData._id;
let receiver_id;
let lastSeen;
let user_status;

const socket = io('/user-namespace', {
	auth: {
		token: sender_id
	}
});

/**
 * One-to-one Chatting implementation
 */

$(document).ready(() => {
	$('.user-list').click(function() {

		receiver_id = $(this).attr('data-id');
		lastSeen = $(this).attr('data-time');
		let user_name = $(this).attr('data-name');
		let user_image = $(this).attr('data-image');
		user_status = $(this).attr('data-status');

		$('.start-head').hide();
		$('.chat-section').fadeIn(400);

		if($(window).width() <= 768) {
			$(".col-md-3").fadeOut(400);
			$("#back-chat").removeClass('d-none');
			$(".row").css('padding', '0rem 1rem');
		} 

		$('.chat-section').addClass('d-flex');
		$('#start-chat').removeClass('app__flex');
		$('.user-list').removeClass('custom__active');
		$(this).addClass('custom__active');

		$('.user__name').text(user_name);
		$('.user__img').attr('src', user_image);

		user_status == "true" ? $('.user__lastActive').text("Online") :
		$('.user__lastActive').text("Last active "+getFullDateTime(lastSeen));

		// Load old chats 

		socket.emit('loadOldChat', {sender_id : sender_id, receiver_id: receiver_id});
	})
})

$("#back-chat").click(() => {
	$("#back-chat").addClass('d-none');
	$(".col-md-3").fadeIn(400);
	$('.chat-section').removeClass('d-flex');
	$('.chat-section').addClass('d-none');
	$(".row").css('padding', '1rem 1rem 0rem 1rem');
})

// Update user status

socket.on('getOnlineUser', (data) => {
	$('[data-id="' + data.user_id + '"]').attr('data-status', "true")
	$('#'+data.user_id+'-status').removeClass('offline__status');
	$('#'+data.user_id+'-status').addClass('online__status');

	if(receiver_id == data.user_id)
		$('.user__lastActive').text("Online");
})

socket.on('getOfflineUser', (data) => {
	$('[data-id="' + data.user_id + '"]').attr('data-status', "false")
	$('#'+data.user_id+'-status').removeClass('online__status');
	$('#'+data.user_id+'-status').addClass('offline__status');

	if(receiver_id == data.user_id)
		$('.user__lastActive').text("Last active "+getFullDateTime(data.lastSeen));
	
	// endCall();
	// $("#voiceCallModel").modal('hide');
	// $('.videocall-section').hide();
})

// Scroll the chats to the end
const scrollChat = () => {
	$('#chat-container').animate({
		scrollTop: $('#chat-container').offset().top + $('#chat-container')[0].scrollHeight
	}, 0);
}

const scrollGroupChat = () => {
	$('#group-chat-container').animate({
		scrollTop: $('#group-chat-container').offset().top + $('#group-chat-container')[0].scrollHeight
	}, 0);
}

// Delete chat
const deleteChat = (chat_id) => {
	Swal.fire({
		title: 'Are you sure?',
		text: "You won't be able to revert this!",
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		confirmButtonText: 'Yes!'
	}).then((result) => {
		if (result.isConfirmed) {
			$.ajax({
				url: '/delete-chat',
				type: 'POST',
				data: { chat_id: chat_id },
				success: (res) => {
					if(res.success) {

						$(`#${chat_id}`).remove();
						socket.emit('chatDeleted', chat_id, receiver_id );
					
					} else {
						Swal.fire({
							icon: 'error',
							title: 'Oops...',
							text: 'Something went wrong.',
						});	
					}
				}
			});
			Swal.fire(
			'Deleted!',
			'Message has been deleted.',
			'success'
			)
		}
	})
}

// User Chat send and save

$('#chat-form').submit((event) => {
	event.preventDefault();

	let message = $('#message').val();

	$.ajax({
		url: '/save-chat',
		type: 'POST',
		data: { sender_id: sender_id, receiver_id: receiver_id, message: message },
		success: (res) => {
			if(res.success) {
				$('#message').val('');

				let fullDateTime = getFullDateTime(res.data.createdAt);

				let html = `<div class="current__user__chat" id='${res.data._id}'>
								<h5>
									<span>${linkifyHtml(message)}  
										<i class="fas fa-trash-alt" aria-hidden='true' onclick="deleteChat('${res.data._id}')"></i> <br>
										<span class='user-data'> ${fullDateTime}</span>
									</span> 
								</h5>
							</div>
							`;
				
				$('#chat-container').append(html);
				socket.emit('newChat', res.data, receiver_id);

				scrollChat();
			} else {
				alert(res.message);
			}
		}
	});
})

// Load the current chat of the opposite user

socket.on('loadNewChat', (data) => {

	let fullDateTime = getFullDateTime(data.createdAt);

	if(receiver_id === data.sender_id) {
		let html = `<div class="opposite__user__chat">
						<h5>
							<span>${linkifyHtml(data.message)} <br>
								<span class='user-data'> ${fullDateTime}</span>
							<span>
						</h5>
					</div>`;

		$('#chat-container').append(html);
	}

	scrollChat();
})

// Receive the old chats

socket.on('receiveOldChat', (data) => {
	$('#chat-container').html('');

	let oldChats = data.oldChats;
	let html = '';

	for(let i = 0; i < oldChats.length; i++) {

		let fullDateTime = getFullDateTime(oldChats[i].createdAt);

		let addClass = '';

		if(oldChats[i].sender_id == sender_id) {
			addClass = 'current__user__chat';
		} else {
			addClass = 'opposite__user__chat';
		}

		html += `<div class='${addClass}' id='${oldChats[i]._id}'>
					<h5><span>${linkifyHtml(oldChats[i].message)}` + ` `;
						
		if(oldChats[i].sender_id == sender_id) {
			html += `<i class="fas fa-trash-alt" aria-hidden='true' onclick="deleteChat('${oldChats[i]._id}')"></i>`;
		}

		html +=  `<br> <span class='user-data'> ${fullDateTime}</span>`;
						
		html += 		`</span>
					</h5>
				</div>`;
	}

	$('#chat-container').append(html);
	scrollChat();
})

socket.on('deleteChat', (chat_id) => {
	$(`#${chat_id}`).remove();
})


/**
 * Group Chatting Implementation
 */

// Initial loading on clicking upon groups

let global_group_id;

$(document).ready(() => {
	$('.group-list').click(function() {

		global_group_id = $(this).attr('data-id');
		
		let group_name = $(this).attr('data-name');
		let group_image = $(this).attr('data-image');
		let group__description = $(this).attr('data-description');
		
		$('.group-btn').hide();
		$('.chat-section').show();

		if($(window).width() <= 768) {
			$(".col-md-3").fadeOut(400);
			$("#back-chat").removeClass('d-none');
			$(".row").css('padding', '0rem 1rem');
		} 

		$('.chat-section').addClass('d-flex');
		$('#start-chat').removeClass('app__flex');
		$('.group-list').removeClass('custom__active');
		$(this).addClass('custom__active');


		$('#group-id').val(global_group_id);
		$('.group__name').text(group_name);
		$('.group__description').text(group__description);
		$('.group__image').attr('src', group_image);
	
		// Load old chats 

		socket.emit('loadOldGroupChat', { group_id : global_group_id });
	})
})


// Add & Remvoe members

$('.addMember').click(function() {
	let group_id = $(this).parent().attr('data-id');

	$('#group-update-id').val(group_id);

	$.ajax({
		url: '/get-members',
		type: 'POST',
		data: { group_id: group_id },
		success: (res) => {

			if(res.success) {
				const userList = res.data;

				let html = '';

				for(let i = 0; i < userList.length; i++) {

					let isMemberOfGroup = userList[i].member.length > 0 ? true : false;

					html += `<tr>
								<td>
									<input type="checkbox" ${isMemberOfGroup ? 'checked' : ''}  name="members[]" value="${userList[i]._id}"/>
								</td>
								<td>${userList[i].username}</td>
							<tr>`
				}

				$('.addMemberTable').html(html);

			} else {
				Swal.fire({
					icon: 'error',
					title: 'Oops...',
					text: 'Something went wrong.',
					});
			}
		}
	});
});

$('#add-member-form').submit(function (event){
	event.preventDefault();

	let formData = $(this).serialize();

	$.ajax({
		url: "/add-members",
		type: "POST",
		data: formData,
		success: ((res) => {
			if(res.success) {
				$("#AddMembersModal").modal("hide");
				$('#add-member-form')[0].reset();
			} else {
				$('#add-member-error').text(res.message);
				setTimeout(() => {
					$('#add-member-error').text('');
				}, 3000)			
			}
		})
	})
});


/**
 * Update Group functionalities
 */

//Show the previous values in the from
$('.updateGroup').click(function() {
	let group_obj = JSON.parse($(this).attr('data-obj'));

	$('#selectedImage').attr('src', group_obj.image);
	$('#group-update-id').val(group_obj._id);
	$('#group-name').val(group_obj.name);
	$('#group-description').val(group_obj.description);

})

//Make changes and update 
$('#update-group-form').submit(function(e) {
	e.preventDefault();

	const formData = new FormData();
	formData.append('group_id', $('#group-update-id').val());
	formData.append('name', $('#group-name').val());
	formData.append('image', $('#imageInput')[0].files[0]);
	formData.append('description', $('#group-description').val());

	$.ajax({
		url: 'update-group',
		type: 'POST',
		data: formData,
		contentType: false,
		cache: false,
		processData: false,
		success: ((res) => {
			if(res.success) {
				location.reload();
			} else {
				Swal.fire({
						icon: 'error',
						title: 'Oops...',
						text: 'Something went wrong.',
					});
			}
		})
	})
})


// Delete Group

$('.deleteGroup').click(function(e) {
	Swal.fire({
		title: 'Are you sure your want to delete the Group?',
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		confirmButtonText: 'Yes!'
	}).then((result) => {
		if (result.isConfirmed) {
			let group_id = $(this).parent().attr('data-id');

			$.ajax({
				url: "/delete-group",
				type: "POST",
				data: { group_id: group_id },
				success: ((res) => {
					if(res.success) {
						Swal.fire({
							icon: 'success',
							title: 'Group Deleted!',
							text: 'The group has been deleted successfully.',
							timer: 2000, // Automatically close after 2 seconds
							showConfirmButton: true
						})
						setTimeout(() => {
								window.location.reload();
						}, 2000)			
					} else {
						Swal.fire({
							icon: 'error',
							title: 'Oops...',
							text: 'Something went wrong.',
						});			
					}
				})
			})

		} else {

		}
	})
})

/**
 * Group line create, share and join
 */

// Create group link and show success message

$('.groupLink').click(function() {
	let group_id = $(this).parent().attr('data-id');

	let url = window.location.host+'/share-group/'+group_id;

	navigator.clipboard.writeText(url).then(() => {
		$(this).parent().parent().parent().append('<span class="success_copy">Copied!</span>');

		setTimeout(function() {
			$(".success_copy").remove();
		  }, 2000);
	}).catch(() => {
		$(this).parent().parent().parent().append('<span class="error_copy">Error!</span>');

		setTimeout(function() {
			$(".error_copy").remove();
		  }, 2000);
	})
})

// Join Group by Shared Link

$('.join_by_shared_link').click(function() {
	$(this).text('Joining...');
	$(this).attr('disabled', 'disabled');

	let group_id = $(this).attr('data-id');
	
	$.ajax({
		url: "/join-group",
		type: 'POST',
		data: { group_id: group_id },
		success: (res) => {
			if(res.success) {

				Swal.fire({
					icon: 'success',
					title: 'Joind !!',
					text: 'Joined the group successfully.',
					timer: 2000, // Automatically close after 2 seconds
					showConfirmButton: true
				})

				setTimeout(() => {
					window.location.href = '/groups';
				}, 2000)	

			} else {

				alert(res.message);
				$(this).text('Join Group');
				$(this).removeAttr('disabled');
			}
		}
	})
});


// Leave Group

$('.leaveGroup').click(function(e) {
	Swal.fire({
		title: 'Are you sure your want to left the Group?',
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		confirmButtonText: 'Yes!'
	}).then((result) => {
		if (result.isConfirmed) {
			let group_id = $(this).attr('data-id');

			$.ajax({
				url: "/leave-group",
				type: "POST",
				data: { group_id: group_id },
				success: ((res) => {
					if(res.success) {
						Swal.fire({
							icon: 'success',
							title: 'You Left!',
							text: 'You have successfully left the group.',
							timer: 2000, // Automatically close after 2 seconds
							showConfirmButton: true
						})
						setTimeout(() => {
								window.location.reload();
						}, 2000)			
					} else {
						Swal.fire({
							icon: 'error',
							title: 'Oops...',
							text: 'Something went wrong.',
						});			
					}
				})
			})

		} else {

		}
	})
})


// Send Message in Group

$('#group-chat-form').submit((event) => {
	event.preventDefault();

	let message = $('#group-message').val();

	$.ajax({
		url: '/save-group-chat',
		type: 'POST',
		data: { sender_id: sender_id, group_id: global_group_id, message: message },
		success: (res) => {
			if(res.success) {
			
				$('#group-message').val('');

				let fullDateTime = getFullDateTime(res.data[0].createdAt);

				let html = `<div class="current__user__chat" id='${res.data[0]._id}'>
								<h5>
									<span>${linkifyHtml(message)} <i class="fas fa-trash-alt" aria-hidden='true' onclick="deleteGroupChat('${res.data[0]._id}')"></i>
										<br>
										<span class='user-data'> ${fullDateTime}</span>
									</span> 
								</h5>
							</div>
							`;
				
				$('#group-chat-container').append(html);
				socket.emit('newGroupChat', res.data);

				scrollGroupChat();
			} else {
				alert(res.message);
			}
		}
	});
})

// Load current Group chats of all users

socket.on('loadNewGroupChat', (data) => {

	let fullDateTime = getFullDateTime(data[0].createdAt);

	if(global_group_id == data[0].group_id) {
		let html = `<div class="opposite__user__chat" id='${data[0]._id}'>`;

		html += '<div>' +
					'<img src="' + data[0].sender_id.image + '" alt="sender-img" class="rounded-pill" height="20px"/>' +
					'<span class="group__username">' + data[0].sender_id.username + '</span>' +
				'</div>';	

		html +=	`<h5><span>${linkifyHtml(data[0].message)} 
						<br>
						<span class='user-data'> ${fullDateTime} </span>`

		html += 	`</span>
				</h5>
			</div>`;

		$('#group-chat-container').append(html);

	}

	scrollGroupChat();
})

// Receive the old Group chats

socket.on('receiveOldGroupChat', (data) => {
	$('#group-chat-container').html('');

	let oldGroupChats = data.oldGroupChats;
	let html = '';

	for(let i = 0; i < oldGroupChats.length; i++) {
		let addClass = '';

		if(oldGroupChats[i].sender_id._id == sender_id) {
			addClass = 'current__user__chat';
		} else {
			addClass = 'opposite__user__chat';
		}

		html += `<div class='${addClass}' id='${oldGroupChats[i]._id}'>`


		if(oldGroupChats[i].sender_id._id != sender_id) {
			html += '<div>' +
						'<img src="' + oldGroupChats[i].sender_id.image + '" alt="sender-img" class="rounded-pill" height="20px"/>' +
						'<span class="group__username">' + oldGroupChats[i].sender_id.username + '</span>' +
					'</div>';		
		}

		html += `<h5><span>${linkifyHtml(oldGroupChats[i].message)}` + ` `;
						
		if(oldGroupChats[i].sender_id._id == sender_id) {
			html += `<i class="fas fa-trash-alt" aria-hidden='true' onclick="deleteGroupChat('${oldGroupChats[i]._id}')"></i>`;

		}
		
		let fullDateTime = getFullDateTime(oldGroupChats[i].createdAt);

		if(oldGroupChats[i].sender_id._id == sender_id) {
			html += `<br><span class='user-data'> ${fullDateTime}
					</span>`
		} else {
			html += `<br><span class='user-data'> ${fullDateTime}
					</span>`
		}

		html += 	`</span>
				</h5>
			</div>`;
	}

	$('#group-chat-container').append(html);
	scrollGroupChat();
})

// Delete Group chat

const deleteGroupChat = (chat_id) => {
	Swal.fire({
		title: 'Are you sure?',
		text: "You won't be able to revert this!",
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		confirmButtonText: 'Yes!'
	}).then((result) => {
		if (result.isConfirmed) {
			$.ajax({
				url: '/delete-group-chat',
				type: 'POST',
				data: { chat_id: chat_id },
				success: (res) => {
					if(res.success) {

						$(`#${chat_id}`).remove();
						socket.emit('groupChatDeleted', chat_id );
					
					} else {
						alert(res.message);
					}
				}
			});
			Swal.fire(
				'Deleted!',
				'Message has been deleted.',
				'success'
			)
		}
	})
}

socket.on('deleteGroupChat', (chat_id) => {
	$(`#${chat_id}`).remove();
})


// Delete user profile

$(".profile__delete").click(() => {
	Swal.fire({
		title: 'Are you sure?',
		text: "All your data & chats will be deleted, you won't be able to revert this!",
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#3085d6',
		cancelButtonColor: '#d33',
		confirmButtonText: 'Yes!'
	}).then((result) => {
		if (result.isConfirmed) {
			$.ajax({
				url: '/delete-profile',
				type: 'POST',
				data: {},
				success: (res) => {
					if(res.success) {
						window.location.href = '/';
					} else {
						Swal.fire({
							icon: 'error',
							title: 'Oops...',
							text: 'Something went wrong.',
						});	
					}
				}
			});
		}
	})
})

/**
 * Image relate functionalities
 */

$('#imageInput').on('change', function (event) {
	const file = event.target.files[0];

	if (file) {
		const reader = new FileReader();

		reader.onload = function (e) {
			$('#selectedImage').attr('src', e.target.result);
		};

		reader.readAsDataURL(file);
	} 
});

// Update profile image

$('#update-image').click(() => {
	let image = $('#imageInput')[0].files[0];

	if(image == undefined) {
		Swal.fire({
			icon: 'warning',
			title: 'Oops...',
			text: 'Please select a new image to update.',
		});	

		return;
	}

	const formData = new FormData();
	formData.append('image', image);

	$.ajax({
		url: 'update-profile',
		type: 'POST',
		data: formData,
		contentType: false,
		cache: false,
		processData: false,
		success: ((res) => {
			if(res.success) {
				Swal.fire({
					icon: 'success',
					title: 'Successfull!',
					text: 'Profile photo updated successfully.',
				});
				setTimeout(() => {
					window.location.reload();
				}, 2000)
			} else {
				Swal.fire({
						icon: 'error',
						title: 'Oops...',
						text: 'Something went wrong.',
					});
			}
		})
	})
})


/**
 * Call section implementation using WebRTC
 */

const voiceCallConstraints = { 'video': false, 'audio': true }
const videoCallConstraints = { 'video': true, 'audio': true }

const configuration = {
	'iceServers': [
		{ 'urls': 'stun:stun.l.google.com:19302' },
		{ 'urls': 'stun:stun.services.mozilla.com' },
	]
}

let timerInterval;
let seconds = 0;
let minutes = 0;

let user_name;
let user_image;
let called_user_id;
let stream;
let remoteStream;
let peerConnection = new RTCPeerConnection(configuration);;

let isCallMute = false;
let isVoiceMute = false;
let isVideoMute = false;


// Making the voice call modal draggalbe
$("#voiceCallModel").draggable({
    handle: ".modal-body"
});

// Toggle the voice call UI while close call and or start call
const toggleVoiceCallModal = (val, data = null) => {
	val ? $('#voiceCallModel').modal('show') : $('#voiceCallModel').modal('hide')

	if(data) {
		$("#btn-3").show();
		$("#call-dismiss").addClass('currentcall__iconAnimation');
		$("#call-receive").addClass('currentcall__iconAnimation');
	
	
		$('#call-text').text("Incoming voice call...");
		$('#currentcall-user-name').text(data.caller.username);
		$('#currentcall-user-image').attr('src', data.caller.image);
		$('#ringAudio')[0].play();
	}
}

// Toggle the video call UI while close call and or start call
const toggleVideoCallUI = (val, data = null) => {
	if(val) {
		$('.videocall-section').show();
		$('.row').hide();
	} else {
		$('.videocall-section').hide();
		$('.row').show();
	}
	if(data) {
		$("#videocall-receive").show();
		$("#videocall-dismiss").addClass('currentcall__iconAnimation');
		$("#videocall-receive").addClass('currentcall__iconAnimation');
	
		$('#videocall-text').text("Incoming video call...");
		$('#currentvideocall-user-name').text(data.caller.username);
		$('#currentvideocall-user-image').attr('src', data.caller.image);
		$('#VideoCallringAudio')[0].play();
	}
}

$(window).on('beforeunload', function() {

	let isVoiceCall = $("#voiceCallModel").css("display") == 'block';
	let isVideoCall = $(".videocall-section").css("display") == 'block';

	if(isVoiceCall || isVideoCall) {
		callDisconnect(isVideoCall ? "video-call" : "voice-call");
	}

});

function updateTimer() {
	seconds++;
	if (seconds === 60) {
		seconds = 0;
		minutes++;
	}
  
	const formattedTime = `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
	$("#timer").text(formattedTime);
}

/** 
 * This all functions are used by both voice and video calls
 */

async function startCall(constraints, type) {
	try {

		stream = await navigator.mediaDevices.getUserMedia(constraints)
		stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

		if(type === "video-call") {
			$('#localVideo')[0].srcObject = stream;
		}

		type == "video-call" ? toggleVideoCallUI(true) : toggleVoiceCallModal(true);
		
		createOffer(type);

	} catch (error) {
		toggleVoiceCallModal(false);
		Swal.fire({
			icon: 'error',
			title: 'Oops...',
			text: 'Something went wrong! Please check all media devices permission and internet connectivity!',
		});
	}
}

function endCall() {

	// If there's a local stream, stop its tracks which goes to the peer
	if (stream) {
		stream.getTracks().forEach(track => track.stop());
	}
	
	// If peerConnection has senders, remove tracks from senders
	if (peerConnection.getSenders()) {
		peerConnection.getSenders().forEach(sender => {
			peerConnection.removeTrack(sender);
		});
	}

	clearInterval(timerInterval);

	//Reseting all the classes and variables so that it not affects next call
	$("#btn-3, #btn-1, #timer").hide();
	$('#ringAudio')[0].pause();
	$('#ringAudio')[0].currentTime = 0;
	$('#VideoCallringAudio')[0].pause();
	$('#VideoCallringAudio')[0].currentTime = 0;

	$("#call-dismiss, #call-receive, #videocall-receive, #videocall-dismiss").removeClass('currentcall__iconAnimation');
	$("#videocall-receive, #videocallvideo-mute, #videocallmic-mute").hide();

	$('.videocall__negotiation, #videocall-text, #currentvideocall-user-name, #call-text').show();
	$(".remoteuser__name").text("");
	$("#remoteVideo")[0].srcObject = null;


	const $callElement = $("#call-mute");
	const $videoCallElement = $("#videocallmic-mute");
	const $videoVideoElement = $("#videocallvideo-mute");

	if ($callElement.hasClass('fas fa-microphone-slash')) {
		$callElement.removeClass('fas fa-microphone-slash');
		$callElement.addClass('fas fa-microphone');
	}
	if ($videoCallElement.hasClass('far fa-microphone-slash')) {
		$videoCallElement.removeClass('far fa-microphone-slash');
		$videoCallElement.addClass('far fa-microphone');
	}
	if ($videoVideoElement.hasClass('far fa-video-slash')) {
		$videoVideoElement.removeClass('far fa-video-slash');
		$videoVideoElement.addClass('far fa-video');
	}

	isCallMute = false;
	isVideoMute = false;
	isVoiceMute = false;

	seconds = 0;
	minutes = 0;
	
}

// ICE layer
peerConnection.onicecandidate = (event) => {
	sendIceCandidate(event);
}

// Receiving the ICE candidates on the remote peer
socket.on('remotePeerIceCandidate', async (data) => {
	try {

		let candidate = new RTCIceCandidate(data.candidate);
		await peerConnection.addIceCandidate(candidate);

	} catch (error) {
		console.log(error);
	}
})

// Create local offer
const createOffer = async (type) => {
	try {

		const localPeerOffer = await peerConnection.createOffer();
		await peerConnection.setLocalDescription(localPeerOffer);
	
		sendMediaOffer(localPeerOffer, type);
		
	} catch (error) {
		console.log(error);	
	}
}

// Receiving the media offer on the remote peer and create media answer
socket.on('mediaOffer', async (data) => {
	try {

		let constraints;
		called_user_id = data.from;

		if(data.callType === "voice-call") {

			toggleVoiceCallModal(true, data);
			constraints = voiceCallConstraints;

			//Call reject or receive negotiation
			const answerPromise = new Promise((resolve, reject) => {
				$('#call-receive').click(() => resolve('Call received') );
				$('#call-dismiss').click(() => reject('Call rejected') );
			});

			const decision = await answerPromise;

			if (decision === 'Call received') {
				$("#btn-3").hide();
				$("#btn-1").show();
				$('#call-text').hide();
				$("#call-dismiss").removeClass('currentcall__iconAnimation');
				$("#call-receive").removeClass('currentcall__iconAnimation');
				$('#ringAudio')[0].pause();
				$('#ringAudio')[0].currentTime = 0;

				$("#timer").show();
				$("#timer").text("00:00");

				timerInterval = setInterval(updateTimer, 1000);
			}
		
		} else {
		
			toggleVideoCallUI(true, data);
			constraints = videoCallConstraints;

			//Call reject or receive negotiation
			const answerPromise = new Promise((resolve, reject) => {
				$('#videocall-receive').click(() => resolve('Call received') );
				$('#videocall-dismiss').click(() => reject('Call rejected') );
			});

			const decision = await answerPromise;

			if (decision === 'Call received') {
				$("#videocall-receive").hide();
				$("#videocallvideo-mute").show();
				$("#videocallmic-mute").show();
				$("#videocall-receive").removeClass('currentcall__iconAnimation');
				$("#videocall-dismiss").removeClass('currentcall__iconAnimation');
				$('.videocall__negotiation').hide();
				$(".localuser__name").text("You");
				$(".remoteuser__name").text(data.caller.username);
				$('#videocall-text, #currentvideocall-user-name').hide();
				$('#VideoCallringAudio')[0].pause();
				$('#VideoCallringAudio')[0].currentTime = 0;
			}
		
		}

		stream = await navigator.mediaDevices.getUserMedia(constraints)
		stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

		if(data.callType === "video-call") {
			$('#localVideo')[0].srcObject = stream;
		}

		await peerConnection.setRemoteDescription(data.offer);
		const peerAnswer = await peerConnection.createAnswer();
		await peerConnection.setLocalDescription(peerAnswer);
		
		sendMediaAnswer(peerAnswer, data);

	} catch (error) {
		if (error === 'Call rejected') {
			sendMediaAnswer(undefined, data);
		} else {
			endCall();
			callDisconnect("voice-call");
			Swal.fire({
				icon: 'error',
				title: 'Oops...',
				text: 'Something went wrong! Please check all media devices permission and internet connectivity!',
			});
		}

		toggleVoiceCallModal(false);
	}
});

// Receiving the media answer from the remote peer
socket.on('mediaAnswer', async (data) => {
	try {
		if(data.answer !== "Rejected") {

			$("#btn-3").hide();
			$("#btn-1").show();
			$('#call-text').hide();

			$("#videocallvideo-mute, #videocallmic-mute, #timer").show();
			$('#videocall-text, #currentvideocall-user-name, .videocall__negotiation').hide();
			$(".remoteuser__name").text(user_name);
			$("#timer").text("00:00");

			timerInterval = setInterval(updateTimer, 1000);

			await peerConnection.setRemoteDescription(data.answer);	
		}
	} catch (error) {
		console.log(error);
	}
});

// Ontrack handler 
peerConnection.ontrack = (event) => {

	const [stream] = event.streams;
	const track = event.track;

	if (track.kind === 'audio') {
        $("#remoteAudio")[0].srcObject = stream;
    } else if (track.kind === 'video') {
        $('#remoteVideo')[0].srcObject = stream;
    }

};

socket.on('muteNotification', data => {
	$('.videocall__negotiation').toggle();
});

socket.on('callDisconnect', data => {

	endCall();

	if(data.callType === "voice-call") {
		toggleVoiceCallModal(false);
	} else {
		toggleVideoCallUI(false);
	}
})

/**
 * Sending the media offer, media answer, ICECandidates and call disconnect message through our signaling channel / server
 */

const sendMediaOffer = (localPeerOffer, type) => {
	socket.emit('mediaOffer', {
	  	offer: localPeerOffer,
		callType: type,
	  	from: sender_id,
		to: called_user_id
	});
};

const sendMediaAnswer = (peerAnswer = "Rejected", data) => {
	socket.emit('mediaAnswer', {
		answer: peerAnswer,
		from: sender_id,
		to: data.from
	})
}

const sendIceCandidate = (event) => {
	socket.emit('iceCandidate', {
		to: called_user_id,
		candidate: event.candidate,
	});
}

const sendMuteNotification = (isVideoMute) => {
	socket.emit('muteNotification', {
		from: sender_id,
		to: called_user_id,
		muteState: isVideoMute
	});
}

const callDisconnect = (type) => {
	socket.emit('callDisconnect', {
		from: sender_id,
		to: called_user_id,
		callType: type
	});
}

/**
 * Voice Call functionalities - call, mute call, dismiss call
 */

$('.call-user').click( function() {

	called_user_id = $(this).parent().attr('data-id');
	user_name = $(this).parent().attr('data-name');
	user_image = $(this).parent().attr('data-image');
	
	$('#call-text').text("Calling...");
	$('#currentcall-user-name').text(user_name);
	$('#currentcall-user-image').attr('src', user_image);

	startCall(voiceCallConstraints, "voice-call");
})

$('#call-mute').click( function() {
	// Getting the audio tracks
	const audioTrack = stream.getTracks().find(track => track.kind === 'audio') 
	
	if(isCallMute) {
		audioTrack.enabled = true;

		$(this).removeClass('fas fa-microphone-slash');
		$(this).addClass('fas fa-microphone');
	} else {
		audioTrack.enabled = false;

		$(this).removeClass('fas fa-microphone');
		$(this).addClass('fas fa-microphone-slash');
	}
	
	isCallMute = !isCallMute;
})

$('#call-dismiss').click(() => {
	endCall();
	callDisconnect("voice-call");
})

/**
 * Video Call functionalities - call, voice mute, video mute, dismiss-call
 */

$('.videocall-user').click( function() {
	called_user_id = $(this).parent().attr('data-id');
	user_name = $(this).parent().attr('data-name');
	user_image = $(this).parent().attr('data-image');

	$('#videocall-text').text("Calling...");
	$('#currentvideocall-user-name').text(user_name);
	$('#currentvideocall-user-image').attr('src', user_image);
	$(".localuser__name").text("You");

	startCall(videoCallConstraints, "video-call");
})

$('#videocallmic-mute').click( function() {
	// Getting the audio tracks
	const audioTrack = stream.getTracks().find(track => track.kind === 'audio') 
	
	if(isVoiceMute) {
		audioTrack.enabled = true;

		$(this).removeClass('far fa-microphone-slash');
		$(this).addClass('far fa-microphone');
	} else {
		audioTrack.enabled = false;

		$(this).removeClass('far fa-microphone');
		$(this).addClass('far fa-microphone-slash');
	}
	
	isVoiceMute = !isVoiceMute;
})

$('#videocallvideo-mute').click( function() {
	// Getting the video tracks
	const videoTrack = stream.getTracks().find(track => track.kind === 'video') 

	if(isVideoMute) {
		videoTrack.enabled = true;

		$(this).removeClass('far fa-video-slash');
		$(this).addClass('far fa-video');
	} else {
		videoTrack.enabled = false;

		$(this).removeClass('far fa-video');
		$(this).addClass('far fa-video-slash');
	}

	sendMuteNotification(isVideoMute);
	
	isVideoMute = !isVideoMute;
})

$('#videocall-dismiss').click( function() {
	endCall();

	callDisconnect("video-call");
	toggleVideoCallUI(false);
})


