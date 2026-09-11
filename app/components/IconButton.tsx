import type { ReactNode } from "react";

/**
 * 원형 아이콘 버튼 — 두 결.
 * - primary: Main.dc.html 머리의 "일정 추가" (주 색 채움 · 그림자 · 흰 아이콘)
 * - outline: ScheduleForm.dc.html · ScheduleDetail.dc.html 머리의 뒤로가기 (흰 바탕 · 테두리)
 * 둘 다 --tap-min(44px) 정사각. 아이콘은 currentColor 라 버튼의 글자색을 따라간다.
 */

export type IconButtonVariant = "primary" | "outline";

export type IconButtonProps = {
  /** 스크린리더용 이름 (원본 aria-label: "일정 추가" · "뒤로가기") */
  label: string;
  /** Icons.tsx 의 아이콘. 원본은 원형 버튼 안에서 20px 이라 size-icon-md 를 준다. */
  icon: ReactNode;
  variant?: IconButtonVariant;
  onClick?: () => void;
};

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  primary: "bg-primary text-surface shadow-card hover:bg-primary-strong",
  outline: "border border-border bg-surface text-text hover:border-primary",
};

export default function IconButton({
  label,
  icon,
  variant = "primary",
  onClick,
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex-none size-tap-min rounded-full flex items-center justify-center cursor-pointer ${VARIANT_CLASS[variant]}`}
    >
      {icon}
    </button>
  );
}
