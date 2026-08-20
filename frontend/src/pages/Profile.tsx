import { useEffect, useState } from "react";
import { Link } from "react-router";

const identityOptions = [
  { value: "high_school", label: "高中生" },
  { value: "college", label: "大學生" },
  { value: "graduate", label: "研究生" },
  { value: "working", label: "上班族" },
  { value: "freelance", label: "自由工作者" },
  { value: "other", label: "其他" },
];

const sleepScheduleOptions = [
  { value: "early", label: "23 點前入睡" },
  { value: "normal", label: "23 點～凌晨 1 點" },
  { value: "night", label: "凌晨 1～3 點" },
  { value: "irregular", label: "作息不固定" },
];

const baselineSleepOptions = [
  { value: "<5h", label: "少於 5 小時" },
  { value: "5-7h", label: "5～7 小時" },
  { value: "7-9h", label: "7～9 小時" },
  { value: ">9h", label: "超過 9 小時" },
];

const stressSourceOptions = [
  { value: "study", label: "課業" },
  { value: "work", label: "工作" },
  { value: "relation", label: "人際" },
  { value: "family", label: "家庭" },
  { value: "finance", label: "經濟" },
  { value: "health", label: "健康" },
  { value: "future", label: "未來規劃" },
  { value: "other", label: "其他" },
];

const copingMethodOptions = [
  { value: "music", label: "聽音樂" },
  { value: "exercise", label: "運動" },
  { value: "video", label: "看影片" },
  { value: "chat", label: "聊天" },
  { value: "alone", label: "自己待著" },
  { value: "sleep", label: "睡覺" },
  { value: "game", label: "玩遊戲" },
  { value: "journal", label: "寫日記" },
];

const companionStyleOptions = [
  { value: "warm", label: "溫暖鼓勵" },
  { value: "organize", label: "幫我整理想法" },
  { value: "action", label: "給我具體建議" },
  { value: "brief", label: "簡短陪伴" },
];

const preferredElementOptions = [
  { value: "emoji", label: "Emoji" },
  { value: "animal", label: "動物元素" },
  { value: "scenery", label: "風景" },
  { value: "music", label: "音樂" },
  { value: "animation", label: "動畫感" },
  { value: "none", label: "不特別偏好" },
];

