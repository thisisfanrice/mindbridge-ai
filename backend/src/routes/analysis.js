const express = require("express");
const pool = require("../db");

const router = express.Router();

function isValidNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function buildSummaryState({
  averageMood,
  averageStress,
  averageSleep,
  completedDays,
}) {
  const parts = [];

  if (isValidNumber(averageStress)) {
    parts.push(`平均壓力 ${roundOne(averageStress)}/10`);
  }

  if (isValidNumber(averageSleep)) {
    parts.push(`平均睡眠 ${roundOne(averageSleep)}/10`);
  }

  if (isValidNumber(averageMood)) {
    parts.push(`平均心情 ${roundOne(averageMood)}/6`);
  }

  if (parts.length === 0) {
    return "目前還沒有足夠的紀錄可以整理近期狀態。";
  }

  return `最近 ${completedDays} 筆紀錄中，${parts.join("、")}。`;
}

function buildBaseAnalysis({
  averageMood,
  averageStress,
  averageSleep,
}) {
  /*
   * 高壓 + 低睡眠
   */
  if (
    isValidNumber(averageStress) &&
    isValidNumber(averageSleep) &&
    averageStress >= 8 &&
    averageSleep <= 3
  ) {
    return {
      insightText:
        "近期紀錄同時出現較高壓力與較低睡眠，這兩項變化可能值得一起留意，尤其是休息不足時的日常負擔感。",

      actionText:
        "花 3 分鐘寫下現在最重要的一件事，其他事情先暫時放到旁邊。",

      xaiReason:
        "因為近期壓力紀錄偏高，同時睡眠分數相對偏低，所以先推薦降低當下負擔、容易完成的小行動。",
    };
  }

  /*
   * 高壓
   */
  if (
    isValidNumber(averageStress) &&
    averageStress >= 8
  ) {
    return {
      insightText:
        "近期壓力紀錄偏高，可能代表這段時間有不少事情同時佔據你的注意力，可以先觀察哪些事情最常讓你覺得吃力。",

      actionText:
        "用 3 分鐘列出今天最需要處理的 1 件事，先只專注那一件。",

      xaiReason:
        "因為近期壓力分數偏高，所以推薦一個能快速縮小注意範圍、降低資訊負擔的做法。",
    };
  }

  /*
   * 睡眠偏低
   */
  if (
    isValidNumber(averageSleep) &&
    averageSleep <= 3
  ) {
    return {
      insightText:
        "近期睡眠紀錄偏低，日常精神和專注感可能也會跟著出現變化，可以先觀察最近是否有固定影響休息的因素。",

      actionText:
        "花 2 分鐘把今晚睡前最想少做的一件事記下來。",

      xaiReason:
        "因為近期睡眠分數較低，所以建議先從一個低負擔、容易執行的睡前調整開始。",
    };
  }

  /*
   * 心情偏低
   */
  if (
    isValidNumber(averageMood) &&
    averageMood <= 2
  ) {
    return {
      insightText:
        "近期心情紀錄比較低，可以把它當成一個提醒，看看最近是否有重複出現、讓自己特別消耗的情境。",

      actionText:
        "花 3 分鐘寫下一件今天讓你最累的事，不需要現在就解決它。",

      xaiReason:
        "因為近期心情分數較低，所以先推薦整理感受，而不是立刻要求自己完成更多事情。",
    };
  }

  /*
   * 狀態不錯
   */
  if (
    isValidNumber(averageMood) &&
    isValidNumber(averageStress) &&
    averageMood >= 5 &&
    averageStress <= 3
  ) {
    return {
      insightText:
        "近期心情較正向，同時壓力紀錄偏低，可以留意最近哪些生活安排或習慣可能和這段較穩定的狀態有關。",

      actionText:
        "花 2 分鐘記下一件最近對你有幫助的小習慣。",

      xaiReason:
        "因為近期心情較高、壓力較低，所以推薦把有效的生活模式記錄下來，方便之後回頭參考。",
    };
  }

  /*
   * 中度壓力
   */
  if (
    isValidNumber(averageStress) &&
    averageStress >= 6
  ) {
    return {
      insightText:
        "近期壓力有些偏高，但還可以透過持續記錄觀察它是短期波動，還是某些情境反覆出現。",

      actionText:
        "花 3 分鐘把目前最掛心的事情分成「現在能做」和「之後再處理」。",

      xaiReason:
        "因為近期壓力分數高於一般中間範圍，所以推薦先整理事情的可控程度。",
    };
  }

  /*
   * 一般狀態
   */
  return {
    insightText:
      "近期紀錄沒有出現特別明顯的單一變化，可以繼續累積資料，之後會更容易看出自己的生活節奏與波動。",

    actionText:
      "花 2 分鐘記下一件今天值得保留的小事。",

    xaiReason:
      "目前各項紀錄沒有特別突出的變化，因此推薦一個簡單、不增加負擔的日常整理方式。",
  };
}

