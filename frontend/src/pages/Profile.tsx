import { apiFetch as fetch } from "../lib/apiFetch";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ANONYMOUS_AVATARS,
  DEFAULT_NICKNAME,
  cacheAnonymousProfile,
  isAnonymousAvatarId,
  randomAnonymousAvatarId,
  type AnonymousAvatarId,
} from "../lib/anonymousAvatar";

type Option = {
  value: string;
  label: string;
};

type ProfileData = {
  nickname?: string | null;
  avatar_id?: string | null;
  user_identity?: string | null;
  age_range?: string | null;
  stress_sources?: string[] | null;
  sleep_schedule?: string | null;
  baseline_sleep?: string | null;
  companion_style?: string | null;
  current_energy_level?: string | null;
  socratic_mode?: string | null;
  terms_accepted?: boolean | null;
  allow_profile_personalization?: boolean | null;
  allow_history_analysis?: boolean | null;
};

const identityOptions: Option[] = [
  { value: "working", label: "上班族" },
  { value: "freelance", label: "自由工作" },
  { value: "unemployed", label: "待業中" },
  { value: "homemaker", label: "家庭主婦" },
  { value: "senior", label: "樂齡族" },
  { value: "student", label: "學生" },
];

const ageOptions: Option[] = [
  { value: "under_15", label: "15 歲以下（國中及以下）" },
  { value: "15_18", label: "15 - 18 歲（高中職）" },
  { value: "19_22", label: "19 - 22 歲（大專院校）" },
  { value: "23_30", label: "23 - 30 歲（青年 / 初入職場）" },
  { value: "over_30", label: "30 歲以上" },
];

const companionStyleOptions: Option[] = [
  { value: "warm", label: "溫柔同理" },
  { value: "rational", label: "理性客觀" },
  { value: "positive", label: "積極客觀" },
];

