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

        if (!["start", "followup", "followup2"].includes(stage)) {
            return res.status(400).json({
                success: false,
                message: "stage must be start, followup, or followup2",
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
         * 錄影 Demo 固定為三輪：
         * start -> 第一個引導問題
         * followup -> 第二個引導問題
         * followup2 -> 收斂
         * External 模式仍由外部 Tutor API 決定流程。
         */
        if (tutorResponse.demo_mode === true) {
            if (stage === "start") {
                tutorResponse = {
                    message:
                        "三角函數剛開始最容易卡在斜邊、對邊、鄰邊的判斷。先不要一次背全部，我們先只找最容易辨認的一條。",
                    question:
                        "在直角三角形裡，最長而且正對直角的那一邊叫什麼？",
                    conversation_end: false,
                    demo_mode: true,
                };
            } else if (stage === "followup") {
                tutorResponse = {
                    message:
                        "先找到斜邊之後，剩下兩條邊就可以依照題目指定的角來分。",
                    question:
                        "如果題目指定一個角，正對這個角的邊叫什麼？貼著這個角、但不是斜邊的又叫什麼？",
                    conversation_end: false,
                    demo_mode: true,
                };
            } else if (stage === "followup2") {
                tutorResponse = {
                    message:
                        "可以把判斷順序整理成三步：先找斜邊，再依指定角分出對邊和鄰邊，最後才套 sin＝對邊／斜邊、cos＝鄰邊／斜邊。這樣比較不容易把兩個公式混在一起。",
                    question: "",
                    conversation_end: true,
                    demo_mode: true,
                };
            }
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
