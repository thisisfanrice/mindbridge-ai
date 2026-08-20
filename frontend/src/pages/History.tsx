import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface CheckinRecord {
    checkin_id: string;
    user_id: string;

    mood_score: number | null;
    stress_score: number | null;
    sleep_score: number | null;
    energy_score: number | null;

    note: string | null;
    input_type: "text" | "voice" | null;

    checkin_date: string;
    created_at: string;
}

const moodOptions = [
    { value: 1, emoji: "😫", label: "崩潰" },
    { value: 2, emoji: "😟", label: "焦慮" },
    { value: 3, emoji: "😐", label: "平淡" },
    { value: 4, emoji: "🙂", label: "充實" },
    { value: 5, emoji: "😃", label: "愉快" },
    { value: 6, emoji: "🤩", label: "超棒" },
];

const energyOptions = [
    { value: 1, emoji: "🪫", label: "電量耗盡" },
    { value: 2, emoji: "🪫", label: "低電量" },
    { value: 3, emoji: "🔋", label: "電量中等" },
    { value: 4, emoji: "🔋", label: "電量充足" },
    { value: 5, emoji: "⚡", label: "電量滿格" },
];

const mockTrendData = [
    { date: "8/06", mood: 4, stress: 5, sleep: 6, energy: 3 },
    { date: "8/07", mood: 3, stress: 6, sleep: 5, energy: 3 },
    { date: "8/08", mood: 4, stress: 5, sleep: 7, energy: 4 },
    { date: "8/09", mood: 5, stress: 4, sleep: 8, energy: 4 },
    { date: "8/10", mood: 5, stress: 3, sleep: 8, energy: 5 },
    { date: "8/11", mood: 4, stress: 5, sleep: 6, energy: 4 },
    { date: "8/12", mood: 3, stress: 7, sleep: 5, energy: 3 },
    { date: "8/13", mood: 2, stress: 8, sleep: 4, energy: 2 },
    { date: "8/14", mood: 3, stress: 7, sleep: 5, energy: 2 },
    { date: "8/15", mood: 4, stress: 6, sleep: 6, energy: 3 },
    { date: "8/16", mood: 4, stress: 5, sleep: 7, energy: 4 },
    { date: "8/17", mood: 5, stress: 4, sleep: 8, energy: 4 },
    { date: "8/18", mood: 4, stress: 6, sleep: 6, energy: 3 },
    { date: "8/19", mood: 3, stress: 7, sleep: 5, energy: 3 },
];

function getMoodInfo(score: number | null) {
    return moodOptions.find(
        (item) => item.value === score
    );
}

function getEnergyInfo(score: number | null) {
    return energyOptions.find(
        (item) => item.value === score
    );
}

