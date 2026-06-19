const GAME_TIME = 180;
const MAX_HP = 100;
const GROUND_Y = 0;
const FATIGUE_INTERVAL = 10;
const FATIGUE_DAMAGE = 1;
const TUTORIAL_SECONDS = 5;

const stageInfo = [
  { stage: 1, name: '1단계 · 집 앞 골목', damage: 3, speed: 3.7, spawn: 1850, theme: 'home' },
  { stage: 2, name: '2단계 · 버스 정류장', damage: 5, speed: 4.6, spawn: 1600, theme: 'bus' },
  { stage: 3, name: '3단계 · 햄찌컴퍼니 앞', damage: 10, speed: 5.4, spawn: 1380, theme: 'office' },
];

const objectTypes = [
  { kind: 'obstacle', label: '🚦', className: 'traffic-light', width: 42, height: 58, weight: 28, name: '신호등' },
  { kind: 'obstacle', label: '🚗', className: 'car', width: 60, height: 42, weight: 24, name: '자동차' },
  { kind: 'obstacle', label: '🛴', className: 'kickboard', width: 46, height: 42, weight: 24, name: '킥보드' },
  { kind: 'obstacle', label: '💼', className: 'bag', width: 44, height: 38, weight: 16, name: '서류가방' },
  { kind: 'item', label: '☕', className: 'coffee-item', width: 42, height: 42, weight: 8, name: '커피' },
];

