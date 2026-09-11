import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "팀 일정 관리",
  description: "동아리 일정을 만들고 참석 여부를 모으는 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
