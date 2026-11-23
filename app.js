// CAMPUS MATE 통합 데이터 및 Google Apps Script 온라인 동기화 관리
const STORAGE_KEY = 'campus_mate_data_v2';
const GAS_CONFIG_KEY = 'campus_mate_gas_config';

// ★ 구글 앱스 스크립트 배포 후 발급받은 웹 앱 URL을 아래 따옴표 안에 넣으면 모든 기기에서 기본으로 연결됩니다!
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwz2-ac7qRFPjLPnLXcrBi1SmKLD9QF838AuhBV3OyZtnkCXn7TSdauua0ZKFCIVy78QA/exec';

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
    { id: 'k1', member: '이다은', task: '메인 UI 및 스토리보드 설계', status: 'done' },
    { id: 'k2', member: '김민수', task: '캘린더 및 타이머 JS 구현', status: 'doing' },
    { id: 'k3', member: '박지훈', task: '최종 발표 PPT 제작', status: 'todo' }
  ],
  meetings: [
    { id: 'm1', date: '2026-11-20', members: '이다은, 김민수, 박지훈', note: '주제를 CAMPUS MATE로 확정하고 6개 페이지 역할 분담 완료.' }
  ],
  timetable: [
    { day: '월', period: 2, subject: '웹프로그래밍', room: '공학관 302' },
    { day: '수', period: 2, subject: '웹프로그래밍', room: '공학관 302' },
    { day: '화', period: 4, subject: '컴퓨터개론', room: '정보관 105' }
  ]
};

function getGasConfig() {
  const raw = localStorage.getItem(GAS_CONFIG_KEY);
  const saved = raw ? JSON.parse(raw) : {};
  return {
    url: saved.url || DEFAULT_GAS_URL,
    userId: saved.userId || '20250890'
  };
}

function saveGasConfig(url, userId) {
  localStorage.setItem(GAS_CONFIG_KEY, JSON.stringify({ url: url.trim(), userId: userId.trim() || '20250890' }));
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return JSON.parse(JSON.stringify(defaultData));
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

// 로컬 저장 + 구글 앱스 스크립트(구글 시트) 온라인 비동기 동기화
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const cfg = getGasConfig();
  if (cfg.url) {
    setSyncStatus('☁️ 구글 시트 동기화 중...');
    fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ userId: cfg.userId, data: data })
    })
      .then(res => res.json())
      .then(() => setSyncStatus(`✅ 구글 시트 온라인 저장 완료 (ID: ${cfg.userId})`))
      .catch(() => setSyncStatus('⚠️ 온라인 동기화 실패 (로컬 저장됨)'));
  }
}

// 구글 시트에서 온라인 데이터 불러오기
async function pullFromCloud(onComplete) {
  const cfg = getGasConfig();
  if (!cfg.url) {
    alert('먼저 [시간표·백업] 페이지에서 Google Apps Script 웹 앱 URL을 등록해 주세요.');
    return;
  }
  setSyncStatus('☁️ 구글 시트에서 데이터 불러오는 중...');
  try {
    const res = await fetch(`${cfg.url}?userId=${encodeURIComponent(cfg.userId)}`);
    const json = await res.json();
    if (json.status === 'ok' && json.data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
      setSyncStatus(`✅ 클라우드 데이터 불러오기 완료 (ID: ${cfg.userId})`);
      if (onComplete) onComplete();
      else location.reload();
    } else {
      setSyncStatus(`ℹ️ 구글 시트에 저장된 [${cfg.userId}] 데이터가 아직 없습니다.`);
      alert(`해당 ID(${cfg.userId})로 저장된 클라우드 데이터가 없습니다. 데이터를 수정하면 자동으로 생성됩니다.`);
    }
  } catch (err) {
    setSyncStatus('⚠️ 클라우드 불러오기 오류');
    alert('구글 앱스 스크립트 연결에 실패했습니다. 웹 앱 URL과 액세스 권한(모든 사용자)을 확인해 주세요.');
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
  const data = loadData();
  const cfg = getGasConfig();
  if (data.darkMode) document.body.classList.add('dark-mode');

  const statusInitial = cfg.url
    ? `☁️ 온라인 DB 연결됨 (사용자 ID: ${cfg.userId})`
    : `💻 로컬 저장 모드 (구글 시트 연동은 [시간표·백업]에서 설정)`;

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
      </div>
    </div>
    <div class="sync-bar">
      <div class="sync-inner">
        <span id="syncStatusText">${statusInitial}</span>
        <div style="display:flex; gap:6px; align-items:center;">
          <input type="text" id="quickUserIdInput" value="${cfg.userId}" placeholder="학번/닉네임" style="padding:3px 8px; font-size:0.8rem; width:110px;" />
          <button class="btn btn-outline btn-sm" style="padding:3px 8px;" onclick="changeQuickUserId()">ID 변경</button>
          <button class="btn btn-sm" style="padding:3px 9px;" onclick="pullFromCloud()">☁️ 클라우드 동기화</button>
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

function changeQuickUserId() {
  const newId = document.getElementById('quickUserIdInput').value.trim();
  if (!newId) return;
  const cfg = getGasConfig();
  saveGasConfig(cfg.url, newId);
  if (cfg.url) {
    pullFromCloud();
  } else {
    setSyncStatus(`💻 사용자 ID 변경됨: ${newId} (구글 시트 URL 연결 시 온라인 동기화 가능)`);
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
