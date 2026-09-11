/**
 * /api/schedules/[id]/share — 공유 주소 (F1 · F2).
 * GET ?create=false → 이미 있는 주소만 읽는다(없으면 null)
 * GET (그 외)        → 없으면 한 번 만들어 저장한다(ensureShareUrl)
 */
import { NextResponse } from "next/server";
import { dbEnsureShareUrl, dbGetShareUrl } from "@/app/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const shouldCreate = searchParams.get("create") !== "false";

  try {
    const url = shouldCreate ? await dbEnsureShareUrl(id) : await dbGetShareUrl(id);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("GET /api/schedules/[id]/share 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}
