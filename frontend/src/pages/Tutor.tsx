import { apiFetch as fetch } from "../lib/apiFetch";
import { useEffect, useRef, useState } from "react";
import FocusTimer from "../components/FocusTimer";
import { Link, useNavigate } from "react-router-dom";
import LumiStatusBar from "../components/LumiStatusBar";

type StudyTask = {
    id: number;
    text: string;
    completed: boolean;
};


type TutorCache = {
    version: 1;
    userId: string;
    subject: string;
    question: string;
    submittedQuestion: string;
    submittedAnswer: string;
    tutorAnswer: string;
    aiMessage: string;
    aiQuestion: string;
    tutorStage: "idle" | "question" | "complete";
    tutorDemoMode: boolean;
    inputType: "text" | "voice";
    studyGoal: string;
    studyTasks: StudyTask[];
    planCompleted: boolean;
    microPracticeCompleted: boolean;
};

function getTutorCacheKey(userId: string) {
    return `mindbridge_tutor_state:${userId}`;
}

function isStudyTask(value: unknown): value is StudyTask {
    if (!value || typeof value !== "object") return false;
    const task = value as Record<string, unknown>;

    return (
        typeof task.id === "number" &&
        typeof task.text === "string" &&
        typeof task.completed === "boolean"
    );
}

function readTutorCache(userId: string): TutorCache | null {
    try {
        const raw = localStorage.getItem(getTutorCacheKey(userId));
        if (!raw) return null;

        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;

        const data = parsed as Record<string, unknown>;
        const stage = data.tutorStage;
        const input = data.inputType;

        if (
            data.version !== 1 ||
            data.userId !== userId ||
            !["idle", "question", "complete"].includes(String(stage)) ||
            !["text", "voice"].includes(String(input)) ||
            !Array.isArray(data.studyTasks) ||
            !data.studyTasks.every(isStudyTask)
        ) {
            return null;
        }

        return {
            version: 1,
            userId,
            subject:
                typeof data.subject === "string" ? data.subject : "數學",
            question:
                typeof data.question === "string" ? data.question : "",
            submittedQuestion:
                typeof data.submittedQuestion === "string"
                    ? data.submittedQuestion
                    : "",
            submittedAnswer:
                typeof data.submittedAnswer === "string"
                    ? data.submittedAnswer
                    : "",
            tutorAnswer:
                typeof data.tutorAnswer === "string"
                    ? data.tutorAnswer
                    : "",
            aiMessage:
                typeof data.aiMessage === "string"
                    ? data.aiMessage
                    : "",
            aiQuestion:
                typeof data.aiQuestion === "string"
                    ? data.aiQuestion
                    : "",
            tutorStage: stage as TutorCache["tutorStage"],
            tutorDemoMode: data.tutorDemoMode === true,
            inputType: input as TutorCache["inputType"],
            studyGoal:
                typeof data.studyGoal === "string"
                    ? data.studyGoal
                    : "",
            studyTasks: data.studyTasks,
            planCompleted: data.planCompleted === true,
            microPracticeCompleted:
                data.microPracticeCompleted === true,
        };
    } catch {
        return null;
    }
}

// Demo 固定拆解，不宣稱已進行 AI 語意分析。
function createDemoPlan(goal: string): StudyTask[] {
    return [
        { id: 1, text: `整理「${goal}」的已知條件與目前卡住的地方`, completed: false },
        { id: 2, text: "挑選一個最小的部分，嘗試解題或查閱課本", completed: false },
        { id: 3, text: "用自己的話整理一個重點，記下下一個問題", completed: false },
    ];
}

type TutorReply = {
    message: string;
    question: string;
    conversation_end: boolean;
    demo_mode: boolean;
    posture_state: "listening" | "tutoring" | null;
};

type SpeechResult = {
    isFinal: boolean;
    0: { transcript: string };
};
type SpeechEvent = { results: ArrayLike<SpeechResult> };
type SpeechRecognizer = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechEvent) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};
type SpeechWindow = Window & {
    SpeechRecognition?: new () => SpeechRecognizer;
    webkitSpeechRecognition?: new () => SpeechRecognizer;
};

