/**
 * 라벨 붙은 입력칸 — ScheduleForm.dc.html 의 제목 · 날짜 · 시간 · 장소 네 칸.
 * 라벨 없이 쓰면 ScheduleDetail.dc.html 의 "이름을 입력하세요" 칸과 같은 모양이다.
 * 글자 수 표시(제목 "0/30자")와 경고 한 줄("지난 날짜입니다")도 원본에 있는 자리다.
 * 표시 전용 — 값과 바뀔 때 할 일은 props 로 받는다.
 */

export type LabeledInputProps = {
  id: string;
  /** 없으면 라벨 줄을 그리지 않는다(상세 화면의 이름 칸). */
  label?: string;
  value: string;
  onChange?: (value: string) => void;
  type?: "text" | "date" | "time";
  placeholder?: string;
  maxLength?: number;
  /** 라벨 오른쪽 글자 수 표시 (원본: "0/30자") */
  counter?: string;
  /** 입력칸 아래 경고 한 줄 (원본: "지난 날짜입니다") */
  error?: string;
};

export default function LabeledInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
  counter,
  error,
}: LabeledInputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label ? (
        counter ? (
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={id} className="text-sm font-bold text-text-muted">
              {label}
            </label>
            <span className="text-xs text-text-faint">{counter}</span>
          </div>
        ) : (
          <label htmlFor={id} className="text-sm font-bold text-text-muted">
            {label}
          </label>
        )
      ) : null}

      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full min-h-tap-min font-sans text-base text-text bg-surface border border-border rounded-md px-4 py-3 outline-none focus:border-primary"
      />

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
