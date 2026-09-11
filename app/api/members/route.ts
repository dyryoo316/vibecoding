/**
 * /api/members — 구성원 명단 (F4 의 "미응답" 계산 근거).
 *
 * ⚠️ 열린 질문 [?] (06-data.md · PRD 6절): "명단을 누가 · 어디서 만드나" 는 팀이 아직 정하지 않았다.
 * 여기는 이미 있는 명단을 읽고 쓰는 라우트일 뿐이다 — 가입 · 초대 흐름은 지어내지 않았다.
 *
 * GET    → 전체 명단
 * POST   { name } → 한 명 추가
 * PUT    { names: string[] } → 명단 통째로 바꾸기
 * DELETE ?name=xxx → 한 명 빼기
 */
import { NextResponse } from "next/server";
import { dbAddMember, dbGetMembers, dbRemoveMember, dbSetMembers } from "@/app/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await dbGetMembers());
  } catch (error) {
    console.error("GET /api/members 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { name?: string } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "EMPTY_FIELD", field: "name" }, { status: 400 });
  }

  try {
    const result = await dbAddMember(body?.name ?? "");
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("POST /api/members 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: { names?: string[] } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const ok = await dbSetMembers(Array.isArray(body?.names) ? body.names : []);
    return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
  } catch (error) {
    console.error("PUT /api/members 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "";

  try {
    const ok = await dbRemoveMember(name);
    return NextResponse.json({ ok });
  } catch (error) {
    console.error("DELETE /api/members 실패:", error);
    return NextResponse.json({ ok: false, code: "STORAGE_UNAVAILABLE" }, { status: 500 });
  }
}
