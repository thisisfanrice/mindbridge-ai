const express = require("express");
const router = express.Router();
const { callTutor } = require("../services/aiClient");

router.post("/", async (req, res) => {
    try {
        const {
            message,
            input_type = "text",
        } = req.body;

        if (
            !message ||
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "message is required",
            });
        }

        if (!["text", "voice"].includes(input_type)) {
            return res.status(400).json({
                success: false,
                message: "input_type must be text or voice",
            });
        }

        const tutorResponse = {
            message:
                "沒關係，我們先不要急著直接算答案。可以先把題目已知的條件整理出來。",
            question:
                "你目前看得懂題目中的哪一部分？",
            conversation_end: false,
        };

        return res.status(200).json({
            success: true,
            message: tutorResponse.message,
            question: tutorResponse.question,
            conversation_end:
                tutorResponse.conversation_end,
        });
    } catch (error) {
        console.error("Tutor error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to process tutor request",
        });
    }
});

module.exports = router;