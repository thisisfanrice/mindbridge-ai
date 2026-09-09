import {
    useEffect,
    useState,
} from "react";

import { Link, useNavigate } from "react-router-dom";

type Option = {
    value: string;
    label: string;
};

const identityOptions: Option[] = [
    {
        value: "working",
        label: "上班族",
    },
    {
        value: "freelance",
        label: "自由工作",
    },
    {
        value: "unemployed",
        label: "待業中",
    },
    {
        value: "homemaker",
        label: "家庭主婦",
    },
    {
        value: "senior",
        label: "樂齡族",
    },
    {
        value: "student",
        label: "學生",
    },
];

const ageOptions: Option[] = [
    {
        value: "under_15",
        label:
            "15 歲以下（國中及以下）",
    },
    {
        value: "15_18",
        label:
            "15 - 18 歲（高中職）",
    },
    {
        value: "19_22",
        label:
            "19 - 22 歲（大專院校）",
    },
    {
        value: "23_30",
        label:
            "23 - 30 歲（青年 / 初入職場）",
    },
    {
        value: "over_30",
        label:
            "30 歲以上",
    },
];

const stressOptions: Option[] = [
    {
        value: "career",
        label: "工作和職涯",
    },
    {
        value: "finance",
        label: "財務和經濟",
    },
    {
        value: "future",
        label: "未來迷茫",
    },
    {
        value:
            "relationships_family",
        label: "人際和家庭",
    },
    {
        value: "health",
        label: "健康和體力",
    },
    {
        value: "study",
        label: "課業和學業",
    },
];

const sleepScheduleOptions: Option[] = [
    {
        value: "early",
        label:
            "早睡早起、規律作息",
    },
    {
        value: "night",
        label:
            "夜型作息、習慣熬夜",
    },
    {
        value: "irregular",
        label: "作息不固定",
    },
];

const baselineSleepOptions: Option[] = [
    {
        value: "under_5",
        label: "小於 5 小時",
    },
    {
        value: "5_7",
        label: "5 - 7 小時",
    },
    {
        value: "7_9",
        label: "7 - 9 小時",
    },
    {
        value: "over_9",
        label: "9 小時以上",
    },
];

const companionStyleOptions: Option[] = [
    {
        value: "warm",
        label: "溫柔同理",
    },
    {
        value: "rational",
        label: "理性客觀",
    },
    {
        value: "positive",
        label: "積極客觀",
    },
];

const energyOptions: Option[] = [
    {
        value: "full",
        label: "能量充沛",
    },
    {
        value: "maintaining",
        label: "尚可維持",
    },
    {
        value: "drained",
        label: "嚴重透支",
    },
];

const socraticOptions: Option[] = [
    {
        value: "study",
        label:
            "開啟作業家教模式",
    },
    {
        value: "emotional",
        label:
            "維持純情緒陪伴",
    },
];

