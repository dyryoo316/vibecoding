/**
 * 서버 데이터베이스 도우미 — docs/06-data.md 「저장 항목」 표의 네 항목만 읽고 쓴다.
 *
 * - 저장 자리는 서버 Postgres 데이터베이스 하나(`DATABASE_URL`, `.env.local`)뿐이다.
 *   브라우저 localStorage 는 더 이상 쓰지 않는다.
 * - 연결 문자열은 `process.env.DATABASE_URL` 로만 읽는다 — 코드에 값을 적지 않고,
 *   값을 로그·콘솔에 남기지 않는다.
 * - 이 파일은 서버 전용이다(Node.js `pg` 모듈을 쓴다). app/api/** 라우트 핸들러에서만
 *   불러온다 — "use client" 화면 파일이 이 파일을 직접 불러오면 안 된다.
 * - 정책(05-policy.md)의 예외까지 여기서 막는다: P2 · P3 · P4 · P5 · SP2.
 *   다만 "총무만"(P1)은 여기서 막을 수 없다 — 06 표에 누가 총무인지 적는 칸이 없고
 *   로그인은 모듈2라 정해진 것이 없다. 화면에서 버튼을 감추는 것으로만 지킨다(보고의 열린 질문).
 */

import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { computeStatus, validateScheduleInput, withNow } from "./schedule-rules";
import type {
  Attendance,
  AttendanceChoice,
  Member,
  Schedule,
  ScheduleInput,
  StorageResult,
} from "./types";

/* -------------------------------------------------------------- 연결 풀 */

declare global {
  // Next.js 개발 서버의 핫 리로드마다 새 Pool 이 생기지 않도록 전역에 캐싱한다.
  var __teamSchedulePgPool: Pool | undefined;
  var __teamScheduleSchemaReady: Promise<void> | undefined;
}

function getPool(): Pool {
  if (!globalThis.__teamSchedulePgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      // 값을 만들어 내지 않는다 — 환경 변수가 없으면 분명한 에러로 멈춘다.
      throw new Error("DATABASE_URL 환경 변수가 없습니다 (.env.local 확인).");
    }
    globalThis.__teamSchedulePgPool = new Pool({ connectionString });
  }
  return globalThis.__teamSchedulePgPool;
}

