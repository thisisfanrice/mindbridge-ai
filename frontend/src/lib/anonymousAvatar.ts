export const ANONYMOUS_AVATARS = [
  { id: "animal-cat", emoji: "🐱", label: "小貓", background: "bg-amber-50" },
  { id: "animal-dog", emoji: "🐶", label: "小狗", background: "bg-orange-50" },
  { id: "animal-rabbit", emoji: "🐰", label: "兔兔", background: "bg-pink-50" },
  { id: "animal-bear", emoji: "🐻", label: "小熊", background: "bg-yellow-50" },
  { id: "animal-fox", emoji: "🦊", label: "狐狸", background: "bg-rose-50" },
  { id: "animal-panda", emoji: "🐼", label: "熊貓", background: "bg-slate-100" },
  { id: "animal-frog", emoji: "🐸", label: "青蛙", background: "bg-green-50" },
  { id: "animal-owl", emoji: "🦉", label: "貓頭鷹", background: "bg-violet-50" },
] as const;

export type AnonymousAvatarId = (typeof ANONYMOUS_AVATARS)[number]["id"];

export const DEFAULT_NICKNAME = "匿名旅人";
export const ANONYMOUS_PROFILE_EVENT = "mindbridge:anonymous-profile-updated";

export type AnonymousProfile = {
  userId: string;
  nickname: string;
  avatarId: AnonymousAvatarId;
};

export function isAnonymousAvatarId(value: unknown): value is AnonymousAvatarId {
  return typeof value === "string" &&
    ANONYMOUS_AVATARS.some((avatar) => avatar.id === value);
}

export function getAnonymousAvatar(value: unknown) {
  return ANONYMOUS_AVATARS.find((avatar) => avatar.id === value) ?? ANONYMOUS_AVATARS[0];
}

export function randomAnonymousAvatarId(): AnonymousAvatarId {
  const index = Math.floor(Math.random() * ANONYMOUS_AVATARS.length);
  return ANONYMOUS_AVATARS[index].id;
}

// 快取只供目前瀏覽器顯示。後端 user_profiles 才是儲存來源。
export function readAnonymousProfile(userId: string): AnonymousProfile | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem("mindbridge_anonymous_profile");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const data = parsed as Record<string, unknown>;
    if (data.userId !== userId || !isAnonymousAvatarId(data.avatarId)) return null;
    return {
      userId,
      avatarId: data.avatarId,
      nickname: typeof data.nickname === "string" && data.nickname.trim()
        ? data.nickname.trim()
        : DEFAULT_NICKNAME,
    };
  } catch {
    return null;
  }
}

export function cacheAnonymousProfile(profile: AnonymousProfile): void {
  if (!profile.userId || !isAnonymousAvatarId(profile.avatarId)) return;
  localStorage.setItem("mindbridge_anonymous_profile", JSON.stringify(profile));
  window.dispatchEvent(new Event(ANONYMOUS_PROFILE_EVENT));
}
