/**
 * /api/schedules — 일정 목록 · 생성 (F1 · F2 · F4).
 * 서버 전용 app/lib/db.ts 를 통해서만 Postgres 에 접근한다.
 */
import { NextResponse } from "next/server";
import { dbAddSchedule, dbGetSchedules, dbGetUpcomingSchedules } from "@/app/lib/db";
import type { ScheduleInput } from "@/app/lib/types";

function parseNow(value: string | null): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = parseNow(searchParams.get("now"));
  const scope = searchParams.get("scope");

  try {
    const schedules =
      scope === "upcoming" ? await dbGetUpcomingSchedules(now) : await dbGetSchedules(now);
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("GET /api/schedules 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: (ScheduleInput & { now?: string }) | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "EMPTY_FIELD" }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ ok: false, code: "EMPTY_FIELD" }, { status: 400 });
  }

  const now = parseNow(body.now ?? null);
  const input: ScheduleInput = {
    title: body.title ?? "",
    date: body.date ?? "",
    time: body.time ?? "",
    place: body.place ?? "",
  };

  try {
    const result = await dbAddSchedule(input, now);
    return NextResponse.json(result, { status: result.ok ? 201 : 400 });
  } catch (error) {
    console.error("POST /api/schedules 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}
