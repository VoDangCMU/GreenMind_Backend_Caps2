const { io } = require("socket.io-client");

// CẤU HÌNH Ở ĐÂY
const SERVER_URL = "http://localhost:3000";
const JWT_TOKEN = "";
const CAMPAIGN_ID = "";

const socket = io(SERVER_URL, {
    auth: {
        token: `Bearer ${JWT_TOKEN}`
    },
    transports: ['websocket']
});

socket.on("connect", () => {
    console.log("Connected to socket server:", socket.id);

    // 1. Join campaign
    console.log(`Joining campaign: ${CAMPAIGN_ID}...`);
    socket.emit("join_campaign", { campaignId: CAMPAIGN_ID });
});

socket.on("new_message", (data) => {
    console.log("New message received:", data);
});

socket.on("error", (err) => {
    console.error("Socket error:", err.message);
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
});

// Test gửi tin nhắn sau 2 giây
setTimeout(() => {
    if (socket.connected) {
        console.log("Sending test message...");
        socket.emit("send_message", {
            campaignId: CAMPAIGN_ID,
            content: "Hello from test script!"
        });
    }
}, 2000);

// Thoát sau 10 giây
setTimeout(() => {
    console.log("Closing connection...");
    socket.disconnect();
    process.exit(0);
}, 10000);
