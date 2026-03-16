import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, onValue, set, onDisconnect } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCl_6vsYoZkEBMUNf0P4CK01hKCwA5P0XQ",
  authDomain: "kasuschat.firebaseapp.com",
  databaseURL: "https://kasuschat-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kasuschat",
  storageBucket: "kasuschat.firebasestorage.app",
  messagingSenderId: "953505535371",
  appId: "1:953505535371:web:0d44f20017bc8664948b8e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const onlineRef = ref(db,"onlineUsers");

// unique id for this browser tab
const tabId = crypto.randomUUID();

const myOnlineRef = ref(db,"onlineUsers/"+tabId);

// mark online
set(myOnlineRef,true);

// remove when tab closes
onDisconnect(myOnlineRef).remove();

onValue(onlineRef,(snapshot)=>{

let count = snapshot.numChildren();

document.getElementById("onlineCount").innerText =
count + " users online";

});

function startPresence(){

const onlineRef = ref(db,"onlineUsers");

const tabId = crypto.randomUUID();

const myOnlineRef = ref(db,"onlineUsers/"+tabId);

set(myOnlineRef,true);

onDisconnect(myOnlineRef).remove();

document.addEventListener("visibilitychange",()=>{

if(document.hidden){
set(myOnlineRef,false);
}else{
set(myOnlineRef,true);
}

});

onValue(onlineRef,(snapshot)=>{

let count = snapshot.numChildren();

document.getElementById("onlineCount").innerText =
count + " users online";

});

}

document.addEventListener("visibilitychange",()=>{

if(document.hidden){
set(myOnlineRef,false);
}else{
set(myOnlineRef,true);
}

});

let lastTypingTime = 0;

// User is typing ref
const typingRef = ref(db,"typing");

// ASK FOR NOTIFICATION PERMISSION
if ("Notification" in window) {

if (Notification.permission !== "granted") {
Notification.requestPermission();
}

}

const chat = ref(db, "messages");

function userTyping(){

let name = document.getElementById("name").value;

if(name.trim() === "") return;

let now = Date.now();

if(now - lastTypingTime < 2000) return;

lastTypingTime = now;

set(ref(db,"typing/" + name),{
user: name,
time: now
});

}

window.userTyping = userTyping;


function send(){

let name = document.getElementById("name").value;
let message = document.getElementById("message").value;

if(message.trim() === "") return;
if(name.trim() === "") return;

let time = Date.now();

// check admin command
if(message.startsWith("/clear")){

let parts = message.split(" ");
let pass = parts[1];

if(pass === ADMIN_PASSWORD){

remove(chat).then(()=>{
document.getElementById("chat").innerHTML = "";
});

}else{
alert("Wrong admin password");
}

document.getElementById("message").value="";
return;

}

push(chat,{
name:name,
message:message,
timestamp: time
});

document.getElementById("message").value="";

}

onChildAdded(chat,(data)=>{

let msg = data.val();

let time = new Date(msg.timestamp);
let formattedTime = time.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

let div = document.createElement("div");

let content = msg.message;

// check if message is an image link
if(content.match(/\.(jpeg|jpg|gif|png|webp)$/i)){
content = `<br><img src="${content}" style="max-width:250px;border-radius:6px;margin-top:5px;">`;
}

div.innerHTML = "["+formattedTime+"] <b>"+msg.name+":</b> " + content;

document.getElementById("chat").appendChild(div);

document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;

// SHOW NOTIFICATION
let myName = document.getElementById("name").value;

if(document.hidden && msg.name !== myName){

if(Notification.permission === "granted"){

new Notification(msg.name + " says:", {
body: msg.message
});

}

}

});

onValue(chat,(snapshot)=>{

if(!snapshot.exists()){
document.getElementById("chat").innerHTML = "";
}

});

let typingUsers = {};

