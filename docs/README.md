Hiworks Attendance Bot

이 프로젝트는 하이웍스 근태 페이지에 자동으로 접속하여 사용자의 출퇴근 상태를 조회하고, 그 결과를 n8n 워크플로우와 연동해 알림 시스템을 자동화하기 위한 Node.js 기반 서버이다.

하이웍스 로그인 → 근태 페이지 자동 이동 → 출근/퇴근 상태 파싱 → JSON 반환 → n8n에서 조건 검사 → Pushbullet 등으로 알림
이라는 흐름을 안정적으로 구성하는 것이 목적이다.

기능 요약

Puppeteer를 이용한 하이웍스 자동 로그인

근태 페이지 접근 후 출근/퇴근 상태 파싱

/attendance API로 JSON 응답 제공

INTERNAL_API_TOKEN 기반 내부 인증

n8n Cron + HTTP Request 조합으로 주기적 조회

출근 상태 + 미퇴근 상태일 때만 알림 발송 가능

디렉터리 구조

server/
server.js
package.json
.env.example

n8n/
attendance-reminder.json

docs/
architecture.md
security.md

README.md
.gitignore

사전 준비물

Node.js (v18 이상 권장)

npm

Puppeteer 실행을 위한 Chrome/Chromium

하이웍스 로그인 계정

n8n (self-hosted 또는 클라우드)

INTERNAL_API_TOKEN (내부 인증용)

설치 방법

cd server
npm install

환경변수 설정 (.env)

server/.env.example을 참고해 같은 위치에 .env 파일을 만든다.

예시:

HIWORKS_ID=your-id@example.com

HIWORKS_PW=your-password
HIWORKS_BASE_URL=https://login.office.hiworks.com/your-domain

HIWORKS_ATTENDANCE_URL=https://hr-work.office.hiworks.com/personal/index

INTERNAL_API_TOKEN=change_me_to_strong_random_value
PORT=3000
PUPPETEER_EXEC_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"

주의:

.env는 절대 GitHub에 업로드하면 안 된다.

실제 비밀번호와 토큰은 보안에 유의하여 관리한다.

서버 실행

cd server
npm start
또는
node server.js

정상 실행 시 기본적으로 http://localhost:3000
 에서 동작한다.

API 엔드포인트

GET /attendance
Authorization 헤더로 INTERNAL_API_TOKEN 전달 필요

예시:

Authorization: Bearer xxxxxxxxxx

성공 시 응답 형식:

{
"success": true,
"status": {
"clockIn": true,
"clockOut": false,
"rawText": "..."
},
"checkedAt": "2025-01-01T09:10:00+09:00"
}

n8n 워크플로우 연동

방법:

n8n에서 Import 기능 사용

n8n/attendance-reminder.json 파일 선택

Cron 노드 스케줄을 평일 09~23시, 매 1시간 등으로 설정

HTTP Request 노드 URL을 실제 서버 URL로 변경

INTERNAL_API_TOKEN을 헤더로 전달

워크플로우 로직 요약:

Cron → HTTP Request (/attendance 호출)
→ Function: 성공 여부 및 출퇴근 상태 검사
→ IF 조건 만족 시 Pushbullet 등으로 알림 전송

보안 지침

모든 보안 가이드는 docs/security.md에서 확인 가능

.env 파일 절대 커밋 금지

INTERNAL_API_TOKEN은 강력한 난수 사용

비밀번호/토큰 등 민감 데이터는 로그로 출력 금지

n8n Credential은 JSON export에 포함되지 않도록 주의

문제 해결 / 개선 포인트

Puppeteer 파싱 실패 시 PAGE_STRUCTURE_CHANGED 처리

로그인 실패 시 LOGIN_FAILED 응답

하이웍스 UI 변경 대비 셀렉터 보강 필요

Jest 기반 테스트 코드 추가 예정

Redis/DB 기반의 상태 저장 기능 확장 가능

라이선스

(필요 시 라이선스 정보 추가)