function Profile() {
  const [userIdentity, setUserIdentity] = useState("");
  const [sleepSchedule, setSleepSchedule] = useState("");
  const [baselineSleep, setBaselineSleep] = useState("");

  const [stressSources, setStressSources] = useState<string[]>([]);
  const [copingMethods, setCopingMethods] = useState<string[]>([]);
  const [companionStyle, setCompanionStyle] = useState("");
  const [preferredElements, setPreferredElements] = useState<string[]>([]);
  const [userTarget, setUserTarget] = useState("");

  const [
    allowProfilePersonalization,
    setAllowProfilePersonalization,
  ] = useState(false);

  const [
    allowHistoryAnalysis,
    setAllowHistoryAnalysis,
  ] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = localStorage.getItem("mindbridge_user_id");

        if (!userId) {
          setMessage("找不到使用者資料，請先回首頁重新建立匿名使用者。");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/profile/${userId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load profile");
        }

        if (data.data) {
          setUserIdentity(data.data.user_identity || "");
          setSleepSchedule(data.data.sleep_schedule || "");
          setBaselineSleep(data.data.baseline_sleep || "");

          setStressSources(
            Array.isArray(data.data.stress_sources)
              ? data.data.stress_sources
              : []
          );

          setCopingMethods(
            Array.isArray(data.data.coping_methods)
              ? data.data.coping_methods
              : []
          );

          setCompanionStyle(data.data.companion_style || "");

          setPreferredElements(
            Array.isArray(data.data.preferred_elements)
              ? data.data.preferred_elements
              : []
          );

          setUserTarget(data.data.user_target || "");

          setAllowProfilePersonalization(
            data.data.allow_profile_personalization ?? false
          );

          setAllowHistoryAnalysis(
            data.data.allow_history_analysis ?? true
          );
        }
      } catch (error) {
        console.error("Profile load error:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "載入設定時發生錯誤。"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const toggleArrayValue = (
    value: string,
    values: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (values.includes(value)) {
      setter(values.filter((item) => item !== value));
    } else {
      setter([...values, value]);
    }
  };

  const handleSave = async () => {
    try {
      setMessage("");

      const userId = localStorage.getItem("mindbridge_user_id");

      if (!userId) {
        setMessage("找不到使用者資料，請先回首頁重新建立匿名使用者。");
        return;
      }

      setSaving(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/profile/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userIdentity,
            sleepSchedule,
            baselineSleep,
            stressSources,
            copingMethods,
            companionStyle,
            preferredElements,
            userTarget,

            allowProfilePersonalization,
            allowHistoryAnalysis,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save profile");
      }

      setMessage("✅ 個人化設定已儲存");
    } catch (error) {
      console.error("Profile save error:", error);

      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ 儲存設定時發生錯誤"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-500">正在載入設定...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            to="/"
            className="text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            ← 返回首頁
          </Link>

          <h1 className="mt-5 text-3xl font-bold text-slate-900 sm:text-4xl">
            個人化設定
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            這些背景資料只需要設定一次，之後可以隨時修改。
            全部皆為選填，你可以決定想提供多少資訊。
          </p>
        </div>

        <div className="space-y-6">
          {/* 日常身份 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              日常身份
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              選填
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {identityOptions.map((option) => {
                const selected = userIdentity === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setUserIdentity(selected ? "" : option.value)
                    }
                    className={`rounded-2xl border px-4 py-4 text-left font-medium transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 作息 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              平常作息型態
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              主要依平常入睡時間選擇
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {sleepScheduleOptions.map((option) => {
                const selected = sleepSchedule === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setSleepSchedule(selected ? "" : option.value)
                    }
                    className={`rounded-2xl border px-4 py-4 text-left font-medium transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 平均睡眠 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              平均睡眠時間
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {baselineSleepOptions.map((option) => {
                const selected = baselineSleep === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setBaselineSleep(selected ? "" : option.value)
                    }
                    className={`rounded-2xl border px-4 py-4 text-left font-medium transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 壓力來源 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              主要壓力來源
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              可複選
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {stressSourceOptions.map((option) => {
                const selected = stressSources.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      toggleArrayValue(
                        option.value,
                        stressSources,
                        setStressSources
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    {selected ? "✓ " : ""}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 調適方式 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              平常習慣怎麼調適自己？
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              可複選
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {copingMethodOptions.map((option) => {
                const selected = copingMethods.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      toggleArrayValue(
                        option.value,
                        copingMethods,
                        setCopingMethods
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    {selected ? "✓ " : ""}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* AI 陪伴風格 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              希望 AI 怎麼陪你？
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {companionStyleOptions.map((option) => {
                const selected = companionStyle === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setCompanionStyle(selected ? "" : option.value)
                    }
                    className={`rounded-2xl border px-4 py-4 text-left font-medium transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 偏好互動元素 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              偏好的互動元素
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              可複選
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {preferredElementOptions.map((option) => {
                const selected = preferredElements.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      toggleArrayValue(
                        option.value,
                        preferredElements,
                        setPreferredElements
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    {selected ? "✓ " : ""}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 近期目標 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              最近正在努力的目標
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              選填
            </p>

            <textarea
              value={userTarget}
              onChange={(e) => setUserTarget(e.target.value)}
              rows={3}
              placeholder="例如：準備考試、完成專題、調整作息..."
              className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />
          </section>

          {/* AI 權限 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">
              AI 個人化權限
            </h2>

            <div className="mt-6 space-y-4">
              <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-semibold text-slate-800">
                    使用背景資料提供個人化內容
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    允許 AI 使用你的作息、壓力來源、調適方式與偏好，
                    提供更貼近你的內容。
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={allowProfilePersonalization}
                  onChange={(e) =>
                    setAllowProfilePersonalization(e.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-indigo-600"
                />
              </label>

              <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-semibold text-slate-800">
                    使用過去 Check-in 分析長期趨勢
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    允許系統使用過去紀錄觀察近期及長期變化。
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={allowHistoryAnalysis}
                  onChange={(e) =>
                    setAllowHistoryAnalysis(e.target.checked)
                  }
                  className="mt-1 h-5 w-5 accent-indigo-600"
                />
              </label>
            </div>
          </section>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "儲存中..." : "儲存個人化設定"}
          </button>

          {message && (
            <div className="rounded-2xl bg-white px-4 py-3 text-center text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default Profile;