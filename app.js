// CAMPUS MATE 인증(ID/PW) 및 Google Apps Script 온라인 DB 관리 엔진
const SESSION_KEY = 'campus_mate_session';
const USERS_LOCAL_KEY = 'campus_mate_local_users';
const GAS_CONFIG_KEY = 'campus_mate_gas_config';

// 구글 앱스 스크립트 배포 후 발급받은 웹 앱 URL을 아래 따옴표 안에 넣으면 모든 기기에서 기본으로 연결됨
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzJ23bWjBf4qMg10xknmzK1dHFRe-T6JrgwlYqXhLPS5zUf4MKTDqP0uyP7jHaaxhSlzg/exec';

const defaultData = {
  darkMode: false,
  subjects: [
    { id: 's1', name: '웹프로그래밍', prof: '김교수', credit: 3, type: '전공' },
    { id: 's2', name: '컴퓨터개론', prof: '이교수', credit: 3, type: '전공' },
    { id: 's3', name: '대학영어', prof: '박교수', credit: 2, type: '교양' }
  ],
  tasks: [
    { id: 't1', subject: '웹프로그래밍', title: '스토리보드 및 프로토타입 제출', due: '2026-11-26', tag: '과제', done: false },
    { id: 't2', subject: '컴퓨터개론', title: '기말 프로젝트 발표 준비', due: '2026-12-03', tag: '팀플', done: false }
  ],
  studyLogs: [
    { subject: '웹프로그래밍', minutes: 80 },
    { subject: '컴퓨터개론', minutes: 45 }
  ],
  grades: [
    { subject: '웹프로그래밍', credit: 3, type: '전공', grade: 'A+' },
    { subject: '컴퓨터개론', credit: 3, type: '전공', grade: 'A0' },
    { subject: '대학영어', credit: 2, type: '교양', grade: 'B+' }
  ],
  targetGpa: 4.0,
  gradGoal: { total: 130, major: 65, liberal: 35, prevEarned: 60, prevMajor: 30, prevLiberal: 20 },
  teamTasks: [
    { id: 'k1', member: '팀장', task: '메인 UI 및 스토리보드 설계', status: 'done' },
    { id: 'k2', member: '팀원A', task: '캘린더 및 타이머 JS 구현', status: 'doing' },
    { id: 'k3', member: '팀원B', task: '최종 발표 PPT 제작', status: 'todo' }
  ],
  meetings: [
    { id: 'm1', date: '2026-11-20', members: '팀장, 팀원A, 팀원B', note: '주제를 CAMPUS MATE로 확정하고 6개 페이지 역할 분담 완료.' }
  ],
  timetable: [
    { day: '월', period: 2, subject: '웹프로그래밍', room: '공학관 302' },
    { day: '수', period: 2, subject: '웹프로그래밍', room: '공학관 302' },
    { day: '화', period: 4, subject: '컴퓨터개론', room: '정보관 105' }
  ]
};

function getGasUrl() {
  const saved = localStorage.getItem(GAS_CONFIG_KEY);
  return (saved && saved.trim()) ? saved.trim() : DEFAULT_GAS_URL;
}

function setGasUrl(url) {
  localStorage.setItem(GAS_CONFIG_KEY, url.trim());
}

function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(userObj, remember = true) {
  const str = JSON.stringify(userObj);
  sessionStorage.setItem(SESSION_KEY, str);
  if (remember) localStorage.setItem(SESSION_KEY, str);
}

function logoutUser() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  location.href = 'login.html';
}

function requireAuth() {
  const session = getSession();
  if (!session || !session.userId) {
    location.href = 'login.html';
    return null;
  }
  return session;
}

function getUserStorageKey(userId) {
  return `campus_mate_user_data_${userId}`;
}

function getLocalUsers() {
  const raw = localStorage.getItem(USERS_LOCAL_KEY);
  if (!raw) {
    // 범용 체험 계정 세팅
    const initial = {
      'guest': { password: '1234', userName: '체험사용자' }
    };
    localStorage.setItem(USERS_LOCAL_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(raw);
}

function loadData() {
  const session = getSession();
  const uid = session ? session.userId : 'guest';
  const key = getUserStorageKey(uid);
  const raw = localStorage.getItem(key);
  if (!raw) {
    const clone = JSON.parse(JSON.stringify(defaultData));
    localStorage.setItem(key, JSON.stringify(clone));
    return clone;
  }
  try {
    return { ...defaultData, ...JSON.parse(raw) };
  } catch (e) {
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function setSyncStatus(msg) {
  const el = document.getElementById('syncStatusText');
  if (el) el.textContent = msg;
}

function saveData(data) {
  const session = getSession();
  if (!session) return;
  const uid = session.userId;
  localStorage.setItem(getUserStorageKey(uid), JSON.stringify(data));

  const gasUrl = getGasUrl();
  if (gasUrl) {
    setSyncStatus('☁️ 구글 시트 온라인 저장 중...');
    fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'save',
        userId: uid,
        data: data
      })
    })
      .then(res => res.json())
      .then(() => setSyncStatus(`✅ 온라인 DB 동기화 완료 (${session.userName}님)`))
      .catch(() => setSyncStatus('⚠️ 온라인 동기화 실패 (브라우저 로컬 저장됨)'));
  }
}

