import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 세 화면(.dc.html)이 구글 폰트로 불러오던 Noto Sans KR 400/500/700/900.
// --font-noto-sans-kr 변수는 app/globals.css 의 --font-sans 가 받아 쓴다.
const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-noto-sans-kr",
});

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
    <html lang="ko" className={notoSansKR.variable}>
      <body>{children}</body>
    </html>
  );
}