function formatDate(dateString: string) {
    const datePart = dateString.slice(0, 10);

    const date = new Date(`${datePart}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return datePart;
    }

    return new Intl.DateTimeFormat("zh-TW", {
        month: "numeric",
        day: "numeric",
        weekday: "short",
    }).format(date);
}

function formatTime(dateString: string) {
    const date = new Date(dateString);

    return new Intl.DateTimeFormat("zh-TW", {
        timeZone: "Asia/Taipei",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
}

function calculateAverage(
    values: Array<number | null>
) {
    const validValues = values.filter(
        (value): value is number =>
            typeof value === "number"
    );

    if (validValues.length === 0) {
        return null;
    }

    const total = validValues.reduce(
        (sum, value) => sum + value,
        0
    );

    return total / validValues.length;
}

function History() {
    const [records, setRecords] =
        useState<CheckinRecord[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [message, setMessage] =
        useState("");

    const [summaryState, setSummaryState] =
        useState("");

    const [aiInsight, setAiInsight] =
        useState("");

    const [actionText, setActionText] =
        useState("");

    const [xaiReason, setXaiReason] =
        useState("");

    const [attributionText, setAttributionText] =
        useState("");

    const [showReason, setShowReason] =
        useState(false);

    const [showSupportResources, setShowSupportResources] =
        useState(false);

    const [analysisLoading, setAnalysisLoading] =
        useState(false);

    const [editingId, setEditingId] =
        useState<string | null>(null);

    const [editMood, setEditMood] =
        useState<number | null>(null);

    const [editStress, setEditStress] =
        useState<number | null>(null);

    const [editSleep, setEditSleep] =
        useState<number | null>(null);

    const [editEnergy, setEditEnergy] =
        useState<number | null>(null);

    const [editNote, setEditNote] =
        useState("");

    const [editInputType, setEditInputType] =
        useState<"text" | "voice">("text");

    const [savingEdit, setSavingEdit] =
        useState(false);

    const loadAnalysis = async (
        sourceRecords: CheckinRecord[]
    ) => {
        try {
            const userId = localStorage.getItem(
                "mindbridge_user_id"
            );

            if (!userId) {
                setAiInsight(
                    "找不到使用者資料，無法進行分析。"
                );
                return;
            }

            if (sourceRecords.length === 0) {
                setAiInsight(
                    "累積一些 Check-in 後，這裡會開始整理你的近期變化。"
                );
                return;
            }

            setAnalysisLoading(true);

            const recentRecords =
                sourceRecords.slice(0, 14);

            const averageMood = calculateAverage(
                recentRecords.map(
                    (record) => record.mood_score
                )
            );

            const averageStress =
                calculateAverage(
                    recentRecords.map(
                        (record) =>
                            record.stress_score
                    )
                );

            const averageSleep =
                calculateAverage(
                    recentRecords.map(
                        (record) =>
                            record.sleep_score
                    )
                );

            const response = await fetch(
                `${import.meta.env.VITE_API_URL
                }/api/analysis`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        userId,

                        completedDays:
                            recentRecords.length,

                        averageMood,
                        averageStress,
                        averageSleep,

                        recentRecords,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to load analysis"
                );
            }

            setSummaryState(
                data.summaryState ||
                "目前沒有可整理的狀態。"
            );

            setAiInsight(
                data.insightText ||
                data.summary ||
                "目前沒有可顯示的分析結果。"
            );

            setActionText(
                data.actionText || ""
            );

            setXaiReason(
                data.xaiReason || ""
            );

            setAttributionText(
                data.attributionText || ""
            );

            setShowSupportResources(
                Boolean(data.showSupportResources)
            );

        } catch (error) {
            console.error(
                "Analysis error:",
                error
            );

            setAiInsight(
                "目前暫時無法產生趨勢整理，但你的紀錄仍然有正常保存。"
            );
        } finally {
            setAnalysisLoading(false);
        }
    };

    const loadRecords = async () => {
        try {
            setLoading(true);
            setMessage("");

            const userId =
                localStorage.getItem(
                    "mindbridge_user_id"
                );

            if (!userId) {
                setMessage(
                    "找不到使用者資料，請先回首頁重新建立匿名使用者。"
                );
                return;
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL
                }/api/checkin/${userId}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to load history"
                );
            }

            const loadedRecords =
                Array.isArray(data.data)
                    ? data.data
                    : [];

            setRecords(loadedRecords);

            await loadAnalysis(
                loadedRecords
            );
        } catch (error) {
            console.error(
                "History load error:",
                error
            );

            setMessage(
                error instanceof Error
                    ? error.message
                    : "載入紀錄時發生錯誤。"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecords();
    }, []);

    /*
     * 產生最近 14 個日曆日
     */
    const chartData = useMemo(() => {
        const today = new Date();

        const days = Array.from(
            { length: 14 },
            (_, index) => {
                const date = new Date(today);

                date.setHours(
                    12,
                    0,
                    0,
                    0
                );

                date.setDate(
                    today.getDate() -
                    (13 - index)
                );

                const year =
                    date.getFullYear();

                const month = String(
                    date.getMonth() + 1
                ).padStart(2, "0");

                const day = String(
                    date.getDate()
                ).padStart(2, "0");

                const key =
                    `${year}-${month}-${day}`;

                const record =
                    records.find(
                        (item) =>
                            item.checkin_date
                                .slice(0, 10) === key
                    );

                return {
                    date: `${date.getMonth() + 1}/${date.getDate()}`,

                    fullDate: key,

                    mood:
                        record?.mood_score ??
                        null,

                    stress:
                        record?.stress_score ??
                        null,

                    sleep:
                        record?.sleep_score ??
                        null,

                    energy:
                        record?.energy_score ??
                        null,
                };
            }
        );

        return days;
    }, [records]);

    const displayChartData =
        records.length >= 5
            ? chartData
            : mockTrendData;

    const recent14Records =
        useMemo(
            () =>
                records
                    .filter((record) => {
                        const recordDate =
                            new Date(
                                `${record.checkin_date.slice(
                                    0,
                                    10
                                )}T12:00:00`
                            );

                        const start =
                            new Date();

                        start.setHours(
                            12,
                            0,
                            0,
                            0
                        );

                        start.setDate(
                            start.getDate() - 13
                        );

                        return (
                            recordDate >= start
                        );
                    })
                    .slice(0, 14),
            [records]
        );

    const averageMood =
        calculateAverage(
            recent14Records.map(
                (record) =>
                    record.mood_score
            )
        );

    const averageStress =
        calculateAverage(
            recent14Records.map(
                (record) =>
                    record.stress_score
            )
        );

    const averageSleep =
        calculateAverage(
            recent14Records.map(
                (record) =>
                    record.sleep_score
            )
        );

    const averageEnergy =
        calculateAverage(
            recent14Records.map(
                (record) =>
                    record.energy_score
            )
        );

    const startEdit = (
        record: CheckinRecord
    ) => {
        setEditingId(
            record.checkin_id
        );

        setEditMood(
            record.mood_score
        );

        setEditStress(
            record.stress_score
        );

        setEditSleep(
            record.sleep_score
        );

        setEditEnergy(
            record.energy_score
        );

        setEditNote(
            record.note || ""
        );

        setEditInputType(
            record.input_type === "voice"
                ? "voice"
                : "text"
        );
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async (
        checkinId: string
    ) => {
        try {
            const userId =
                localStorage.getItem(
                    "mindbridge_user_id"
                );

            if (!userId) {
                setMessage(
                    "找不到使用者資料。"
                );
                return;
            }

            const hasContent =
                editMood !== null ||
                editStress !== null ||
                editSleep !== null ||
                editEnergy !== null ||
                editNote.trim().length > 0;

            if (!hasContent) {
                setMessage(
                    "至少保留一項 Check-in 內容。"
                );
                return;
            }

            setSavingEdit(true);
            setMessage("");

            const response = await fetch(
                `${import.meta.env.VITE_API_URL
                }/api/checkin/${checkinId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        userId,

                        moodScore:
                            editMood,

                        stressScore:
                            editStress,

                        sleepScore:
                            editSleep,

                        energyScore:
                            editEnergy,

                        note:
                            editNote.trim()
                                ? editNote.trim()
                                : null,

                        inputType:
                            editInputType,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to update check-in"
                );
            }

            const updatedRecords =
                records.map((record) =>
                    record.checkin_id ===
                        checkinId
                        ? data.data
                        : record
                );

            setRecords(
                updatedRecords
            );

            setEditingId(null);

            setMessage(
                "✅ 紀錄已更新"
            );

            await loadAnalysis(
                updatedRecords
            );
        } catch (error) {
            console.error(
                "Update check-in error:",
                error
            );

            setMessage(
                error instanceof Error
                    ? `❌ ${error.message}`
                    : "❌ 修改紀錄失敗"
            );
        } finally {
            setSavingEdit(false);
        }
    };

    const deleteRecord = async (
        checkinId: string
    ) => {
        const confirmed =
            window.confirm(
                "確定要刪除這筆 Check-in 嗎？"
            );

        if (!confirmed) {
            return;
        }

        try {
            const userId =
                localStorage.getItem(
                    "mindbridge_user_id"
                );

            if (!userId) {
                return;
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL
                }/api/checkin/${checkinId}`,
                {
                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        userId,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to delete check-in"
                );
            }

            const updatedRecords =
                records.filter(
                    (record) =>
                        record.checkin_id !==
                        checkinId
                );

            setRecords(
                updatedRecords
            );

            setMessage(
                "✅ 紀錄已刪除"
            );

            await loadAnalysis(
                updatedRecords
            );
        } catch (error) {
            console.error(
                "Delete check-in error:",
                error
            );

            setMessage(
                error instanceof Error
                    ? `❌ ${error.message}`
                    : "❌ 刪除紀錄失敗"
            );
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 px-4 py-8">
                <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                    <p className="text-slate-500">
                        正在整理你的紀錄...
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-6xl">
                <Link
                    to="/"
                    className="text-sm font-medium text-slate-500 transition hover:text-indigo-600"
                >
                    ← 返回首頁
                </Link>

                <header className="mb-8 mt-5">
                    <p className="text-sm font-semibold text-indigo-600">
                        Trends
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                        最近 14 天
                    </h1>

                    <p className="mt-3 text-slate-600">
                        把零散的 Daily
                        Check-in 整理成比較容易看懂的變化。
                    </p>

                    {records.length < 5 && (
                        <p className="mt-2 text-xs text-amber-600">
                            目前紀錄較少，圖表以展示資料呈現；累積更多 Check-in 後會自動切換為你的實際紀錄。
                        </p>
                    )}
                </header>

                {message && (
                    <div className="mb-6 rounded-2xl bg-white p-4 text-center text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
                        {message}
                    </div>
                )}

                {/* Summary */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <SummaryCard
                        label="完成紀錄"
                        value={`${recent14Records.length}/14`}
                    />

                    <SummaryCard
                        label="平均心情"
                        value={
                            averageMood !== null
                                ? `${averageMood.toFixed(
                                    1
                                )}/6`
                                : "－"
                        }
                    />

                    <SummaryCard
                        label="平均壓力"
                        value={
                            averageStress !== null
                                ? `${averageStress.toFixed(
                                    1
                                )}/10`
                                : "－"
                        }
                    />

                    <SummaryCard
                        label="平均睡眠"
                        value={
                            averageSleep !== null
                                ? `${averageSleep.toFixed(
                                    1
                                )}/10`
                                : "－"
                        }
                    />

                    <SummaryCard
                        label="平均能量"
                        value={
                            averageEnergy !== null
                                ? `${averageEnergy.toFixed(
                                    1
                                )}/5`
                                : "－"
                        }
                    />
                </section>

                {/* AI Dashboard */}
                <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-xl">
                            ✦
                        </div>

                        <div>
                            <h2 className="font-bold text-slate-900">
                                AI 今日整理
                            </h2>

                            <p className="text-sm text-slate-500">
                                根據你允許使用的 Check-in 與個人化設定
                            </p>
                        </div>
                    </div>

                    {analysisLoading ? (
                        <p className="mt-6 text-slate-500">
                            正在整理近期變化...
                        </p>
                    ) : (
                        <div className="mt-6 space-y-4">
                            {/* 今日狀態 */}
                            <div className="rounded-2xl bg-slate-50 p-5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    今日狀態整理
                                </p>

                                <p className="mt-2 font-semibold leading-7 text-slate-800">
                                    {summaryState}
                                </p>
                            </div>

                            {/* AI Insight */}
                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                                    AI Insight
                                </p>

                                <p className="mt-2 leading-7 text-slate-700">
                                    {aiInsight}
                                </p>
                            </div>

                            {/* 行動建議 */}
                            {actionText && (
                                <div className="rounded-2xl border border-slate-200 p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                                            ✓
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-slate-900">
                                                現在可以做的一件小事
                                            </p>

                                            <p className="mt-2 leading-7 text-slate-700">
                                                {actionText}
                                            </p>

                                            <p className="mt-2 text-xs text-slate-400">
                                                設計為約 5 分鐘內可以完成
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* XAI */}
                            {xaiReason && (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowReason(!showReason)
                                        }
                                        className="flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
                                    >
                                        {showReason ? "▾" : "▸"}
                                        為什麼推薦這個？
                                    </button>

                                    {showReason && (
                                        <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                                            <p className="text-sm leading-6 text-slate-600">
                                                {xaiReason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Attribution */}
                            {attributionText && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        近期紀錄歸因
                                    </p>

                                    <p className="mt-2 text-sm leading-6 text-slate-700">
                                        {attributionText}
                                    </p>

                                    <p className="mt-2 text-xs leading-5 text-slate-400">
                                        此內容根據近期 Check-in 中實際出現的文字關鍵字統計，
                                        不代表因果關係或心理診斷。
                                    </p>
                                </div>
                            )}
                            {/* Support resources */}
                            {showSupportResources && (
                                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                                    <p className="text-sm font-bold text-slate-900">
                                        如果你現在想要多一點支持
                                    </p>

                                    <p className="mt-2 text-sm leading-6 text-slate-700">
                                        你可以先找一位信任的人聊聊，例如家人、朋友、老師或學校輔導資源。
                                        不需要一次把所有事情說清楚，只要先讓身邊的人知道你現在需要一些支持就可以。
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <p className="mt-5 text-xs leading-5 text-slate-400">
                        此內容用於日常紀錄整理與一般支持，
                        不代表醫療診斷或心理狀態預測。
                    </p>
                </section>

                {/* Mood chart */}
                <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
                    <h2 className="text-lg font-bold text-slate-900">
                        心情變化
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        最近 14 天，1～6 分
                    </p>

                    <div className="mt-6 h-72">
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <LineChart
                                data={displayChartData}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="date"
                                    tick={{
                                        fontSize: 12,
                                    }}
                                />

                                <YAxis
                                    domain={[1, 6]}
                                    ticks={[
                                        1, 2, 3, 4, 5,
                                        6,
                                    ]}
                                    allowDecimals={
                                        false
                                    }
                                    width={28}
                                />

                                <Tooltip />

                                <Line
                                    type="monotone"
                                    dataKey="mood"
                                    name="心情"
                                    connectNulls={false}
                                    strokeWidth={3}
                                    dot={{
                                        r: 4,
                                    }}
                                    activeDot={{
                                        r: 6,
                                    }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Stress & Sleep */}
                <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
                    <h2 className="text-lg font-bold text-slate-900">
                        壓力與睡眠
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        最近 14 天，1～10 分
                    </p>

                    <div className="mt-6 h-72">
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <LineChart
                                data={displayChartData}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="date"
                                    tick={{
                                        fontSize: 12,
                                    }}
                                />

                                <YAxis
                                    domain={[1, 10]}
                                    allowDecimals={
                                        false
                                    }
                                    width={28}
                                />

                                <Tooltip />

                                <Line
                                    type="monotone"
                                    dataKey="stress"
                                    name="壓力"
                                    connectNulls={false}
                                    strokeWidth={3}
                                />

                                <Line
                                    type="monotone"
                                    dataKey="sleep"
                                    name="睡眠"
                                    connectNulls={false}
                                    strokeWidth={3}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Energy chart */}
                <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
                    <h2 className="text-lg font-bold text-slate-900">
                        能量變化
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        最近 14 天，1～5 分
                    </p>

                    <div className="mt-6 h-64">
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <LineChart
                                data={displayChartData}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="date"
                                    tick={{
                                        fontSize: 12,
                                    }}
                                />

                                <YAxis
                                    domain={[1, 5]}
                                    ticks={[
                                        1, 2, 3, 4, 5,
                                    ]}
                                    allowDecimals={
                                        false
                                    }
                                    width={28}
                                />

                                <Tooltip />

                                <Line
                                    type="monotone"
                                    dataKey="energy"
                                    name="能量"
                                    connectNulls={false}
                                    strokeWidth={3}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Records */}
                <section className="mt-8">
                    <div className="mb-4 flex items-end justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Check-in 紀錄
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                共 {records.length} 筆
                            </p>
                        </div>

                        <Link
                            to="/checkin"
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                            ＋ 今日 Check-in
                        </Link>
                    </div>

                    {records.length === 0 ? (
                        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
                            <div className="text-4xl">
                                🌱
                            </div>

                            <p className="mt-4 font-semibold text-slate-700">
                                還沒有 Check-in
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                第一筆紀錄永遠是最孤單的，給它一點同伴。
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {records.map(
                                (record) => {
                                    const mood =
                                        getMoodInfo(
                                            record.mood_score
                                        );

                                    const energy =
                                        getEnergyInfo(
                                            record.energy_score
                                        );

                                    const editing =
                                        editingId ===
                                        record.checkin_id;

                                    return (
                                        <article
                                            key={
                                                record.checkin_id
                                            }
                                            className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-bold text-slate-900">
                                                            {formatDate(
                                                                record.checkin_date
                                                            )}
                                                        </h3>

                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                                            {record.input_type ===
                                                                "voice"
                                                                ? "🎙️ 語音"
                                                                : "✏️ 文字"}
                                                        </span>
                                                    </div>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        Check-in{" "}
                                                        {formatTime(
                                                            record.created_at
                                                        )}
                                                    </p>
                                                </div>

                                                {!editing && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                startEdit(
                                                                    record
                                                                )
                                                            }
                                                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                                        >
                                                            修改
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteRecord(
                                                                    record.checkin_id
                                                                )
                                                            }
                                                            className="rounded-xl border border-red-100 px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50"
                                                        >
                                                            刪除
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {!editing ? (
                                                <>
                                                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                        <MetricBox
                                                            label="心情"
                                                            value={
                                                                mood
                                                                    ? `${mood.emoji} ${mood.label} · ${mood.value}/6`
                                                                    : "未填"
                                                            }
                                                        />

                                                        <MetricBox
                                                            label="壓力"
                                                            value={
                                                                record.stress_score !==
                                                                    null
                                                                    ? `${record.stress_score}/10`
                                                                    : "未填"
                                                            }
                                                        />

                                                        <MetricBox
                                                            label="睡眠"
                                                            value={
                                                                record.sleep_score !==
                                                                    null
                                                                    ? `${record.sleep_score}/10`
                                                                    : "未填"
                                                            }
                                                        />

                                                        <MetricBox
                                                            label="能量"
                                                            value={
                                                                energy
                                                                    ? `${energy.emoji} ${energy.value}/5`
                                                                    : "未填"
                                                            }
                                                        />
                                                    </div>

                                                    {record.note && (
                                                        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                                            <p className="text-sm leading-7 text-slate-700">
                                                                {
                                                                    record.note
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="mt-6 space-y-6">
                                                    <div>
                                                        <p className="mb-3 text-sm font-semibold text-slate-700">
                                                            心情
                                                        </p>

                                                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                                                            {moodOptions.map(
                                                                (
                                                                    option
                                                                ) => (
                                                                    <button
                                                                        key={
                                                                            option.value
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setEditMood(
                                                                                editMood ===
                                                                                    option.value
                                                                                    ? null
                                                                                    : option.value
                                                                            )
                                                                        }
                                                                        className={`rounded-xl border p-3 text-center ${editMood ===
                                                                            option.value
                                                                            ? "border-indigo-500 bg-indigo-50"
                                                                            : "border-slate-200"
                                                                            }`}
                                                                    >
                                                                        <div className="text-xl">
                                                                            {
                                                                                option.emoji
                                                                            }
                                                                        </div>

                                                                        <div className="mt-1 text-xs font-medium">
                                                                            {
                                                                                option.label
                                                                            }
                                                                        </div>
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>

                                                    <EditSlider
                                                        label="壓力"
                                                        value={
                                                            editStress
                                                        }
                                                        max={10}
                                                        onChange={
                                                            setEditStress
                                                        }
                                                    />

                                                    <EditSlider
                                                        label="睡眠"
                                                        value={
                                                            editSleep
                                                        }
                                                        max={10}
                                                        onChange={
                                                            setEditSleep
                                                        }
                                                    />

                                                    <div>
                                                        <div className="mb-3 flex justify-between">
                                                            <p className="text-sm font-semibold text-slate-700">
                                                                能量
                                                            </p>

                                                            {editEnergy !==
                                                                null && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setEditEnergy(
                                                                                null
                                                                            )
                                                                        }
                                                                        className="text-xs text-slate-400"
                                                                    >
                                                                        清除
                                                                    </button>
                                                                )}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                                            {energyOptions.map(
                                                                (
                                                                    option
                                                                ) => (
                                                                    <button
                                                                        key={
                                                                            option.value
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setEditEnergy(
                                                                                editEnergy ===
                                                                                    option.value
                                                                                    ? null
                                                                                    : option.value
                                                                            )
                                                                        }
                                                                        className={`rounded-xl border p-3 text-center text-sm ${editEnergy ===
                                                                            option.value
                                                                            ? "border-indigo-500 bg-indigo-50"
                                                                            : "border-slate-200"
                                                                            }`}
                                                                    >
                                                                        <div>
                                                                            {
                                                                                option.emoji
                                                                            }
                                                                        </div>

                                                                        <div className="mt-1 text-xs">
                                                                            {
                                                                                option.label
                                                                            }
                                                                        </div>
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="mb-2 text-sm font-semibold text-slate-700">
                                                            Journal
                                                        </p>

                                                        <textarea
                                                            value={
                                                                editNote
                                                            }
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                setEditNote(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            rows={4}
                                                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none focus:border-indigo-400"
                                                        />
                                                    </div>

                                                    <div className="flex flex-wrap gap-3">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                savingEdit
                                                            }
                                                            onClick={() =>
                                                                saveEdit(
                                                                    record.checkin_id
                                                                )
                                                            }
                                                            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                                                        >
                                                            {savingEdit
                                                                ? "儲存中..."
                                                                : "儲存修改"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                cancelEdit
                                                            }
                                                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600"
                                                        >
                                                            取消
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    );
                                }
                            )}
                        </div>
                    )}
                </section>

                <p className="mt-8 pb-6 text-center text-xs leading-5 text-slate-400">
                    MindBridge
                    用於日常紀錄、趨勢整理與一般支持，
                    不作為醫療診斷或專業心理治療的替代。
                </p>
            </div>
        </main>
    );
}

interface SummaryCardProps {
    label: string;
    value: string;
}

function SummaryCard({
    label,
    value,
}: SummaryCardProps) {
    return (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
                {value}
            </p>
        </div>
    );
}

interface MetricBoxProps {
    label: string;
    value: string;
}

function MetricBox({
    label,
    value,
}: MetricBoxProps) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-400">
                {label}
            </p>

            <p className="mt-1 font-semibold text-slate-800">
                {value}
            </p>
        </div>
    );
}

interface EditSliderProps {
    label: string;
    value: number | null;
    max: number;
    onChange: (
        value: number | null
    ) => void;
}

function EditSlider({
    label,
    value,
    max,
    onChange,
}: EditSliderProps) {
    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                    {label}
                </p>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-indigo-600">
                        {value !== null
                            ? `${value}/${max}`
                            : "未填"}
                    </span>

                    {value !== null && (
                        <button
                            type="button"
                            onClick={() =>
                                onChange(null)
                            }
                            className="text-xs text-slate-400"
                        >
                            清除
                        </button>
                    )}
                </div>
            </div>

            <input
                type="range"
                min="1"
                max={max}
                value={value ?? Math.ceil(max / 2)}
                onChange={(e) =>
                    onChange(
                        Number(e.target.value)
                    )
                }
                className="w-full cursor-pointer accent-indigo-600"
            />
        </div>
    );
}

export default History;