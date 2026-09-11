import { CalendarIcon } from "./Icons";

/**
 * 빈 상태 — Main.dc.html 의 isEmpty 화면.
 * 세로 가운데 정렬이라 ScreenFrame 의 스크롤 영역이 아니라 본문 자리에 그대로 놓는다
 * (ScreenFrame 의 scrollable={false}).
 */

export type EmptyStateProps = {
  /** 원본 문구 그대로가 기본값이다 (F2 예외) */
  message?: string;
};

export default function EmptyState({ message = "예정된 일정이 없습니다" }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
      {/* 원본의 빈 상태 아이콘만 40px · stroke-width 1.6 이다 */}
      <CalendarIcon className="size-10 text-text-faint" strokeWidth={1.6} />
      <p className="text-md text-text-muted">{message}</p>
    </div>
  );
}
