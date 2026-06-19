const GAME_TIME = 180;
const MAX_HP = 100;
const GROUND_Y = 0;
const FATIGUE_DAMAGE = 1;
const TUTORIAL_SECONDS = 5;
const PLAY_LOG_KEY = 'hamzziPlayLogs';
const BEST_RECORD_KEY = 'hamzziBestRecord';

const stageInfo = [
  { stage: 1, name: '1단계 · 집 앞 골목', damage: 3, speed: 3.7, spawn: 1850, fatigueInterval: 10, theme: 'home' },
  { stage: 2, name: '2단계 · 버스 정류장', damage: 5, speed: 4.6, spawn: 1600, fatigueInterval: 8, theme: 'bus' },
  { stage: 3, name: '3단계 · 햄찌컴퍼니 앞', damage: 10, speed: 5.4, spawn: 1380, fatigueInterval: 5, theme: 'office' },
];

const objectTypes = [
  { kind: 'obstacle', label: '🚦', className: 'traffic-light', width: 42, height: 58, weight: 28, name: '신호등' },
  { kind: 'obstacle', label: '🚗', className: 'car', width: 60, height: 42, weight: 24, name: '자동차' },
  { kind: 'obstacle', label: '🛴', className: 'kickboard', width: 46, height: 42, weight: 24, name: '킥보드' },
  { kind: 'obstacle', label: '💼', className: 'bag', width: 44, height: 38, weight: 16, name: '서류가방' },
  { kind: 'obstacle', label: '🚧', className: 'tall-barrier', width: 48, height: 82, weight: 10, name: '공사 표지판' },
  { kind: 'item', label: '☕', className: 'coffee-item', width: 42, height: 42, weight: 5, name: '커피' },
];

const state = {
  running: false,
  paused: false,
  gameOver: false,
  hp: MAX_HP,
  elapsed: 0,
  stage: 1,
  y: GROUND_Y,
  velocityY: 0,
  jumpCount: 0,
  maxJumps: 2,
  objects: [],
  lastTime: 0,
  spawnTimer: 0,
  nextSpawnDelay: 1600,
  invincibleTimer: 0,
  fatigueTimer: 0,
  passed: 0,
  coffeeCount: 0,
  hitCount: 0,
  playerName: '햄찌',
};

const timeText = document.getElementById('timeText');
const hpText = document.getElementById('hpText');
const hpFill = document.getElementById('hpFill');
const stageText = document.getElementById('stageText');
const progressFill = document.getElementById('progressFill');
const stageBanner = document.getElementById('stageBanner');
const hamsterWrap = document.getElementById('hamsterWrap');
const obstacleLayer = document.getElementById('obstacleLayer');
const hitFlash = document.getElementById('hitFlash');
const centerMessage = document.getElementById('centerMessage');
const startButton = document.getElementById('startButton');
const nicknameInput = document.getElementById('nicknameInput');
const pauseButton = document.getElementById('pauseButton');
const pauseMessage = document.getElementById('pauseMessage');
const resumeButton = document.getElementById('resumeButton');
const resultPanel = document.getElementById('resultPanel');
const endingTitle = document.getElementById('endingTitle');
const endingText = document.getElementById('endingText');
const restartButton = document.getElementById('restartButton');
const logList = document.getElementById('logList');
const recordList = document.getElementById('recordList');
const stage = document.getElementById('stage');

function getStageConfig() {
  return stageInfo[state.stage - 1];
}

function getRandomSpawnDelay(cfg) {
  const minDelay = Math.max(1050, cfg.spawn * 0.78);
  const maxDelay = cfg.spawn * 1.42;
  return minDelay + Math.random() * (maxDelay - minDelay);
}

