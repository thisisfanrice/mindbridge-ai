const express = require("express");
const router = express.Router();
const { callStage2 } = require("../services/aiClient");
const pool = require("../db");

function isValidUuid(value) {
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    );
}

const DEMO_MAX_TURNS = 3;

function getDemoFinalResponse() {
    return {
        safety_escalation: false,
        message:
            "謝謝你完成今天的反思。你可以把剛才提到的想法整理成一個小重點，不需要現在就解決所有事情。",
        question: "",
        action_text:
            "花約 5 分鐘，把目前最掛心的事情分成「現在能做」和「之後再處理」，選一件小事作為下一步。",
        conversation_end: true,
        xai_reason:
            "Demo 規則式收斂：已完成預設的三輪反思。此內容並非根據語意分析產生，也不代表系統已評估個人狀態。",
        demo_mode: true,
    };
}

/**
 * POST /api/conversation
 * {
 *   conversation_id,
 *   user_message,
 *   input_type
 * }
 */
router.post("/", async (req, res) => {
    const {
        conversation_id,
        user_message,
        input_type = "text",
    } = req.body;

    if (!isValidUuid(conversation_id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid conversation_id",
        });
    }

    if (
        typeof user_message !== "string" ||
        !user_message.trim()
    ) {
        return res.status(400).json({
            success: false,
            message: "user_message is required",
        });
    }

    if (!["text", "voice"].includes(input_type)) {
        return res.status(400).json({
            success: false,
            message: "input_type must be text or voice",
        });
    }

    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        // 1. 鎖定對話，避免同時送出造成輪數或結束狀態混亂。
        const conversationResult = await client.query(
            `SELECT
         conversation_id,
         user_id,
         checkin_id,
         conversation_end,
         safety_escalation
       FROM conversations
       WHERE conversation_id = $1 AND user_id = $2
       FOR UPDATE`,
            [conversation_id, req.anonymousUserId]
        );

        if (conversationResult.rowCount === 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Conversation not found",
            });
        }

        const conversation = conversationResult.rows[0];

        if (conversation.safety_escalation) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                safety_escalation: true,
                conversation_end: true,
                message: "This conversation is currently in support mode.",
            });
        }

        if (conversation.conversation_end) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                safety_escalation: false,
                conversation_end: true,
                message: "Conversation has already ended.",
            });
        }

        // 2. 儲存使用者回答。
        await client.query(
            `INSERT INTO conversation_messages
         (conversation_id, role, content, input_type)
       VALUES ($1, 'user', $2, $3)`,
            [conversation_id, user_message.trim(), input_type]
        );

        // 3. 取得完整前後文。
        const historyResult = await client.query(
            `SELECT
         role,
         content,
         input_type,
         created_at
       FROM conversation_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC, message_id ASC`,
            [conversation_id]
        );

        const messages = historyResult.rows;

        // Check-in 建立對話時，已經存入第一筆 user 訊息。
        // 這裡只計算後續 Stage 2 的反思回答。
        const conversationTurn = Math.max(
            0,
            messages.filter(
                (message) => message.role === "user"
            ).length - 1
        );
        // 4. 呼叫 Demo / External 回覆產生器。
        let aiResponse = await callStage2({
            conversation_id,
            user_message: user_message.trim(),
            input_type,
            messages,
            conversation_turn: conversationTurn,
        });

        // Demo：回答三輪後進入收斂。
        if (
            aiResponse.demo_mode === true &&
            conversationTurn >= DEMO_MAX_TURNS &&
            aiResponse.safety_escalation !== true
        ) {
            aiResponse = getDemoFinalResponse();
        }

        // 安全旗標優先於一般回覆與收斂。
        if (aiResponse.safety_escalation === true) {
            aiResponse = {
                ...aiResponse,
                question: "",
                conversation_end: true,
            };
        }

        // Stage 2 只接受一項明確回傳的微行動。
        // 安全升級及未完成對話不顯示一般微行動。
        const actionText =
            aiResponse.conversation_end === true &&
            aiResponse.safety_escalation !== true &&
            typeof aiResponse.action_text === "string"
                ? aiResponse.action_text.trim()
                : "";

        // 5. 儲存 assistant 訊息。
        const assistantContent = [
            aiResponse.message,
            aiResponse.question,
        ]
            .filter(Boolean)
            .join("\n");

        await client.query(
            `INSERT INTO conversation_messages
         (conversation_id, role, content, input_type)
       VALUES ($1, 'assistant', $2, NULL)`,
            [conversation_id, assistantContent]
        );

        // 6. 更新對話狀態。
        await client.query(
            `UPDATE conversations
       SET
         conversation_end = $2,
         safety_escalation = $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1`,
            [
                conversation_id,
                aiResponse.conversation_end === true,
                aiResponse.safety_escalation === true,
            ]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(200).json({
            success: true,
            safety_escalation: aiResponse.safety_escalation === true,
            message: aiResponse.message,
            question: aiResponse.question,
            action_text: actionText,
            demo_mode: aiResponse.demo_mode === true,
            conversation_end: aiResponse.conversation_end === true,
            xai_reason: aiResponse.xai_reason,
            conversation_id,
            conversation_turn: conversationTurn,
        });
    } catch (error) {
        if (client && transactionStarted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Conversation rollback error:", rollbackError && rollbackError.code ? rollbackError.code : "internal");
            }
        }

        console.error("Conversation error:", error && error.code ? error.code : "internal");

        return res.status(500).json({
            success: false,
            message: "Unable to continue conversation",
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});



