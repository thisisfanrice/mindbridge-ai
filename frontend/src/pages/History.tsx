import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

type CheckinRecord = {
    checkin_id: string;
    user_id: string;
    mood_score: number | null;
    stress_score: number | null;
    sleep_score: number | null;
    note: string | null;
    checkin_date: string;
    created_at: string;
};

type ChartRecord = {
    date: string;
    心情: number | null;
    壓力: number | null;
    睡眠: number | null;
};

const moodOptions = [
    { value: 1, emoji: "😢", label: "很低落" },
    { value: 2, emoji: "😞", label: "低落" },
    { value: 3, emoji: "😐", label: "普通" },
    { value: 4, emoji: "🙂", label: "還不錯" },
    { value: 5, emoji: "😊", label: "開心" },
    { value: 6, emoji: "😄", label: "很好" },
];

const getMoodEmoji = (score: number | null) => {
    const option = moodOptions.find(
        (item) => item.value === score
    );

    return option?.emoji ?? "—";
};

const calculateAverage = (
    values: Array<number | null>
): string | null => {
    const validValues = values.filter(
        (value): value is number => value !== null
    );

    if (validValues.length === 0) {
        return null;
    }

    const total = validValues.reduce(
        (sum, value) => sum + value,
        0
    );

    return (total / validValues.length).toFixed(1);
};

