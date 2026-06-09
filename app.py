import json
import os
from flask import Flask, render_template, request
from flask_socketio import SocketIO, send, emit
from datetime import datetime
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

socketio = SocketIO(app, cors_allowed_origins="*")

# -------------------------
# CHAT HISTORY
# -------------------------
HISTORY_FILE = "chat_history.json"


def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    return []


def save_history(messages):
    with open(HISTORY_FILE, "w") as f:
        json.dump(messages, f)


messages = load_history()
PRIVATE_FILE = "private_messages.json"

def load_private():
    if os.path.exists(PRIVATE_FILE):
        with open(PRIVATE_FILE, "r") as f:
            return json.load(f)
    return []

def save_private(data):
    with open(PRIVATE_FILE, "w") as f:
        json.dump(data, f)

private_messages = load_private()
# -------------------------
# USERS (USERNAME -> SOCKET ID)
# -------------------------
users = {}   # username -> sid
last_seen = {}

# -------------------------
# JOIN USER
# -------------------------
@socketio.on('join')
def handle_join(username):

    users[username] = request.sid

    # system message
    system_msg = {
        "username": "System",
        "message": f"🟢 {username} joined the chat"
    }

    send(system_msg, broadcast=True)

    # send old chat history ONLY to new user
    emit("chat_history", messages, to=request.sid)
    emit(
    "private_history",
    private_messages,
    to=request.sid
)
    # send updated user list
    emit("user_list", list(users.keys()), broadcast=True)


# -------------------------
# PUBLIC MESSAGE
# -------------------------
@socketio.on('message')
def handle_message(data):

    messages.append(data)
    save_history(messages)

    send(data, broadcast=True)


# -------------------------
# PRIVATE MESSAGE (NEW)
# -------------------------
@socketio.on('private_message')
def private_message(data):

    sender = data["sender"]
    receiver = data["receiver"]
    message = data["message"]

    # don't allow self chat
    if sender == receiver:
        return
    private_messages.append({
    "sender": sender,
    "receiver": receiver,
    "message": message
})
    save_private(private_messages)
    payload = {
        "username": sender,
        "message": message,
        "private": True,
        "to": receiver
    }

    # send to receiver
    if receiver in users:
        emit(
            "private_message",
            payload,
            room=users[receiver]
        )

    # send copy to sender
    if sender in users:
        emit(
            "private_message",
            payload,
            room=users[sender]
        )
# -------------------------
# TYPING INDICATOR
# -------------------------
@socketio.on("typing")
def typing(data):

    receiver = data["receiver"]

    if receiver in users:
        emit(
            "typing",
            {
                "username": data["username"]
            },
            room=users[receiver]
        )
#-------------------------
# MESSAGE SEEN
#-------------------------
@socketio.on("message_seen")
def message_seen(data):

    sender = data["sender"]

    if sender in users:
        emit(
            "message_seen",
            {
                "sender": sender
            },
            room=users[sender]
        )
# -------------------------
# DISCONNECT HANDLER
# -------------------------
@socketio.on('disconnect')
def handle_disconnect():

    for username, sid in list(users.items()):
        if sid == request.sid:
            last_seen[username] = datetime.now().strftime("%I:%M %p")

            del users[username]

            send({
                "username": "System",
                "message": f"🔴 {username} left the chat"
            }, broadcast=True)

            emit("user_list", list(users.keys()), broadcast=True)
            break

 
# -------------------------
# ROUTE
# -------------------------
@app.route('/')
def home():
    return render_template('index.html')


# -------------------------
# START SERVER
# -------------------------
if __name__ == '__main__':
    socketio.run(app, debug=True)