"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenFrame from "@/app/components/ScreenFrame";
import ScheduleCard from "@/app/components/ScheduleCard";
import IconButton from "@/app/components/IconButton";
import EmptyState from "@/app/components/EmptyState";
import { PlusIcon } from "@/app/components/Icons";
import { getUpcomingSchedules, getAttendanceSummary } from "@/app/lib/storage";
import type { Schedule } from "@/app/lib/types";

/**
 * 일정 목록 화면 (Main.dc.html)
 * - 다가오는 일정을 날짜순으로 표시
 * - 각 일정의 참석 상황을 인원 수로 표시
 * - 변경된 일정에는 "변경됨" 배지 표시 (P4)
 * - 일정이 없으면 빈 상태 표시 (F2 예외)
 */
export default function ScheduleListPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const upcoming = await getUpcomingSchedules();
        const summaries = await Promise.all(
          upcoming.map((schedule) => getAttendanceSummary(schedule.id)),
        );
        if (cancelled) return;
        setSchedules(upcoming);
        setAttendeeCounts(
          Object.fromEntries(
            upcoming.map((schedule, index) => [schedule.id, summaries[index].attend.length]),
          ),
        );
      } catch (error) {
        console.error("일정 목록 로드 실패:", error);
        if (!cancelled) setSchedules([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isEmpty = !isLoading && schedules.length === 0;

  const handleAddClick = () => {
    // TODO: 총무 여부를 확인해야 함 (P1)
    // 현재는 누구나 버튼을 볼 수 있다. 로그인 기능 추가 시(모듈2) 총무만 보여준다.
    router.push("/form");
  };

  const handleCardClick = (scheduleId: string) => {
    // TODO: 일정 상세 화면 라우트 미구현
    // router.push(`/detail/${scheduleId}`);
    console.log("일정 카드 클릭:", scheduleId);
  };

  /**
   * 날짜를 "9월 12일(토)" 형식으로 포맷
   * storage의 date는 YYYY-MM-DD 형식
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString + "T00:00:00");
      const formatter = new Intl.DateTimeFormat("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
      });
      const parts = formatter.formatToParts(date);
      const month = parts.find((p) => p.type === "month")?.value || "";
      const day = parts.find((p) => p.type === "day")?.value || "";
      const weekday = parts.find((p) => p.type === "weekday")?.value || "";
      return `${month} ${day}일(${weekday})`;
    } catch {
      return dateString;
    }
  };

  /**
   * 참석 인원을 "참석 8명" 형식으로 표시
   * F4: 참석 · 불참 · 미응답 인원 표시
   * (인원 수는 목록 로드 시 함께 미리 받아 둔 값을 읽는다 — 카드마다 다시 부르지 않는다)
   */
  const getAttendeeLabel = (scheduleId: string): string => {
    const attendCount = attendeeCounts[scheduleId] ?? 0;
    return `참석 ${attendCount}명`;
  };

  return (
    <ScreenFrame
      title="팀 일정 관리"
      subtitle="다가오는 일정"
      headerRight={
        <IconButton
          label="일정 추가"
          icon={<PlusIcon className="size-icon-md" />}
          variant="primary"
          onClick={handleAddClick}
        />
      }
      scrollable={!isEmpty}
      showBack={false}
    >
      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              title={schedule.title}
              date={formatDate(schedule.date)}
              time={schedule.time}
              place={schedule.place}
              attendeeLabel={getAttendeeLabel(schedule.id)}
              changed={schedule.changed}
              onClick={() => handleCardClick(schedule.id)}
            />
          ))}
        </div>
      )}
    </ScreenFrame>
  );
}
