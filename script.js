const socket = io();

let myName = "";
let selectedUser = "Everyone";
let count = 0;
let publicMessages = [];
let privateMessages = {};
/* =========================
   ENTER CHAT
========================= */

function enterChat() {
    console.log("Button Clicked");
    let username =
        document.getElementById("home-username").value.trim();

    if (username === "") {
        alert("Please enter your name");
        return;
    }

    myName = username;

    socket.emit("join", username);

    document.getElementById("username").value = username;

    document.getElementById("home-screen").style.display = "none";
    document.getElementById("chat-screen").style.display = "flex";
}

/* =========================
   SEND MESSAGE
========================= */

function sendMessage() {

    let message =
        document.getElementById("message-input")
        .value
        .trim();

    if(message === "") return;

    // GROUP CHAT
    if(selectedUser === "Everyone"){

        socket.send({
            username: myName,
            message: message
        });

    }

    // PRIVATE CHAT
    else{

        socket.emit("private_message",{
            sender: myName,
            receiver: selectedUser,
            message: message
        });

    }

    document.getElementById("message-input").value = "";
}

/* =========================
   ENTER KEY
========================= */

document.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("message-input")
        .addEventListener("keypress", function(e){

            if(e.key === "Enter"){
                sendMessage();
            }

        });

});

/* =========================
   GROUP MESSAGE
========================= */

socket.on("message", function(data){

    if(data.username === "System"){

        document.getElementById("notification-area").innerHTML =
            `<div class="notify">${data.message}</div>`;

        return;
    }

    count++;

    let counter =
    document.getElementById("counter");

if(counter){
    counter.innerText =
        "Messages: " + count;
}

    publicMessages.push(data);

if(selectedUser === "Everyone"){
    addMessageToChat(data,false);
}

});

/* =========================
   PRIVATE MESSAGE
========================= */

socket.on("private_message", function(data){

    let otherUser =
        data.username === myName
        ? data.to
        : data.username;

    if(!privateMessages[otherUser]){
        privateMessages[otherUser] = [];
    }

    privateMessages[otherUser].push({
        username: data.username,
        message: data.message
    });

    if(selectedUser === otherUser){

        addMessageToChat({
            username: data.username,
            message: data.message
        }, true);

    }

});
/* =========================
   MESSAGE SEEN
========================= */
socket.on("message_seen", function(data){

    let typingDiv =
        document.getElementById("typing");

    typingDiv.innerHTML =
        "👀 Seen";

    setTimeout(() => {
        typingDiv.innerHTML = "";
    }, 2000);

});
/* =========================
   CHAT HISTORY
========================= */

socket.on("chat_history", function(messages){

    let chatBox =
        document.getElementById("chat-box");

    chatBox.innerHTML = "";

    messages.forEach(msg => {

        if(msg.username !== "System"){

            addMessageToChat(msg,false);

        }

    });

});

/* =========================
   ONLINE USERS
========================= */

socket.on("user_list", function(users){

    let countElement =
        document.getElementById("online-count");

    if(countElement){
        countElement.innerText =
            "(" + users.length + ")";
    }

    let list =
        document.getElementById("user-list");

    list.innerHTML = "";

    // Everyone Chat
    let everyone =
        document.createElement("li");

    everyone.innerHTML =
        "👥 Everyone Chat";

    everyone.onclick = function(){

        selectedUser = "Everyone";

        document.getElementById("chat-title").innerText =
            "👥 Everyone Chat";

        let chatBox =
            document.getElementById("chat-box");

        chatBox.innerHTML = "";

        publicMessages.forEach(msg => {

            addMessageToChat(msg,false);

        });

    };

    list.appendChild(everyone);

    // Private Users
    users.forEach(user => {

        if(user === myName){
            return;
        }

        let li =
            document.createElement("li");

        li.innerHTML =
            "🔒 " + user;

        li.onclick = function(){

            selectedUser = user;

            document.getElementById("chat-title").innerText =
                "🔒 Chat with " + user;
            // SEND SEEN STATUS
    socket.emit("message_seen",{
        sender: user
        
    });
            let chatBox =
                document.getElementById("chat-box");

            chatBox.innerHTML = "";

            if(privateMessages[user]){

                privateMessages[user].forEach(msg => {

                    addMessageToChat({
                        username: msg.username,
                        message: msg.message
                    }, true);

                });

            }

        };

        list.appendChild(li);

    });

}); 
/*=======================
DISPLAY MESSAGE
=========================*/

function addMessageToChat(data,isPrivate=false){

    let chatBox =
        document.getElementById("chat-box");

    let messageDiv =
        document.createElement("div");

    messageDiv.classList.add("message");

    if(data.username === myName){

        messageDiv.classList.add("right");

    }else{

        messageDiv.classList.add("left");

    }

    let time =
        new Date().toLocaleTimeString([],{
            hour:"2-digit",
            minute:"2-digit"
        });

    messageDiv.innerHTML = `
        <div class="username">
            ${data.username}
            ${isPrivate ? " 🔒" : ""}
        </div>

        <div class="msg-text">
            ${data.message}
        </div>

        <div class="time">
            🕒 ${time}
        </div>

        <button
            class="delete-btn"
            onclick="deleteMessage(this)">
            🗑
        </button>
    `;

    chatBox.appendChild(messageDiv);

    chatBox.scrollTop =
        chatBox.scrollHeight;
}

/* =========================
   DELETE MESSAGE
========================= */

function deleteMessage(btn){

    btn.parentElement.remove();

}

/* =========================
   DOWNLOAD CHAT
========================= */

function downloadChat(){

    let text =
        document.getElementById("chat-box").innerText;

    let blob =
        new Blob([text],{
            type:"text/plain"
        });

    let a =
        document.createElement("a");

    a.href =
        URL.createObjectURL(blob);

    a.download =
        "LiveTalk_Chat.txt";

    a.click();
}
function addEmoji(emoji){

    let input =
        document.getElementById("message-input");

    input.value += emoji;

    input.focus();
}
let typingTimeout;

document
.getElementById("message-input")
.addEventListener("input", function(){

    if(selectedUser !== "Everyone"){

    socket.emit("typing", {
        username: myName,
        receiver: selectedUser
    });

}
});


socket.on("typing", function(data){

    let typingDiv =
        document.getElementById("typing");

    typingDiv.innerHTML =
        "⌨️ " + data.username + " is typing...";

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {

        typingDiv.innerHTML = "";

    }, 2000);

});
socket.on("private_history", function(data){

    privateMessages = {};

    data.forEach(msg => {

        let otherUser =
            msg.sender === myName
            ? msg.receiver
            : msg.sender;

        if(!privateMessages[otherUser]){
            privateMessages[otherUser] = [];
        }

        privateMessages[otherUser].push({
            username: msg.sender,
            message: msg.message
        });

    });

});
socket.on("message_seen", function(data){

    let typingDiv =
        document.getElementById("typing");

    typingDiv.innerHTML =
        "👀 Seen";

    setTimeout(() => {

        typingDiv.innerHTML = "";

    }, 2000);

});