function readTutorReply(value: unknown): TutorReply {
    if (!value || typeof value !== "object") {
        throw new Error("伴讀服務回傳格式不正確。");
    }
    const data = value as Record<string, unknown>;
    if (data.success !== true || typeof data.message !== "string") {
        throw new Error(
            typeof data.message === "string"
                ? data.message
                : "伴讀服務回傳格式不正確。"
        );
    }
    // 舊版 Demo API 尚未回傳 demo_mode，不能因此宣稱是真實 AI。
    return {
        message: data.message,
        question: typeof data.question === "string" ? data.question : "",
        conversation_end: data.conversation_end === true,
        demo_mode: data.demo_mode !== false,
        posture_state:
            data.posture_state === "listening" ||
            data.posture_state === "tutoring"
                ? data.posture_state
                : null,
    };
}

const subjectIcons: Record<string, string> = {
    數學: "📐",
    英文: "📖",
    自然: "🧪",
    社會: "🌍",
    國文: "📝",
    其他: "➕",
};

const subjectPlaceholders: Record<string, string> = {
    數學: "例如：三角函數公式記不住、一次函數的斜率看不懂...",
    英文: "例如：單字背不起來、文法不太懂、閱讀題不知道怎麼下手...",
    自然: "例如：物理公式不會用、化學反應搞不清楚、生物觀念記不住...",
    社會: "例如：歷史事件順序記不住、地理觀念不清楚、公民題目看不懂...",
    國文: "例如：文言文看不懂、修辭分不清楚、閱讀測驗不知道怎麼分析...",
    其他: "例如：這個學習目標卡住了，不知道該從哪裡開始...",
};

