// CAMPUS MATE 인증(ID/PW) 및 다중 팀플(ID 초대/공유) 엔진
const SESSION_KEY = 'campus_mate_session';
const USERS_LOCAL_KEY = 'campus_mate_local_users';
const SHARED_TEAMS_KEY = 'campus_mate_shared_teams';
const ADMIN_GAS_KEY = 'campus_mate_admin_gas_url';

// ★ 기본 서버 URL (관리자 모드에서 변경 시 브라우저에 저장되어 우선 적용됨)
const DEFAULT_GAS_URL = '여기에_순수_웹앱_URL_붙여넣기';
// ★ 관리자 모드 진입 PIN 번호 (원하는 비밀번호로 변경 가능)
const ADMIN_PIN = 'admin1234';

const SEMESTERS = [
  '1학년 1학기', '1학년 2학기',
  '2학년 1학기', '2학년 2학기',
  '3학년 1학기', '3학년 2학기',
  '4학년 1학기', '4학년 2학기',
  '계절학기'
];

const defaultData = {
  darkMode: false,
  selectedSemester: '1학년 1학기',
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
    { semester: '1학년 1학기', subject: '웹프로그래밍', credit: 3, type: '전공', grade: 'A+' },
    { semester: '1학년 1학기', subject: '컴퓨터개론', credit: 3, type: '전공', grade: 'A0' },
    { semester: '1학년 1학기', subject: '대학영어', credit: 2, type: '교양', grade: 'B+' },
    { semester: '1학년 1학기', subject: '채플/인성세미나', credit: 1, type: '교양', grade: 'P' }
  ],
  targetGpa: 4.0,
  gradGoal: { total: 130, major: 65, liberal: 35, prevEarned: 0, prevMajor: 0, prevLiberal: 0 },
  timetableConfig: {
    startHour: 9,
    startMin: 0,
    periodMinutes: 60,
    maxPeriods: 12 // 야간 수업(12교시, 밤 9시)까지 기본 지원 및 자유 변경 가능
  },
  timetable: [
    { semester: '1학년 1학기', day: '월', period: 2, subject: '웹프로그래밍', room: '공학관 302' },
    { semester: '1학년 1학기', day: '수', period: 2, subject: '웹프로그래밍', room: '공학관 302' },
    { semester: '1학년 1학기', day: '화', period: 4, subject: '컴퓨터개론', room: '정보관 105' }
  ]
};

function getGasUrl() {
  const adminSaved = localStorage.getItem(ADMIN_GAS_KEY);
  if (adminSaved && adminSaved.trim()) return adminSaved.trim();
  if (!DEFAULT_GAS_URL || DEFAULT_GAS_URL === '여기에_순수_웹앱_URL_붙여넣기') return '';
  return DEFAULT_GAS_URL.trim();
}

function setAdminGasUrl(url) {
  const clean = url.trim();
  if (!clean) {
    localStorage.removeItem(ADMIN_GAS_KEY);
  } else {
    localStorage.setItem(ADMIN_GAS_KEY, clean);
  }
}

// 숨김 관리자 모달 열기 (PIN 검증 후 서버 URL 설정 창 표시)
function triggerAdminMode() {
  const pin = prompt('관리자 비밀번호를 입력하세요:');
  if (pin === null) return;
  if (pin !== ADMIN_PIN) {
    alert('관리자 비밀번호가 일치하지 않습니다.');
    return;
  }
  const currentUrl = getGasUrl();
  const nextUrl = prompt(
    '✅ 관리자 인증 완료!\n연결할 Google Apps Script 웹 앱 URL(https://.../exec)을 입력하세요.\n(비우고 확인을 누르면 기본 설정으로 초기화됩니다)',
    currentUrl
  );
  if (nextUrl === null) return;
  if (nextUrl.trim().startsWith('{')) {
    alert('⚠️ JSON 전체가 아닌 순수 https://.../exec 주소만 입력해 주세요!');
    return;
  }
  setAdminGasUrl(nextUrl);
  alert('서버 URL 설정이 반영되었습니다. 페이지를 새로고침합니다.');
  location.reload();
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
    e.preventDefault();
    triggerAdminMode();
  }
});

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
  const base = raw ? JSON.parse(raw) : {};
  base['guest'] = { password: '1234', userName: '체험사용자' };
  base['student1'] = { password: '1234', userName: '김민수' };
  base['student2'] = { password: '1234', userName: '박지훈' };
  localStorage.setItem(USERS_LOCAL_KEY, JSON.stringify(base));
  return base;
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
    const parsed = JSON.parse(raw);
    const merged = { ...defaultData, ...parsed };
    merged.timetableConfig = { ...defaultData.timetableConfig, ...(parsed.timetableConfig || {}) };
    // 기존 데이터 하위 호환: semester 필드가 없으면 기본 학기로 보정
    merged.grades = (merged.grades || []).map(g => ({ semester: merged.selectedSemester || '1학년 1학기', ...g }));
    merged.timetable = (merged.timetable || []).map(t => ({ semester: merged.selectedSemester || '1학년 1학기', ...t }));
    return merged;
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

  if (uid === 'guest') {
    setSyncStatus('🧪 체험 모드 (브라우저 임시 저장)');
    return;
  }

  const gasUrl = getGasUrl();
  if (gasUrl) {
    setSyncStatus('☁️ 클라우드 동기화 중...');
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
      .catch(() => setSyncStatus('⚠️ 서버 동기화 지연 (로컬 백업 완료)'));
  }
}

