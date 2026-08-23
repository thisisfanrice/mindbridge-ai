import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router";

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

function Profile() {
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

  const [
    allowDataAnalysis,
    setAllowDataAnalysis,
  ] = useState(false);

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
              `${
                import.meta.env
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

        if (!termsAccepted) {
          setMessage(
            "請先閱讀並同意使用者服務條款。"
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
            `${
              import.meta.env
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
                  allowDataAnalysis,
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

        setMessage(
          "✅ 個人化設定已儲存"
        );
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
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                        selected
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
        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
          <h2 className="text-center text-lg font-bold text-slate-900">
            使用條款與資料授權
          </h2>

          <div className="mt-5 space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={
                  termsAccepted
                }
                onChange={(e) =>
                  setTermsAccepted(
                    e.target
                      .checked
                  )
                }
                className="mt-1 h-5 w-5 accent-indigo-600"
              />

              <span className="text-sm leading-6 text-slate-700">
                我已閱讀並同意
                《使用者服務條款》。
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={
                  allowDataAnalysis
                }
                onChange={(e) =>
                  setAllowDataAnalysis(
                    e.target
                      .checked
                  )
                }
                className="mt-1 h-5 w-5 accent-indigo-600"
              />

              <span className="text-sm leading-6 text-slate-700">
                允許系統使用我提供的背景資料與
                Check-in
                紀錄進行個人化與趨勢整理。
                此設定之後可以修改。
              </span>
            </label>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs leading-6 text-slate-500">
              MindBridge
              提供日常紀錄、反思與一般支持，
              不作為醫療診斷、心理治療或緊急救援服務。
              語音功能預設只儲存轉換後的文字，
              不長期保存原始音檔。
            </p>
          </div>
        </section>

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
    </main>
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
              className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                selected
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

export default Profile;