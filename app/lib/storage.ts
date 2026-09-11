/**
 * 저장소 도우미 — docs/06-data.md 「저장 항목」 표의 네 항목만 읽고 쓴다.
 *
 * - 저장 자리는 서버 Postgres 데이터베이스다(app/lib/db.ts · .env.local 의 DATABASE_URL).
 *   브라우저 localStorage 는 더 이상 쓰지 않는다 — 이 파일은 화면(클라이언트)에서 그대로
 *   불러 쓸 수 있도록, 실제 데이터베이스 접근은 app/api/** 라우트 핸들러에 맡기고
 *   여기서는 fetch 로 그 라우트를 부르기만 한다("use client" 화면이 pg 모듈을 직접
 *   불러오면 안 되기 때문이다 — pg 는 Node 서버 전용이다).
 * - 화면(app/page.tsx · app/form/page.tsx)이 부르는 함수 이름 · 인자는 그대로 두었다.
 *   다만 이제 서버를 거치므로 데이터를 읽고 쓰는 함수는 전부 Promise 를 돌려준다
 *   (예전 localStorage 버전은 동기 함수였다) — 화면 쪽 호출부에 await 를 더하는 것만
 *   불가피하게 바꿨다.
 * - 네트워크 오류 · 서버 오류에도 화면이 죽지 않게 전부 try/catch 로 감싸고
 *   빈 값 · ok:false 로 되돌린다(예전의 "저장소가 막힌 창" 대비와 같은 자리).
 * - 정책(05-policy.md)의 예외는 서버 쪽(app/lib/db.ts)에서 막는다: P2 · P3 · P4 · P5 · SP2.
 *   다만 "총무만"(P1)은 여기서 막을 수 없다 — 06 표에 누가 총무인지 적는 칸이 없고
 *   로그인은 모듈2라 정해진 것이 없다. 화면에서 버튼을 감추는 것으로만 지킨다(보고의 열린 질문).
 */

import type {
  Attendance,
  AttendanceChoice,
  Member,
  Schedule,
  ScheduleInput,
  StorageResult,
} from "./types";

export {
  ASSUMED_DURATION_MS,
  computeStatus,
  todayString,
  validateScheduleInput,
} from "./schedule-rules";

/** 서버 라우트가 만드는 주소의 접두어 — app/lib/db.ts 의 SHARE_PATH_PREFIX 와 같다. */
export const SHARE_PATH_PREFIX = "/s/";

/* --------------------------------------------------------------- 공통 fetch */

async function fetchJson<T>(input: string, init?: RequestInit): Promise<{ status: number; body: T | null }> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => null)) as T | null;
  return { status: response.status, body };
}

/* --------------------------------------------------------- 일정 (F1·F2·F4·F5) */

export async function getSchedules(now: Date = new Date()): Promise<Schedule[]> {
  try {
    const { body } = await fetchJson<Schedule[]>(`/api/schedules?now=${encodeURIComponent(now.toISOString())}`);
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  }
}

/** 일정 목록 화면이 쓰는 "다가오는 일정" — 지난 일정은 빼고 날짜순. */
export async function getUpcomingSchedules(now: Date = new Date()): Promise<Schedule[]> {
  try {
    const { body } = await fetchJson<Schedule[]>(
      `/api/schedules?scope=upcoming&now=${encodeURIComponent(now.toISOString())}`,
    );
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  }
}

export async function getSchedule(id: string, now: Date = new Date()): Promise<Schedule | null> {
  try {
    const { status, body } = await fetchJson<Schedule>(
      `/api/schedules/${encodeURIComponent(id)}?now=${encodeURIComponent(now.toISOString())}`,
    );
    if (status === 404 || !body) return null;
    return body;
  } catch {
    return null;
  }
}

