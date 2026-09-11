/**
 * 저장 항목 타입 — 원본: docs/06-data.md 「저장 항목」 표.
 * 표에 있는 네 항목(일정 · 참석 응답 · 구성원 명단 · 공유 주소)과 표에 적힌 칸만 있다.
 * 표에 없는 칸은 만들지 않았다 — 단 하나의 예외는 아래 id 설명을 보라.
 */

/** 05-policy.md 「상태값」 — 예정 → 진행 중 → 지난 일정 */
export type ScheduleStatus = "예정" | "진행 중" | "지난 일정";

/** 제목 한도 (06-data.md · P3) */
export const MAX_TITLE_LENGTH = 30;

/**
 * 일정 — 칸: 제목 · 날짜 · 시간 · 장소 · 상태값 · 변경됨 표시 · 만든 시각
 *
 * id 는 06 표에 없는 칸이다. 참석 응답과 공유 주소의 "어느 일정" 칸이 가리킬 열쇠가 필요해서
 * 붙였다(표의 예시는 제목으로 가리키지만, 제목은 30자까지 자유 입력이고 수정으로 바뀐다).
 * 사람에게 보이지 않는 저장용 열쇠다.
 */
export type Schedule = {
  id: string;
  /** 30자까지 · 비울 수 없다 (P3) */
  title: string;
  /** YYYY-MM-DD · 오늘 이후만 (P3) */
  date: string;
  /** HH:MM */
  time: string;
  place: string;
  /** 예정 / 진행 중 / 지난 일정 — 읽을 때 시각으로 다시 계산한다 */
  status: ScheduleStatus;
  /** 변경됨 표시 — 고치면 켜지고 시작 전까지만 보인다 (P4) */
  changed: boolean;
  /** 만든 시각 (ISO 8601) */
  createdAt: string;
};

/** 일정 입력 네 칸 — 화면(일정 입력)에서 받는 값 */
export type ScheduleInput = {
  title: string;
  date: string;
  time: string;
  place: string;
};

/** 참석/불참 — 둘 중 하나 (P5) */
export type AttendanceChoice = "참석" | "불참";

/** 참석 응답 — 칸: 이름 · 어느 일정 · 참석/불참 · 남긴 시각 */
export type Attendance = {
  /** 저장하는 개인정보는 이름뿐이다 (SP1) */
  name: string;
  /** "어느 일정" — Schedule.id */
  scheduleId: string;
  choice: AttendanceChoice;
  /** 남긴 시각 (ISO 8601) */
  respondedAt: string;
};

/**
 * 구성원 명단 — 칸: 이름 · [?]
 *
 * ⚠️ 열린 질문 (06-data.md · PRD 6절): "명단을 누가 · 어디서 만드나" 는 팀이 아직 정하지 않았다.
 * 그래서 이름 칸 하나만 둔다. 가입 · 초대 · 자동 등록 같은 유입 흐름은 지어내지 않았다.
 */
export type Member = {
  name: string;
};

/**
 * 공유 주소 — 칸: 어느 일정 · 주소 문자열
 * 값은 "(에이전트가 만든다)" — storage.ts 의 ensureShareUrl 이 한 번 만들어 저장하고,
 * 새로고침 뒤에도 같은 주소를 돌려준다.
 */
export type ShareLink = {
  /** "어느 일정" — Schedule.id */
  scheduleId: string;
  /** 주소 문자열 */
  url: string;
};

/** 도우미가 돌려주는 실패 이유 — 화면에 보일 문구는 화면이 정한다 */
export type StorageErrorCode =
  | "EMPTY_FIELD" /** 제목·날짜·시간·장소·이름이 비었다 (P3) */
  | "TITLE_TOO_LONG" /** 제목이 30자를 넘었다 (P3) */
  | "PAST_DATE" /** 지난 날짜다 (P3 — 화면 문구 "지난 날짜입니다") */
  | "NOT_FOUND" /** 그런 일정이 없다 */
  | "NOT_UPCOMING" /** 상태가 "예정" 이 아니다 (P2 · P4 — 화면 문구 "이미 시작된 일정입니다") */
  | "STORAGE_UNAVAILABLE"; /** 브라우저 저장소에 쓸 수 없다(프라이빗 창 등) */

export type StorageResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: StorageErrorCode;
      /** EMPTY_FIELD 일 때 어느 칸이 비었는지 */
      field?: "title" | "date" | "time" | "place" | "name";
    };
