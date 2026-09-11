/**
 * 선 아이콘 모음 — docs/design/ 세 화면의 인라인 SVG 를 path 까지 그대로 옮긴 것.
 * 규칙(design-system.md): 이모지 없음 · 24×24 viewBox · fill:none · stroke-width:2 · 둥근 캡.
 * 색은 stroke="currentColor" 라서 부모의 글자색 유틸리티(text-*)를 따라간다.
 * 크기는 className 으로 준다 — 인라인 14px 은 size-icon-sm, 원형 버튼 안 20px 은 size-icon-md.
 */

export type IconProps = {
  /** 크기·색 유틸리티. 기본값은 목록·상세의 인라인 아이콘 크기(14px). */
  className?: string;
  /** 원본이 1.6 을 쓰는 빈 상태 아이콘만 바꾼다. */
  strokeWidth?: number;
};

type BaseProps = IconProps & { children: React.ReactNode };

function BaseIcon({ className = "size-icon-sm", strokeWidth = 2, children }: BaseProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** 달력 — Main.dc.html 카드 날짜 · 빈 상태 · ScheduleDetail.dc.html 날짜/시간 줄 */
export function CalendarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3"></rect>
      <path d="M8 3v4M16 3v4M3 10h18"></path>
    </BaseIcon>
  );
}

/** 시계 — Main.dc.html 카드 시간 */
export function ClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M12 7v5l3 3"></path>
    </BaseIcon>
  );
}

/** 핀 — Main.dc.html 카드 장소 · ScheduleDetail.dc.html 장소 줄 */
export function PinIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z"></path>
      <circle cx="12" cy="9.5" r="2.3"></circle>
    </BaseIcon>
  );
}

/** 사람 — Main.dc.html 카드 아래 참석 인원 줄 */
export function PeopleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="9" cy="8" r="3"></circle>
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"></path>
      <circle cx="17" cy="9" r="2.5"></circle>
      <path d="M15.5 14.3c2.5.4 4.5 2.6 4.5 5.7"></path>
    </BaseIcon>
  );
}

/** 플러스 — Main.dc.html 머리의 "일정 추가" 원형 버튼 */
export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14M5 12h14"></path>
    </BaseIcon>
  );
}

/** 왼쪽 꺾쇠 — ScheduleForm.dc.html · ScheduleDetail.dc.html 머리의 뒤로가기 */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15 6l-6 6 6 6"></path>
    </BaseIcon>
  );
}
