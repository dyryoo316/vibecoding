"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ScreenFrame from "@/app/components/ScreenFrame";
import LabeledInput from "@/app/components/LabeledInput";
import Button from "@/app/components/Button";
import {
  addSchedule,
  updateSchedule,
  getSchedule,
  validateScheduleInput,
  todayString,
} from "@/app/lib/storage";
import type { ScheduleInput } from "@/app/lib/types";

/**
 * 일정 입력 화면 (ScheduleForm.dc.html)
 * - F1: 새 일정 추가 (빈 폼에서 시작)
 * - F5: 기존 일정 수정 (URL 쿼리 ?id=<schedule_id> 로 감지)
 * - P3: 제목 필수·max 30자, 날짜 필수·오늘 이후, 시간 필수, 장소 필수
 */
export default function ScheduleFormPage() {
  return (
    <Suspense fallback={null}>
      <ScheduleForm />
    </Suspense>
  );
}

function ScheduleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scheduleId = searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [dateError, setDateError] = useState<string>("");

  // 폼 상태
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");

  // 수정 모드인지 추가 모드인지
  const isEditMode = !!scheduleId;

  // 마운트 시 수정 모드면 기존 일정 로드
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (isEditMode && scheduleId) {
        try {
          const schedule = await getSchedule(scheduleId);
          if (cancelled) return;
          if (schedule) {
            setTitle(schedule.title);
            setDate(schedule.date);
            setTime(schedule.time);
            setPlace(schedule.place);
          } else {
            setErrorMessage("일정을 찾을 수 없습니다");
          }
        } catch (error) {
          console.error("일정 로드 실패:", error);
          if (!cancelled) setErrorMessage("일정 로드 중 오류가 발생했습니다");
        }
      }
      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isEditMode, scheduleId]);

  // 오늘 날짜 (date input의 min 속성용)
  const today = todayString();

  // 모든 필드 채워짐 여부 (제출 버튼 활성화 조건)
  const isAllFilled = title.trim() !== "" && date !== "" && time !== "" && place.trim() !== "";

  // 제출 핸들러
  const handleSubmit = async () => {
    setErrorMessage("");
    setDateError("");

    // 유효성 검사
    const input: ScheduleInput = {
      title: title.trim(),
      date,
      time,
      place: place.trim(),
    };

    const validation = validateScheduleInput(input);
    if (!validation.ok) {
      if (validation.code === "PAST_DATE") {
        setDateError("지난 날짜입니다");
      } else if (validation.code === "EMPTY_FIELD") {
        setErrorMessage("모든 필드를 입력하세요");
      } else if (validation.code === "TITLE_TOO_LONG") {
        setErrorMessage("제목은 30자 이하여야 합니다");
      } else if (validation.code === "STORAGE_UNAVAILABLE") {
        setErrorMessage("저장하지 못했습니다. 브라우저 저장소를 확인하세요");
      } else {
        setErrorMessage("입력을 확인하세요");
      }
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && scheduleId) {
        // F5: 일정 수정
        const result = await updateSchedule(scheduleId, input);
        if (result.ok) {
          // 상세 화면으로 이동 (다음 세션: /detail/{id})
          // 현재는 목록으로 돌아가기
          router.push("/");
        } else {
          if (result.code === "NOT_UPCOMING") {
            setErrorMessage("이미 시작된 일정입니다");
          } else if (result.code === "NOT_FOUND") {
            setErrorMessage("일정을 찾을 수 없습니다");
          } else if (result.code === "STORAGE_UNAVAILABLE") {
            setErrorMessage("저장하지 못했습니다. 브라우저 저장소를 확인하세요");
          } else {
            setErrorMessage("수정하지 못했습니다");
          }
        }
      } else {
        // F1: 새 일정 추가
        const result = await addSchedule(input);
        if (result.ok) {
          router.push("/");
        } else {
          if (result.code === "STORAGE_UNAVAILABLE") {
            setErrorMessage("저장하지 못했습니다. 브라우저 저장소를 확인하세요");
          } else {
            setErrorMessage("등록하지 못했습니다");
          }
        }
      }
    } catch (error) {
      console.error("제출 중 오류:", error);
      setErrorMessage("처리 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenFrame
        title={isEditMode ? "일정 수정" : "일정 등록"}
        showBack={true}
        scrollable={true}
      >
        <div className="flex items-center justify-center py-8">
          <p className="text-text-muted">로드 중...</p>
        </div>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame
      title={isEditMode ? "일정 수정" : "일정 등록"}
      showBack={true}
      scrollable={true}
      contentClassName="pt-3 gap-5"
      footer={
        <Button
          label={isEditMode ? "수정" : "등록"}
          disabled={!isAllFilled || isSubmitting}
          onClick={handleSubmit}
        />
      }
    >
      {/* 일반적인 에러 메시지 (지난 날짜 외) */}
      {errorMessage ? (
        <div className="bg-danger bg-opacity-10 border border-danger rounded-md p-3 mb-2">
          <p className="text-sm text-danger">{errorMessage}</p>
        </div>
      ) : null}

      {/* 제목 입력칸 */}
      <LabeledInput
        id="f-title"
        label="제목"
        value={title}
        onChange={setTitle}
        type="text"
        placeholder="예: 9월 정기 모임"
        maxLength={30}
        counter={`${title.length}/30자`}
      />

      {/* 날짜 입력칸 */}
      <LabeledInput
        id="f-date"
        label="날짜"
        value={date}
        onChange={(newDate) => {
          setDate(newDate);
          setDateError(""); // 날짜 변경 시 에러 클리어
        }}
        type="date"
        min={today}
        error={dateError || undefined}
      />

      {/* 시간 입력칸 */}
      <LabeledInput
        id="f-time"
        label="시간"
        value={time}
        onChange={setTime}
        type="time"
      />

      {/* 장소 입력칸 */}
      <LabeledInput
        id="f-place"
        label="장소"
        value={place}
        onChange={setPlace}
        type="text"
        placeholder="예: 스터디룸 B"
      />
    </ScreenFrame>
  );
}