function History() {
    const [records, setRecords] = useState<CheckinRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const [aiInsight, setAiInsight] = useState("");
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

    const [editNote, setEditNote] = useState("");

    const [savingId, setSavingId] =
        useState<string | null>(null);

    const [deletingId, setDeletingId] =
        useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            setMessage("");

            const userId = localStorage.getItem(
                "mindbridge_user_id"
            );

            if (!userId) {
                setMessage(
                    "找不到使用者資料，請先回首頁重新建立匿名使用者。"
                );
                return;
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/checkin/${userId}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to load history"
                );
            }

            const loadedRecords: CheckinRecord[] =
                data.data;

            setRecords(loadedRecords);

            await loadAnalysis(loadedRecords);
        } catch (error) {
            console.error("History load error:", error);

            setMessage(
                error instanceof Error
                    ? error.message
                    : "載入歷史紀錄時發生錯誤。"
            );
        } finally {
            setLoading(false);
        }
    };

    const loadAnalysis = async (
        loadedRecords: CheckinRecord[]
    ) => {
        const userId = localStorage.getItem("mindbridge_user_id");

        if (!userId) {
            setAiInsight("找不到使用者資料，無法進行分析。");
            return;
        }
        const today = new Date();

        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recent7Days = loadedRecords.filter(
            (record) => {
                const recordDate = new Date(
                    record.checkin_date
                );

                const taipeiDate = new Date(
                    recordDate.toLocaleString("en-US", {
                        timeZone: "Asia/Taipei",
                    })
                );

                taipeiDate.setHours(0, 0, 0, 0);

                return taipeiDate >= sevenDaysAgo;
            }
        );

        if (recent7Days.length === 0) {
            setAiInsight("");
            return;
        }

        const moodAverage = calculateAverage(
            recent7Days.map(
                (record) => record.mood_score
            )
        );

        const stressAverage = calculateAverage(
            recent7Days.map(
                (record) => record.stress_score
            )
        );

        const sleepAverage = calculateAverage(
            recent7Days.map(
                (record) => record.sleep_score
            )
        );

        setAnalysisLoading(true);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analysis`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        userId,
                        completedDays: recent7Days.length,
                        averageMood: moodAverage,
                        averageStress: stressAverage,
                        averageSleep: sleepAverage,

                        recentRecords: recent7Days.map(
                            (record) => ({
                                date: record.checkin_date,
                                mood: record.mood_score,
                                stress: record.stress_score,
                                sleep: record.sleep_score,
                            })
                        ),
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                setAiInsight(data.data.summary);
            } else {
                setAiInsight(
                    "目前無法產生狀態洞察，請稍後再試。"
                );
            }
        } catch (error) {
            console.error("Analysis load error:", error);

            setAiInsight(
                "目前無法產生狀態洞察，請稍後再試。"
            );
        } finally {
            setAnalysisLoading(false);
        }
    };

    const startEditing = (
        record: CheckinRecord
    ) => {
        setEditingId(record.checkin_id);

        setEditMood(record.mood_score);
        setEditStress(record.stress_score);
        setEditSleep(record.sleep_score);
        setEditNote(record.note ?? "");
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditMood(null);
        setEditStress(null);
        setEditSleep(null);
        setEditNote("");
    };

    const handleUpdate = async (
        record: CheckinRecord
    ) => {
        try {
            const userId = localStorage.getItem(
                "mindbridge_user_id"
            );

            if (!userId) {
                alert("找不到使用者資料。");
                return;
            }

            const hasAnyData =
                editMood !== null ||
                editStress !== null ||
                editSleep !== null ||
                editNote.trim().length > 0;

            if (!hasAnyData) {
                alert("至少保留一項 Check-in 內容。");
                return;
            }

            setSavingId(record.checkin_id);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/checkin/${record.checkin_id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        userId,
                        moodScore: editMood,
                        stressScore: editStress,
                        sleepScore: editSleep,
                        note: editNote.trim() || null,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to update check-in"
                );
            }

            const updatedRecord: CheckinRecord =
                data.data;

            const updatedRecords = records.map(
                (item) =>
                    item.checkin_id ===
                        updatedRecord.checkin_id
                        ? updatedRecord
                        : item
            );

            setRecords(updatedRecords);

            cancelEditing();

            await loadAnalysis(updatedRecords);
        } catch (error) {
            console.error(
                "Update check-in error:",
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : "修改紀錄時發生錯誤。"
            );
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (
        record: CheckinRecord
    ) => {
        const confirmed = window.confirm(
            "確定要刪除這筆 Check-in 紀錄嗎？刪除後無法復原。"
        );

        if (!confirmed) {
            return;
        }

        try {
            const userId = localStorage.getItem(
                "mindbridge_user_id"
            );

            if (!userId) {
                alert("找不到使用者資料。");
                return;
            }

            setDeletingId(record.checkin_id);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/checkin/${record.checkin_id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        userId,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to delete check-in"
                );
            }

            const updatedRecords = records.filter(
                (item) =>
                    item.checkin_id !== record.checkin_id
            );

            setRecords(updatedRecords);

            if (editingId === record.checkin_id) {
                cancelEditing();
            }

            await loadAnalysis(updatedRecords);
        } catch (error) {
            console.error(
                "Delete check-in error:",
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : "刪除紀錄時發生錯誤。"
            );
        } finally {
            setDeletingId(null);
        }
    };

    const chartData: ChartRecord[] =
        Array.from(
            { length: 7 },
            (_, index) => {
                const date = new Date();

                date.setDate(
                    date.getDate() - (6 - index)
                );

                const dateString =
                    date.toLocaleDateString("en-CA", {
                        timeZone: "Asia/Taipei",
                    });

                const matchedRecord = records.find(
                    (record) => {
                        const recordDate = new Date(
                            record.checkin_date
                        ).toLocaleDateString("en-CA", {
                            timeZone: "Asia/Taipei",
                        });

                        return recordDate === dateString;
                    }
                );

                return {
                    date: date.toLocaleDateString(
                        "zh-TW",
                        {
                            month: "numeric",
                            day: "numeric",
                            timeZone: "Asia/Taipei",
                        }
                    ),

                    心情:
                        matchedRecord?.mood_score ?? null,

                    壓力:
                        matchedRecord?.stress_score ?? null,

                    睡眠:
                        matchedRecord?.sleep_score ?? null,
                };
            }
        );

    const completedDays =
        chartData.filter(
            (record) =>
                record.心情 !== null ||
                record.壓力 !== null ||
                record.睡眠 !== null
        ).length;

    const avg7Mood = calculateAverage(
        chartData.map(
            (record) => record.心情
        )
    );

    const avg7Stress = calculateAverage(
        chartData.map(
            (record) => record.壓力
        )
    );

    const avg7Sleep = calculateAverage(
        chartData.map(
            (record) => record.睡眠
        )
    );

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-6xl">

                {/* Header */}
                <div className="mb-8">
                    <Link
                        to="/"
                        className="text-sm font-medium text-slate-500 transition hover:text-indigo-600"
                    >
                        ← 返回首頁
                    </Link>

                    <h1 className="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl">
                        狀態趨勢
                    </h1>

                    <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                        查看近期的心情、壓力與睡眠紀錄，
                        也可以修改或刪除自己的資料。
                    </p>
                </div>

                {loading ? (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                        <p className="text-slate-500">
                            正在載入紀錄...
                        </p>
                    </div>
                ) : message ? (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                        <p className="text-red-500">
                            {message}
                        </p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                        <p className="text-lg font-semibold text-slate-800">
                            還沒有 Check-in 紀錄
                        </p>

                        <p className="mt-2 text-slate-500">
                            完成第一次紀錄後，
                            這裡就會開始出現趨勢。
                        </p>

                        <Link
                            to="/checkin"
                            className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
                        >
                            開始今日 Check-in
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* 近 7 天摘要 */}
                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                                    近 7 天狀態趨勢
                                </h2>

                                <p className="mt-2 text-sm text-slate-500">
                                    未填寫的項目不會計入平均。
                                </p>
                            </div>

                            <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-sm text-slate-500">
                                        完成紀錄
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-slate-900">
                                        {completedDays} / 7
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-indigo-50 p-4">
                                    <p className="text-sm text-indigo-600">
                                        😊 平均心情
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-indigo-700">
                                        {avg7Mood !== null
                                            ? `${avg7Mood} / 6`
                                            : "—"}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-orange-50 p-4">
                                    <p className="text-sm text-orange-600">
                                        😵 平均壓力
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-orange-700">
                                        {avg7Stress !== null
                                            ? `${avg7Stress} / 10`
                                            : "—"}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <p className="text-sm text-emerald-600">
                                        😴 平均睡眠
                                    </p>

                                    <p className="mt-2 text-2xl font-bold text-emerald-700">
                                        {avg7Sleep !== null
                                            ? `${avg7Sleep} / 10`
                                            : "—"}
                                    </p>
                                </div>
                            </div>

                            {/* 心情圖 */}
                            <div>
                                <h3 className="font-bold text-slate-900">
                                    😊 心情變化
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    心情採 1～6 級 Emoji 紀錄
                                </p>

                                <div className="mt-4 h-[260px] w-full sm:h-[320px]">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <LineChart data={chartData}>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                            />

                                            <XAxis dataKey="date" />

                                            <YAxis
                                                domain={[1, 6]}
                                                ticks={[
                                                    1, 2, 3, 4, 5, 6,
                                                ]}
                                                width={30}
                                            />

                                            <Tooltip />

                                            <Line
                                                type="monotone"
                                                dataKey="心情"
                                                stroke="#6366f1"
                                                strokeWidth={3}
                                                dot={{ r: 5 }}
                                                activeDot={{ r: 7 }}
                                                connectNulls={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 壓力睡眠圖 */}
                            <div className="mt-10 border-t border-slate-100 pt-8">
                                <h3 className="font-bold text-slate-900">
                                    壓力與睡眠變化
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    壓力與睡眠皆採 1～10 分紀錄
                                </p>

                                <div className="mt-4 h-[280px] w-full sm:h-[340px]">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <LineChart data={chartData}>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                            />

                                            <XAxis dataKey="date" />

                                            <YAxis
                                                domain={[1, 10]}
                                                ticks={[
                                                    1,
                                                    2,
                                                    3,
                                                    4,
                                                    5,
                                                    6,
                                                    7,
                                                    8,
                                                    9,
                                                    10,
                                                ]}
                                                width={30}
                                            />

                                            <Tooltip />

                                            <Legend />

                                            <Line
                                                type="monotone"
                                                dataKey="壓力"
                                                stroke="#f97316"
                                                strokeWidth={3}
                                                dot={{ r: 4 }}
                                                activeDot={{ r: 6 }}
                                                connectNulls={false}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="睡眠"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                dot={{ r: 4 }}
                                                activeDot={{ r: 6 }}
                                                connectNulls={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </section>

                        {/* AI 洞察 */}
                        <section className="mt-6 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-8">
                            <div className="flex items-start gap-3">
                                <div className="text-2xl">
                                    💡
                                </div>

                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        狀態洞察
                                    </h2>

                                    <p className="mt-2 leading-7 text-slate-700">
                                        {analysisLoading
                                            ? "正在分析近期狀態..."
                                            : aiInsight ||
                                            "目前還沒有足夠的資料進行分析。"}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* 每日紀錄 */}
                        <section className="mt-8">
                            <div className="mb-5 flex items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                                        每日紀錄
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        共 {records.length} 筆紀錄
                                    </p>
                                </div>

                                <Link
                                    to="/checkin"
                                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                                >
                                    ＋ 今日 Check-in
                                </Link>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {records.map((record) => {
                                    const isEditing =
                                        editingId ===
                                        record.checkin_id;

                                    return (
                                        <article
                                            key={record.checkin_id}
                                            className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900">
                                                        {new Date(
                                                            record.checkin_date
                                                        ).toLocaleDateString(
                                                            "zh-TW",
                                                            {
                                                                year: "numeric",
                                                                month: "long",
                                                                day: "numeric",
                                                                timeZone:
                                                                    "Asia/Taipei",
                                                            }
                                                        )}
                                                    </h3>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        Check-in 時間：
                                                        {new Date(
                                                            record.created_at
                                                        ).toLocaleTimeString(
                                                            "zh-TW",
                                                            {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                                timeZone:
                                                                    "Asia/Taipei",
                                                            }
                                                        )}
                                                    </p>
                                                </div>

                                                {!isEditing && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                startEditing(
                                                                    record
                                                                )
                                                            }
                                                            className="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                                                        >
                                                            修改
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                deletingId ===
                                                                record.checkin_id
                                                            }
                                                            onClick={() =>
                                                                handleDelete(
                                                                    record
                                                                )
                                                            }
                                                            className="rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                                                        >
                                                            {deletingId ===
                                                                record.checkin_id
                                                                ? "刪除中..."
                                                                : "刪除"}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {!isEditing ? (
                                                <>
                                                    <div className="mt-5 grid grid-cols-3 gap-2">
                                                        <div className="rounded-xl bg-indigo-50 p-3 text-center">
                                                            <p className="text-xs text-slate-500">
                                                                心情
                                                            </p>

                                                            <p className="mt-1 text-xl">
                                                                {getMoodEmoji(
                                                                    record.mood_score
                                                                )}
                                                            </p>

                                                            <p className="mt-1 text-xs font-medium text-indigo-600">
                                                                {record.mood_score !==
                                                                    null
                                                                    ? `${record.mood_score} / 6`
                                                                    : "未填"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-orange-50 p-3 text-center">
                                                            <p className="text-xs text-slate-500">
                                                                壓力
                                                            </p>

                                                            <p className="mt-1 text-xl">
                                                                😵
                                                            </p>

                                                            <p className="mt-1 text-xs font-medium text-orange-600">
                                                                {record.stress_score !==
                                                                    null
                                                                    ? `${record.stress_score} / 10`
                                                                    : "未填"}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-xl bg-emerald-50 p-3 text-center">
                                                            <p className="text-xs text-slate-500">
                                                                睡眠
                                                            </p>

                                                            <p className="mt-1 text-xl">
                                                                😴
                                                            </p>

                                                            <p className="mt-1 text-xs font-medium text-emerald-600">
                                                                {record.sleep_score !==
                                                                    null
                                                                    ? `${record.sleep_score} / 10`
                                                                    : "未填"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                                        <p className="text-xs font-medium text-slate-400">
                                                            今日紀錄
                                                        </p>

                                                        <p className="mt-2 leading-7 text-slate-700">
                                                            {record.note ||
                                                                "今天沒有留下文字備註。"}
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="mt-6 space-y-6 border-t border-slate-100 pt-6">

                                                    {/* 編輯心情 */}
                                                    <div>
                                                        <p className="mb-3 font-semibold text-slate-800">
                                                            心情
                                                        </p>

                                                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                                                            {moodOptions.map(
                                                                (option) => {
                                                                    const selected =
                                                                        editMood ===
                                                                        option.value;

                                                                    return (
                                                                        <button
                                                                            key={
                                                                                option.value
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setEditMood(
                                                                                    selected
                                                                                        ? null
                                                                                        : option.value
                                                                                )
                                                                            }
                                                                            className={`rounded-xl border p-2 text-center transition ${selected
                                                                                    ? "border-indigo-500 bg-indigo-50"
                                                                                    : "border-slate-200"
                                                                                }`}
                                                                        >
                                                                            <div className="text-2xl">
                                                                                {
                                                                                    option.emoji
                                                                                }
                                                                            </div>

                                                                            <div className="mt-1 text-[11px] text-slate-500">
                                                                                {
                                                                                    option.label
                                                                                }
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                }
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 編輯壓力 */}
                                                    <div>
                                                        <div className="mb-2 flex justify-between">
                                                            <span className="font-semibold text-slate-800">
                                                                壓力
                                                            </span>

                                                            <span className="text-sm text-orange-600">
                                                                {editStress !==
                                                                    null
                                                                    ? `${editStress} / 10`
                                                                    : "未填"}
                                                            </span>
                                                        </div>

                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="10"
                                                            value={
                                                                editStress ?? 1
                                                            }
                                                            onChange={(e) =>
                                                                setEditStress(
                                                                    Number(
                                                                        e.target.value
                                                                    )
                                                                )
                                                            }
                                                            className="w-full text-orange-500"
                                                        />

                                                        {editStress !== null && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditStress(
                                                                        null
                                                                    )
                                                                }
                                                                className="mt-2 text-xs text-slate-400 underline"
                                                            >
                                                                清除
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* 編輯睡眠 */}
                                                    <div>
                                                        <div className="mb-2 flex justify-between">
                                                            <span className="font-semibold text-slate-800">
                                                                睡眠
                                                            </span>

                                                            <span className="text-sm text-emerald-600">
                                                                {editSleep !==
                                                                    null
                                                                    ? `${editSleep} / 10`
                                                                    : "未填"}
                                                            </span>
                                                        </div>

                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="10"
                                                            value={
                                                                editSleep ?? 1
                                                            }
                                                            onChange={(e) =>
                                                                setEditSleep(
                                                                    Number(
                                                                        e.target.value
                                                                    )
                                                                )
                                                            }
                                                            className="w-full text-emerald-500"
                                                        />

                                                        {editSleep !== null && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditSleep(
                                                                        null
                                                                    )
                                                                }
                                                                className="mt-2 text-xs text-slate-400 underline"
                                                            >
                                                                清除
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* 編輯文字 */}
                                                    <div>
                                                        <label className="mb-2 block font-semibold text-slate-800">
                                                            今日紀錄
                                                        </label>

                                                        <textarea
                                                            rows={4}
                                                            value={editNote}
                                                            onChange={(e) =>
                                                                setEditNote(
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none focus:border-indigo-400 focus:bg-white"
                                                        />
                                                    </div>

                                                    {/* 編輯按鈕 */}
                                                    <div className="flex gap-3">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                savingId ===
                                                                record.checkin_id
                                                            }
                                                            onClick={() =>
                                                                handleUpdate(
                                                                    record
                                                                )
                                                            }
                                                            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                                        >
                                                            {savingId ===
                                                                record.checkin_id
                                                                ? "儲存中..."
                                                                : "儲存修改"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                cancelEditing
                                                            }
                                                            className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
                                                        >
                                                            取消
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}

export default History;