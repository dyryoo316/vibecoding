/**
 * /api/schedules/[id] — 일정 단건 조회 · 수정(F5) · 삭제(SP2).
 */
import { NextResponse } from "next/server";
import { dbDeleteSchedule, dbGetSchedule, dbUpdateSchedule } from "@/app/lib/db";
import type { ScheduleInput } from "@/app/lib/types";

function parseNow(value: string | null): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const now = parseNow(searchParams.get("now"));

  try {
    const schedule = await dbGetSchedule(id, now);
    if (!schedule) {
      return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(schedule);
  } catch (error) {
    console.error("GET /api/schedules/[id] 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
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
    const result = await dbUpdateSchedule(id, input, now);
    const status = result.ok ? 200 : result.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error("PUT /api/schedules/[id] 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const result = await dbDeleteSchedule(id);
    const status = result.ok ? 200 : result.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error("DELETE /api/schedules/[id] 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}
