/**
 * 버튼 — 세 결.
 * - primary: ScheduleForm.dc.html 아래의 "등록" · "수정" (전체 너비 · 높이 --control-height)
 * - primary + disabled: 같은 화면의 비활성 버튼 (중립 배경 · 커서 not-allowed)
 * - outline: ScheduleDetail.dc.html 의 "참석" · "불참" (가로로 반씩 · 최소 --tap-min)
 * 표시 전용 — 누르면 무엇을 할지는 onClick 으로 받기만 한다.
 */

export type ButtonVariant = "primary" | "outline";

export type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
  /** ScheduleForm.dc.html 의 비활성 버튼 모양(원본은 primary 자리에만 있다) */
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
};

const PRIMARY = "w-full h-control-height rounded-md bg-primary text-surface text-base font-bold cursor-pointer hover:bg-primary-strong";
const PRIMARY_DISABLED = "w-full h-control-height rounded-md border border-border bg-neutral-soft text-text-faint text-base font-bold cursor-not-allowed";
// 원본의 1.5px 테두리 — 디자인 시스템에 테두리 두께 토큰이 없어 원본 값을 그대로 옮겼다.
const OUTLINE = "flex-1 min-h-tap-min rounded-md border-[1.5px] border-primary bg-surface text-primary text-md font-bold cursor-pointer hover:bg-primary-soft";

export default function Button({
  label,
  variant = "primary",
  disabled = false,
  onClick,
  type = "button",
}: ButtonProps) {
  const className =
    variant === "outline" ? OUTLINE : disabled ? PRIMARY_DISABLED : PRIMARY;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`font-sans ${className}`}
    >
      {label}
    </button>
  );
}
