/**
 * 배지 — 두 결.
 * - accent(강조): Main.dc.html 카드의 "변경됨" · ScheduleDetail.dc.html 의 "예정"
 * - neutral(중립): ScheduleDetail.dc.html 의 "진행 중" · "지난 일정"
 * 표시 전용. 원본의 여백·글자·반경 그대로다.
 */

export type BadgeTone = "accent" | "neutral";

export type BadgeProps = {
  /** 배지에 적히는 글자 (예: "변경됨" · "예정" · "진행 중") */
  label: string;
  tone?: BadgeTone;
};

const TONE_CLASS: Record<BadgeTone, string> = {
  accent: "bg-primary-soft text-primary-strong",
  neutral: "bg-neutral-soft text-text-muted",
};

export default function Badge({ label, tone = "accent" }: BadgeProps) {
  return (
    <span
      className={`flex-none ${TONE_CLASS[tone]} text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap`}
    >
      {label}
    </span>
  );
}
