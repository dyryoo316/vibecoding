import type { ReactNode } from "react";

/**
 * 아이콘 + 글자 한 줄.
 * Main.dc.html 카드의 날짜·시간·장소 세 줄(간격 --space-1)과
 * ScheduleDetail.dc.html 요약 카드의 날짜/시간·장소 두 줄(간격 --space-2)에 같은 모양으로 나온다.
 * 두 화면의 간격이 달라 gap 만 골라 쓰게 했다 — 원본에 있는 두 값뿐이다.
 */

export type InfoLineProps = {
  /** Icons.tsx 의 아이콘 (원본은 14px = size-icon-sm) */
  icon: ReactNode;
  children: ReactNode;
  /** tight = --space-1 (목록 카드) · loose = --space-2 (상세 요약 카드) */
  gap?: "tight" | "loose";
};

export default function InfoLine({ icon, children, gap = "tight" }: InfoLineProps) {
  return (
    <span
      className={`flex items-center ${gap === "tight" ? "gap-1" : "gap-2"} text-sm text-text-muted`}
    >
      {icon}
      {children}
    </span>
  );
}
