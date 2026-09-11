# docs/design — 클로드 디자인에서 내려받은 화면 원본

클로드 디자인 프로젝트 `9a404f54-5d9e-455b-a738-1fd9f716b157` 에서 2026-09-11 에 그대로 내려받았다.
개발 에이전트(`product-builder`)는 클로드 디자인에 직접 붙지 못하므로, 화면을 볼 때 이 폴더를 본다.

## 파일

| 파일 | 무엇 |
|---|---|
| `Main.dc.html` | 일정 목록 화면 |
| `ScheduleForm.dc.html` | 일정 입력 화면 (등록/수정) |
| `ScheduleDetail.dc.html` | 일정 상세 화면 |
| `tokens.css` | 디자인 토큰 **단일 원본** — 색·글자·간격·반경·크기·그림자 |
| `design-system.md` | 디자인 시스템 문서 — 분위기·색 표·타이포·아이콘 규칙·화면별 상태 토글 |
| `support.js` | `.dc.html` 런타임 (69KB, **생성물**) |

받지 않은 것: 프로젝트의 `uploads/design/` (초안 사본 · `canvas.json` · `claude-design-prompt.md`) 과 `.thumbnail` — 초안 원본이라 제외했다.

## support.js 를 건드리지 말 것

첫 줄에 이렇게 적혀 있다:

```
// GENERATED from dc-runtime/src/*.ts — do not edit.
```

클로드 디자인이 빌드해서 내보낸 런타임 번들이다. 직접 고치면 다음에 화면을 다시 받을 때 덮어써지고, 원본과 달라져 비교도 어려워진다. 손대지 않는다.

세 화면이 모두 `<script src="./support.js">` 로 **같은 폴더의** 이 파일을 참조한다. 그래서 이 파일이 있어야 `.dc.html` 을 브라우저로 열었을 때 화면이 렌더링된다. 옮기거나 지우면 미리보기가 깨진다.

하는 일: `.dc.html` 안의 `<x-dc>` 템플릿과 `<script data-dc-script>` 의 `DCLogic` 클래스를 읽어, `{{값}}` 치환과 `<sc-if>` · `<sc-for>` 를 해석해 React 로 렌더링한다. 앱 코드가 아니라 **미리보기용**이므로, 실제 구현에 이 런타임을 가져다 쓰지 않는다.

## 화면을 보려면

`docs/design/Main.dc.html` 을 브라우저로 연다. 나머지 두 화면도 같다.

## 값을 바꿀 때

`tokens.css` 와 **세 화면의 helmet `:root` 블록**을 함께 고친다. 스트리밍 중 깨짐을 막으려고 같은 토큰 블록이 네 군데에 복제돼 있다 (`design-system.md` 참고).

다만 원칙은 **여기서 고치지 않고 클로드 디자인에서 고친 뒤 다시 내려받는 것**이다. 이 폴더는 사본이다.