/** F1 — 일정을 만든다. 만들면서 공유 주소도 함께 만들어 둔다(06 표: F1 결과). */
export async function addSchedule(
  input: ScheduleInput,
  now: Date = new Date(),
): Promise<StorageResult<Schedule>> {
  try {
    const { body } = await fetchJson<StorageResult<Schedule>>("/api/schedules", {
      method: "POST",
      body: JSON.stringify({ ...input, now: now.toISOString() }),
    });
    return body ?? { ok: false, code: "STORAGE_UNAVAILABLE" };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

/** F5 — 일정을 고친다. 고치면 "변경됨" 이 켜진다(P4). 시작된 일정은 고칠 수 없다(P4). */
export async function updateSchedule(
  id: string,
  input: ScheduleInput,
  now: Date = new Date(),
): Promise<StorageResult<Schedule>> {
  try {
    const { body } = await fetchJson<StorageResult<Schedule>>(`/api/schedules/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ ...input, now: now.toISOString() }),
    });
    return body ?? { ok: false, code: "STORAGE_UNAVAILABLE" };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

/**
 * SP2 — 총무는 일정을 삭제할 수 있고, 삭제하면 그 일정의 참석 기록도 사라진다.
 * 07-screens.md 의 세 화면에는 삭제 버튼이 없다 — 정책만 구현해 둔 도우미다.
 */
export async function deleteSchedule(id: string): Promise<StorageResult<true>> {
  try {
    const { body } = await fetchJson<StorageResult<true>>(`/api/schedules/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return body ?? { ok: false, code: "STORAGE_UNAVAILABLE" };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

/* -------------------------------------------------------- 참석 응답 (F3·F4) */

export async function getAttendances(scheduleId: string): Promise<Attendance[]> {
  try {
    const { body } = await fetchJson<Attendance[]>(
      `/api/schedules/${encodeURIComponent(scheduleId)}/attendance`,
    );
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  }
}

/** 한 사람이 이 일정에 남긴 답 (P5 — 하나뿐이다) */
export async function getAttendance(scheduleId: string, name: string): Promise<Attendance | null> {
  try {
    const { status, body } = await fetchJson<Attendance>(
      `/api/schedules/${encodeURIComponent(scheduleId)}/attendance?name=${encodeURIComponent(name.trim())}`,
    );
    if (status === 404 || !body) return null;
    return body;
  } catch {
    return null;
  }
}

/**
 * F3 — 참석 · 불참을 남긴다.
 * P2: 상태 "예정" 동안만 (시작 뒤에는 바꿀 수 없다 — "이미 시작된 일정입니다").
 * P5: 같은 이름은 하나만 — 다시 누르면 덮어쓴다(칸만 옮겨 간다).
 */
export async function saveAttendance(
  scheduleId: string,
  name: string,
  choice: AttendanceChoice,
  now: Date = new Date(),
): Promise<StorageResult<Attendance>> {
  try {
    const { body } = await fetchJson<StorageResult<Attendance>>(
      `/api/schedules/${encodeURIComponent(scheduleId)}/attendance`,
      { method: "POST", body: JSON.stringify({ name, choice, now: now.toISOString() }) },
    );
    return body ?? { ok: false, code: "STORAGE_UNAVAILABLE" };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

/**
 * F4 — 참석 · 불참 · 미응답 세 칸.
 * 미응답은 구성원 명단에서 아직 답하지 않은 이름이다(06 표의 구성원 명단 근거).
 */
export async function getAttendanceSummary(scheduleId: string): Promise<{
  attend: string[];
  absent: string[];
  pending: string[];
}> {
  try {
    const { body } = await fetchJson<{ attend: string[]; absent: string[]; pending: string[] }>(
      `/api/schedules/${encodeURIComponent(scheduleId)}/attendance?summary=1`,
    );
    return body ?? { attend: [], absent: [], pending: [] };
  } catch {
    return { attend: [], absent: [], pending: [] };
  }
}

/* ------------------------------------------------------------ 구성원 명단 (F4) */

/**
 * ⚠️ 열린 질문 [?] (06-data.md 「구성원 명단」 · PRD 6절):
 *    "명단을 누가 · 어디서 만드나" 를 팀이 아직 정하지 않았다.
 *    아래는 이미 있는 명단을 읽고 쓰는 도우미일 뿐이다.
 */
export async function getMembers(): Promise<Member[]> {
  try {
    const { body } = await fetchJson<Member[]>("/api/members");
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  }
}

export async function setMembers(names: string[]): Promise<boolean> {
  try {
    const { body } = await fetchJson<{ ok: boolean }>("/api/members", {
      method: "PUT",
      body: JSON.stringify({ names }),
    });
    return body?.ok ?? false;
  } catch {
    return false;
  }
}

export async function addMember(name: string): Promise<StorageResult<Member>> {
  try {
    const { body } = await fetchJson<StorageResult<Member>>("/api/members", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return body ?? { ok: false, code: "STORAGE_UNAVAILABLE" };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

export async function removeMember(name: string): Promise<boolean> {
  try {
    const { body } = await fetchJson<{ ok: boolean }>(
      `/api/members?name=${encodeURIComponent(name.trim())}`,
      { method: "DELETE" },
    );
    return body?.ok ?? false;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------ 공유 주소 (F1·F2) */

export async function getShareUrl(scheduleId: string): Promise<string | null> {
  try {
    const { body } = await fetchJson<{ url: string | null }>(
      `/api/schedules/${encodeURIComponent(scheduleId)}/share?create=false`,
    );
    return body?.url ?? null;
  } catch {
    return null;
  }
}

/** 없으면 한 번 만들어 저장한다 — 새로고침 뒤에도 같은 주소가 나온다. */
export async function ensureShareUrl(scheduleId: string): Promise<string | null> {
  try {
    const { body } = await fetchJson<{ url: string | null }>(
      `/api/schedules/${encodeURIComponent(scheduleId)}/share`,
    );
    return body?.url ?? null;
  } catch {
    return null;
  }
}

/** 공유 주소로 어느 일정인지 찾는다 (F2 — 공유 주소를 열면) */
export async function findScheduleIdByShareUrl(url: string): Promise<string | null> {
  try {
    const { body } = await fetchJson<{ scheduleId: string | null }>(
      `/api/share?url=${encodeURIComponent(url)}`,
    );
    return body?.scheduleId ?? null;
  } catch {
    return null;
  }
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