function personalizeAnalysis(baseAnalysis, profile) {
  const result = {
    ...baseAnalysis,
  };

  if (!profile?.allow_profile_personalization) {
    return {
      ...result,
      usedProfileData: false,
    };
  }

  const stressSources = Array.isArray(profile.stress_sources)
    ? profile.stress_sources
    : [];

  const companionStyle = profile.companion_style;

  /*
   * 壓力來源
   */
  if (stressSources.length > 0) {
    result.insightText +=
      " 你先前設定的主要壓力來源，也可以作為回頭觀察近期紀錄的參考。";
  }

  /*
   * AI 陪伴風格
   */
  if (companionStyle === "brief") {
    result.insightText = result.insightText
      .split("。")
      .filter(Boolean)
      .slice(0, 1)
      .join("。");

    if (result.insightText) {
      result.insightText += "。";
    }
  }

  if (companionStyle === "action") {
    result.xaiReason +=
      " 你偏好較具體的建議，因此這次優先提供可以直接開始的小行動。";
  }

  if (companionStyle === "organize") {
    result.actionText =
      "花 3 分鐘把現在腦中的事情分成「要做、能等、暫時不管」三類。";
  }

  if (companionStyle === "warm") {
    result.insightText +=
      " 不需要一次把所有事情處理完，先注意到自己的變化就已經是有用的紀錄。";
  }

  return {
    ...result,
    usedProfileData: true,
  };
}

const stressKeywordMap = {
  study: [
    "課業",
    "考試",
    "作業",
    "報告",
    "讀書",
    "成績",
    "學校",
    "專題",
  ],

  work: [
    "工作",
    "上班",
    "主管",
    "同事",
    "加班",
  ],

  relation: [
    "人際",
    "朋友",
    "同學",
    "吵架",
    "相處",
  ],

  family: [
    "家庭",
    "家人",
    "爸媽",
    "父母",
    "媽媽",
    "爸爸",
  ],

  finance: [
    "經濟",
    "錢",
    "花費",
    "費用",
  ],

  health: [
    "健康",
    "身體",
    "不舒服",
    "疲累",
  ],

  future: [
    "未來",
    "升學",
    "找工作",
    "生涯",
    "目標",
  ],
};

const stressSourceLabels = {
  study: "課業",
  work: "工作",
  relation: "人際",
  family: "家庭",
  finance: "經濟",
  health: "健康",
  future: "未來規劃",
};