function Tutor() {
    const navigate = useNavigate();
    const timerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognizer | null>(null);
    const requestRef = useRef<AbortController | null>(null);
    const requestIdRef = useRef(0);
    const [timerStartSignal, setTimerStartSignal] = useState(0);
    const [submittedQuestion, setSubmittedQuestion] = useState("");
    const [submittedAnswer, setSubmittedAnswer] = useState("");
    const [tutorAnswer, setTutorAnswer] = useState("");
    const [microPracticeCompleted, setMicroPracticeCompleted] = useState(false);
    const [tutorStage, setTutorStage] = useState<"idle" | "question" | "complete">("idle");
    const [tutorDemoMode, setTutorDemoMode] = useState(false);
    const [postureState, setPostureState] = useState<"listening" | "tutoring" | null>(null);
    const [listening, setListening] = useState(false);
    const [inputType, setInputType] = useState<"text" | "voice">("text");
    const [cacheHydrated, setCacheHydrated] = useState(false);

    useEffect(() => {
        return () => {
            requestIdRef.current += 1;
            requestRef.current?.abort();
            recognitionRef.current?.stop();
        };
    }, []);

    const stopListening = () => {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setListening(false);
    };

    const resetTutor = () => {
        requestIdRef.current += 1;
        requestRef.current?.abort();
        requestRef.current = null;
        stopListening();
        setSubmittedQuestion("");
        setSubmittedAnswer("");
        setTutorAnswer("");
        setAiMessage("");
        setAiQuestion("");
        setTutorStage("idle");
        setTutorDemoMode(false);
        setPostureState(null);
        setInputType("text");
        setMessage("");
        setMicroPracticeCompleted(false);
    };

    const startVoiceInput = () => {
        if (listening) {
            stopListening();
            return;
        }
        const speechWindow = window as SpeechWindow;
        const Constructor =
            speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
        if (!Constructor) {
            setMessage("此瀏覽器不支援語音輸入，請使用文字回覆。");
            return;
        }
        try {
            const recognition = new Constructor();
            recognition.lang = "zh-TW";
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map((result) => result[0]?.transcript || "")
                    .join(" ").trim();
                if (transcript) {
                    setTutorAnswer((previous) =>
                        previous ? `${previous} ${transcript}` : transcript
                    );
                    setInputType("voice");
                }
            };
            recognition.onerror = (event) => {
                setMessage(
                    event.error === "not-allowed"
                        ? "麥克風未獲授權，請改用文字輸入。"
                        : "語音辨識未完成，請改用文字輸入。"
                );
                setListening(false);
            };
            recognition.onend = () => {
                setListening(false);
                recognitionRef.current = null;
            };
            recognitionRef.current = recognition;
            recognition.start();
            setListening(true);
            setMessage("");
        } catch {
            setListening(false);
            setMessage("無法啟動語音輸入，請改用文字輸入。");
        }
    };

    const openFocusTimer = () => {
        setTimerStartSignal((previous) => previous + 1);
        timerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const finishTutor = () => {
        const userId = localStorage.getItem("mindbridge_user_id");

        if (userId) {
            localStorage.removeItem(getTutorCacheKey(userId));
        }

        setCacheHydrated(false);
        resetTutor();
        resetPlan();
        setStudyGoal("");
        setQuestion("");
        navigate("/");
    };

    const [subject, setSubject] = useState("數學");
    const [question, setQuestion] = useState("");
    const [aiMessage, setAiMessage] = useState("");
    const [aiQuestion, setAiQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const subjects = ["數學", "英文", "自然", "社會", "國文", "其他"];

    const [studyGoal, setStudyGoal] = useState("");
    const [studyTasks, setStudyTasks] = useState<StudyTask[]>([]);
    const [planCompleted, setPlanCompleted] = useState(false);
    const [planMessage, setPlanMessage] = useState("");

    useEffect(() => {
        const userId = localStorage.getItem("mindbridge_user_id");

        if (!userId) {
            setCacheHydrated(true);
            return;
        }

        const cached = readTutorCache(userId);

        if (cached) {
            setSubject(cached.subject);
            setQuestion(cached.question);
            setSubmittedQuestion(cached.submittedQuestion);
            setSubmittedAnswer(cached.submittedAnswer);
            setTutorAnswer(cached.tutorAnswer);
            setAiMessage(cached.aiMessage);
            setAiQuestion(cached.aiQuestion);
            setTutorStage(cached.tutorStage);
            setTutorDemoMode(cached.tutorDemoMode);
            setInputType(cached.inputType);
            setStudyGoal(cached.studyGoal);
            setStudyTasks(cached.studyTasks);
            setPlanCompleted(cached.planCompleted);
            setMicroPracticeCompleted(
                cached.microPracticeCompleted
            );
        }

        setCacheHydrated(true);
    }, []);

    useEffect(() => {
        if (!cacheHydrated) return;

        const userId = localStorage.getItem("mindbridge_user_id");
        if (!userId) return;

        const cache: TutorCache = {
            version: 1,
            userId,
            subject,
            question,
            submittedQuestion,
            submittedAnswer,
            tutorAnswer,
            aiMessage,
            aiQuestion,
            tutorStage,
            tutorDemoMode,
            inputType,
            studyGoal,
            studyTasks,
            planCompleted,
            microPracticeCompleted,
        };

        localStorage.setItem(
            getTutorCacheKey(userId),
            JSON.stringify(cache)
        );
    }, [
        cacheHydrated,
        subject,
        question,
        submittedQuestion,
        submittedAnswer,
        tutorAnswer,
        aiMessage,
        aiQuestion,
        tutorStage,
        tutorDemoMode,
        inputType,
        studyGoal,
        studyTasks,
        planCompleted,
        microPracticeCompleted,
    ]);

    const createPlan = () => {
        const goal = studyGoal.trim();
        if (!goal) {
            setPlanMessage("請先輸入這次想完成的學習目標。");
            return;
        }
        setStudyTasks(createDemoPlan(goal));
        setPlanCompleted(false);
        setPlanMessage("");
    };

    const toggleTask = (id: number) => {
        setStudyTasks((previous) =>
            previous.map((task) =>
                task.id === id
                    ? { ...task, completed: !task.completed }
                    : task
            )
        );
        setPlanCompleted(false);
    };

    const resetPlan = () => {
        setStudyTasks([]);
        setPlanCompleted(false);
        setPlanMessage("");
    };

    const selectAnotherSubject = () => {
        resetTutor();
        resetPlan();
        setStudyGoal("");
        setQuestion("");
        setAiMessage("");
        setAiQuestion("");
        setMessage("");
    };



    const handleStartTutor = async () => {
        const goal = question.trim();
        if (!goal || loading) {
            if (!goal) setMessage("請先輸入你卡住的題目或問題。");
            return;
        }

        setLoading(true);
        setMessage("");
        resetTutor();
        setLoading(true);
        setSubmittedQuestion(goal);
        const requestId = ++requestIdRef.current;
        const controller = new AbortController();
        requestRef.current = controller;

        try {
            const response = await fetch(
                `/api/tutor`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: goal,
                        input_type: "text",
                        stage: "start",
                        subject,
                        original_question: goal,
                    }),
                    signal: controller.signal,
                }
            );
            const raw = await response.json();
            if (!response.ok) {
                throw new Error(raw.message || "Unable to start tutor session");
            }
            const data = readTutorReply(raw);
            if (requestId !== requestIdRef.current) return;
            setAiMessage(data.message);
            setAiQuestion(data.question);
            setTutorDemoMode(data.demo_mode);
            setPostureState(data.posture_state);
            setTutorStage(data.conversation_end ? "complete" : "question");
        } catch (error) {
            if (requestId !== requestIdRef.current) return;
            console.error("Tutor error:", error);
            setMessage(error instanceof Error ? error.message : "伴讀功能暫時無法使用。");
            setSubmittedQuestion("");
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
                requestRef.current = null;
            }
        }
    };

    const submitTutorAnswer = async () => {
        const answer = tutorAnswer.trim();
        if (!answer || tutorStage !== "question" || loading) return;

        stopListening();
        setLoading(true);
        setMessage("");

        const requestId = ++requestIdRef.current;
        const controller = new AbortController();
        requestRef.current = controller;

        try {
            const response = await fetch(
                `/api/tutor`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: answer,
                        input_type: inputType,
                        stage: "followup",
                        subject,
                        original_question: submittedQuestion,
                        tutor_question: aiQuestion,
                    }),
                    signal: controller.signal,
                }
            );

            const raw = await response.json();

            if (!response.ok) {
                throw new Error(
                    raw.message || "Unable to continue tutor session"
                );
            }

            const data = readTutorReply(raw);

            if (requestId !== requestIdRef.current) return;

            setSubmittedAnswer(answer);
            setTutorAnswer("");
            setAiMessage(data.message);
            setAiQuestion(data.question);
            setTutorDemoMode(data.demo_mode);
            setPostureState(data.posture_state);
            setTutorStage(
                data.conversation_end ? "complete" : "question"
            );
        } catch (error) {
            if (requestId !== requestIdRef.current) return;

            console.error("Tutor follow-up error:", error);
            setMessage(
                error instanceof Error
                    ? error.message
                    : "伴讀功能暫時無法使用。"
            );
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
                requestRef.current = null;
            }
        }
    };

    return (
        <div className="min-h-screen mindbridge-page px-4 py-8">
            <div className="mx-auto max-w-3xl space-y-6">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    ← 回首頁
                </Link>
                {/* Header */}
                <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
                    <p className="text-sm font-medium text-indigo-600">
                        MindBridge 心訊號 · AI Tutor
                    </p>

                    <h1 className="mt-2 text-2xl font-bold text-slate-900">
                        伴讀小幫手
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        告訴我你卡住的地方，我會陪你一步一步整理，不會一口氣把答案全部塞給你。
                    </p>
                </div>

                <LumiStatusBar
                    posture="tutoring"
                    postureState={postureState}
                    title="橋寶伴讀中"
                    message="不懂的概念或題目，讓橋寶陪你一步步整理。"
                />

                {cacheHydrated && submittedQuestion && (
                    <p className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800">
                        已恢復這個瀏覽器上次的伴讀進度。
                    </p>
                )}

                {/* Subject */}
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="font-bold text-slate-800">
                        先選一個科目
                    </h2>

                    <div className="mt-4 flex flex-wrap gap-3">
                        {subjects.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => { if (subject !== item) { resetTutor(); resetPlan(); setStudyGoal(""); setQuestion(""); setSubject(item); } }}
                                className={`rounded-2xl px-5 py-2.5 font-medium transition ${subject === item
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span aria-hidden="true">{subjectIcons[item]}</span>
                                    <span>{item}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* W4: 15 分鐘 ToDo 拆解 */}
                <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-bold text-slate-800">15 分鐘學習小計畫</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                把一個目標拆成三個約 5 分鐘的小步驟。
                            </p>
                        </div>
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                            Demo 固定拆解
                        </span>
                    </div>

                    <label htmlFor="study-goal" className="mt-5 block text-sm font-semibold text-slate-700">
                        這次想完成什麼？
                    </label>
                    <textarea
                        id="study-goal"
                        value={studyGoal}
                        onChange={(event) => setStudyGoal(event.target.value)}
                        rows={2}
                        placeholder="例如：整理三角函數公式、複習英文單字、完成一題數學"
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700 outline-none focus:border-violet-400"
                    />
                    <button
                        type="button"
                        onClick={createPlan}
                        disabled={!studyGoal.trim()}
                        className="mt-3 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {studyTasks.length > 0 ? "重新拆解" : "拆解成 15 分鐘計畫"}
                    </button>
                    {planMessage && (
                        <p className="mt-3 text-sm text-rose-600" role="status">{planMessage}</p>
                    )}

                    {studyTasks.length > 0 && (
                        <div className="mt-5 space-y-4">
                            <p className="text-sm font-medium text-slate-600">
                                已完成 {studyTasks.filter((task) => task.completed).length} / 3 項
                            </p>
                            <div className="space-y-3">
                                {studyTasks.map((task) => (
                                    <label
                                        key={task.id}
                                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => toggleTask(task.id)}
                                            className="mt-1 h-5 w-5 shrink-0 accent-violet-600"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className={`block text-sm font-medium leading-6 ${task.completed ? "text-slate-400 line-through" : "text-slate-800"
                                                }`}>
                                                {task.text}
                                            </span>
                                            <span className="mt-1 block text-xs text-slate-400">
                                                約 5 分鐘
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {planCompleted ? (
                                <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800" role="status">
                                    ✓ 這次的小計畫已完成。可以先休息一下，再決定下一步。
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setPlanCompleted(true)}
                                    disabled={!studyTasks.every((task) => task.completed)}
                                    className="w-full rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    完成這次小計畫
                                </button>
                            )}
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={selectAnotherSubject}
                                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    重新選擇科目
                                </button>
                                <button
                                    type="button"
                                    onClick={createPlan}
                                    className="rounded-full border border-violet-200 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
                                >
                                    重新拆解
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Question input */}
                {tutorStage === "idle" && <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                    <h2 className="font-bold text-slate-800">
                        學習卡關問題描述
                    </h2>

                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        rows={5}
                        placeholder={subjectPlaceholders[subject]}
                        className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />

                    <button
                        type="button"
                        onClick={handleStartTutor}
                        disabled={loading}
                        className="mt-4 w-full rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "橋寶正在整理..." : "開始伴讀"}
                    </button>

                </div>}

                {message && (
                    <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">
                        {message}
                    </p>
                )}

                {/* W4: 使用者提問與雙向伴讀 */}
                {submittedQuestion && (
                    <div className="space-y-4">
                        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                            <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800">
                                {subjectIcons[subject]} {subject} ｜ 使用者提問
                            </span>
                            <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-sky-50 p-4 leading-7 text-slate-700">
                                {submittedQuestion}
                            </div>
                        </section>

                        {tutorDemoMode && (
                            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                                Demo 固定引導：目前未接入真實 AI 語意分析。下方收斂與微練習為固定示範，不代表系統已判斷你的答案正確。
                            </p>
                        )}

                        {(aiMessage || aiQuestion) && (
                            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                                <h2 className="font-bold text-slate-800">橋寶蘇格拉底式家教引導</h2>
                                {aiMessage && (
                                    <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-indigo-50 p-4 leading-7 text-slate-700">
                                        {aiMessage}
                                    </div>
                                )}
                                {aiQuestion && (
                                    <div className="mt-4 rounded-2xl bg-orange-50 p-4">
                                        <p className="text-sm font-semibold text-orange-700">橋寶想問你</p>
                                        <p className="mt-2 leading-7 text-slate-700">{aiQuestion}</p>
                                    </div>
                                )}
                                {tutorStage === "question" && (
                                    <div className="mt-4">
                                        <label htmlFor="tutor-answer" className="block text-sm font-semibold text-slate-700">
                                            說說你的想法
                                        </label>
                                        <textarea
                                            id="tutor-answer"
                                            value={tutorAnswer}
                                            onChange={(event) => {
                                                setTutorAnswer(event.target.value);
                                                setInputType("text");
                                            }}
                                            rows={3}
                                            placeholder="寫下你目前想到的答案，也可以使用語音輸入..."
                                            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 outline-none focus:border-violet-400"
                                        />
                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                            <button
                                                type="button"
                                                onClick={startVoiceInput}
                                                disabled={loading}
                                                aria-pressed={listening}
                                                className="rounded-full border border-violet-200 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                                            >
                                                {listening ? "■ 停止語音輸入" : "🎙️ 語音輸入"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={submitTutorAnswer}
                                                disabled={loading || !tutorAnswer.trim()}
                                                className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                送出回答 ➔
                                            </button>
                                        </div>
                                        {inputType === "voice" && (
                                            <p className="mt-2 text-xs text-slate-500">
                                                語音已轉為文字，請確認內容後再送出。
                                            </p>
                                        )}
                                    </div>
                                )}
                            </section>
                        )}

                        {tutorStage === "complete" && (
                            <section className="space-y-4">
                                {submittedAnswer && (
                                    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                                        <span className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800">
                                            {subjectIcons[subject]} {subject} ｜ 使用者回應
                                        </span>
                                        <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-sky-50 p-4 leading-7 text-slate-700">
                                            {submittedAnswer}
                                        </p>
                                    </div>
                                )}
                                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                                    <h2 className="font-bold text-slate-800">橋寶的觀念收斂</h2>
                                    <p className="mt-3 leading-7 text-slate-700">
                                        {aiMessage ||
                                            "可以先對照課本或例題確認自己的理解，再把還不確定的地方記下來。"}
                                    </p>
                                    <p className="mt-2 text-xs leading-5 text-slate-400">
                                        Demo 模式不判斷你的答案是否正確；正式 AI 串接前，請以課本、老師或可靠解答為準。
                                    </p>
                                </div>
                                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <h2 className="font-bold text-slate-800">
                                            打鐵趁熱・5 分鐘微練習
                                        </h2>
                                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                                            約 5 分鐘
                                        </span>
                                    </div>

                                    <p className="mt-3 leading-7 text-slate-700">
                                        從課本挑一題相近的基礎題，花約 5 分鐘試著完成，
                                        再對照解答。若還有不確定的地方，記下來作為下一次提問。
                                    </p>

                                    <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <input
                                            type="checkbox"
                                            checked={microPracticeCompleted}
                                            onChange={(event) =>
                                                setMicroPracticeCompleted(event.target.checked)
                                            }
                                            className="mt-1 h-5 w-5 shrink-0 accent-violet-600"
                                        />

                                        <span
                                            className={`text-sm font-medium leading-6 ${microPracticeCompleted
                                                ? "text-slate-400 line-through"
                                                : "text-slate-700"
                                                }`}
                                        >
                                            我完成這個練習了
                                        </span>
                                    </label>

                                    {microPracticeCompleted && (
                                        <div
                                            role="status"
                                            className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
                                        >
                                            ✓ 這次的微練習已完成。可以先休息一下，
                                            或繼續進入 15 分鐘專注時間。
                                        </div>
                                    )}

                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={openFocusTimer}
                                            className="rounded-full border border-violet-200 px-5 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                                        >
                                            ◷ 開啟專注時鐘
                                        </button>

                                        <button
                                            type="button"
                                            onClick={finishTutor}
                                            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                                        >
                                            今日解惑完成，回首頁
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* Focus Timer */}
                <div ref={timerRef}>
                    <FocusTimer startSignal={timerStartSignal} />
                </div>

                {/* Finish */}
                <button
                    type="button"
                    onClick={finishTutor}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                    完成這次學習
                </button>
            </div>
        </div>
    );
}

export default Tutor;