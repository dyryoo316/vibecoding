import NameChip from "./NameChip";

/**
 * 이름 명단 카드 — ScheduleDetail.dc.html 의 "참석 n명" · "불참 n명" · "미응답 n명" 세 칸.
 * 같은 카드가 세 번 반복된다. "없음" 은 원본에서 미응답 칸에만 있다(F4 예외 — 전원 응답).
 */

export type NameListCardProps = {
  /** 원본: "참석 2명" 처럼 인원 수까지 포함된 제목 */
  label: string;
  names: string[];
  /** 목록이 비었을 때 대신 보일 글자 (원본: 미응답 칸의 "없음") */
  emptyText?: string;
};

export default function NameListCard({ label, names, emptyText }: NameListCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-2">
      <h3 className="text-sm font-bold text-text-muted">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {names.map((name) => (
          <NameChip key={name} name={name} />
        ))}
        {names.length === 0 && emptyText ? (
          <span className="text-sm text-text-faint">{emptyText}</span>
        ) : null}
      </div>
    </div>
  );
}
