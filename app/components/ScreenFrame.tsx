"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import IconButton from "./IconButton";
import { ChevronLeftIcon } from "./Icons";

/**
 * 세 화면이 함께 쓰는 틀.
 * - 바깥틀: 390×844 폰 화면 · 배경 --color-bg · 세로 한 줄 흐름 · overflow hidden (세 .dc.html 의 바깥 div 그대로)
 * - 머리: 두 모양뿐이다
 *     · Main.dc.html      → 제목 + 부제 + 오른쪽 요소 (위 --space-6 · 위쪽 정렬)
 *     · ScheduleForm/Detail → 뒤로가기 + 제목 + 오른쪽 요소 (위 --space-5 · 가운데 정렬)
 *   ScheduleForm 은 오른쪽 요소가 없을 뿐 Detail 과 같은 머리다.
 * - 본문: 스크롤 영역 (좌우 --space-5 · 아래 --space-6 은 세 화면 공통, 위 여백과 gap 만 화면마다 달라
 *   contentClassName 으로 받는다)
 * - 아래 고정 영역: ScheduleForm.dc.html 의 등록/수정 버튼 자리
 */

export type ScreenFrameProps = {
  title: string;
  /** Main.dc.html 의 "다가오는 일정" */
  subtitle?: string;
  /** 머리에 뒤로가기 버튼을 둔다(입력·상세 화면) */
  showBack?: boolean;
  /** 없으면 next/navigation 의 router.back() 을 쓴다 */
  onBack?: () => void;
  /** 뒤로가기 버튼의 스크린리더 이름 (원본 aria-label) */
  backLabel?: string;
  /** ScheduleDetail.dc.html 머리 오른쪽의 글자 버튼("수정") */
  action?: { label: string; onClick?: () => void };
  /** 머리 오른쪽에 다른 것을 넣을 때 (Main.dc.html 의 원형 "일정 추가" 버튼). action 보다 먼저다. */
  headerRight?: ReactNode;
  /** 아래 고정 영역 (ScheduleForm.dc.html 의 전체 너비 버튼) */
  footer?: ReactNode;
  /** 빈 상태처럼 스크롤 영역이 아니라 본문 자리에 그대로 놓아야 할 때 false */
  scrollable?: boolean;
  /** 화면마다 다른 위 여백·gap (예: Main "gap-3" · Form "pt-3 gap-5" · Detail "pt-2 gap-4") */
  contentClassName?: string;
  children: ReactNode;
};

export default function ScreenFrame({
  title,
  subtitle,
  showBack = false,
  onBack,
  backLabel = "뒤로가기",
  action,
  headerRight,
  footer,
  scrollable = true,
  contentClassName = "",
  children,
}: ScreenFrameProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  const right =
    headerRight ??
    (action ? (
      <button
        type="button"
        onClick={action.onClick}
        className="flex-none min-h-tap-min px-2 bg-transparent text-primary font-sans text-md font-bold cursor-pointer hover:text-primary-strong"
      >
        {action.label}
      </button>
    ) : null);

  return (
    <div className="w-screen-width h-screen-height bg-bg font-sans text-text flex flex-col overflow-hidden">
      {showBack ? (
        <header className="flex-none flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <IconButton
              label={backLabel}
              variant="outline"
              icon={<ChevronLeftIcon className="size-icon-md" />}
              onClick={handleBack}
            />
            <h1 className="text-xl font-black">{title}</h1>
          </div>
          {right}
        </header>
      ) : (
        <header className="flex-none flex items-start justify-between gap-3 px-5 pt-6 pb-4">
          <div className="flex flex-col gap-1">
            {/* 원본 Main.dc.html 의 제목만 letter-spacing:-0.01em — 자간 토큰이 없어 원본 값을 그대로 옮겼다 */}
            <h1 className="text-xl font-black tracking-[-0.01em]">{title}</h1>
            {subtitle ? <p className="text-sm text-text-muted">{subtitle}</p> : null}
          </div>
          {right}
        </header>
      )}

      {scrollable ? (
        <div className={`flex-1 overflow-y-auto flex flex-col px-5 pb-6 ${contentClassName}`}>
          {children}
        </div>
      ) : (
        children
      )}

      {footer ? <div className="flex-none px-5 pt-3 pb-6">{footer}</div> : null}
    </div>
  );
}
