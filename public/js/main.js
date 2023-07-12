// (function($) {

// 	"use strict";

// 	var fullHeight = function() {

// 		$('.js-fullheight').css('height', $(window).height());
// 		$(window).resize(function(){
// 			$('.js-fullheight').css('height', $(window).height());
// 		});

// 	};
// 	fullHeight();

// 	$('#sidebarCollapse').on('click', function () {
//       $('#sidebar').toggleClass('active');
//   });

// })(jQuery);


function getCookie(name) {
	let matches = document.cookie.match(new RegExp(
		"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	));
	return matches ? decodeURIComponent(matches[1]) : undefined;
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

const socket = io('/user-namespace', {
	auth: {
		token: sender_id
	}
});


$(document).ready(() => {
	$('.user-list').click(function() {

		receiver_id = $(this).attr('data-id');

		$('.start-head').hide();
		$('.group-btn').hide();
		$('.chat-section').show();
		$('.chat-section').addClass('d-flex');
		$('#start-chat').removeClass('app__flex');
		$('.user-list').removeClass('custom__active');
		$(this).addClass('custom__active');

		//Load old chats 

		socket.emit('loadOldChat', {sender_id : sender_id, receiver_id: receiver_id});
	})
})

//Update user status

socket.on('getOnlineUser', (data) => {
	$('#'+data.user_id+'-status').text('Online');
	$('#'+data.user_id+'-status').removeClass('offline__status');
	$('#'+data.user_id+'-status').addClass('online__status');
})

socket.on('getOfflineUser', (data) => {
	$('#'+data.user_id+'-status').text('Offline');
	$('#'+data.user_id+'-status').removeClass('online__status');
	$('#'+data.user_id+'-status').addClass('offline__status');
})

//Scrool the chats to the end
const scrollChat = () => {
	$('#chat-container').animate({
		scrollTop: $('#chat-container').offset().top + $('#chat-container')[0].scrollHeight
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

	// Swal.fire({
	// 	title: 'Edit Message',
	// 	input: 'text',
	// 	inputLabel: 'New Message',
	// 	inputPlaceholder: 'Enter a new message',
	// 	inputValue: 'Hello, world!', // Default value for the input field
	// 	showCancelButton: true,
	// 	confirmButtonText: 'Update',
	// 	showLoaderOnConfirm: true,
	// 	preConfirm: (newMessage) => {
	// 		return newMessage;
	// 	},
	// 	allowOutsideClick: () => !Swal.isLoading()
	// }).then((result) => {
	// 	if (result.isConfirmed) {
	// 		const newMessage = result.value;

	// 		$.ajax({
	// 			url: '/update-chat',
	// 			type: 'POST',
	// 			data: { chat_id: chat_id, message: newMessage },
	// 			success: (res) => {
	// 				if(res.success) {

	// 					$(`#${chat_id}`).find('span').txt(newMessage);
	// 					socket.emit('chatUpdated', chat_id, newMessage, receiver_id );
					
	// 				} else {
	// 					Swal.fire({
	// 						title: 'Failure!',
	// 						text: 'Something went wrong.',
	// 						icon: 'error'
	// 					});
	// 				}
	// 			}
	// 		});

	// 		Swal.fire({
	// 			title: 'Success!',
	// 			text: `Message updated to: ${newMessage}`,
	// 			icon: 'success'
	// 		});
	// 	}
	// });
}

//Chat save of user

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

				let html = `<div class="current__user__chat" id='${res.data._id}'>
								<h5>
									<span>${message}  <span><i class="fa fa-trash" aria-hidden='true' onclick="deleteChat('${res.data._id}')"></i></span></span> 
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

socket.on('loadNewChat', (data) => {
	if(receiver_id === data.sender_id) {
		let html = `<div class="opposite__user__chat">
						<h5><span>${data.message}<span></h5>
					</div>`;
		console.log("HIiii");
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
		let addClass = '';

		if(oldChats[i].sender_id == sender_id) {
			addClass = 'current__user__chat';
		} else {
			addClass = 'opposite__user__chat';
		}

		html += `<div class='${addClass}' id='${oldChats[i]._id}'>
					<h5><span>${oldChats[i].message}<span>` + ` `;
						
		if(oldChats[i].sender_id == sender_id) {
			html += `<i class="fa fa-trash" aria-hidden='true' onclick="deleteChat('${oldChats[i]._id}')"></i>`;

		}
						
		html += 	`</h5>
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

let group_id;
let group_name;
let group_image;

$(document).ready(() => {
	$('.group-list').click(function() {

		group_id = $(this).attr('data-id');
		group_name = $(this).attr('data-name');
		group_image = $(this).attr('data-image');
		

		$('.start-head').hide();
		$('.group-btn').hide();
		$('.chat-section').show();
		$('.chat-section').addClass('d-flex');
		$('#start-chat').removeClass('app__flex');
		$('.user-list').removeClass('custom__active');
		$(this).addClass('custom__active');

		//

		$('#group-id').val(group_id);
		$('.group__name').text(group_name);
		$('.group__image').attr('src', 'http://localhost:5000/'+ group_image);
	})
})


/*------------Add & Remvoe members-------------*/

$('.addMember').click(function() {
	let group_id = $(this).parent().attr('data-id');

	console.log(group_id);

	$('#group-update-id').val(group_id);

	$.ajax({
		url: '/get-members',
		type: 'POST',
		data: { group_id: group_id },
		success: (res) => {

			console.log(res.data)
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
				alert(res.message);
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

	console.log(group_obj._id)

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
	formData.append('image', $('#group-image')[0].files[0]);
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