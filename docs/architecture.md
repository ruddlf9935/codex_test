목적

이 프로젝트는 하이웍스 근태 페이지에 자동으로 접속해 현재 사용자의 출퇴근 상태(출근 여부, 퇴근 여부)를 읽어온 뒤, 내부 API 형태으로 n8n 워크플로우에 제공하기 위한 Node 서버를 구성하는 것을 목표로 한다.

주요 시나리오:

사용자가 하이웍스에 정상 로그인할 수 있는 계정 정보를 사용한다.

Puppeteer로 근태 페이지에 접속해 출근/퇴근 상태를 읽어온다.

사용자가 출근했고 아직 퇴근하지 않은 상태일 때만

n8n이 이 API를 주기적으로 호출해 Pushbullet 등으로 알림을 보낸다.

구성 요소

(1) Node 서버 (server/server.js)

Express 기반 HTTP API 서버

Puppeteer를 이용해 하이웍스 로그인 및 근태 페이지 접근

페이지 내용을 파싱해 출근/퇴근 상태를 JSON 형태로 반환

INTERNAL_API_TOKEN으로 간단한 토큰 기반 인증 처리

(2) n8n 워크플로우 (n8n/attendance-reminder.json)

Cron 노드로 일정 주기(예: 1시간)에 한 번 HTTP Request 실행

Node 서버의 /attendance 엔드포인트를 호출해 출퇴근 상태 수신

조건에 맞을 때만 Pushbullet(또는 다른 채널)로 알림 발송

(3) 환경변수 (.env)

하이웍스 계정 정보와 근태 URL

내부 API 토큰, 서버 포트, Puppeteer 실행 경로 등

실제 값은 .env에만 존재하며, 저장소에는 .env.example만 포함한다.

주요 변수:
HIWORKS_ID
HIWORKS_PW
HIWORKS_BASE_URL
HIWORKS_ATTENDANCE_URL
INTERNAL_API_TOKEN
PORT
PUPPETEER_EXEC_PATH

데이터 흐름

3-1. n8n → Node 서버 요청
n8n HTTP Request 노드는 다음과 같이 호출한다.

METHOD: GET (또는 POST)
URL: http://{SERVER_HOST}:{PORT}/attendance
HEADERS: Authorization: Bearer INTERNAL_API_TOKEN

요청 예시:
URL: http://localhost:3000/attendance

Header: Authorization: Bearer xxxxxxxxxx

3-2. Node 서버 내부 동작

Express가 /attendance 요청을 받는다.

Authorization 헤더에서 토큰을 읽어 INTERNAL_API_TOKEN과 일치하는지 확인.

토큰이 올바르면 Puppeteer 실행.

HIWORKS_BASE_URL로 이동하여 로그인 페이지 로드.

HIWORKS_ID, HIWORKS_PW 입력 후 로그인.

로그인 성공 시 HIWORKS_ATTENDANCE_URL로 이동.

페이지 텍스트(또는 DOM 요소)를 읽어 출근/퇴근 상태 판별.

JSON 형태로 응답 전송.

3-3. Node 서버 → n8n 응답

성공 예시:
{
"success": true,
"status": {
"clockIn": true,
"clockOut": false,
"rawText": "2025-01-01 09:01 출근, 근무중"
},
"checkedAt": "2025-01-01T09:10:00+09:00"
}

실패 예시:
{
"success": false,
"error": "LOGIN_FAILED",
"message": "하이웍스 로그인에 실패했습니다."
}

3-4. n8n 후속 처리

success가 true인지 확인

status.clockIn이 true인지 확인

status.clockOut이 false인지 확인

조건을 만족할 때만 Pushbullet 또는 다른 알림 채널 실행

시간 및 스케줄링 규칙

기준 시간대: 한국 시간 (UTC+9)

동작 요일: 평일(월~금)

동작 시간: 09시 ~ 23시

Cron 노드에서 기본 스케줄 설정

Function 노드에서 요일/시간 검증

중복 알림 방지를 위해 staticData 등을 이용해 “마지막 알림 시간” 저장 가능
(예: 마지막 알림 이후 1시간 이상일 때만 알림 전송)

출퇴근 판별 로직

출근 패턴:

"근무중", "근무 중"

"HH:MM 출근"

퇴근 패턴:

"근무종료", "근무 완료"

"HH:MM 퇴근"

판별 함수:
server/server.js 내부 getAttendanceStatus 함수가 rawText를 기반으로 clockIn, clockOut, rawText를 반환.

반환 예시:
{
clockIn: true,
clockOut: false,
rawText: "2025-01-01 09:01 출근, 근무중"
}

에러 처리 방침

처리해야 할 에러:

Puppeteer 실행 실패

하이웍스 접속 실패

로그인 실패

페이지 구조 변경으로 파싱 실패

처리 원칙:

HTTP 200 유지

success: false 포함

error 코드와 message 포함

n8n에서는 success false인 경우 푸시 금지

에러 응답 예시:
{
"success": false,
"error": "PAGE_STRUCTURE_CHANGED",
"message": "근태 페이지에서 출퇴근 정보를 찾을 수 없습니다."
}

향후 개선 포인트

Jest 기반 단위 테스트 / 통합 테스트 추가

Puppeteer mock 기반 테스트케이스 구성

하이웍스 UI 변경 대응을 위한 견고한 셀렉터 설계

여러 계정 순차 조회 지원

Redis, 파일, DB 기반의 상태 저장 구조 도입
(예: 마지막 알림 시간, 마지막 근태 상태 저장 등)