function Onboarding() {
    const navigate = useNavigate();
    const [
        userIdentity,
        setUserIdentity,
    ] = useState("");

    const [
        ageRange,
        setAgeRange,
    ] = useState("");

    const [
        stressSources,
        setStressSources,
    ] = useState<string[]>([]);

    const [
        sleepSchedule,
        setSleepSchedule,
    ] = useState("");

    const [
        baselineSleep,
        setBaselineSleep,
    ] = useState("");

    const [
        companionStyle,
        setCompanionStyle,
    ] = useState("");

    const [
        currentEnergyLevel,
        setCurrentEnergyLevel,
    ] = useState("");

    const [
        socraticMode,
        setSocraticMode,
    ] = useState("");

    const [
        termsAccepted,
        setTermsAccepted,
    ] = useState(false);

    const [privacyAgreed, setPrivacyAgreed] = useState(false);
    const [, setAllowDataAnalysis] = useState(false);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        message,
        setMessage,
    ] = useState("");

    const [termsModalOpen, setTermsModalOpen] = useState(false);
    const [dataModalOpen, setDataModalOpen] = useState(false);

    /*
     * =========================
     * Load profile
     * =========================
     */

    useEffect(() => {
        const loadProfile =
            async () => {
                try {
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

                    const response =
                        await fetch(
                            `${import.meta.env
                                .VITE_API_URL
                            }/api/profile/${userId}`
                        );

                    const data =
                        await response.json();

                    if (!response.ok) {
                        throw new Error(
                            data.message ||
                            "Unable to load profile"
                        );
                    }

                    if (!data.data) {
                        return;
                    }

                    const profile =
                        data.data;

                    setUserIdentity(
                        profile.user_identity ||
                        ""
                    );

                    setAgeRange(
                        profile.age_range ||
                        ""
                    );

                    setStressSources(
                        Array.isArray(
                            profile.stress_sources
                        )
                            ? profile.stress_sources
                            : []
                    );

                    setSleepSchedule(
                        profile.sleep_schedule ||
                        ""
                    );

                    setBaselineSleep(
                        profile.baseline_sleep ||
                        ""
                    );

                    setCompanionStyle(
                        profile.companion_style ||
                        ""
                    );

                    setCurrentEnergyLevel(
                        profile.current_energy_level ||
                        ""
                    );

                    setSocraticMode(
                        profile.socratic_mode ||
                        ""
                    );

                    setTermsAccepted(
                        profile.terms_accepted ??
                        false
                    );

                    /*
                     * 現在一個 UI checkbox
                     * 同時控制兩個既有 permission。
                     */
                    setAllowDataAnalysis(
                        Boolean(
                            profile.allow_profile_personalization &&
                            profile.allow_history_analysis
                        )
                    );
                } catch (error) {
                    console.error(
                        "Profile load error:",
                        error
                    );

                    setMessage(
                        error instanceof Error
                            ? error.message
                            : "載入設定時發生錯誤"
                    );
                } finally {
                    setLoading(false);
                }
            };

        loadProfile();
    }, []);

    /*
     * =========================
     * Stress multi-select
     * =========================
     */

    const toggleStressSource = (
        value: string
    ) => {
        setStressSources(
            (previous) => {
                if (
                    previous.includes(value)
                ) {
                    return previous.filter(
                        (item) =>
                            item !== value
                    );
                }

                return [
                    ...previous,
                    value,
                ];
            }
        );
    };

    /*
     * =========================
     * Save
     * =========================
     */

    const handleSave =
        async () => {
            try {
                setMessage("");

                if (!termsAccepted || !privacyAgreed) {
                    setMessage(
                        "請先閱讀並同意 MindBridge 使用服務條款與匿名資料隱私政策。"
                    );

                    return;
                }

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

                setSaving(true);

                const response =
                    await fetch(
                        `${import.meta.env
                            .VITE_API_URL
                        }/api/profile/${userId}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json",
                            },

                            body:
                                JSON.stringify({
                                    userIdentity,
                                    ageRange,
                                    stressSources,
                                    sleepSchedule,
                                    baselineSleep,
                                    companionStyle,
                                    currentEnergyLevel,
                                    socraticMode,

                                    termsAccepted,
                                    privacyAgreed,
                                    hasCompletedOnboarding: true,
                                }),
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Unable to save profile"
                    );
                }

                localStorage.setItem(
                    "mindbridge_has_completed_onboarding",
                    "true"
                );

                setMessage("✅ 設定完成，正在前往首頁...");

                navigate("/");
            } catch (error) {
                console.error(
                    "Profile save error:",
                    error
                );

                setMessage(
                    error instanceof Error
                        ? `❌ ${error.message}`
                        : "❌ 儲存設定失敗"
                );
            } finally {
                setSaving(false);
            }
        };

    const handleTermsReadComplete = () => {
        setTermsAccepted(true);
        setTermsModalOpen(false);
    };

    const handlePrivacyReadComplete = () => {
        setPrivacyAgreed(true);
        setDataModalOpen(false);
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 px-4 py-8">
                <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
                    <p className="text-slate-500">
                        正在載入設定...
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
            <div className="mx-auto max-w-4xl">
                <Link
                    to="/"
                    className="text-sm font-medium text-slate-500 transition hover:text-indigo-600"
                >
                    ← 返回首頁
                </Link>

                <header className="mb-8 mt-5">
                    <p className="text-sm font-semibold text-indigo-600">
                        Onboarding
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                        讓 MindBridge 更了解你的偏好
                    </h1>

                    <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                        這些資料用來調整互動方式與趨勢整理，
                        之後都可以回來修改。
                    </p>
                </header>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Identity */}
                    <ProfileCard
                        title="您目前的身分是？"
                    >
                        <OptionGrid
                            options={
                                identityOptions
                            }
                            value={
                                userIdentity
                            }
                            onChange={
                                setUserIdentity
                            }
                        />
                    </ProfileCard>

                    {/* Age */}
                    <ProfileCard
                        title="您的年齡區間是？"
                    >
                        <OptionGrid
                            options={
                                ageOptions
                            }
                            value={ageRange}
                            onChange={
                                setAgeRange
                            }
                            singleColumn
                        />
                    </ProfileCard>

                    {/* Stress */}
                    <ProfileCard
                        title="主要壓力來源（多選）"
                    >
                        <div className="grid grid-cols-2 gap-2">
                            {stressOptions.map(
                                (option) => {
                                    const selected =
                                        stressSources.includes(
                                            option.value
                                        );

                                    return (
                                        <button
                                            key={
                                                option.value
                                            }
                                            type="button"
                                            onClick={() =>
                                                toggleStressSource(
                                                    option.value
                                                )
                                            }
                                            className={`rounded-full border px-3 py-2 text-sm font-medium transition ${selected
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                                                }`}
                                        >
                                            {selected
                                                ? "✓ "
                                                : ""}
                                            {
                                                option.label
                                            }
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    </ProfileCard>

                    {/* Sleep baseline */}
                    <ProfileCard
                        title="每日平均睡眠時數"
                    >
                        <OptionGrid
                            options={
                                baselineSleepOptions
                            }
                            value={
                                baselineSleep
                            }
                            onChange={
                                setBaselineSleep
                            }
                        />
                    </ProfileCard>

                    {/* Schedule */}
                    <ProfileCard
                        title="您的日常作息型態"
                    >
                        <OptionGrid
                            options={
                                sleepScheduleOptions
                            }
                            value={
                                sleepSchedule
                            }
                            onChange={
                                setSleepSchedule
                            }
                            singleColumn
                        />
                    </ProfileCard>

                    {/* Companion style */}
                    <ProfileCard
                        title="您希望 AI 提供什麼樣的陪伴與說話風格？"
                    >
                        <OptionGrid
                            options={
                                companionStyleOptions
                            }
                            value={
                                companionStyle
                            }
                            onChange={
                                setCompanionStyle
                            }
                            singleColumn
                        />
                    </ProfileCard>

                    {/* Energy */}
                    <ProfileCard
                        title="近期的整體心靈能量"
                    >
                        <OptionGrid
                            options={
                                energyOptions
                            }
                            value={
                                currentEnergyLevel
                            }
                            onChange={
                                setCurrentEnergyLevel
                            }
                            singleColumn
                        />
                    </ProfileCard>

                    {/* Socratic */}
                    <ProfileCard
                        title="需要開啟課業與學習輔導嗎？"
                    >
                        <p className="mb-4 text-xs leading-5 text-slate-400">
                            開啟後，AI
                            會使用較多引導式提問協助整理學習與課業問題。
                        </p>

                        <OptionGrid
                            options={
                                socraticOptions
                            }
                            value={
                                socraticMode
                            }
                            onChange={
                                setSocraticMode
                            }
                            singleColumn
                        />
                    </ProfileCard>
                </div>

                {/* Terms */}
                <ProfileCard title="使用條款與匿名資料隱私政策確認">
                    <div className="space-y-5">
                        {/* MindBridge 使用服務條款 */}
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="mt-1 h-5 w-5 accent-indigo-600"
                            />

                            <span className="text-base leading-7 text-slate-700">
                                我已閱讀並同意{" "}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setTermsModalOpen(true);
                                    }}
                                    className="font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                    《MindBridge 使用服務條款》
                                </button>
                            </span>
                        </label>

                        {/* MindBridge 匿名資料與隱私政策 */}
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={privacyAgreed}
                                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                                className="mt-1 h-5 w-5 accent-indigo-600"
                            />

                            <span className="text-base leading-7 text-slate-700">
                                我已閱讀並同意{" "}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setDataModalOpen(true);
                                    }}
                                    className="font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                    《MindBridge 匿名資料與隱私政策》
                                </button>
                            </span>
                        </label>
                    </div>

                    <div className="mt-6 rounded-2xl bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-500">
                        <p>
                            兩項皆需勾選同意後，才能完成設定並開始使用 MindBridge。
                        </p>
                        <p>
                            MindBridge 提供日常紀錄、自我覺察、AI 陪伴與趨勢整理，不作為醫療診斷或正式心理治療。
                        </p>
                    </div>
                </ProfileCard>

                {/* MindBridge 使用服務條款 Modal */}
                {termsModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4"
                        onClick={() => setTermsModalOpen(false)}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="terms-modal-title"
                            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 固定 Header */}
                            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
                                <div>
                                    <h2
                                        id="terms-modal-title"
                                        className="text-xl font-bold text-slate-900"
                                    >
                                        MindBridge 使用服務條款
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        請閱讀以下內容後，再決定是否同意。
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setTermsModalOpen(false)}
                                    className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100"
                                    aria-label="關閉使用服務條款"
                                >
                                    ×
                                </button>
                            </div>

                            {/* 只有這個 Body 可以捲動 */}
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
                                <div className="space-y-6 text-sm leading-7 text-slate-600">
                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            4.1 服務定位
                                        </h3>
                                        <p>
                                            MindBridge 為 AI 輔助之日常情緒紀錄、自我覺察、心理陪伴與趨勢分析工具。
                                        </p>
                                        <p className="mt-2">
                                            系統透過使用者主動提供的資料與內容，協助整理情緒、想法與生活壓力。
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            4.2 非醫療與非診斷服務
                                        </h3>
                                        <p>
                                            MindBridge 不提供醫療診斷、精神疾病判定、正式心理治療或處方建議。
                                        </p>
                                        <p className="mt-2">
                                            AI 所提供的內容不得視為醫師、心理師或其他專業人員服務的替代。
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            4.3 AI 回應限制
                                        </h3>
                                        <p>
                                            AI 回應係根據使用者提供的資料與內容生成，可能存在理解誤差。
                                        </p>
                                        <p className="mt-2">
                                            使用者不應僅依據 AI 回應做出重大醫療、心理、財務或其他重要決策。
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            4.4 需要額外支持的情況
                                        </h3>
                                        <p>
                                            若系統判斷使用者可能需要更優先的安全支持，AI 將停止一般情緒分析、
                                            一般建議與蘇格拉底式對話，改以安全與尋求可信任支持為優先。
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            4.5 服務調整
                                        </h3>
                                        <p>
                                            MindBridge 得基於系統安全、服務優化與功能改善需求，
                                            調整 AI 回應邏輯、功能或相關規則。
                                        </p>
                                    </section>
                                </div>
                            </div>

                            {/* 固定 Footer */}
                            <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={handleTermsReadComplete}
                                        className="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700"
                                    >
                                        閱讀完成
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MindBridge 匿名資料與隱私政策 Modal */}
                {dataModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4"
                        onClick={() => setDataModalOpen(false)}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="privacy-modal-title"
                            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 固定 Header */}
                            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
                                <div>
                                    <h2
                                        id="privacy-modal-title"
                                        className="text-xl font-bold text-slate-900"
                                    >
                                        MindBridge 匿名資料與隱私政策
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        說明 MindBridge 會處理哪些資料，以及資料的使用方式。
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setDataModalOpen(false)}
                                    className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100"
                                    aria-label="關閉匿名資料與隱私政策"
                                >
                                    ×
                                </button>
                            </div>

                            {/* 只有中間內容捲動 */}
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
                                <div className="space-y-6 text-sm leading-7 text-slate-600">
                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            5.1 匿名化原則
                                        </h3>
                                        <p>
                                            MindBridge 以降低直接識別個人身分資料蒐集為原則。
                                        </p>
                                        <p className="mt-2">
                                            使用者不需提供真實姓名等非必要個人資訊。
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            5.2 蒐集資料範圍
                                        </h3>

                                        <p className="mb-2">
                                            系統可能處理使用者主動提供的資料，包括：
                                        </p>

                                        <ul className="list-disc space-y-1 pl-6">
                                            <li>年齡區間</li>
                                            <li>壓力來源</li>
                                            <li>日常作息</li>
                                            <li>平均睡眠狀況</li>
                                            <li>AI 陪伴偏好</li>
                                            <li>每日心情</li>
                                            <li>每日壓力</li>
                                            <li>睡眠品質</li>
                                            <li>能量狀態</li>
                                            <li>文字紀錄</li>
                                            <li>語音轉文字內容</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            5.3 資料使用目的
                                        </h3>

                                        <p className="mb-2">
                                            資料主要用於：
                                        </p>

                                        <ol className="list-decimal space-y-1 pl-6">
                                            <li>提供個人化 AI 陪伴。</li>
                                            <li>產生每日狀態整理。</li>
                                            <li>提供近期趨勢分析與智慧洞察。</li>
                                            <li>改善系統功能與使用體驗。</li>
                                            <li>維護平台安全與適當的支持回應。</li>
                                        </ol>
                                    </section>

                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            5.4 語音資料處理
                                        </h3>
                                        <p>
                                            使用者選擇語音輸入時，系統將語音內容轉換為文字，
                                            並以轉換後內容進行語意理解與 AI 回應。
                                        </p>
                                        <p className="mt-2">
                                            系統應依服務實際技術架構處理語音與文字資料，
                                            並避免將資料使用於與服務無關的用途。
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            5.5 資料最小化原則
                                        </h3>
                                        <p>
                                            系統僅處理提供服務所必要的資料。
                                        </p>
                                        <p className="mt-2">
                                            若選填欄位未填寫，AI 不得自行推測、補充或虛構使用者資訊。
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="mb-2 text-base font-semibold text-slate-800">
                                            5.6 趨勢分析資料
                                        </h3>
                                        <p>
                                            趨勢分析應以使用者實際累積的 Check-in 資料為基礎。
                                        </p>
                                        <p className="mt-2">
                                            若資料經去識別化或彙整後用於服務分析與改善，
                                            應避免直接辨識特定個人。
                                        </p>
                                    </section>
                                </div>
                            </div>

                            {/* 固定 Footer */}
                            {/* 固定 Footer */}
                            <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 sm:px-8">
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={handlePrivacyReadComplete}
                                        className="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700"
                                    >
                                        閱讀完成
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={
                        handleSave
                    }
                    disabled={saving}
                    className="mt-6 w-full rounded-2xl bg-indigo-600 px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving
                        ? "儲存中..."
                        : "儲存並完成設定"}
                </button>

                {message && (
                    <div className="mt-4 rounded-2xl bg-white p-4 text-center text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
                        {message}
                    </div>
                )}
            </div>
        </main >
    );
}

/*
 * =========================
 * Card
 * =========================
 */

interface ProfileCardProps {
    title: string;
    children:
    React.ReactNode;
}

function ProfileCard({
    title,
    children,
}: ProfileCardProps) {
    return (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <h2 className="mb-4 text-center font-bold text-slate-800">
                {title}
            </h2>

            {children}
        </section>
    );
}

/*
 * =========================
 * Single-select buttons
 * =========================
 */

interface OptionGridProps {
    options: Option[];
    value: string;
    onChange: (
        value: string
    ) => void;
    singleColumn?: boolean;
}

function OptionGrid({
    options,
    value,
    onChange,
    singleColumn = false,
}: OptionGridProps) {
    return (
        <div
            className={
                singleColumn
                    ? "grid gap-2"
                    : "grid grid-cols-2 gap-2 sm:grid-cols-3"
            }
        >
            {options.map(
                (option) => {
                    const selected =
                        value ===
                        option.value;

                    return (
                        <button
                            key={
                                option.value
                            }
                            type="button"
                            onClick={() =>
                                onChange(
                                    selected
                                        ? ""
                                        : option.value
                                )
                            }
                            className={`rounded-full border px-3 py-2 text-sm font-medium transition ${selected
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                                }`}
                        >
                            {
                                option.label
                            }
                        </button>
                    );
                }
            )}
        </div>
    );
}

export default Onboarding;