/** 06-data.md 「저장 항목」 표의 네 항목 — 관계(FK)는 긋지 않고 "어느 일정" 칸만 둔다. */
async function ensureSchema(): Promise<void> {
  if (!globalThis.__teamScheduleSchemaReady) {
    globalThis.__teamScheduleSchemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schedules (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          place TEXT NOT NULL,
          changed BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS attendances (
          schedule_id TEXT NOT NULL,
          name TEXT NOT NULL,
          choice TEXT NOT NULL CHECK (choice IN ('참석', '불참')),
          responded_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (schedule_id, name)
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS members (
          name TEXT PRIMARY KEY
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS share_links (
          schedule_id TEXT PRIMARY KEY,
          url TEXT UNIQUE NOT NULL
        );
      `);
    })();
  }
  return globalThis.__teamScheduleSchemaReady;
}

async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------- 행 매핑 */

type ScheduleRow = {
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
  changed: boolean;
  created_at: Date;
};

function rowToSchedule(row: ScheduleRow, now: Date): Schedule {
  const base: Schedule = {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time,
    place: row.place,
    status: computeStatus(row, now),
    changed: row.changed,
    createdAt: row.created_at.toISOString(),
  };
  return withNow(base, now);
}

type AttendanceRow = {
  schedule_id: string;
  name: string;
  choice: AttendanceChoice;
  responded_at: Date;
};

function rowToAttendance(row: AttendanceRow): Attendance {
  return {
    scheduleId: row.schedule_id,
    name: row.name,
    choice: row.choice,
    respondedAt: row.responded_at.toISOString(),
  };
}

/* --------------------------------------------------------- 일정 (F1·F2·F4·F5) */

export async function dbGetSchedules(now: Date = new Date()): Promise<Schedule[]> {
  return withClient(async (client) => {
    const result = await client.query<ScheduleRow>(
      "SELECT * FROM schedules ORDER BY date ASC, time ASC",
    );
    return result.rows.map((row) => rowToSchedule(row, now));
  });
}

/** F2 "다가오는 일정" — 지난 일정은 빼고 날짜순(F6 지난 일정 보기는 v2). */
export async function dbGetUpcomingSchedules(now: Date = new Date()): Promise<Schedule[]> {
  const all = await dbGetSchedules(now);
  return all.filter((schedule) => schedule.status !== "지난 일정");
}

export async function dbGetSchedule(id: string, now: Date = new Date()): Promise<Schedule | null> {
  return withClient(async (client) => {
    const result = await client.query<ScheduleRow>(
      "SELECT * FROM schedules WHERE id = $1",
      [id],
    );
    const row = result.rows[0];
    return row ? rowToSchedule(row, now) : null;
  });
}

/** F1 — 일정을 만든다. 만들면서 공유 주소도 함께 만들어 둔다(06 표: F1 결과). */
export async function dbAddSchedule(
  input: ScheduleInput,
  now: Date = new Date(),
): Promise<StorageResult<Schedule>> {
  const checked = validateScheduleInput(input, now);
  if (!checked.ok) return checked;

  return withClient(async (client) => {
    const id = randomUUID();
    const createdAt = now;
    await client.query(
      `INSERT INTO schedules (id, title, date, time, place, changed, created_at)
       VALUES ($1, $2, $3, $4, $5, false, $6)`,
      [id, checked.value.title, checked.value.date, checked.value.time, checked.value.place, createdAt],
    );
    await ensureShareUrlRow(client, id);

    const schedule: Schedule = {
      id,
      ...checked.value,
      status: computeStatus(checked.value, now),
      changed: false,
      createdAt: createdAt.toISOString(),
    };
    return { ok: true, value: schedule };
  });
}

/** F5 — 일정을 고친다. 고치면 "변경됨" 이 켜진다(P4). 시작된 일정은 고칠 수 없다(P4). */
export async function dbUpdateSchedule(
  id: string,
  input: ScheduleInput,
  now: Date = new Date(),
): Promise<StorageResult<Schedule>> {
  return withClient(async (client) => {
    const existingResult = await client.query<ScheduleRow>(
      "SELECT * FROM schedules WHERE id = $1",
      [id],
    );
    const existing = existingResult.rows[0];
    if (!existing) return { ok: false, code: "NOT_FOUND" };

    if (computeStatus(existing, now) !== "예정") {
      return { ok: false, code: "NOT_UPCOMING" };
    }

    const checked = validateScheduleInput(input, now);
    if (!checked.ok) return checked;

    const updateResult = await client.query<ScheduleRow>(
      `UPDATE schedules
       SET title = $2, date = $3, time = $4, place = $5, changed = true
       WHERE id = $1
       RETURNING *`,
      [id, checked.value.title, checked.value.date, checked.value.time, checked.value.place],
    );
    return { ok: true, value: rowToSchedule(updateResult.rows[0], now) };
  });
}

/**
 * SP2 — 총무는 일정을 삭제할 수 있고, 삭제하면 그 일정의 참석 기록도 사라진다.
 * (SP2 는 참석 기록만 말하지만, 가리킬 일정이 없어진 공유 주소도 함께 지운다.)
 * 07-screens.md 의 세 화면에는 삭제 버튼이 없다 — 정책만 구현해 둔 도우미다.
 */
export async function dbDeleteSchedule(id: string): Promise<StorageResult<true>> {
  return withClient(async (client) => {
    try {
      await client.query("BEGIN");
      const existing = await client.query("SELECT 1 FROM schedules WHERE id = $1", [id]);
      if (existing.rowCount === 0) {
        await client.query("ROLLBACK");
        return { ok: false, code: "NOT_FOUND" };
      }
      await client.query("DELETE FROM attendances WHERE schedule_id = $1", [id]);
      await client.query("DELETE FROM share_links WHERE schedule_id = $1", [id]);
      await client.query("DELETE FROM schedules WHERE id = $1", [id]);
      await client.query("COMMIT");
      return { ok: true, value: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

/* -------------------------------------------------------- 참석 응답 (F3·F4) */

export async function dbGetAttendances(scheduleId: string): Promise<Attendance[]> {
  return withClient(async (client) => {
    const result = await client.query<AttendanceRow>(
      "SELECT * FROM attendances WHERE schedule_id = $1",
      [scheduleId],
    );
    return result.rows.map(rowToAttendance);
  });
}

/** 한 사람이 이 일정에 남긴 답 (P5 — 하나뿐이다) */
export async function dbGetAttendance(scheduleId: string, name: string): Promise<Attendance | null> {
  const trimmed = name.trim();
  return withClient(async (client) => {
    const result = await client.query<AttendanceRow>(
      "SELECT * FROM attendances WHERE schedule_id = $1 AND name = $2",
      [scheduleId, trimmed],
    );
    const row = result.rows[0];
    return row ? rowToAttendance(row) : null;
  });
}

/**
 * F3 — 참석 · 불참을 남긴다.
 * P2: 상태 "예정" 동안만 (시작 뒤에는 바꿀 수 없다 — "이미 시작된 일정입니다").
 * P5: 같은 이름은 하나만 — 다시 누르면 덮어쓴다(칸만 옮겨 간다).
 */
export async function dbSaveAttendance(
  scheduleId: string,
  name: string,
  choice: AttendanceChoice,
  now: Date = new Date(),
): Promise<StorageResult<Attendance>> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, code: "EMPTY_FIELD", field: "name" };

  return withClient(async (client) => {
    const scheduleResult = await client.query<ScheduleRow>(
      "SELECT * FROM schedules WHERE id = $1",
      [scheduleId],
    );
    const schedule = scheduleResult.rows[0];
    if (!schedule) return { ok: false, code: "NOT_FOUND" };
    if (computeStatus(schedule, now) !== "예정") {
      return { ok: false, code: "NOT_UPCOMING" };
    }

    const respondedAt = now;
    await client.query(
      `INSERT INTO attendances (schedule_id, name, choice, responded_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (schedule_id, name)
       DO UPDATE SET choice = EXCLUDED.choice, responded_at = EXCLUDED.responded_at`,
      [scheduleId, trimmed, choice, respondedAt],
    );

    return {
      ok: true,
      value: { scheduleId, name: trimmed, choice, respondedAt: respondedAt.toISOString() },
    };
  });
}

/**
 * F4 — 참석 · 불참 · 미응답 세 칸.
 * 미응답은 구성원 명단에서 아직 답하지 않은 이름이다(06 표의 구성원 명단 근거).
 * 명단에 없는 이름이 답을 남기면 참석/불참 칸에는 보이되 미응답 셈에는 들어가지 않는다.
 */
export async function dbGetAttendanceSummary(scheduleId: string): Promise<{
  attend: string[];
  absent: string[];
  pending: string[];
}> {
  const [attendances, members] = await Promise.all([
    dbGetAttendances(scheduleId),
    dbGetMembers(),
  ]);
  const answered = new Set(attendances.map((attendance) => attendance.name));

  return {
    attend: attendances.filter((a) => a.choice === "참석").map((a) => a.name),
    absent: attendances.filter((a) => a.choice === "불참").map((a) => a.name),
    pending: members.map((member) => member.name).filter((name) => !answered.has(name)),
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
export async function dbGetMembers(): Promise<Member[]> {
  return withClient(async (client) => {
    const result = await client.query<{ name: string }>("SELECT name FROM members ORDER BY name ASC");
    return result.rows.map((row) => ({ name: row.name }));
  });
}

export async function dbSetMembers(names: string[]): Promise<boolean> {
  const seen = new Set<string>();
  const members: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    members.push(name);
  }

  return withClient(async (client) => {
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM members");
      for (const name of members) {
        await client.query("INSERT INTO members (name) VALUES ($1)", [name]);
      }
      await client.query("COMMIT");
      return true;
    } catch {
      await client.query("ROLLBACK");
      return false;
    }
  });
}

export async function dbAddMember(name: string): Promise<StorageResult<Member>> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, code: "EMPTY_FIELD", field: "name" };

  return withClient(async (client) => {
    await client.query(
      "INSERT INTO members (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [trimmed],
    );
    return { ok: true, value: { name: trimmed } };
  });
}

export async function dbRemoveMember(name: string): Promise<boolean> {
  const trimmed = name.trim();
  return withClient(async (client) => {
    await client.query("DELETE FROM members WHERE name = $1", [trimmed]);
    return true;
  });
}

/* ------------------------------------------------------------ 공유 주소 (F1·F2) */

/**
 * 주소 문자열의 모양 — 07-screens.md 에 "주소(URL)는 여기 없다 — 만드는 쪽이 제안하고 팀이 확정한다"
 * 라고 적혀 있다. 그래서 /s/<열쇠> 를 제안값으로 쓴다(보고의 열린 질문).
 * 그 주소를 받는 화면(라우트)은 만들지 않았다 — 여기서는 저장할 문자열만 만든다.
 */
export const SHARE_PATH_PREFIX = "/s/";

export async function dbGetShareUrl(scheduleId: string): Promise<string | null> {
  return withClient(async (client) => {
    const result = await client.query<{ url: string }>(
      "SELECT url FROM share_links WHERE schedule_id = $1",
      [scheduleId],
    );
    return result.rows[0]?.url ?? null;
  });
}

async function ensureShareUrlRow(client: PoolClient, scheduleId: string): Promise<string> {
  const existing = await client.query<{ url: string }>(
    "SELECT url FROM share_links WHERE schedule_id = $1",
    [scheduleId],
  );
  if (existing.rows[0]) return existing.rows[0].url;

  const url = SHARE_PATH_PREFIX + randomUUID();
  await client.query(
    "INSERT INTO share_links (schedule_id, url) VALUES ($1, $2) ON CONFLICT (schedule_id) DO NOTHING",
    [scheduleId, url],
  );
  const stored = await client.query<{ url: string }>(
    "SELECT url FROM share_links WHERE schedule_id = $1",
    [scheduleId],
  );
  return stored.rows[0]?.url ?? url;
}

/** 없으면 한 번 만들어 저장한다 — 새로고침 뒤에도 같은 주소가 나온다. */
export async function dbEnsureShareUrl(scheduleId: string): Promise<string> {
  return withClient((client) => ensureShareUrlRow(client, scheduleId));
}

/** 공유 주소로 어느 일정인지 찾는다 (F2 — 공유 주소를 열면) */
export async function dbFindScheduleIdByShareUrl(url: string): Promise<string | null> {
  return withClient(async (client) => {
    const result = await client.query<{ schedule_id: string }>(
      "SELECT schedule_id FROM share_links WHERE url = $1",
      [url],
    );
    return result.rows[0]?.schedule_id ?? null;
  });
}
