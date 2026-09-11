/**
 * 일정 규칙 — 저장소(브라우저든 서버 DB든)와 무관한 순수 계산.
 *
 * 원래 app/lib/storage.ts 안에 있던 순수 함수들을 이 파일로 옮겼다.
 * 서버(app/lib/db.ts, API 라우트)와 클라이언트(app/lib/storage.ts) 양쪽에서
 * 그대로 가져다 쓴다 — I/O 가 없어 어느 쪽에서 실행해도 안전하다.
 *
 * 정책 원본: docs/05-policy.md 「상태값」· PRD 1절 열린 질문(종료 시각 가정).
 */

import { MAX_TITLE_LENGTH, type Schedule, type ScheduleInput, type ScheduleStatus, type StorageResult } from "./types";

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
export function withNow(schedule: Schedule, now: Date): Schedule {
  const status = computeStatus(schedule, now);
  return {
    ...schedule,
    status,
    // "고치면 변경됨 표시가 시작 전까지 보인다" (P4)
    changed: schedule.changed && status === "예정",
  };
}

export function byStart(a: Schedule, b: Schedule): number {
  return (a.date + "T" + a.time).localeCompare(b.date + "T" + b.time);
}

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