// ==========================================
// 다중 팀 프로젝트(폴더) & 팀원 ID 초대 관리 함수
// ==========================================
function getDefaultTeams(session) {
  return [
    {
      id: 'team_demo_1',
      name: '웹프로그래밍 기말 프로젝트',
      subject: '웹프로그래밍',
      ownerId: session.userId,
      members: [
        { userId: session.userId, userName: session.userName },
        { userId: 'student1', userName: '김민수' }
      ],
      tasks: [
        { id: 'k1', memberId: session.userId, memberName: session.userName, task: '메인 UI 및 스토리보드 설계', status: 'done' },
        { id: 'k2', memberId: 'student1', memberName: '김민수', task: '캘린더 및 타이머 JS 구현', status: 'doing' }
      ],
      meetings: [
        { id: 'm1', date: '2026-11-20', members: `${session.userName}, 김민수`, note: '주제를 CAMPUS MATE로 확정하고 역할 분담 완료.' }
      ]
    },
    {
      id: 'team_demo_2',
      name: '컴퓨터개론 발표조',
      subject: '컴퓨터개론',
      ownerId: session.userId,
      members: [
        { userId: session.userId, userName: session.userName },
        { userId: 'student2', userName: '박지훈' }
      ],
      tasks: [
        { id: 'k3', memberId: 'student2', memberName: '박지훈', task: '자료 조사 및 발표 PPT 초안', status: 'todo' }
      ],
      meetings: []
    }
  ];
}

function getAllLocalTeams() {
  const raw = localStorage.getItem(SHARED_TEAMS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setAllLocalTeams(teams) {
  localStorage.setItem(SHARED_TEAMS_KEY, JSON.stringify(teams));
}

function getMyTeams() {
  const session = getSession();
  if (!session) return [];
  let all = getAllLocalTeams();
  if (all.length === 0) {
    all = getDefaultTeams(session);
    setAllLocalTeams(all);
  }
  return all.filter(team => (team.members || []).some(m => m.userId === session.userId));
}

async function saveTeamProject(teamObj) {
  const session = getSession();
  let all = getAllLocalTeams();
  const idx = all.findIndex(t => t.id === teamObj.id);
  if (idx >= 0) {
    all[idx] = teamObj;
  } else {
    all.push(teamObj);
  }
  setAllLocalTeams(all);

  const gasUrl = getGasUrl();
  if (gasUrl && session && session.userId !== 'guest') {
    setSyncStatus('☁️ 팀 프로젝트 서버 동기화 중...');
    try {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveTeam',
          team: teamObj
        })
      });
      setSyncStatus('✅ 팀플 보드 클라우드 동기화 완료');
    } catch (e) {
      setSyncStatus('⚠️ 팀플 서버 동기화 지연 (로컬 저장됨)');
    }
  }
}

async function deleteTeamProject(teamId) {
  const session = getSession();
  let all = getAllLocalTeams().filter(t => t.id !== teamId);
  setAllLocalTeams(all);

  const gasUrl = getGasUrl();
  if (gasUrl && session && session.userId !== 'guest') {
    try {
      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteTeam',
          teamId: teamId
        })
      });
    } catch (e) {}
  }
}

