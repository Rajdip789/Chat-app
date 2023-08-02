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
		$('.user__img').attr('src', 'http://localhost:5000/'+ user_image);

		user_status == "true" ? $('.user__lastActive').text("Online") :
		$('.user__lastActive').text("Last active "+getFullDateTime(lastSeen));

		//Load old chats 

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

//Update user status

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
})

//Scrool the chats to the end
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

//Deleting chat
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

/*---------User Chat send and save---------*/

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
										<i class="fa fa-trash" aria-hidden='true' onclick="deleteChat('${res.data._id}')"></i> <br>
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

//Load the current chat of the opposite user

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

//Receive the old chats

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
			html += `<i class="fa fa-trash" aria-hidden='true' onclick="deleteChat('${oldChats[i]._id}')"></i>`;
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



/*---------GROUP CHAT---------*/

//Initial loading on clicking upon groups

let global_group_id;

$(document).ready(() => {
	$('.group-list').click(function() {

		global_group_id = $(this).attr('data-id');
		
		let group_name = $(this).attr('data-name');
		let group_image = $(this).attr('data-image');
		let group__description = $(this).attr('data-description');
		
		$('.group-btn').hide();
		$('.chat-section').show();

		console.log($(window).width);
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
		$('.group__image').attr('src', 'http://localhost:5000/'+ group_image);
	
		
		//Load old chats 

		socket.emit('loadOldGroupChat', { group_id : global_group_id });
	})
})


/*------------Add & Remvoe members-------------*/

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


/*---------------Update Group------------*/

//Show the previous values in the from
$('.updateGroup').click(function() {
	let group_obj = JSON.parse($(this).attr('data-obj'));

	$('#selectedImage').attr('src', '/' + group_obj.image);
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


/*-----------Delete Group----------*/

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

/*---------Create group link and show success message---------*/ 

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

/*----------------Join Group by Shared Link---------------*/

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


/*----------------Leave Group---------------*/

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


/*------------Send Message in Group-------------*/

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
									<span>${linkifyHtml(message)} <i class="fa fa-trash" aria-hidden='true' onclick="deleteGroupChat('${res.data[0]._id}')"></i>
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

//Load current chats of all users

socket.on('loadNewGroupChat', (data) => {

	let fullDateTime = getFullDateTime(data[0].createdAt);

	if(global_group_id == data[0].group_id) {
		let html = `<div class="opposite__user__chat" id='${data[0]._id}'>`;

		html += '<div>' +
					'<img src="http://localhost:5000/' + data[0].sender_id.image + '" alt="sender-img" class="rounded-pill" height="20px"/>' +
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

//Receive the old Group chats

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
						'<img src="http://localhost:5000/' + oldGroupChats[i].sender_id.image + '" alt="sender-img" class="rounded-pill" height="20px"/>' +
						'<span class="group__username">' + oldGroupChats[i].sender_id.username + '</span>' +
					'</div>';		
		}

		html += `<h5><span>${linkifyHtml(oldGroupChats[i].message)}` + ` `;
						
		if(oldGroupChats[i].sender_id._id == sender_id) {
			html += `<i class="fa fa-trash" aria-hidden='true' onclick="deleteGroupChat('${oldGroupChats[i]._id}')"></i>`;

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

//Deleting Group chat
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