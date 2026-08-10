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
    mood_score: number;
    stress_score: number;
    sleep_score: number;
    note: string | null;
    checkin_date: string;
    created_at: string;
};

function History() {
    const [records, setRecords] = useState<CheckinRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [aiInsight, setAiInsight] = useState("");
    const [analysisLoading, setAnalysisLoading] = useState(false);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const userId = localStorage.getItem("mindbridge_user_id");

                if (!userId) {
                    setMessage("找不到使用者資料，請先回首頁重新建立匿名使用者。");
                    setLoading(false);
                    return;
                }

                const response = await fetch(
                    `http://localhost:3000/api/checkin/${userId}`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Unable to load history");
                }

                setRecords(data.data);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
                sevenDaysAgo.setHours(0, 0, 0, 0);

                const recent7Days = data.data.filter((record: CheckinRecord) => {
                    const recordDate = new Date(record.checkin_date);

                    const taipeiDate = new Date(
                        recordDate.toLocaleString("en-US", {
                            timeZone: "Asia/Taipei",
                        })
                    );

                    taipeiDate.setHours(0, 0, 0, 0);

                    return taipeiDate >= sevenDaysAgo;
                });

                if (data.data.length > 0) {
                    setAnalysisLoading(true);

                    const analysisResponse = await fetch(
                        "http://localhost:3000/api/analysis",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                completedDays: data.data.length,

                                averageMood: (
                                    data.data.reduce(
                                        (sum: number, record: CheckinRecord) =>
                                            sum + record.mood_score,
                                        0
                                    ) / data.data.length
                                ).toFixed(1),

                                averageStress: (
                                    data.data.reduce(
                                        (sum: number, record: CheckinRecord) =>
                                            sum + record.stress_score,
                                        0
                                    ) / data.data.length
                                ).toFixed(1),

                                averageSleep: (
                                    data.data.reduce(
                                        (sum: number, record: CheckinRecord) =>
                                            sum + record.sleep_score,
                                        0
                                    ) / data.data.length
                                ).toFixed(1),

                                recentRecords: data.data.map((record: CheckinRecord) => ({
                                    date: record.checkin_date,
                                    mood: record.mood_score,
                                    stress: record.stress_score,
                                    sleep: record.sleep_score,
                                })),
                            }),
                        }
                    );

                    const analysisData = await analysisResponse.json();

                    if (analysisResponse.ok) {
                        setAiInsight(analysisData.data.summary);
                    }

                    setAnalysisLoading(false);
                }
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

        loadHistory();
    }, []);

    const chartData = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));

        const dateString = date.toLocaleDateString("en-CA", {
            timeZone: "Asia/Taipei",
        });

        const matchedRecord = records.find((record) => {
            const recordDate = new Date(
                record.checkin_date
            ).toLocaleDateString("en-CA", {
                timeZone: "Asia/Taipei",
            });

            return recordDate === dateString;
        });

        return {
            date: date.toLocaleDateString("zh-TW", {
                month: "numeric",
                day: "numeric",
                timeZone: "Asia/Taipei",
            }),
            心情: matchedRecord?.mood_score ?? null,
            壓力: matchedRecord?.stress_score ?? null,
            睡眠: matchedRecord?.sleep_score ?? null,
        };
    });

    const last7DaysRecords = chartData.filter(
        (record) =>
            record.心情 !== null ||
            record.壓力 !== null ||
            record.睡眠 !== null
    );

    const completedDays = last7DaysRecords.length;

    const avg7Mood =
        completedDays > 0
            ? (
                last7DaysRecords.reduce(
                    (sum, record) => sum + (record.心情 ?? 0),
                    0
                ) / completedDays
            ).toFixed(1)
            : "0";

    const avg7Stress =
        completedDays > 0
            ? (
                last7DaysRecords.reduce(
                    (sum, record) => sum + (record.壓力 ?? 0),
                    0
                ) / completedDays
            ).toFixed(1)
            : "0";

    const avg7Sleep =
        completedDays > 0
            ? (
                last7DaysRecords.reduce(
                    (sum, record) => sum + (record.睡眠 ?? 0),
                    0
                ) / completedDays
            ).toFixed(1)
            : "0";

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-6xl">
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
                        查看近期的心情、壓力與睡眠紀錄，觀察自己的狀態變化。
                    </p>
                </div>

                {loading ? (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                        <p className="text-slate-500">正在載入紀錄...</p>
                    </div>
                ) : message ? (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                        <p className="text-red-500">{message}</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                        <p className="text-lg font-semibold text-slate-800">
                            還沒有 Check-in 紀錄
                        </p>

                        <p className="mt-2 text-slate-500">
                            完成第一次紀錄後，這裡就會開始出現趨勢。
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
                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                                    近 7 天狀態趨勢
                                </h2>

                                <p className="mt-2 text-sm text-slate-500">
                                    根據最近七天的每日紀錄整理
                                </p>
                            </div>

                            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="text-sm text-slate-500">完成紀錄</p>
                                    <p className="mt-2 text-2xl font-bold text-slate-900">
                                        {completedDays} / 7
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-indigo-50 p-4">
                                    <p className="text-sm text-indigo-600">😊 平均心情</p>
                                    <p className="mt-2 text-2xl font-bold text-indigo-700">
                                        {avg7Mood}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-orange-50 p-4">
                                    <p className="text-sm text-orange-600">😵 平均壓力</p>
                                    <p className="mt-2 text-2xl font-bold text-orange-700">
                                        {avg7Stress}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <p className="text-sm text-emerald-600">😴 平均睡眠</p>
                                    <p className="mt-2 text-2xl font-bold text-emerald-700">
                                        {avg7Sleep}
                                    </p>
                                </div>
                            </div>

                            <div className="h-[300px] w-full sm:h-[360px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />

                                        <XAxis dataKey="date" />

                                        <YAxis
                                            domain={[1, 5]}
                                            ticks={[1, 2, 3, 4, 5]}
                                            width={30}
                                        />

                                        <Tooltip />

                                        <Legend />

                                        <Line
                                            type="monotone"
                                            dataKey="心情"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                            connectNulls={false}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="壓力"
                                            stroke="#f97316"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                            connectNulls={false}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="睡眠"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            dot={{ r: 4 }}
                                            connectNulls={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        <section className="mt-6 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-8">
                            <div className="flex items-start gap-3">
                                <div className="text-2xl">💡</div>

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
                                {records.map((record) => (
                                    <article
                                        key={record.checkin_id}
                                        className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md sm:p-6"
                                    >
                                        <h3 className="text-lg font-bold text-slate-900">
                                            {new Date(
                                                record.checkin_date
                                            ).toLocaleDateString("zh-TW", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                timeZone: "Asia/Taipei",
                                            })}
                                        </h3>

                                        <div className="mt-5 grid grid-cols-3 gap-2">
                                            <div className="rounded-xl bg-indigo-50 p-3 text-center">
                                                <p className="text-xs text-slate-500">心情</p>
                                                <p className="mt-1 font-bold text-indigo-700">
                                                    😊 {record.mood_score}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-orange-50 p-3 text-center">
                                                <p className="text-xs text-slate-500">壓力</p>
                                                <p className="mt-1 font-bold text-orange-700">
                                                    😵 {record.stress_score}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-emerald-50 p-3 text-center">
                                                <p className="text-xs text-slate-500">睡眠</p>
                                                <p className="mt-1 font-bold text-emerald-700">
                                                    😴 {record.sleep_score}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                            <p className="text-xs font-medium text-slate-400">
                                                今日紀錄
                                            </p>

                                            <p className="mt-2 leading-7 text-slate-700">
                                                {record.note
                                                    ? record.note
                                                    : "今天沒有留下文字備註。"}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}

export default History;