async function syncMyTeamsFromCloud() {
  const session = getSession();
  const gasUrl = getGasUrl();
  if (!session || session.userId === 'guest' || !gasUrl) return getMyTeams();

  try {
    const res = await fetch(`${gasUrl}?action=getTeams&userId=${encodeURIComponent(session.userId)}`);
    const json = await res.json();
    if (json.status === 'ok' && Array.isArray(json.teams)) {
      let all = getAllLocalTeams();
      const serverIds = new Set(json.teams.map(t => t.id));
      all = all.filter(t => !serverIds.has(t.id)).concat(json.teams);
      setAllLocalTeams(all);
      return json.teams;
    }
  } catch (e) {}
  return getMyTeams();
}

async function lookupUserById(targetId) {
  const cleanId = targetId.trim();
  if (!cleanId) return null;

  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetch(`${gasUrl}?action=checkUser&userId=${encodeURIComponent(cleanId)}`);
      const json = await res.json();
      if (json.status === 'ok') {
        return { userId: json.userId, userName: json.userName };
      }
    } catch (e) {}
  }

  const localUsers = getLocalUsers();
  if (localUsers[cleanId]) {
    return { userId: cleanId, userName: localUsers[cleanId].userName };
  }
  return null;
}

async function pullFromCloud() {
  const session = getSession();
  const gasUrl = getGasUrl();
  if (!session || session.userId === 'guest') {
    alert('체험 계정은 로컬 전용 모드입니다. 개인 계정으로 로그인 후 이용해 주세요.');
    return;
  }
  if (!gasUrl) {
    alert('서버가 연결되어 있지 않습니다.');
    return;
  }
  setSyncStatus('☁️ 최신 데이터 불러오는 중...');
  try {
    const res = await fetch(`${gasUrl}?action=fetch&userId=${encodeURIComponent(session.userId)}`);
    const json = await res.json();
    if (json.status === 'ok' && json.data) {
      localStorage.setItem(getUserStorageKey(session.userId), JSON.stringify(json.data));
    }
    await syncMyTeamsFromCloud();
    setSyncStatus('✅ 클라우드 데이터 동기화 완료');
    location.reload();
  } catch (err) {
    alert('데이터 동기화 중 오류가 발생했습니다.');
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

  let statusInitial = '';
  if (session.userId === 'guest') {
    statusInitial = '🧪 체험 계정 모드 (guest) · 테스트용 팀원 ID: student1, student2';
  } else if (gasUrl) {
    statusInitial = `☁️ 온라인 DB 자동 연결됨 · 로그인 계정: ${session.userName} (${session.userId})`;
  } else {
    statusInitial = `💻 로컬 계정 모드 · 로그인 계정: ${session.userName} (${session.userId})`;
  }

  const headerHTML = `
    <div class="nav-container">
      <a href="index.html" class="logo" ondblclick="event.preventDefault(); triggerAdminMode();">🎓 CAMPUS MATE</a>
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

// 패논패(P / NP) 지원 학점 계산 (P/NP는 평점 분모·분자에서 제외, P만 졸업 학점에 합산)
const gradePointMap = {
  'A+': 4.5, 'A0': 4.0, 'B+': 3.5, 'B0': 3.0,
  'C+': 2.5, 'C0': 2.0, 'D+': 1.5, 'D0': 1.0, 'F': 0.0
};

function calculateGPA(grades) {
  let totalCredits = 0;
  let totalPoints = 0;
  grades.forEach(g => {
    if (g.grade === 'P' || g.grade === 'NP') return; // 패논패 과목은 평점 계산에서 제외
    const cr = Number(g.credit) || 0;
    const pt = gradePointMap[g.grade] ?? 0;
    totalCredits += cr;
    totalPoints += cr * pt;
  });
  return totalCredits === 0 ? 0 : (totalPoints / totalCredits);
}

// 교시별 실제 시각 문자열 계산 함수 (예: 1교시 (09:00~10:00))
function formatPeriodTime(periodNum, cfg) {
  const startTotalMin = (Number(cfg.startHour) * 60) + Number(cfg.startMin) + (periodNum - 1) * Number(cfg.periodMinutes);
  const endTotalMin = startTotalMin + Number(cfg.periodMinutes);
  const sh = String(Math.floor(startTotalMin / 60)).padStart(2, '0');
  const sm = String(startTotalMin % 60).padStart(2, '0');
  const eh = String(Math.floor(endTotalMin / 60)).padStart(2, '0');
  const em = String(endTotalMin % 60).padStart(2, '0');
  return `${sh}:${sm}~${eh}:${em}`;
}
