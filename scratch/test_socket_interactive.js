const { io } = require("socket.io-client");
const readline = require("readline");

// CẤU HÌNH
const SERVER_URL = "http://localhost:3000";
const JWT_TOKEN = "";
const CAMPAIGN_ID = "";

const socket = io(SERVER_URL, {
    auth: { token: `Bearer ${JWT_TOKEN}` },
    transports: ['websocket']
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "LOGGED IN> "
});

socket.on("connect", () => {
    console.log(`\nConnected as ${socket.id}`);
    socket.emit("join_campaign", { campaignId: CAMPAIGN_ID });
    console.log(`Joined Campaign: ${CAMPAIGN_ID}`);
    console.log("------------------------------------------");
    console.log("Bắt đầu chat! Nhập nội dung và nhấn ENTER để gửi.");
    console.log("Gõ 'exit' để thoát.\n");
    rl.prompt();
});

// Nhận tin nhắn từ server
socket.on("new_message", (data) => {
    // Xóa dòng hiện tại để in tin nhắn mới cho đẹp
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);

    console.log(`📩 [${data.sender.fullName}]: ${data.content}`);

    // Hiện lại prompt
    rl.prompt();
});

socket.on("error", (err) => {
    console.error(`\nError: ${err.message}`);
    rl.prompt();
});

// Xử lý nhập liệu từ bàn phím
rl.on("line", (line) => {
    const content = line.trim();

    if (content.toLowerCase() === "exit") {
        console.log("Tạm biệt!");
        socket.disconnect();
        process.exit(0);
    }

    if (content) {
        socket.emit("send_message", {
            campaignId: CAMPAIGN_ID,
            content: content
        });
    }

    rl.prompt();
});

socket.on("disconnect", () => {
    console.log("\nDisconnected from server.");
    process.exit(0);
});
