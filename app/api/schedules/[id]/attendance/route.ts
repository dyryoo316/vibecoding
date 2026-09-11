/**
 * /api/schedules/[id]/attendance — 참석 응답 (F3 · F4).
 * GET  ?summary=1 → 참석·불참·미응답 세 칸(F4)
 * GET  ?name=xxx  → 그 이름의 응답 하나(P5 — 하나뿐이다)
 * GET  (그 외)     → 그 일정의 응답 전체 목록
 * POST { name, choice, now? } → 참석·불참 남기기(F3, P2 · P5)
 */
import { NextResponse } from "next/server";
import {
  dbGetAttendance,
  dbGetAttendanceSummary,
  dbGetAttendances,
  dbSaveAttendance,
} from "@/app/lib/db";
import type { AttendanceChoice } from "@/app/lib/types";

function parseNow(value: string | null): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  try {
    if (searchParams.get("summary") === "1") {
      return NextResponse.json(await dbGetAttendanceSummary(id));
    }
    const name = searchParams.get("name");
    if (name !== null) {
      const attendance = await dbGetAttendance(id, name);
      if (!attendance) {
        return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json(attendance);
    }
    return NextResponse.json(await dbGetAttendances(id));
  } catch (error) {
    console.error("GET /api/schedules/[id]/attendance 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  let body: { name?: string; choice?: AttendanceChoice; now?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "EMPTY_FIELD", field: "name" }, { status: 400 });
  }
  if (!body || (body.choice !== "참석" && body.choice !== "불참")) {
    return NextResponse.json({ ok: false, code: "EMPTY_FIELD", field: "name" }, { status: 400 });
  }

  const now = parseNow(body.now ?? null);

  try {
    const result = await dbSaveAttendance(id, body.name ?? "", body.choice, now);
    const status = result.ok ? 200 : result.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error("POST /api/schedules/[id]/attendance 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}
