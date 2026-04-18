const { io } = require("socket.io-client");

// CẤU HÌNH Ở ĐÂY
const SERVER_URL = "http://localhost:3000";
const CAMPAIGN_ID = "";

const TOKEN_USER_A = "";
const TOKEN_USER_B = "";

function createClient(name, token) {
    const socket = io(SERVER_URL, {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket']
    });

    socket.on("connect", () => {
        console.log(`[${name}] Connected: ${socket.id}`);
        socket.emit("join_campaign", { campaignId: CAMPAIGN_ID });
    });

    socket.on("new_message", (data) => {
        console.log(`[${name}] received message from ${data.sender.fullName}: "${data.content}"`);
    });

    socket.on("error", (err) => console.error(`[${name}] Error:`, err.message));
    socket.on("connect_error", (err) => console.error(`[${name}] Connection error:`, err.message));

    return socket;
}

console.log("Starting Multi-User Test...");

const clientA = createClient("User A", TOKEN_USER_A);
const clientB = createClient("User B", TOKEN_USER_B);

// Test luồng: User A gửi tin nhắn sau 3s
setTimeout(() => {
    console.log("\n--- User A sending message ---");
    clientA.emit("send_message", {
        campaignId: CAMPAIGN_ID,
        content: "Chào User B, mình là User A đây!"
    });
}, 3000);

// Test luồng: User B phản hồi sau 6s
setTimeout(() => {
    console.log("\n--- User B sending message ---");
    clientB.emit("send_message", {
        campaignId: CAMPAIGN_ID,
        content: "Chào User A! Mình đã nhận được tin nhắn!"
    });
}, 6000);

// Thoát sau 15 giây
setTimeout(() => {
    console.log("\nClosing all connections...");
    clientA.disconnect();
    clientB.disconnect();
    process.exit(0);
}, 15000);
