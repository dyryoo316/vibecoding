/**
 * 브라우저 저장소 도우미 — docs/06-data.md 「저장 항목」 표의 네 항목만 읽고 쓴다.
 *
 * - 저장 자리는 브라우저의 localStorage 하나뿐이다. 서버 · API 라우트 · 데이터베이스는 없다.
 * - 서버 렌더링에는 localStorage 가 없으므로 typeof window 로 막고 빈 값을 돌려준다.
 * - 프라이빗 창처럼 저장소가 막혀 있거나 저장된 JSON 이 깨졌을 때도 앱이 죽지 않게
 *   전부 try/catch 로 감싸고 빈 값 · ok:false 로 되돌린다.
 * - 정책(05-policy.md)의 예외까지 여기서 막는다: P2 · P3 · P4 · P5 · SP2.
 *   다만 "총무만"(P1)은 여기서 막을 수 없다 — 06 표에 누가 총무인지 적는 칸이 없고
 *   로그인은 모듈2라 정해진 것이 없다. 화면에서 버튼을 감추는 것으로만 지킨다(보고의 열린 질문).
 */

import {
  MAX_TITLE_LENGTH,
  type Attendance,
  type AttendanceChoice,
  type Member,
  type Schedule,
  type ScheduleInput,
  type ScheduleStatus,
  type ShareLink,
  type StorageResult,
} from "./types";

/* ------------------------------------------------------------------ 저장 열쇠 */

const KEY = {
  schedules: "team-schedule:schedules",
  attendances: "team-schedule:attendances",
  members: "team-schedule:members",
  shareLinks: "team-schedule:share-links",
} as const;

/* ------------------------------------------------------- localStorage 감싸기 */

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // 저장소가 막혔거나 JSON 이 깨졌다 — 빈 값으로 되돌린다.
    return [];
  }
}

