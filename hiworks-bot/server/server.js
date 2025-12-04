// server.js (CommonJS 버전)

// 1) 필수 라이브러리 로드
const express = require('express');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');

// 2) .env 파일 로드
dotenv.config();

const {
  HIWORKS_ID,
  HIWORKS_PW,
  HIWORKS_BASE_URL,
  HIWORKS_ATTENDANCE_URL,
  INTERNAL_API_TOKEN,
  PORT = 3000,
} = process.env;

// 필수 환경변수 체크
if (!HIWORKS_ID || !HIWORKS_PW || !HIWORKS_BASE_URL || !INTERNAL_API_TOKEN) {
  console.error(
    '환경변수(HIWORKS_ID, HIWORKS_PW, HIWORKS_BASE_URL, INTERNAL_API_TOKEN)를 모두 설정해야 합니다.',
  );
  process.exit(1);
}

const app = express();

let browser = null;
let page = null;

// 브라우저/페이지 재사용
async function getPage() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
  }
  return page;
}

// 한국(서울) 기준 오늘 날짜 계산 (지금은 로그용)
function getTodayStringForUi() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const seoulMs = utcMs + 9 * 60 * 60 * 1000;
  const seoul = new Date(seoulMs);

  const yyyyMMdd = seoul.toISOString().slice(0, 10); // 예: 2025-12-04
  return { seoul, yyyyMMdd };
}

// 출근/퇴근 상태 조회 – 하이웍스 개인 대시보드 기준
async function getAttendanceStatus() {
  const page = await getPage();

  // 1) 근무현황(개인) URL
  const attendanceUrl = HIWORKS_ATTENDANCE_URL || HIWORKS_BASE_URL;

  // 2) 근무현황 페이지로 이동 (로그인 안 돼 있으면 로그인 페이지로 리다이렉트됨)
  await page.goto(attendanceUrl, { waitUntil: 'networkidle2' });

  // 3) 로그인 페이지인지 체크
  const loginIdInput = await page.$('input[name="userid"], input[name="user_id"]');
  if (loginIdInput) {
    // 로그인 폼 채우기
    await page.type('input[name="userid"], input[name="user_id"]', HIWORKS_ID, {
      delay: 50,
    });
    await page.type('input[name="password"]', HIWORKS_PW, { delay: 50 });

    await page.click('button[type="submit"], .btn_login');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 로그인 후 다시 근무현황 페이지로 이동 (혹시 다른 페이지로 갔으면)
    await page.goto(attendanceUrl, { waitUntil: 'networkidle2' });
  }

  const { yyyyMMdd } = getTodayStringForUi();

  // 4) 브라우저 내부에서 전체 텍스트 기반으로 출근/퇴근 여부 판별
  const result = await page.evaluate(() => {
    // 페이지 전체 텍스트 가져오기 (줄바꿈/여러 공백 정리)
    const fullText = document.body.innerText.replace(/\s+/g, ' ').trim();

    // 출근 여부
    //  - "근무중" 또는 "근무 중" 이 떠 있으면 확실히 출근 상태
    //  - 또는 "07:19 출근" 처럼 "출근 + 시간" 패턴이 있으면 출근으로 판단
    const hasWorkingText =
      fullText.includes('근무중') || fullText.includes('근무 중');
    const hasStartTime = /출근\s*\d{1,2}:\d{2}/.test(fullText);

    const checkedIn = hasWorkingText || hasStartTime;

    // 퇴근 여부
    //  - "18:10 퇴근" 같이 시간과 함께 표시되거나
    //  - "근무종료", "근무완료" 같은 상태 텍스트가 있으면 퇴근으로 간주
    const hasEndTime = /퇴근\s*\d{1,2}:\d{2}/.test(fullText);
    const hasEndStatus =
      fullText.includes('근무종료') || fullText.includes('근무완료');

    const checkedOut = hasEndTime || hasEndStatus;

    return {
      checkedIn,
      checkedOut,
      _debug: {
        hasWorkingText,
        hasStartTime,
        hasEndTime,
        hasEndStatus,
      },
    };
  });

  console.log('[hiworks-bot] 오늘 근태 상태:', yyyyMMdd, result);

  return {
    checkedIn: result.checkedIn,
    checkedOut: result.checkedOut,
  };
}

// 헬스체크용 엔드포인트
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// n8n에서 호출할 핵심 엔드포인트
app.get('/hiworks/attendance-status', async (req, res) => {
  try {
    const token = req.query.token;
    if (token !== INTERNAL_API_TOKEN) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const status = await getAttendanceStatus();
    return res.json(status);
  } catch (err) {
    console.error('attendance-status error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`hiworks-bot listening on port ${PORT}`);
});