const state = {
  running: false,
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
  invincibleTimer: 0,
  fatigueTimer: 0,
  passed: 0,
  coffeeCount: 0,
  hitCount: 0,
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
const resultPanel = document.getElementById('resultPanel');
const endingTitle = document.getElementById('endingTitle');
const endingText = document.getElementById('endingText');
const restartButton = document.getElementById('restartButton');
const logList = document.getElementById('logList');
const stage = document.getElementById('stage');

function getStageConfig() {
  return stageInfo[state.stage - 1];
}

function formatTime(seconds) {
  const remain = Math.max(0, Math.ceil(GAME_TIME - seconds));
  const mm = String(Math.floor(remain / 60)).padStart(2, '0');
  const ss = String(remain % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function addLog(text) {
  const li = document.createElement('li');
  li.textContent = text;
  logList.prepend(li);
  while (logList.children.length > 6) logList.lastChild.remove();
}

function updateHUD() {
  const cfg = getStageConfig();
  timeText.textContent = formatTime(state.elapsed);
  hpText.textContent = `${Math.max(0, Math.round(state.hp))} / 100`;
  hpFill.style.width = `${Math.max(0, state.hp)}%`;
  stageText.textContent = `${state.stage}단계`;
  stageBanner.textContent = cfg.name;
  progressFill.style.width = `${Math.min(100, (state.elapsed / GAME_TIME) * 100)}%`;
  stage.dataset.theme = cfg.theme;
}

function resetGame() {
  state.running = false;
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
  logList.innerHTML = '<li>햄찌가 휴대폰과 사원증을 챙겼습니다.</li>';
  updateHUD();
}

function startGame() {
  resetGame();
  startButton.disabled = true;
  let count = TUTORIAL_SECONDS;
  centerMessage.querySelector('h2').textContent = '튜토리얼';
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
  centerMessage.classList.add('hidden');
  addLog('출근 시작! 신호등, 자동차, 킥보드는 점프로 피하세요.');
  requestAnimationFrame(loop);
}

function jump() {
  if (!state.running || state.gameOver) return;
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
  };
  state.objects.push(object);
}

function getHamsterBox() {
  const rect = hamsterWrap.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();

  return {
    left: rect.left - stageRect.left + rect.width * 0.45,
    right: rect.left - stageRect.left + rect.width * 0.56,
    top: rect.top - stageRect.top + rect.height * 0.58,
    bottom: rect.top - stageRect.top + rect.height * 0.76,
  };
}

function getObjectBox(object) {
  const rect = object.el.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const padding = object.kind === 'item' ? 0.22 : 0.42;

  return {
    left: rect.left - stageRect.left + rect.width * padding,
    right: rect.left - stageRect.left + rect.width * (1 - padding),
    top: rect.top - stageRect.top + rect.height * (object.kind === 'item' ? 0.18 : 0.48),
    bottom: rect.top - stageRect.top + rect.height * (object.kind === 'item' ? 0.88 : 0.78),
  };
}

function isColliding(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function takeDamage() {
  if (state.invincibleTimer > 0) return;

  const cfg = getStageConfig();
  state.hp -= cfg.damage;
  state.hitCount += 1;
  state.invincibleTimer = 900;
  hamsterWrap.classList.add('hit');
  hitFlash.classList.remove('show');
  void hitFlash.offsetWidth;
  hitFlash.classList.add('show');
  addLog(`${state.stage}단계 장애물 충돌! HP -${cfg.damage}`);

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
  state.fatigueTimer += dt;
  if (state.fatigueTimer >= FATIGUE_INTERVAL) {
    state.fatigueTimer -= FATIGUE_INTERVAL;
    state.hp -= FATIGUE_DAMAGE;
    addLog('출근 피로 누적! HP -1');
    if (state.hp <= 0) endGame(false);
  }
}

function updateStage() {
  const nextStage = state.elapsed < 60 ? 1 : state.elapsed < 120 ? 2 : 3;
  if (nextStage !== state.stage) {
    state.stage = nextStage;
    addLog(`${state.stage}단계 진입! 장애물이 더 빨라집니다.`);
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

  if (state.spawnTimer >= cfg.spawn) {
    state.spawnTimer = 0;
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
    if (object.collected) return;
    if (!isColliding(hamsterBox, getObjectBox(object))) return;

    if (object.kind === 'item') {
      collectCoffee(object);
    } else {
      takeDamage();
    }
  });

  state.objects = state.objects.filter((object) => {
    if (object.collected) return false;
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
    return JSON.parse(localStorage.getItem('hamzziBestRecord')) || null;
  } catch (error) {
    return null;
  }
}

function saveBestRecord(rank, success) {
  const record = {
    rank,
    success,
    hp: Math.max(0, Math.round(state.hp)),
    passed: state.passed,
    coffee: state.coffeeCount,
    hits: state.hitCount,
    date: new Date().toISOString(),
  };

  const rankScore = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
  const best = readBestRecord();
  const isBetter = !best ||
    rankScore[record.rank] > rankScore[best.rank] ||
    (rankScore[record.rank] === rankScore[best.rank] && record.hp > best.hp) ||
    (rankScore[record.rank] === rankScore[best.rank] && record.hp === best.hp && record.passed > best.passed);

  if (isBetter) {
    localStorage.setItem('hamzziBestRecord', JSON.stringify(record));
    return { best: record, updated: true };
  }

  return { best, updated: false };
}

function loop(timestamp) {
  if (!state.running || state.gameOver) return;
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
  updateHUD();
  resultPanel.classList.remove('hidden');

  const rank = getRank(success);
  const record = saveBestRecord(rank, success);
  const bestText = record.best
    ? `최고 기록: ${record.best.rank}등급 / HP ${record.best.hp} / 회피 ${record.best.passed}개`
    : '최고 기록: 아직 없음';
  const newRecordText = record.updated ? '<br><strong class="new-record">NEW BEST!</strong>' : '';

  if (success) {
    endingTitle.textContent = `출근 성공! ${rank}등급`;
    endingText.innerHTML = `햄찌가 3분 출근길을 버텼습니다.<br>남은 HP: ${Math.max(0, Math.round(state.hp))} / 회피 장애물: ${state.passed}개<br>커피 획득: ${state.coffeeCount}잔 / 피격 횟수: ${state.hitCount}회<br>${bestText}${newRecordText}`;
  } else {
    endingTitle.textContent = `출근 실패! ${rank}등급`;
    endingText.innerHTML = `햄찌가 출근길에서 녹초가 됐습니다.<br>버틴 시간: ${Math.floor(state.elapsed)}초 / 회피 장애물: ${state.passed}개<br>커피 획득: ${state.coffeeCount}잔 / 피격 횟수: ${state.hitCount}회<br>${bestText}${newRecordText}`;
  }
}

function handleInput(event) {
  if (event.type === 'keydown' && event.code !== 'Space') return;
  if (event.type === 'keydown') event.preventDefault();

  if (!state.running || state.gameOver) return;
  jump();
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
document.addEventListener('keydown', handleInput);
stage.addEventListener('pointerdown', (event) => {
  if (event.target.tagName === 'BUTTON') return;
  jump();
});

resetGame();