async function buildAttributionText(userId) {
  const result = await pool.query(
    `
      SELECT
        stress_score,
        note,
        checkin_date
      FROM daily_checkins
      WHERE
        user_id = $1
        AND checkin_date >= CURRENT_DATE - INTERVAL '29 days'
        AND stress_score >= 7
      ORDER BY checkin_date DESC
    `,
    [userId]
  );

  const highStressRecords = result.rows;

  if (highStressRecords.length < 2) {
    return null;
  }

  const textRecords = highStressRecords.filter(
    (record) =>
      typeof record.note === "string" &&
      record.note.trim().length > 0
  );

  if (textRecords.length < 2) {
    return null;
  }

  const counts = {};

  for (const source of Object.keys(stressKeywordMap)) {
    counts[source] = 0;

    const keywords = stressKeywordMap[source];

    for (const record of textRecords) {
      const text = record.note.toLowerCase();

      const matched = keywords.some((keyword) =>
        text.includes(keyword.toLowerCase())
      );

      if (matched) {
        counts[source] += 1;
      }
    }
  }

  const rankedSources = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (rankedSources.length === 0) {
    return null;
  }

  const [topSource, topCount] = rankedSources[0];

  const percentage = Math.round(
    (topCount / textRecords.length) * 100
  );

  const label =
    stressSourceLabels[topSource] || topSource;

  return `近 30 天壓力較高且有文字紀錄的 Check-in 中，約 ${percentage}% 曾提到「${label}」相關內容。`;
}
function shouldShowSupportResources(recentRecords) {
  if (!Array.isArray(recentRecords)) {
    return false;
  }

  const supportKeywords = [
    "我需要幫助",
    "需要有人陪",
    "想找人聊聊",
    "不知道該怎麼辦",
    "希望有人聽我說",
  ];

  return recentRecords.some((record) => {
    if (
      !record ||
      typeof record.note !== "string"
    ) {
      return false;
    }

    const text = record.note.trim();

    if (!text) {
      return false;
    }

    return supportKeywords.some(
      (keyword) =>
        text.includes(keyword)
    );
  });
}
router.post("/", async (req, res) => {
  try {
    const userId = req.anonymousUserId;
    let completedDays = 0;
    let averageMood = null;
    let averageStress = null;
    let averageSleep = null;
    let recentRecords = [];

    /*
     * 讀取使用者個人化與分析權限
     */
    const profileResult = await pool.query(
      `
        SELECT
          user_identity,
          sleep_schedule,
          baseline_sleep,
          stress_sources,
          coping_methods,
          companion_style,
          preferred_elements,
          user_target,
          allow_profile_personalization,
          allow_history_analysis

        FROM user_profiles

        WHERE user_id = $1
      `,
      [userId]
    );

    const profile =
      profileResult.rows.length > 0
        ? profileResult.rows[0]
        : null;

    /*
     * 使用者關閉歷史分析
     */
    if (
      !profile ||
      profile.allow_history_analysis !== true
    ) {
      return res.status(200).json({
        success: true,

        summaryState:
          "你目前已關閉 Check-in 歷史分析。",

        insightText:
          "系統不會使用過去的 Check-in 紀錄進行趨勢整理。",

        actionText: null,

        xaiReason:
          "因為你在個人化設定中關閉了歷史分析權限。",

        analysisEnabled: false,
        usedProfileData: false,
        attributionText: null,
        showSupportResources: false,
        safetyEscalation: false,

        // 舊版 History.tsx 相容
        summary:
          "你目前已關閉 Check-in 歷史分析。",
      });
    }

    // All analysis inputs come from the authenticated user's database records.
    // Never accept client-provided records, averages or counts as evidence.
    const historyResult = await pool.query(
      `SELECT mood_score, stress_score, sleep_score, note, checkin_date
       FROM daily_checkins
       WHERE user_id = $1
         AND checkin_date >= CURRENT_DATE - INTERVAL '29 days'
       ORDER BY checkin_date DESC`,
      [userId]
    );
    recentRecords = historyResult.rows;
    completedDays = recentRecords.length;
    const average = (field) => {
      const values = recentRecords.map(r => r[field]).filter(
        value => typeof value === "number" && Number.isFinite(value)
      );
      return values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null;
    };
    averageMood = average("mood_score");
    averageStress = average("stress_score");
    averageSleep = average("sleep_score");

    /*
     * 沒有任何紀錄
     */
    if (
      !Array.isArray(recentRecords) ||
      recentRecords.length === 0
    ) {
      return res.status(200).json({
        success: true,

        summaryState:
          "目前還沒有足夠的 Check-in 紀錄。",

        insightText:
          "累積幾筆日常紀錄後，這裡會開始整理近期的心情、壓力與睡眠變化。",

        actionText:
          "今天先完成一項最想記錄的 Check-in 就可以。",

        xaiReason:
          "目前資料量還很少，因此先不做過度解讀。",

        analysisEnabled: true,
        usedProfileData: false,

        summary:
          "目前還沒有足夠的 Check-in 紀錄。",
      });
    }

    const summaryState = buildSummaryState({
      averageMood,
      averageStress,
      averageSleep,
      completedDays,
    });

    const baseAnalysis = buildBaseAnalysis({
      averageMood,
      averageStress,
      averageSleep,
    });

    const personalized = personalizeAnalysis(
      baseAnalysis,
      profile
    );

    /*
     * 注意：
     * 這不是心理疾病或危機預測。
     * 分數本身不會觸發危機判定。
     *
     * 後續若做支持資源顯示，
     * 應設計成「提供額外支持資訊」，
     * 不應宣稱能預測自傷、自殺或心理疾病。
     */
    const showSupportResources =
      shouldShowSupportResources(
        recentRecords
      );

    /*
     * 為了和 Week 2 規格相容，
     * 暫時保留 safetyEscalation 這個欄位名稱。
     *
     * 但實際語意是：
     * 「是否顯示額外支持資訊」
     * 而不是危機預測或心理診斷。
     */
    const safetyEscalation =
      showSupportResources;

    const attributionText =
      await buildAttributionText(userId);

    return res.status(200).json({
      success: true,

      summaryState,

      insightText:
        personalized.insightText,

      actionText:
        personalized.actionText,

      xaiReason:
        personalized.xaiReason,

      attributionText,

      analysisEnabled: true,

      usedProfileData:
        personalized.usedProfileData,

      showSupportResources,

      safetyEscalation,

      /*
       * 保留舊欄位，
       * 目前 History.tsx 還可以正常顯示，
       * 等下一步前端改完再移除也行。
       */
      summary:
        personalized.insightText,
    });
  } catch (error) {
    console.error("Analysis error:", error.code || "internal");

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate analysis",
    });
  }
});

module.exports = router;