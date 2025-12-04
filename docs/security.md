Hiworks Attendance Bot - Security Guidelines

이 문서는 하이웍스 근태 자동 조회 시스템 개발 및 운영 시 반드시 지켜야 할 보안 원칙을 정리한 것이다.
Node 서버, Puppeteer 자동화, n8n 연동 구조에서 발생할 수 있는 보안 리스크를 최소화하는 것을 목표로 한다.

계정 및 비밀번호 관리

하이웍스 ID / PW는 절대 코드나 저장소에 직접 하드코딩하지 않는다.

실제 값은 .env 파일에만 존재하며, GitHub에는 .env.example만 올라간다.

.env는 절대 커밋하지 않는다.

비밀번호 변경이 필요한 경우, 코드 수정 없이 .env만 교체한다.

가능하면 근태 조회 전용 하이웍스 계정을 별도로 사용하는 것을 권장한다.

비밀번호는 주기적으로 변경한다.

환경변수(.env) 관리 규칙

저장소에는 .env를 올리지 않는다. 반드시 .gitignore에 포함한다.

.env.example에는 "변수 이름 + 예시 값(실제 값 아님)"만 넣는다.

.env 파일을 공유해야 한다면 암호화된 채널(예: 비공개 메시지, 암호화 ZIP 등)만 사용한다.

환경변수 누락 시 서버가 실행되지 않도록 예외 처리를 권장한다.

주요 환경변수 목록:
HIWORKS_ID
HIWORKS_PW
HIWORKS_BASE_URL
HIWORKS_ATTENDANCE_URL
INTERNAL_API_TOKEN
PORT
PUPPETEER_EXEC_PATH

INTERNAL_API_TOKEN 보안 정책

Node 서버의 /attendance API는 INTERNAL_API_TOKEN을 기반으로 인증한다.

n8n → Node 서버 호출 시 Authorization 헤더에 토큰을 포함한다.

토큰은 충분히 길고 예측 불가능한 난수로 구성해야 한다.

토큰이 유출되었거나 의심될 경우 즉시 재발급하고 n8n 설정도 업데이트한다.

토큰 값은 로그(console.log)로 절대 출력하지 않는다.

공격자가 토큰 없이 엔드포인트에 접근할 경우, 403 Forbidden 형태로 처리한다.

로그 및 디버깅 보안

절대 로그에 남기지 말아야 하는 정보:

HIWORKS_ID, HIWORKS_PW

INTERNAL_API_TOKEN

Puppeteer 로그인 세션 쿠키

하이웍스 인증 관련 응답

로그는 다음 원칙을 따른다:

에러 원인은 기록하되 민감값은 마스킹 처리한다.

"LOGIN_FAILED", "PAGE_STRUCTURE_CHANGED" 같은 코드 기반 로그를 사용한다.

개발 단계에서도 민감 데이터가 콘솔에 찍히지 않도록 주의한다.

Puppeteer 자동화 보안

headless 모드를 기본으로 사용하여 UI 노출을 최소화한다.

로그인 후 브라우저 세션이 외부에 노출되지 않도록 한다.

페이지 이동 시 waitUntil 옵션을 적절히 사용하여 비정상적인 출력 방지.

자동 로그인은 사이트 이용약관을 준수하는 범위 내에서만 사용한다.

Puppeteer 종료 시 browser.close()를 반드시 호출해 세션 정리한다.

n8n 보안 규칙

n8n은 인증이 활성화된 상태에서만 외부에 노출한다.

반드시 HTTPS 환경에서 사용한다. (ngrok HTTPS 등)

Node 서버의 /attendance URL은 외부에 공개하지 않고 n8n에서만 사용한다.

n8n Credential(Pushbullet, SMTP 계정 등)은 절대 export하지 않는다.

JSON export 시 민감 값이 포함되지 않았는지 확인한다.

GitHub 보안 규칙

.gitignore에 반드시 다음 포함:
.env
node_modules/
*.log

만약 실수로 민감 정보(.env, 계정, 토큰 등)를 커밋했다면:

즉시 해당 비밀번호/토큰을 변경

GitHub에서 secret scanning 경고 확인

원한다면 git filter-repo 등을 사용해 과거 기록에서 완전히 제거

저장소는 Private 사용을 권장한다.

운영 보안 권장사항

서버는 방화벽을 통해 외부 접근 제한(IP Allowlist) 적용을 추천한다.

n8n ↔ Node 서버 간 통신만 허용하는 네트워크 구조가 이상적이다.

Puppeteer 실행을 위한 서버는 외부 SSH 접근이 제한된 환경에서 운영한다.

정기적으로 하이웍스 계정 로그인 정책(2FA 여부 포함)을 점검한다.

시스템에 대한 접근 로그를 주기적으로 검토해 비정상 접근 탐지.
