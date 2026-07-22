"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = void 0;
const chatbotService_1 = require("../services/chatbotService");
const chat = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }
        const reply = await (0, chatbotService_1.processMessage)(message);
        res.json({ reply });
    }
    catch (error) {
        console.error("Chatbot Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.chat = chat;
