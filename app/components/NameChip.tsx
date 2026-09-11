/**
 * 이름 칩 — ScheduleDetail.dc.html 의 참석 · 불참 · 미응답 명단에 반복해서 나오는 이름 한 알.
 */

export type NameChipProps = {
  name: string;
};

export default function NameChip({ name }: NameChipProps) {
  return (
    <span className="inline-flex items-center text-sm px-3 py-1 rounded-full bg-bg border border-border text-text">
      {name}
    </span>
  );
}