/**
 * GET /api/conversation/current
 *
 * Restores the latest conversation that belongs to the authenticated Session.
 * The server is the source of truth; localStorage is only a display cache.
 */
router.get("/current", async (req, res) => {
    try {
        const conversationResult = await pool.query(
            `SELECT
                 conversation_id,
                 checkin_id,
                 conversation_end,
                 safety_escalation,
                 created_at,
                 updated_at
             FROM conversations
             WHERE user_id = $1
             ORDER BY updated_at DESC, created_at DESC
             LIMIT 1`,
            [req.anonymousUserId]
        );

        if (conversationResult.rowCount === 0) {
            return res.status(200).json({
                success: true,
                data: null,
            });
        }

        const conversation = conversationResult.rows[0];

        const messagesResult = await pool.query(
            `SELECT
                 role,
                 content,
                 input_type,
                 created_at,
                 message_id
             FROM conversation_messages
             WHERE conversation_id = $1
             ORDER BY created_at ASC, message_id ASC`,
            [conversation.conversation_id]
        );

        const messages = messagesResult.rows;
        const userTurns = Math.max(
            0,
            messages.filter((message) => message.role === "user").length - 1
        );

        const lastAssistant = [...messages]
            .reverse()
            .find((message) => message.role === "assistant");

        let message = "";
        let question = "";

        if (lastAssistant && typeof lastAssistant.content === "string") {
            const content = lastAssistant.content.trim();

            if (
                conversation.conversation_end === true ||
                conversation.safety_escalation === true
            ) {
                message = content;
            } else {
                const parts = content
                    .split(/\r?\n/)
                    .map((part) => part.trim())
                    .filter(Boolean);

                if (parts.length >= 2) {
                    question = parts.pop() || "";
                    message = parts.join("\n");
                } else {
                    message = content;
                }
            }
        }

        const demoMode = process.env.AI_MODE !== "external";
        const actionText =
            demoMode &&
            conversation.conversation_end === true &&
            conversation.safety_escalation !== true
                ? getDemoFinalResponse().action_text
                : "";

        return res.status(200).json({
            success: true,
            data: {
                conversation_id: conversation.conversation_id,
                checkin_id: conversation.checkin_id,
                conversation_end: conversation.conversation_end === true,
                safety_escalation: conversation.safety_escalation === true,
                message,
                question,
                action_text: actionText,
                demo_mode: demoMode,
                conversation_turn: userTurns,
            },
        });
    } catch (error) {
        console.error(
            "Restore conversation error:",
            error && error.code ? error.code : "internal"
        );

        return res.status(500).json({
            success: false,
            message: "Unable to restore conversation",
        });
    }
});

/**
 * DELETE /api/conversation/history
 *
 * Deletes only the authenticated user's AI conversation memory.
 * Check-ins, profile settings and the user account remain untouched.
 * conversation_messages are removed by ON DELETE CASCADE.
 */
router.delete("/history", async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM conversations
             WHERE user_id = $1
             RETURNING conversation_id`,
            [req.anonymousUserId]
        );

        return res.status(200).json({
            success: true,
            deleted_conversations: result.rowCount,
            message: "AI conversation memory cleared",
        });
    } catch (error) {
        console.error(
            "Delete conversation history error:",
            error && error.code ? error.code : "internal"
        );

        return res.status(500).json({
            success: false,
            message: "Unable to clear AI conversation memory",
        });
    }
});

module.exports = router;
