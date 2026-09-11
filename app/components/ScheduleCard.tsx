import Badge from "./Badge";
import InfoLine from "./InfoLine";
import { CalendarIcon, ClockIcon, PeopleIcon, PinIcon } from "./Icons";

/**
 * 일정 카드 — Main.dc.html 목록의 <sc-for> 안 카드 한 장.
 * 표시 전용: 날짜·시간·장소·참석 인원은 이미 화면에 보일 글자로 받아 그대로 찍는다
 * (원본 renderVals 도 "9월 12일(토)" · "참석 8명" 처럼 만들어 둔 문자열을 넘긴다).
 */

export type ScheduleCardProps = {
  title: string;
  /** 원본: "9월 12일(토)" */
  date: string;
  /** 원본: "19:00" */
  time: string;
  /** 원본: "스터디룸 B" */
  place: string;
  /** 원본: "참석 8명" */
  attendeeLabel: string;
  /** 고친 일정에 시작 전까지 보이는 "변경됨" 표시 (P4) */
  changed?: boolean;
  onClick?: () => void;
};

export default function ScheduleCard({
  title,
  date,
  time,
  place,
  attendeeLabel,
  changed = false,
  onClick,
}: ScheduleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-surface border border-border rounded-lg p-4 shadow-card flex flex-col gap-3 font-sans text-text cursor-pointer hover:border-primary"
    >
      <div className="flex items-start justify-between gap-2 w-full">
        <span className="text-lg font-bold leading-tight">{title}</span>
        {changed ? <Badge label="변경됨" tone="accent" /> : null}
      </div>

      <div className="flex flex-wrap gap-3 w-full">
        <InfoLine icon={<CalendarIcon />}>{date}</InfoLine>
        <InfoLine icon={<ClockIcon />}>{time}</InfoLine>
        <InfoLine icon={<PinIcon />}>{place}</InfoLine>
      </div>

      <div className="flex items-center gap-2 w-full pt-3 border-t border-border text-sm text-text-muted">
        <PeopleIcon />
        <span>{attendeeLabel}</span>
      </div>
    </button>
  );
}