async function pullFromCloud() {
  const session = getSession();
  const gasUrl = getGasUrl();
  if (!session) return;
  if (!gasUrl) {
    alert('먼저 [시간표·백업] 페이지에서 Google Apps Script 웹 앱 URL을 연결해 주세요.');
    return;
  }
  setSyncStatus('☁️ 구글 시트에서 최신 데이터 불러오는 중...');
  try {
    const res = await fetch(`${gasUrl}?action=fetch&userId=${encodeURIComponent(session.userId)}`);
    const json = await res.json();
    if (json.status === 'ok' && json.data) {
      localStorage.setItem(getUserStorageKey(session.userId), JSON.stringify(json.data));
      setSyncStatus('✅ 클라우드 데이터 동기화 완료');
      location.reload();
    } else {
      alert('서버에 저장된 데이터가 아직 없습니다. 데이터를 변경하면 자동으로 저장됩니다.');
    }
  } catch (err) {
    alert('구글 시트 동기화 중 오류가 발생했습니다.');
  }
}

function calcDDay(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function initCommonUI(activePage) {
  const session = requireAuth();
  if (!session) return;

  const data = loadData();
  const gasUrl = getGasUrl();
  if (data.darkMode) document.body.classList.add('dark-mode');

  const statusInitial = gasUrl
    ? `☁️ 구글 시트 온라인 DB 연결됨 · 로그인 계정: ${session.userName} (${session.userId})`
    : `💻 브라우저 로컬 계정 모드 · 로그인 계정: ${session.userName} (${session.userId})`;

  const headerHTML = `
    <div class="nav-container">
      <a href="index.html" class="logo">🎓 CAMPUS MATE</a>
      <nav class="nav-links">
        <a href="index.html" class="${activePage === 'index' ? 'active' : ''}">대시보드</a>
        <a href="schedule.html" class="${activePage === 'schedule' ? 'active' : ''}">과제·캘린더</a>
        <a href="study.html" class="${activePage === 'study' ? 'active' : ''}">집중 타이머</a>
        <a href="grade.html" class="${activePage === 'grade' ? 'active' : ''}">학점 시뮬레이터</a>
        <a href="team.html" class="${activePage === 'team' ? 'active' : ''}">팀플 매니저</a>
        <a href="tools.html" class="${activePage === 'tools' ? 'active' : ''}">시간표·백업</a>
      </nav>
      <div class="nav-actions">
        <button id="darkModeBtn" class="btn btn-outline btn-sm">${data.darkMode ? '☀️ 라이트' : '🌙 다크'}</button>
        <button onclick="logoutUser()" class="btn btn-danger btn-sm">로그아웃</button>
      </div>
    </div>
    <div class="sync-bar">
      <div class="sync-inner">
        <span id="syncStatusText">${statusInitial}</span>
        <div>
          <button class="btn btn-sm" style="padding:3px 10px;" onclick="pullFromCloud()">☁️ 클라우드 새로고침</button>
        </div>
      </div>
    </div>
  `;

  const headerEl = document.getElementById('main-header');
  if (headerEl) {
    headerEl.innerHTML = headerHTML;
    document.getElementById('darkModeBtn').addEventListener('click', () => {
      const current = loadData();
      current.darkMode = !current.darkMode;
      saveData(current);
      document.body.classList.toggle('dark-mode');
      document.getElementById('darkModeBtn').textContent = current.darkMode ? '☀️ 라이트' : '🌙 다크';
    });
  }
}

const gradePointMap = {
  'A+': 4.5, 'A0': 4.0, 'B+': 3.5, 'B0': 3.0,
  'C+': 2.5, 'C0': 2.0, 'D+': 1.5, 'D0': 1.0, 'F': 0.0
};

function calculateGPA(grades) {
  let totalCredits = 0;
  let totalPoints = 0;
  grades.forEach(g => {
    const cr = Number(g.credit) || 0;
    const pt = gradePointMap[g.grade] ?? 0;
    totalCredits += cr;
    totalPoints += cr * pt;
  });
  return totalCredits === 0 ? 0 : (totalPoints / totalCredits);
}