function writeList<T>(key: string, list: T[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // randomUUID 를 못 쓰는 브라우저 — 아래로 내려간다.
  }
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

/* ------------------------------------------------------------ 날짜 · 상태값 */

/**
 * 05-policy.md 「상태값」: 예정 → 진행 중(시작 시각이 지나면) → 지난 일정(종료 시각이 지나면).
 * 종료 시각을 받을지는 [?] 라 "시작 + 2시간" 가정을 그대로 쓴다(PRD 1절 열린 질문).
 */
export const ASSUMED_DURATION_MS = 2 * 60 * 60 * 1000;

function startOf(schedule: Pick<Schedule, "date" | "time">): Date | null {
  const parsed = new Date(schedule.date + "T" + schedule.time);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function computeStatus(
  schedule: Pick<Schedule, "date" | "time">,
  now: Date = new Date(),
): ScheduleStatus {
  const start = startOf(schedule);
  if (!start) return "예정"; // 날짜·시간을 읽을 수 없으면 판정하지 않는다.
  if (now.getTime() < start.getTime()) return "예정";
  if (now.getTime() < start.getTime() + ASSUMED_DURATION_MS) return "진행 중";
  return "지난 일정";
}

/** 오늘 날짜를 YYYY-MM-DD 로 (그 기기의 시간대 기준) */
export function todayString(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

/** 저장된 값에 지금 시각을 입혀 돌려준다 — 상태값과 "변경됨" 표시는 시각에 따라 달라진다. */
function withNow(schedule: Schedule, now: Date): Schedule {
  const status = computeStatus(schedule, now);
  return {
    ...schedule,
    status,
    // "고치면 변경됨 표시가 시작 전까지 보인다" (P4)
    changed: schedule.changed && status === "예정",
  };
}

function byStart(a: Schedule, b: Schedule): number {
  return (a.date + "T" + a.time).localeCompare(b.date + "T" + b.time);
}

/* --------------------------------------------------------- 일정 (F1·F2·F4·F5) */

/** 네 칸 검사 — P3 (비울 수 없다 · 제목 30자까지 · 날짜는 오늘 이후만) */
export function validateScheduleInput(
  input: ScheduleInput,
  now: Date = new Date(),
): StorageResult<ScheduleInput> {
  const title = input.title.trim();
  const place = input.place.trim();
  const date = input.date.trim();
  const time = input.time.trim();

  if (!title) return { ok: false, code: "EMPTY_FIELD", field: "title" };
  if (!date) return { ok: false, code: "EMPTY_FIELD", field: "date" };
  if (!time) return { ok: false, code: "EMPTY_FIELD", field: "time" };
  if (!place) return { ok: false, code: "EMPTY_FIELD", field: "place" };
  if (title.length > MAX_TITLE_LENGTH) return { ok: false, code: "TITLE_TOO_LONG" };
  // "오늘 이후만" — 오늘은 되고 어제까지는 "지난 날짜입니다".
  if (date < todayString(now)) return { ok: false, code: "PAST_DATE" };

  return { ok: true, value: { title, date, time, place } };
}

/** 모든 일정 — 날짜순 (F2 "날짜순으로") */
export function getSchedules(now: Date = new Date()): Schedule[] {
  return readList<Schedule>(KEY.schedules)
    .map((schedule) => withNow(schedule, now))
    .sort(byStart);
}

/**
 * 일정 목록 화면이 쓰는 "다가오는 일정" — 지난 일정은 빼고 날짜순.
 * (지난 일정 보기는 F6 = v2 라 목록에 섞지 않는다. 진행 중은 아직 끝난 것이 아니라 남긴다.)
 */
export function getUpcomingSchedules(now: Date = new Date()): Schedule[] {
  return getSchedules(now).filter((schedule) => schedule.status !== "지난 일정");
}

export function getSchedule(id: string, now: Date = new Date()): Schedule | null {
  const found = readList<Schedule>(KEY.schedules).find((schedule) => schedule.id === id);
  return found ? withNow(found, now) : null;
}

/** F1 — 일정을 만든다. 만들면서 공유 주소도 함께 만들어 둔다(06 표: F1 결과). */
export function addSchedule(
  input: ScheduleInput,
  now: Date = new Date(),
): StorageResult<Schedule> {
  const checked = validateScheduleInput(input, now);
  if (!checked.ok) return checked;

  const schedule: Schedule = {
    id: newId(),
    ...checked.value,
    status: computeStatus(checked.value, now),
    changed: false,
    createdAt: now.toISOString(),
  };

  const saved = writeList<Schedule>(KEY.schedules, [
    ...readList<Schedule>(KEY.schedules),
    schedule,
  ]);
  if (!saved) return { ok: false, code: "STORAGE_UNAVAILABLE" };

  ensureShareUrl(schedule.id);
  return { ok: true, value: schedule };
}

/** F5 — 일정을 고친다. 고치면 "변경됨" 이 켜진다(P4). 시작된 일정은 고칠 수 없다(P4). */
export function updateSchedule(
  id: string,
  input: ScheduleInput,
  now: Date = new Date(),
): StorageResult<Schedule> {
  const list = readList<Schedule>(KEY.schedules);
  const index = list.findIndex((schedule) => schedule.id === id);
  if (index < 0) return { ok: false, code: "NOT_FOUND" };

  if (computeStatus(list[index], now) !== "예정") {
    return { ok: false, code: "NOT_UPCOMING" };
  }

  const checked = validateScheduleInput(input, now);
  if (!checked.ok) return checked;

  const updated: Schedule = {
    ...list[index],
    ...checked.value,
    status: computeStatus(checked.value, now),
    changed: true,
  };

  const next = [...list];
  next[index] = updated;
  if (!writeList<Schedule>(KEY.schedules, next)) {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
  return { ok: true, value: updated };
}

/**
 * SP2 — 총무는 일정을 삭제할 수 있고, 삭제하면 그 일정의 참석 기록도 사라진다.
 * (SP2 는 참석 기록만 말하지만, 가리킬 일정이 없어진 공유 주소도 함께 지운다.)
 * 07-screens.md 의 세 화면에는 삭제 버튼이 없다 — 정책만 구현해 둔 도우미다.
 */
export function deleteSchedule(id: string): StorageResult<true> {
  const list = readList<Schedule>(KEY.schedules);
  if (!list.some((schedule) => schedule.id === id)) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const okSchedules = writeList<Schedule>(
    KEY.schedules,
    list.filter((schedule) => schedule.id !== id),
  );
  const okAttendances = writeList<Attendance>(
    KEY.attendances,
    readList<Attendance>(KEY.attendances).filter((a) => a.scheduleId !== id),
  );
  const okShare = writeList<ShareLink>(
    KEY.shareLinks,
    readList<ShareLink>(KEY.shareLinks).filter((link) => link.scheduleId !== id),
  );

  if (!okSchedules || !okAttendances || !okShare) {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
  return { ok: true, value: true };
}

/* -------------------------------------------------------- 참석 응답 (F3·F4) */

export function getAttendances(scheduleId: string): Attendance[] {
  return readList<Attendance>(KEY.attendances).filter(
    (attendance) => attendance.scheduleId === scheduleId,
  );
}

/** 한 사람이 이 일정에 남긴 답 (P5 — 하나뿐이다) */
export function getAttendance(scheduleId: string, name: string): Attendance | null {
  const trimmed = name.trim();
  return (
    getAttendances(scheduleId).find((attendance) => attendance.name === trimmed) ?? null
  );
}

/**
 * F3 — 참석 · 불참을 남긴다.
 * P2: 상태 "예정" 동안만 (시작 뒤에는 바꿀 수 없다 — "이미 시작된 일정입니다").
 * P5: 같은 이름은 하나만 — 다시 누르면 덮어쓴다(칸만 옮겨 간다).
 */
export function saveAttendance(
  scheduleId: string,
  name: string,
  choice: AttendanceChoice,
  now: Date = new Date(),
): StorageResult<Attendance> {
  const schedule = readList<Schedule>(KEY.schedules).find((s) => s.id === scheduleId);
  if (!schedule) return { ok: false, code: "NOT_FOUND" };
  if (computeStatus(schedule, now) !== "예정") {
    return { ok: false, code: "NOT_UPCOMING" };
  }

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, code: "EMPTY_FIELD", field: "name" };

  const attendance: Attendance = {
    name: trimmed,
    scheduleId,
    choice,
    respondedAt: now.toISOString(),
  };

  const rest = readList<Attendance>(KEY.attendances).filter(
    (a) => !(a.scheduleId === scheduleId && a.name === trimmed),
  );
  if (!writeList<Attendance>(KEY.attendances, [...rest, attendance])) {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
  return { ok: true, value: attendance };
}

/**
 * F4 — 참석 · 불참 · 미응답 세 칸.
 * 미응답은 구성원 명단에서 아직 답하지 않은 이름이다(06 표의 구성원 명단 근거).
 * 명단에 없는 이름이 답을 남기면 참석/불참 칸에는 보이되 미응답 셈에는 들어가지 않는다.
 */
export function getAttendanceSummary(scheduleId: string): {
  attend: string[];
  absent: string[];
  pending: string[];
} {
  const attendances = getAttendances(scheduleId);
  const answered = new Set(attendances.map((attendance) => attendance.name));

  return {
    attend: attendances.filter((a) => a.choice === "참석").map((a) => a.name),
    absent: attendances.filter((a) => a.choice === "불참").map((a) => a.name),
    pending: getMembers()
      .map((member) => member.name)
      .filter((name) => !answered.has(name)),
  };
}

/* ------------------------------------------------------------ 구성원 명단 (F4) */

/**
 * ⚠️ 열린 질문 [?] (06-data.md 「구성원 명단」 · PRD 6절):
 *    "명단을 누가 · 어디서 만드나" 를 팀이 아직 정하지 않았다.
 *    아래는 이미 있는 명단을 읽고 쓰는 도우미일 뿐이다 —
 *    가입 · 초대 · 자동 등록 같은 "명단이 생기는 흐름" 은 지어내지 않았다.
 *    팀이 정하면 그 흐름이 이 도우미를 부르는 자리에 붙는다.
 */
export function getMembers(): Member[] {
  return readList<Member>(KEY.members);
}

export function setMembers(names: string[]): boolean {
  const seen = new Set<string>();
  const members: Member[] = [];
  for (const raw of names) {
    const name = raw.trim();
    // 저장하는 개인정보는 이름뿐이라(SP1) 이름이 곧 사람 구분이다 — 같은 이름은 하나만 둔다.
    if (!name || seen.has(name)) continue;
    seen.add(name);
    members.push({ name });
  }
  return writeList<Member>(KEY.members, members);
}

export function addMember(name: string): StorageResult<Member> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, code: "EMPTY_FIELD", field: "name" };

  const members = getMembers();
  if (members.some((member) => member.name === trimmed)) {
    return { ok: true, value: { name: trimmed } };
  }
  if (!writeList<Member>(KEY.members, [...members, { name: trimmed }])) {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
  return { ok: true, value: { name: trimmed } };
}

export function removeMember(name: string): boolean {
  const trimmed = name.trim();
  return writeList<Member>(
    KEY.members,
    getMembers().filter((member) => member.name !== trimmed),
  );
}

/* ------------------------------------------------------------ 공유 주소 (F1·F2) */

/**
 * 주소 문자열의 모양 — 07-screens.md 에 "주소(URL)는 여기 없다 — 만드는 쪽이 제안하고 팀이 확정한다"
 * 라고 적혀 있다. 그래서 /s/<열쇠> 를 제안값으로 쓴다(보고의 열린 질문).
 * 그 주소를 받는 화면(라우트)은 만들지 않았다 — 여기서는 저장할 문자열만 만든다.
 */
export const SHARE_PATH_PREFIX = "/s/";

export function getShareUrl(scheduleId: string): string | null {
  return (
    readList<ShareLink>(KEY.shareLinks).find((link) => link.scheduleId === scheduleId)
      ?.url ?? null
  );
}

/** 없으면 한 번 만들어 저장한다 — 새로고침 뒤에도 같은 주소가 나온다. */
export function ensureShareUrl(scheduleId: string): string {
  const existing = getShareUrl(scheduleId);
  if (existing) return existing;

  const url = SHARE_PATH_PREFIX + newId();
  // 저장이 막힌 창(프라이빗 등)에서는 저장되지 않는다 — 그 창에서만 매번 새 값이 나온다.
  writeList<ShareLink>(KEY.shareLinks, [
    ...readList<ShareLink>(KEY.shareLinks),
    { scheduleId, url },
  ]);
  return url;
}

/** 공유 주소로 어느 일정인지 찾는다 (F2 — 공유 주소를 열면) */
export function findScheduleIdByShareUrl(url: string): string | null {
  return (
    readList<ShareLink>(KEY.shareLinks).find((link) => link.url === url)?.scheduleId ??
    null
  );
}

/** 저장한 것은 경로다 — 사람에게 보여 줄 때만 지금 브라우저 주소를 앞에 붙인다. */
export function toAbsoluteShareUrl(url: string): string {
  if (typeof window === "undefined") return url;
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}
