const GAME_TIME = 180;
const MAX_HP = 100;
const GROUND_Y = 0;

const stageInfo = [
  { stage: 1, name: '1단계 · 동네 골목', damage: 3, speed: 4.2, spawn: 1500 },
  { stage: 2, name: '2단계 · 지하철 입구', damage: 5, speed: 5.3, spawn: 1250 },
  { stage: 3, name: '3단계 · 회사 앞 횡단보도', damage: 10, speed: 6.4, spawn: 1050 },
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
  obstacles: [],
  lastTime: 0,
  spawnTimer: 0,
  invincibleTimer: 0,
  passed: 0,
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
  while (logList.children.length > 5) logList.lastChild.remove();
}

function updateHUD() {
  const cfg = getStageConfig();
  timeText.textContent = formatTime(state.elapsed);
  hpText.textContent = `${Math.max(0, Math.round(state.hp))} / 100`;
  hpFill.style.width = `${Math.max(0, state.hp)}%`;
  stageText.textContent = `${state.stage}단계`;
  stageBanner.textContent = cfg.name;
  progressFill.style.width = `${Math.min(100, (state.elapsed / GAME_TIME) * 100)}%`;
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
  state.obstacles.forEach(o => o.el.remove());
  state.obstacles = [];
  state.spawnTimer = 0;
  state.invincibleTimer = 0;
  state.passed = 0;
  state.lastTime = 0;
  hamsterWrap.style.transform = 'translateY(0px)';
  hamsterWrap.classList.remove('hit', 'jumping');
  resultPanel.classList.add('hidden');
  centerMessage.classList.remove('hidden');
  centerMessage.querySelector('h2').textContent = '햄찌 출근 준비 완료!';
  centerMessage.querySelector('p').textContent = '스페이스/클릭/터치로 점프하세요. 공중에서 한 번 더 누르면 더블점프가 됩니다.';
  startButton.textContent = '출근 시작';
  logList.innerHTML = '<li>햄찌가 커피와 휴대폰을 챙겼습니다.</li>';
  updateHUD();
}

function startGame() {
  resetGame();
  state.running = true;
  centerMessage.classList.add('hidden');
  addLog('출근 시작! 장애물은 점프와 더블점프로 피하세요.');
  requestAnimationFrame(loop);
}

function jump() {
  if (!state.running || state.gameOver) return;
  if (state.jumpCount >= state.maxJumps) return;

  // 첫 점프는 안정적으로 길게, 더블점프는 가로 회피 시간을 벌어주는 보정용입니다.
  state.velocityY = state.jumpCount === 0 ? 15.8 : 13.2;
  state.jumpCount += 1;
  hamsterWrap.classList.add('jumping');

  if (state.jumpCount === 2) {
    addLog('더블점프! 햄찌가 공중에서 한 번 더 폴짝 뛰었습니다.');
  }
}

function createObstacle() {
  const types = [
    { label: '☕', className: 'coffee', width: 46, height: 46 },
    { label: '💼', className: 'bag', width: 50, height: 42 },
    { label: '📱', className: 'phone-obstacle', width: 42, height: 50 },
    { label: '🧀', className: 'cheese', width: 48, height: 40 },
  ];

  const type = types[Math.floor(Math.random() * types.length)];
  const el = document.createElement('div');
  el.className = `obstacle ${type.className}`;
  el.textContent = type.label;
  obstacleLayer.appendChild(el);

  const startX = stage.clientWidth + 80;
  const obstacle = {
    el,
    x: startX,
    y: 0,
    width: type.width,
    height: type.height,
    passed: false,
  };
  state.obstacles.push(obstacle);
}

function getHamsterBox() {
  const rect = hamsterWrap.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();

  // 실제 캐릭터보다 훨씬 작은 안전 판정. 귀/컵/휴대폰 장식은 맞아도 피격되지 않게 제외합니다.
  return {
    left: rect.left - stageRect.left + rect.width * 0.34,
    right: rect.left - stageRect.left + rect.width * 0.66,
    top: rect.top - stageRect.top + rect.height * 0.42,
    bottom: rect.top - stageRect.top + rect.height * 0.83,
  };
}

function getObstacleBox(obstacle) {
  const rect = obstacle.el.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();

  // 장애물도 중앙부만 판정해서 점프 타이밍 게임의 억울함을 줄입니다.
  return {
    left: rect.left - stageRect.left + rect.width * 0.30,
    right: rect.left - stageRect.left + rect.width * 0.70,
    top: rect.top - stageRect.top + rect.height * 0.30,
    bottom: rect.top - stageRect.top + rect.height * 0.86,
  };
}

function isColliding(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function takeDamage() {
  if (state.invincibleTimer > 0) return;

  const cfg = getStageConfig();
  state.hp -= cfg.damage;
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

function updateStage() {
  const nextStage = state.elapsed < 60 ? 1 : state.elapsed < 120 ? 2 : 3;
  if (nextStage !== state.stage) {
    state.stage = nextStage;
    addLog(`${state.stage}단계 진입! 장애물이 더 빨라집니다.`);
  }
}

function updatePhysics(dt) {
  const gravity = 0.72;
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

function updateObstacles(dt) {
  const cfg = getStageConfig();
  state.spawnTimer += dt * 1000;

  if (state.spawnTimer >= cfg.spawn) {
    state.spawnTimer = 0;
    createObstacle();
  }

  state.obstacles.forEach((obstacle) => {
    obstacle.x -= cfg.speed * dt * 60;
    obstacle.el.style.transform = `translateX(${obstacle.x}px)`;

    if (!obstacle.passed && obstacle.x < 80) {
      obstacle.passed = true;
      state.passed += 1;
    }
  });

  const hamsterBox = getHamsterBox();
  state.obstacles.forEach((obstacle) => {
    if (isColliding(hamsterBox, getObstacleBox(obstacle))) takeDamage();
  });

  state.obstacles = state.obstacles.filter((obstacle) => {
    if (obstacle.x < -120) {
      obstacle.el.remove();
      return false;
    }
    return true;
  });
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
  updateObstacles(dt);
  updateHUD();

  if (state.elapsed >= GAME_TIME) {
    endGame(true);
    return;
  }

  requestAnimationFrame(loop);
}

function endGame(success) {
  state.gameOver = true;
  state.running = false;
  updateHUD();
  resultPanel.classList.remove('hidden');

  if (success) {
    endingTitle.textContent = '출근 성공!';
    endingText.textContent = `햄찌가 3분 출근길을 버텼습니다. 남은 HP는 ${Math.max(0, Math.round(state.hp))}, 피한 장애물은 ${state.passed}개입니다.`;
  } else {
    endingTitle.textContent = '출근 실패!';
    endingText.textContent = `햄찌가 출근길에서 녹초가 됐습니다. ${state.stage}단계 피해량이 높으니 더블점프 타이밍을 활용해보세요.`;
  }
}

function handleInput(event) {
  if (event.type === 'keydown' && event.code !== 'Space') return;
  if (event.type === 'keydown') event.preventDefault();

  if (!state.running && !state.gameOver && centerMessage && !centerMessage.classList.contains('hidden')) {
    return;
  }

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