onValue(typingRef,(snapshot)=>{

let myName = document.getElementById("name").value;
typingUsers = {};

snapshot.forEach((child)=>{

let info = child.val();

if(!info.user) return;

if(info.user === myName) return;

if(Date.now() - info.time < 3000){
typingUsers[info.user] = true;
}

});

updateTypingDisplay();

});

function updateTypingDisplay(){

let users = Object.keys(typingUsers);

if(users.length === 0){
document.getElementById("typingIndicator").innerText = "";
return;
}

if(users.length === 1){
document.getElementById("typingIndicator").innerText =
users[0] + " is typing...";
return;
}

document.getElementById("typingIndicator").innerText =
users.join(", ") + " are typing...";

}

window.send = send;

const PASSWORD_HASH = "0d08f09ddf93c9c5dbe3f15cd2f022e900b6298b902627d61c18751911e96f38";
const DURESS_PASSWORD_HASH = "8af6ecbdcdb3564c8cc2c2217992b4aafc3981aaeb450b6448a0b86d5bd4de02";

async function sha256(text){

const encoder = new TextEncoder();
const data = encoder.encode(text);

const hashBuffer = await crypto.subtle.digest("SHA-256", data);

const hashArray = Array.from(new Uint8Array(hashBuffer));

const hashHex = hashArray.map(b => b.toString(16).padStart(2,"0")).join("");

return hashHex;

}

async function login() {

  let p = document.getElementById("password").value;

  let hash = await sha256(p);

  // REAL PASSWORD
  if (hash === PASSWORD_HASH) {
        document.getElementById("login").style.display = "none";
        document.getElementById("app").style.display = "block";

        startPresence();
    return;
  }

  // DURESS PASSWORD
  if (hash === DURESS_PASSWORD_HASH) {
    // Show fake 404 page
    document.open();
    document.write(`
      <html>
      <head>
      <title>404</title>
      <style>
      body{
        font-family:Arial;
        background:white;
        color:black;
        text-align:center;
        padding-top:100px;
      }
      </style>
      </head>
      <body>
      <h1>404</h1>
      <p>This page could not be found.</p>
      </body>
      </html>
    `);
    document.close();
    return;
  }

  // WRONG PASSWORD
  alert("Wrong password");
}

window.login = login;

const ADMIN_PASSWORD = "bertilsbareboller";

const statusRef = ref(db,"siteStatus/online");

onValue(statusRef,(snapshot)=>{

let online = snapshot.val();

if(!online){

document.body.innerHTML = `
<h1>Chat is currently offline</h1>
<p>Maintenance in progress</p>
`;

}

});

function toggleQuotes(){

let box = document.getElementById("quoteHistory");

if(box.style.display === "none"){
box.style.display = "block";
}else{
box.style.display = "none";
}

}

window.toggleQuotes = toggleQuotes;

const uploadArea = document.getElementById("uploadArea");
const imageInput = document.getElementById("imageInput");

uploadArea.onclick = () => imageInput.click();

uploadArea.addEventListener("dragover",(e)=>{
e.preventDefault();
uploadArea.style.borderColor="#aaa";
});

uploadArea.addEventListener("dragleave",()=>{
uploadArea.style.borderColor="#555";
});

uploadArea.addEventListener("drop",(e)=>{
e.preventDefault();
uploadArea.style.borderColor="#555";

let file = e.dataTransfer.files[0];
uploadImage(file);
});

imageInput.addEventListener("change",()=>{
let file = imageInput.files[0];
uploadImage(file);
});

function uploadImage(file){

let formData = new FormData();
formData.append("image", file);

fetch("https://api.imgbb.com/1/upload?key=e48b7e0f6d197cb14a1d7f5508fadfef",{
method:"POST",
body:formData
})
.then(res=>res.json())
.then(data=>{

let imageUrl = data.data.url;

let name = document.getElementById("name").value;

push(chat,{
name:name,
message:imageUrl,
timestamp: Date.now()
});

});
}