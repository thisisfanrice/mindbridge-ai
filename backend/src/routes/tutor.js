const express = require("express");
const router = express.Router();
const { callTutor } = require("../services/aiClient");

function normalizeText(value, maxLength = 4000) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
}

router.post("/", async (req, res) => {
    try {
        const {
            message,
            input_type = "text",
            stage = "start",
            subject = "",
            original_question = "",
            tutor_question = "",
        } = req.body;

        const normalizedMessage = normalizeText(message);

        if (!normalizedMessage) {
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

        if (!["start", "followup"].includes(stage)) {
            return res.status(400).json({
                success: false,
                message: "stage must be start or followup",
            });
        }

        const payload = {
            message: normalizedMessage,
            input_type,
            stage,
            subject: normalizeText(subject, 80),
            original_question: normalizeText(original_question),
            tutor_question: normalizeText(tutor_question),
        };

        let tutorResponse = await callTutor(payload);

        /*
         * Demo 第 2 輪固定收斂，不宣稱判斷答案正確與否。
         * External 模式則由外部 Tutor API 決定是否繼續提問或結束。
         */
        if (stage === "followup" && tutorResponse.demo_mode === true) {
            tutorResponse = {
                message:
                    "謝謝你把目前想到的方式說出來。可以先對照課本、例題或老師提供的解法，確認自己的理解，再把還不確定的地方記下來。",
                question: "",
                conversation_end: true,
                demo_mode: true,
            };
        }

        return res.status(200).json({
            success: true,
            message:
                typeof tutorResponse.message === "string"
                    ? tutorResponse.message
                    : "",
            question:
                tutorResponse.conversation_end === true
                    ? ""
                    : typeof tutorResponse.question === "string"
                        ? tutorResponse.question
                        : "",
            conversation_end:
                tutorResponse.conversation_end === true,
            demo_mode:
                tutorResponse.demo_mode === true,
            posture_state: "tutoring",
        });
    } catch (error) {
        console.error(
            "Tutor error:",
            error && error.code ? error.code : "internal"
        );

        return res.status(500).json({
            success: false,
            message: "Unable to process tutor request",
        });
    }
});

module.exports = router;