function getOptionLabel(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label || "尚未設定";
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateCurrentStreak(records: Array<{ checkin_date?: string }>) {
  const dateSet = new Set(
    records
      .map((record) =>
        typeof record.checkin_date === "string"
          ? record.checkin_date.slice(0, 10)
          : ""
      )
      .filter(Boolean)
  );

  if (dateSet.size === 0) return 0;

  const today = new Date();
  const cursor = new Date(today);
  const todayKey = toLocalDateKey(today);

  // 今天尚未 Check-in 時，只要昨天有紀錄，連續天數仍視為進行中。
  if (!dateSet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dateSet.has(toLocalDateKey(cursor))) return 0;
  }

  let streak = 0;

  while (dateSet.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [nickname, setNickname] = useState(DEFAULT_NICKNAME);
  const [avatarId, setAvatarId] = useState<AnonymousAvatarId>("animal-cat");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [savedAvatarId, setSavedAvatarId] = useState<AnonymousAvatarId | null>(null);

  const [userIdentity, setUserIdentity] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [companionStyle, setCompanionStyle] = useState("");
  const [socraticMode, setSocraticMode] = useState("");
  const [allowPersonalization, setAllowPersonalization] = useState(false);
  const [allowHistoryAnalysis, setAllowHistoryAnalysis] = useState(false);

  const [editingField, setEditingField] = useState<"identity" | "age" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [memoryDeleteOpen, setMemoryDeleteOpen] = useState(false);
  const [deletingMemory, setDeletingMemory] = useState(false);
  const [memoryDeleteMessage, setMemoryDeleteMessage] = useState("");
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const userId = localStorage.getItem("mindbridge_user_id");

        if (!userId) {
          throw new Error("找不到匿名使用者，請先返回首頁。");
        }

        const response = await fetch(
          `/api/profile/${userId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "無法載入個人設定");
        }

        if (cancelled) return;

        let saved: ProfileData = data.data || {};


        const streakResponse = await fetch(
          `/api/checkin/${userId}`
        );

        const streakData = await streakResponse.json();

        if (!streakResponse.ok) {
          throw new Error(
            streakData.message || "無法載入連續紀錄"
          );
        }

        const streakRecords = Array.isArray(streakData.data)
          ? streakData.data
          : [];

        if (!cancelled) {
          setCurrentStreak(calculateCurrentStreak(streakRecords));
        }
        let selectedAvatar: AnonymousAvatarId;

        if (isAnonymousAvatarId(saved.avatar_id)) {
          selectedAvatar = saved.avatar_id;
        } else {
          selectedAvatar = randomAnonymousAvatarId();
          if (!cancelled) setAvatarSaving(true);
          try {
            const avatarResponse = await fetch(
              `/api/profile/${userId}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatarId: selectedAvatar }),
              }
            );
            const avatarData = await avatarResponse.json();
            if (!avatarResponse.ok) {
              throw new Error(avatarData.message || "無法儲存預設頭像");
            }
            saved = avatarData.data || { ...saved, avatar_id: selectedAvatar };
          } catch (avatarError) {
            if (!cancelled) {
              setAvatarMessage("預設頭像尚未同步，請稍後按「儲存設定」再試一次。");
            }
          } finally {
            if (!cancelled) setAvatarSaving(false);
          }
        }

        if (cancelled) return;

        setAvatarId(selectedAvatar);
        setSavedAvatarId(
          isAnonymousAvatarId(saved.avatar_id) ? saved.avatar_id : null
        );
        setNickname(
          typeof saved.nickname === "string" && saved.nickname.trim()
            ? saved.nickname
            : DEFAULT_NICKNAME
        );
        if (isAnonymousAvatarId(saved.avatar_id)) {
          cacheAnonymousProfile({
            userId,
            avatarId: saved.avatar_id,
            nickname:
              typeof saved.nickname === "string" && saved.nickname.trim()
                ? saved.nickname
                : DEFAULT_NICKNAME,
          });
        }
        setProfile(saved);
        setUserIdentity(saved.user_identity || "");
        setAgeRange(saved.age_range || "");
        setCompanionStyle(saved.companion_style || "");
        setSocraticMode(saved.socratic_mode || "");
        setAllowPersonalization(saved.allow_profile_personalization ?? false);
        setAllowHistoryAnalysis(saved.allow_history_analysis ?? false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "載入設定失敗");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!profile || saving || avatarSaving) return;

    const trimmedNickname = nickname.trim();
    if (
      Array.from(trimmedNickname).length < 1 ||
      Array.from(trimmedNickname).length > 20 ||
      /[\u0000-\u001f\u007f]/u.test(trimmedNickname)
    ) {
      setMessage("暱稱請輸入 1–20 個字，且不可包含換行或控制字元。");
      return;
    }

    const userId = localStorage.getItem("mindbridge_user_id");
    if (!userId) {
      setMessage("找不到匿名使用者，請先返回首頁。");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      // 保留原有問卷資料，不因設定頁只顯示部分欄位而覆蓋成空值。
      const payload = {
        nickname: trimmedNickname,
        avatarId,
        userIdentity,
        ageRange,
        companionStyle,
        socraticMode,
        allowProfilePersonalization: allowPersonalization,
        allowHistoryAnalysis,
      };

      const response = await fetch(
        `/api/profile/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "儲存設定失敗");
      }

      setProfile((previous) => ({
        ...(previous || {}),
        nickname: trimmedNickname,
        avatar_id: avatarId,
        user_identity: userIdentity,
        age_range: ageRange,
        companion_style: companionStyle,
        socratic_mode: socraticMode,
        allow_profile_personalization: allowPersonalization,
        allow_history_analysis: allowHistoryAnalysis,
      }));

      setNickname(trimmedNickname);
      setSavedAvatarId(avatarId);
      setAvatarMessage("");
      cacheAnonymousProfile({ userId, nickname: trimmedNickname, avatarId });
      setEditingField(null);
      setMessage("設定已成功儲存。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "儲存設定失敗");
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteConversationMemory = async () => {
    if (deletingMemory) return;

    try {
      setDeletingMemory(true);
      setMemoryDeleteMessage("");

      const response = await fetch(
        `/api/conversation/history`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "無法清除 AI 歷史對話記憶"
        );
      }

      localStorage.removeItem("mindbridge_active_conversation");
      setMemoryDeleteOpen(false);
      setMemoryDeleteMessage(
        `已清除 ${Number(data.deleted_conversations) || 0} 段 AI 歷史對話記憶。Check-in、個人設定與匿名帳號均保留。`
      );
    } catch (err) {
      setMemoryDeleteMessage(
        err instanceof Error
          ? err.message
          : "清除 AI 歷史對話記憶失敗"
      );
    } finally {
      setDeletingMemory(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center mindbridge-page px-4">
        <p className="text-slate-500">正在載入個人設定...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen mindbridge-page px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-slate-800">暫時無法載入設定</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <Link to="/" className="mt-4 inline-block text-sm font-medium text-indigo-600">
            返回首頁
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mindbridge-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to="/"
          className="text-sm font-medium text-slate-500 hover:text-indigo-600"
        >
          ← 返回首頁
        </Link>

        <header className="pt-2">
          <p className="text-sm font-semibold text-indigo-600">MindBridge 心訊號</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">個人設定</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            管理你的匿名資料、陪伴偏好與資料使用設定。
          </p>
        </header>

        {/* 匿名個人檔案 */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-4xl"
              aria-hidden="true"
            >
              {ANONYMOUS_AVATARS.find((item) => item.id === avatarId)?.emoji}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">匿名個人檔案</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    選一個喜歡的動物，讓橋寶知道怎麼稱呼你。
                  </p>
                </div>

                <div
                  className="rounded-2xl bg-amber-50 px-4 py-3 text-right ring-1 ring-amber-100"
                  aria-label={`目前已連續陪伴 ${currentStreak} 天`}
                >
                  <p className="text-xs font-medium text-amber-600">連續陪伴</p>
                  <p className="mt-1 text-base font-bold text-amber-800">
                    🔥 已連續陪伴 {currentStreak} 天
                  </p>
                </div>
              </div>

              <p className="mt-2 text-sm font-medium text-indigo-700">
                {nickname.trim() || DEFAULT_NICKNAME}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="anonymous-nickname" className="text-sm font-semibold text-slate-700">
              我的暱稱
            </label>
            <input
              id="anonymous-nickname"
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={20}
              disabled={saving || avatarSaving}
              placeholder="例如：小星星"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-slate-500">
              1–20 個字。建議使用不包含真實姓名、學校或聯絡方式的暱稱。
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">選擇你的動物夥伴</h3>
              <p className="mt-1 text-xs text-slate-500">第一次會隨機分配，也可以隨時換一隻。</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const choices = ANONYMOUS_AVATARS.filter((item) => item.id !== avatarId);
                const next = choices[Math.floor(Math.random() * choices.length)];
                setAvatarId(next.id);
              }}
              disabled={saving || avatarSaving}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
            >
              🎲 換一隻隨機動物
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ANONYMOUS_AVATARS.map((avatar) => {
              const selected = avatarId === avatar.id;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setAvatarId(avatar.id)}
                  disabled={saving || avatarSaving}
                  aria-pressed={selected}
                  aria-label={`選擇${avatar.label}`}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 ${
                    selected
                      ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-16 w-16 items-center justify-center rounded-full text-4xl ${avatar.background}`}
                  >
                    {avatar.emoji}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{avatar.label}</span>
                  <span className={`text-xs ${selected ? "font-semibold text-indigo-600" : "text-slate-400"}`}>
                    {selected ? "✓ 已選擇" : "點選更換"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            {avatarSaving
              ? "正在儲存預設頭像..."
              : avatarId !== savedAvatarId
                ? "頭像已變更，按下方「儲存設定」後才會同步到帳號。"
                : "頭像已同步到你的匿名帳號。"}
          </p>
          {avatarMessage && (
            <p className="mt-2 text-sm text-amber-700" role="status">{avatarMessage}</p>
          )}
        </section>

        {/* 基本資訊 */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-5 text-lg font-bold text-slate-900">基本資訊</h2>

          <div className="divide-y divide-slate-100">
            <div className="py-4 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">日常身份</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {getOptionLabel(identityOptions, userIdentity)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingField(editingField === "identity" ? null : "identity")}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  ✎ 修改
                </button>
              </div>

              {editingField === "identity" && (
                <select
                  value={userIdentity}
                  onChange={(e) => setUserIdentity(e.target.value)}
                  className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="">請選擇</option>
                  {identityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="py-4 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">年齡區間</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {getOptionLabel(ageOptions, ageRange)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingField(editingField === "age" ? null : "age")}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  ✎ 修改
                </button>
              </div>

              {editingField === "age" && (
                <select
                  value={ageRange}
                  onChange={(e) => setAgeRange(e.target.value)}
                  className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="">請選擇</option>
                  {ageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </section>

        {/* 陪伴與學習模式 */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-5 text-lg font-bold text-slate-900">陪伴與學習模式</h2>

          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">AI 說話風格</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {companionStyleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCompanionStyle(option.value)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${companionStyle === option.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <div>
              <p className="font-medium text-slate-800">伴讀家教模式</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                在伴讀頁面使用循序引導與微任務協助學習。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={socraticMode === "study"}
              onClick={() => setSocraticMode(socraticMode === "study" ? "emotional" : "study")}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${socraticMode === "study" ? "bg-indigo-600" : "bg-slate-300"
                }`}
              aria-label="伴讀家教模式"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${socraticMode === "study" ? "left-6" : "left-1"
                  }`}
              />
            </button>
          </div>
        </section>

        {/* 隱私與數據管理 */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-5 text-lg font-bold text-slate-900">隱私與數據管理</h2>

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-800">個人化記憶偏好</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  允許系統使用已提供的背景偏好調整互動方式。
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowPersonalization}
                onClick={() => setAllowPersonalization(!allowPersonalization)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${allowPersonalization ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                aria-label="個人化記憶偏好"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${allowPersonalization ? "left-6" : "left-1"
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <div>
                <p className="font-medium text-slate-800">歷史紀錄分析偏好</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  允許系統使用過去的 Check-in 產生 AI 趨勢整理與一般建議。關閉後仍可自行查看原始紀錄、統計數值與圖表。
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowHistoryAnalysis}
                onClick={() => setAllowHistoryAnalysis(!allowHistoryAnalysis)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${allowHistoryAnalysis ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                aria-label="歷史紀錄分析偏好"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${allowHistoryAnalysis ? "left-6" : "left-1"
                    }`}
                />
              </button>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => {
                  setMemoryDeleteMessage("");
                  setMemoryDeleteOpen(true);
                }}
                disabled={deletingMemory}
                className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingMemory ? "正在清除..." : "清除所有 AI 歷史對話記憶"}
              </button>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                只清除 AI 對話與反思記憶，不會刪除 Check-in、個人設定、頭像或匿名帳號。
              </p>

              {memoryDeleteMessage && (
                <p
                  className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"
                  role="status"
                >
                  {memoryDeleteMessage}
                </p>
              )}
            </div>
          </div>
        </section>

        {memoryDeleteOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !deletingMemory) {
                setMemoryDeleteOpen(false);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="memory-delete-title"
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            >
              <h2 id="memory-delete-title" className="text-xl font-bold text-slate-900">
                確定清除 AI 歷史對話記憶？
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                這會永久刪除目前匿名帳號的 AI 對話與反思訊息。
                Check-in、個人設定、頭像與帳號本身都會保留。
              </p>

              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                清除後無法從網站復原這些對話內容。
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setMemoryDeleteOpen(false)}
                  disabled={deletingMemory}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  取消
                </button>

                <button
                  type="button"
                  onClick={handleDeleteConversationMemory}
                  disabled={deletingMemory}
                  className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingMemory ? "清除中..." : "確認清除"}
                </button>
              </div>
            </section>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || avatarSaving || !profile}
          className="w-full rounded-2xl bg-indigo-600 px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "儲存中..." : "儲存設定"}
        </button>

        {message && (
          <div className="rounded-2xl bg-white p-4 text-center text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}

export default Profile;