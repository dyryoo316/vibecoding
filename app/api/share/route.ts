/**
 * /api/share?url=<공유 주소> — 공유 주소로 어느 일정인지 찾는다 (F2 — 공유 주소를 열면).
 */
import { NextResponse } from "next/server";
import { dbFindScheduleIdByShareUrl } from "@/app/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({ scheduleId: null });
  }

  try {
    const scheduleId = await dbFindScheduleIdByShareUrl(url);
    return NextResponse.json({ scheduleId });
  } catch (error) {
    console.error("GET /api/share 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}
