# 팀 일정 관리

Next.js(App Router) + TypeScript + Tailwind CSS v4 + ESLint 로 구성된 앱입니다.
기획 문서는 `docs/PRD.md` 및 `docs/01-problem.md` ~ `docs/07-screens.md` 를 참조하세요.

## 개발 서버

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과 실행 |
| `npm run lint` | ESLint 검사 |

## 폴더

- `app/` — App Router 페이지 · 레이아웃 · 전역 스타일
- `public/` — 정적 파일
- `docs/` — 기획 문서 (앱 코드 아님)

import alias 는 `@/*` 이며 프로젝트 루트를 가리킵니다(`src/` 미사용).