function formatTime(seconds) {
  const remain = Math.max(0, Math.ceil(GAME_TIME - seconds));
  const mm = String(Math.floor(remain / 60)).padStart(2, '0');
  const ss = String(remain % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function sanitizeName(value) {
  const name = String(value || '').trim().replace(/[<>]/g, '').slice(0, 10);
  return name || '햄찌';
}

function addLog(text) {
  const li = document.createElement('li');
  li.textContent = text;
  logList.prepend(li);
  while (logList.children.length > 7) logList.lastChild.remove();
}

function updateHUD() {
  const cfg = getStageConfig();
  timeText.textContent = formatTime(state.elapsed);
  hpText.textContent = `${Math.max(0, Math.round(state.hp))} / 100`;
  hpFill.style.width = `${Math.max(0, Math.min(100, state.hp))}%`;
  stageText.textContent = `${state.stage}단계`;
  stageBanner.textContent = cfg.name;
  progressFill.style.width = `${Math.min(100, (state.elapsed / GAME_TIME) * 100)}%`;
  stage.dataset.theme = cfg.theme;
}

function resetGame() {
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.hp = MAX_HP;
  state.elapsed = 0;
  state.stage = 1;
  state.y = GROUND_Y;
  state.velocityY = 0;
  state.jumpCount = 0;
  state.objects.forEach(o => o.el.remove());
  state.objects = [];
  state.spawnTimer = 0;
  state.nextSpawnDelay = getRandomSpawnDelay(stageInfo[0]);
  state.invincibleTimer = 0;
  state.fatigueTimer = 0;
  state.passed = 0;
  state.coffeeCount = 0;
  state.hitCount = 0;
  state.lastTime = 0;
  hamsterWrap.style.transform = 'translateY(0px)';
  hamsterWrap.classList.remove('hit', 'jumping');
  resultPanel.classList.add('hidden');
  centerMessage.classList.remove('hidden');
  centerMessage.querySelector('h2').textContent = '햄찌 출근 준비 완료!';
  centerMessage.querySelector('p').textContent = '스페이스/클릭/터치로 점프하세요. 공중에서 한 번 더 누르면 더블점프가 됩니다.';
  startButton.textContent = '출근 시작';
  startButton.disabled = false;
  if (pauseButton) pauseButton.classList.add('hidden');
  if (pauseMessage) pauseMessage.classList.add('hidden');
  if (nicknameInput) nicknameInput.disabled = false;
  logList.innerHTML = '<li>햄찌가 휴대폰과 사원증을 챙겼습니다.</li>';
  renderPlayLogs();
  updateHUD();
}

function startGame() {
  state.playerName = sanitizeName(nicknameInput ? nicknameInput.value : '햄찌');
  resetGame();
  state.playerName = sanitizeName(nicknameInput ? nicknameInput.value : state.playerName);
  startButton.disabled = true;
  if (nicknameInput) nicknameInput.disabled = true;
  let count = TUTORIAL_SECONDS;
  centerMessage.querySelector('h2').textContent = `${state.playerName}님, 출근 준비!`;
  centerMessage.querySelector('p').textContent = `장애물은 피하고, 커피는 획득하세요. ${count}초 후 출근이 시작됩니다.`;
  startButton.textContent = '준비 중...';

  const countdown = setInterval(() => {
    count -= 1;
    if (count <= 0) {
      clearInterval(countdown);
      beginRun();
      return;
    }
    centerMessage.querySelector('p').textContent = `장애물은 피하고, 커피는 획득하세요. ${count}초 후 출근이 시작됩니다.`;
  }, 1000);
}

function beginRun() {
  state.running = true;
  state.paused = false;
  state.lastTime = 0;
  centerMessage.classList.add('hidden');
  if (pauseButton) pauseButton.classList.remove('hidden');
  addLog(`${state.playerName}님의 출근 시작! 신호등, 자동차, 킥보드는 점프로 피하세요.`);
  requestAnimationFrame(loop);
}

function jump() {
  if (!state.running || state.paused || state.gameOver) return;
  if (state.jumpCount >= state.maxJumps) return;

  state.velocityY = state.jumpCount === 0 ? 13.8 : 12.4;
  state.jumpCount += 1;
  hamsterWrap.classList.add('jumping');

  if (state.jumpCount === 2) {
    addLog('더블점프! 햄찌가 공중에서 한 번 더 폴짝 뛰었습니다.');
  }
}

function pickWeightedType() {
  const total = objectTypes.reduce((sum, type) => sum + type.weight, 0);
  let random = Math.random() * total;
  for (const type of objectTypes) {
    random -= type.weight;
    if (random <= 0) return type;
  }
  return objectTypes[0];
}

function createObject() {
  const type = pickWeightedType();
  const el = document.createElement('div');
  el.className = `obstacle ${type.className} ${type.kind}`;
  el.textContent = type.label;
  el.setAttribute('aria-label', type.name);
  el.style.width = `${type.width}px`;
  el.style.height = `${type.height}px`;
  obstacleLayer.appendChild(el);

  const startX = stage.clientWidth + 80;
  const object = {
    el,
    x: startX,
    y: 0,
    width: type.width,
    height: type.height,
    kind: type.kind,
    name: type.name,
    passed: false,
    collected: false,
    resolved: false,
  };
  state.objects.push(object);
}

function getHamsterBox() {
  const rect = hamsterWrap.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();

  return {
    left: rect.left - stageRect.left + rect.width * 0.24,
    right: rect.left - stageRect.left + rect.width * 0.70,
    top: rect.top - stageRect.top + rect.height * 0.34,
    bottom: rect.top - stageRect.top + rect.height * 0.88,
  };
}

function getObjectBox(object) {
  const rect = object.el.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const isItem = object.kind === 'item';
  const xPadding = isItem ? 0.18 : 0.26;
  const yTopPadding = isItem ? 0.18 : 0.24;
  const yBottomPadding = isItem ? 0.12 : 0.16;

  return {
    left: rect.left - stageRect.left + rect.width * xPadding,
    right: rect.left - stageRect.left + rect.width * (1 - xPadding),
    top: rect.top - stageRect.top + rect.height * yTopPadding,
    bottom: rect.top - stageRect.top + rect.height * (1 - yBottomPadding),
  };
}

function isColliding(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function resolveObstacle(object) {
  if (object.resolved) return;
  object.resolved = true;
  takeDamage(object);
  object.el.classList.add('hit-object');
  setTimeout(() => object.el.remove(), 120);
}

function takeDamage(object) {
  if (state.invincibleTimer > 0) return;

  const cfg = getStageConfig();
  state.hp -= cfg.damage;
  state.hitCount += 1;
  state.invincibleTimer = 800;
  hamsterWrap.classList.add('hit');
  hitFlash.classList.remove('show');
  void hitFlash.offsetWidth;
  hitFlash.classList.add('show');
  addLog(`${object ? object.name : '장애물'} 충돌! ${state.stage}단계 피해 HP -${cfg.damage}`);

  setTimeout(() => hamsterWrap.classList.remove('hit'), 450);

  if (state.hp <= 0) {
    endGame(false);
  }
}

function collectCoffee(object) {
  if (object.collected) return;
  object.collected = true;
  state.coffeeCount += 1;
  state.hp = Math.min(MAX_HP, state.hp + 5);
  object.el.classList.add('collected');
  addLog('커피 획득! HP +5');
  setTimeout(() => object.el.remove(), 160);
}

function applyFatigue(dt) {
  const cfg = getStageConfig();
  state.fatigueTimer += dt;
  while (state.fatigueTimer >= cfg.fatigueInterval) {
    state.fatigueTimer -= cfg.fatigueInterval;
    state.hp -= FATIGUE_DAMAGE;
    addLog(`${state.stage}단계 출근 피로 누적! HP -1`);
    if (state.hp <= 0) endGame(false);
  }
}

function updateStage() {
  const nextStage = state.elapsed < 60 ? 1 : state.elapsed < 120 ? 2 : 3;
  if (nextStage !== state.stage) {
    state.stage = nextStage;
    state.fatigueTimer = 0;
    state.nextSpawnDelay = getRandomSpawnDelay(getStageConfig());
    const cfg = getStageConfig();
    if (state.stage === 3) {
      addLog('3단계 진입! 햄찌컴퍼니가 가까워져 누적 피로가 5초마다 증가합니다.');
    } else {
      addLog(`${state.stage}단계 진입! 장애물이 더 빨라지고 피로가 ${cfg.fatigueInterval}초마다 쌓입니다.`);
    }
  }
}

function updatePhysics(dt) {
  const gravity = 0.6;
  state.velocityY -= gravity * dt * 60;
  state.y += state.velocityY * dt * 60;

  if (state.y <= GROUND_Y) {
    state.y = GROUND_Y;
    state.velocityY = 0;
    state.jumpCount = 0;
    hamsterWrap.classList.remove('jumping');
  }

  hamsterWrap.style.transform = `translateY(${-state.y}px)`;
}

function updateObjects(dt) {
  const cfg = getStageConfig();
  state.spawnTimer += dt * 1000;

  if (state.spawnTimer >= state.nextSpawnDelay) {
    state.spawnTimer = 0;
    state.nextSpawnDelay = getRandomSpawnDelay(cfg);
    createObject();
  }

  state.objects.forEach((object) => {
    object.x -= cfg.speed * dt * 60;
    object.el.style.transform = `translateX(${object.x}px)`;

    if (!object.passed && object.x < 80) {
      object.passed = true;
      if (object.kind === 'obstacle') state.passed += 1;
    }
  });

  const hamsterBox = getHamsterBox();
  state.objects.forEach((object) => {
    if (object.collected || object.resolved) return;
    if (!isColliding(hamsterBox, getObjectBox(object))) return;

    if (object.kind === 'item') {
      collectCoffee(object);
    } else {
      resolveObstacle(object);
    }
  });

  state.objects = state.objects.filter((object) => {
    if (object.collected || object.resolved) return false;
    if (object.x < -120) {
      object.el.remove();
      return false;
    }
    return true;
  });
}

function getRank(success) {
  if (!success || state.hp <= 0) return 'F';
  const hp = Math.round(state.hp);
  if (hp >= 95) return 'S';
  if (hp >= 80) return 'A';
  if (hp >= 60) return 'B';
  if (hp >= 40) return 'C';
  return 'D';
}

function readBestRecord() {
  try {
    return JSON.parse(localStorage.getItem(BEST_RECORD_KEY)) || null;
  } catch (error) {
    return null;
  }
}

function readPlayLogs() {
  try {
    const logs = JSON.parse(localStorage.getItem(PLAY_LOG_KEY));
    return Array.isArray(logs) ? logs : [];
  } catch (error) {
    return [];
  }
}

function savePlayLog(record) {
  const logs = readPlayLogs();
  logs.unshift(record);
  localStorage.setItem(PLAY_LOG_KEY, JSON.stringify(logs.slice(0, 10)));
}

function saveBestRecord(record) {
  const rankScore = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
  const best = readBestRecord();
  const isBetter = !best ||
    rankScore[record.rank] > rankScore[best.rank] ||
    (rankScore[record.rank] === rankScore[best.rank] && record.hp > best.hp) ||
    (rankScore[record.rank] === rankScore[best.rank] && record.hp === best.hp && record.passed > best.passed);

  if (isBetter) {
    localStorage.setItem(BEST_RECORD_KEY, JSON.stringify(record));
    return { best: record, updated: true };
  }

  return { best, updated: false };
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

function renderPlayLogs() {
  if (!recordList) return;
  const logs = readPlayLogs();
  if (!logs.length) {
    recordList.innerHTML = '<li>아직 저장된 기록이 없습니다.</li>';
    return;
  }
  recordList.innerHTML = logs.slice(0, 5).map((log) => (
    `<li><strong>${log.name}</strong> · ${log.rank}등급 · HP ${log.hp} · 회피 ${log.passed}개 · ${formatDate(log.date)}</li>`
  )).join('');
}

function loop(timestamp) {
  if (!state.running || state.paused || state.gameOver) return;
  if (!state.lastTime) state.lastTime = timestamp;

  const dt = Math.min(0.033, (timestamp - state.lastTime) / 1000);
  state.lastTime = timestamp;

  state.elapsed += dt;
  state.invincibleTimer = Math.max(0, state.invincibleTimer - dt * 1000);
  updateStage();
  updatePhysics(dt);
  updateObjects(dt);
  applyFatigue(dt);
  updateHUD();

  if (state.elapsed >= GAME_TIME) {
    endGame(true);
    return;
  }

  requestAnimationFrame(loop);
}

function endGame(success) {
  if (state.gameOver) return;
  state.gameOver = true;
  state.running = false;
  if (nicknameInput) nicknameInput.disabled = false;
  if (pauseButton) pauseButton.classList.add('hidden');
  if (pauseMessage) pauseMessage.classList.add('hidden');
  updateHUD();
  resultPanel.classList.remove('hidden');

  const rank = getRank(success);
  const finalRecord = {
    name: state.playerName,
    rank,
    success,
    hp: Math.max(0, Math.round(state.hp)),
    passed: state.passed,
    coffee: state.coffeeCount,
    hits: state.hitCount,
    time: Math.floor(state.elapsed),
    date: new Date().toISOString(),
  };
  savePlayLog(finalRecord);
  const record = saveBestRecord(finalRecord);
  renderPlayLogs();

  const bestText = record.best
    ? `최고 기록: ${record.best.name} / ${record.best.rank}등급 / HP ${record.best.hp} / 회피 ${record.best.passed}개`
    : '최고 기록: 아직 없음';
  const newRecordText = record.updated ? '<br><strong class="new-record">NEW BEST!</strong>' : '';

  if (success) {
    endingTitle.textContent = `출근 성공! ${rank}등급`;
    endingText.innerHTML = `${state.playerName}님의 햄찌가 3분 출근길을 버텼습니다.<br>남은 HP: ${finalRecord.hp} / 회피 장애물: ${state.passed}개<br>커피 획득: ${state.coffeeCount}잔 / 피격 횟수: ${state.hitCount}회<br>${bestText}${newRecordText}`;
  } else {
    endingTitle.textContent = `출근 실패! ${rank}등급`;
    endingText.innerHTML = `${state.playerName}님의 햄찌가 출근길에서 녹초가 됐습니다.<br>버틴 시간: ${Math.floor(state.elapsed)}초 / 회피 장애물: ${state.passed}개<br>커피 획득: ${state.coffeeCount}잔 / 피격 횟수: ${state.hitCount}회<br>${bestText}${newRecordText}`;
  }
}

function togglePause() {
  if (!state.running || state.gameOver) return;

  state.paused = !state.paused;
  if (state.paused) {
    state.lastTime = 0;
    if (pauseMessage) pauseMessage.classList.remove('hidden');
    if (pauseButton) pauseButton.textContent = '계속하기';
    addLog('일시정지! 햄찌가 잠깐 숨을 고릅니다.');
  } else {
    if (pauseMessage) pauseMessage.classList.add('hidden');
    if (pauseButton) pauseButton.textContent = '일시정지';
    addLog('다시 출근 시작!');
    requestAnimationFrame(loop);
  }
}

function handleInput(event) {
  if (event.type === 'keydown' && event.code === 'KeyP') {
    event.preventDefault();
    togglePause();
    return;
  }

  if (event.type === 'keydown' && event.code !== 'Space') return;
  if (event.type === 'keydown') event.preventDefault();

  if (!state.running || state.paused || state.gameOver) return;
  jump();
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
if (pauseButton) pauseButton.addEventListener('click', togglePause);
if (resumeButton) resumeButton.addEventListener('click', togglePause);
document.addEventListener('keydown', handleInput);
stage.addEventListener('pointerdown', (event) => {
  if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT') return;
  if (state.paused) return;
  jump();
});

resetGame();
