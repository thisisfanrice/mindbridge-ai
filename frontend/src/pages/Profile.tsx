import { useEffect, useState } from "react";
import { Link } from "react-router";

const lifeStatusOptions = [
  "學生",
  "工作",
  "其他",
  "不想回答",
];

const stressSourceOptions = [
  "課業",
  "工作",
  "人際",
  "家庭",
  "健康",
  "經濟",
  "未來規劃",
  "其他",
];

function Profile() {
  const [lifeStatus, setLifeStatus] = useState("");
  const [stressSources, setStressSources] = useState<string[]>([]);

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
          `${import.meta.env.VITE_API_URL}/api/profile/${userId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load profile"
          );
        }

        if (data.data) {
          setLifeStatus(
            data.data.life_status || ""
          );

          setStressSources(
            Array.isArray(data.data.stress_sources)
              ? data.data.stress_sources
              : []
          );

          setAllowProfilePersonalization(
            data.data.allow_profile_personalization ??
              false
          );

          setAllowHistoryAnalysis(
            data.data.allow_history_analysis ??
              true
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

  const toggleStressSource = (source: string) => {
    setStressSources((current) => {
      if (current.includes(source)) {
        return current.filter(
          (item) => item !== source
        );
      }

      return [...current, source];
    });
  };

  const handleSave = async () => {
    try {
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

      setSaving(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/profile/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lifeStatus:
              lifeStatus || null,
            stressSources,
            allowProfilePersonalization,
            allowHistoryAnalysis,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save profile"
        );
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
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-500">
              正在載入設定...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
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
            這些資料都是選填，你可以決定想提供多少資訊，
            並控制 AI 可以使用哪些資料進行個人化分析。
          </p>
        </div>

        <div className="space-y-6">

          {/* 生活狀態 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                目前主要生活狀態
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                選填，可隨時修改
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {lifeStatusOptions.map((option) => {
                const selected =
                  lifeStatus === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setLifeStatus(
                        selected ? "" : option
                      )
                    }
                    className={`rounded-2xl border px-4 py-4 text-left font-medium transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 壓力來源 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                常見壓力來源
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                可複選，也可以全部不選
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {stressSourceOptions.map(
                (source) => {
                  const selected =
                    stressSources.includes(source);

                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() =>
                        toggleStressSource(source)
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50"
                      }`}
                    >
                      {selected ? "✓ " : ""}
                      {source}
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* AI 權限 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                AI 個人化權限
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                你可以決定 AI 可以使用哪些資料。
              </p>
            </div>

            <div className="mt-6 space-y-4">

              {/* Profile personalization */}
              <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-800">
                    使用背景資料提供個人化建議
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    允許 AI 使用你的生活狀態與常見壓力來源，
                    提供更貼近個人情況的內容。
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={
                    allowProfilePersonalization
                  }
                  onChange={(e) =>
                    setAllowProfilePersonalization(
                      e.target.checked
                    )
                  }
                  className="mt-1 h-5 w-5 accent-indigo-600"
                />
              </label>

              {/* History analysis */}
              <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-800">
                    使用過去 Check-in 分析長期趨勢
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    允許系統使用過去的心情、壓力與睡眠紀錄，
                    觀察近期及長期變化。
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={allowHistoryAnalysis}
                  onChange={(e) =>
                    setAllowHistoryAnalysis(
                      e.target.checked
                    )
                  }
                  className="mt-1 h-5 w-5 accent-indigo-600"
                />
              </label>
            </div>
          </section>

          {/* Privacy note */}
          <section className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
            <h2 className="font-bold text-slate-900">
              🔒 資料控制
            </h2>

            <p className="mt-2 text-sm leading-7 text-slate-600">
              MindBridge AI 不要求提供姓名、電話或身分證等直接識別資訊。
              這些個人化設定可以隨時修改，之後也會提供歷史紀錄的修改與刪除功能。
            </p>
          </section>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-indigo-600 px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "儲存中..."
              : "儲存個人化設定"}
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