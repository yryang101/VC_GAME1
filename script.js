const GAME_DURATION = 180;
const STAGE_LENGTH = 60;
const JUMP_TIME = 580;
const PLAYER_X = 128;
const HIT_RANGE = 48;

const stageConfigs = [
  {
    name: '1단계 · 동네 골목',
    speed: 230,
    spawnMin: 1.15,
    spawnMax: 1.75,
    log: '1단계 시작! 동네 골목은 아직 여유롭습니다.',
    obstacles: [
      { icon: '☕', label: '엎질러진 커피', className: 'low', width: 54 },
      { icon: '📦', label: '택배 상자', className: 'low', width: 58 },
      { icon: '👜', label: '두고 간 가방', className: 'low', width: 56 },
    ],
  },
  {
    name: '2단계 · 버스 정류장',
    speed: 285,
    spawnMin: 0.9,
    spawnMax: 1.35,
    log: '2단계 진입! 출근길이 조금 붐비기 시작합니다.',
    obstacles: [
      { icon: '☕', label: '엎질러진 커피', className: 'low', width: 54 },
      { icon: '🚧', label: '공사 표지판', className: 'tall', width: 52 },
      { icon: '🐱', label: '출근길 고양이', className: 'tall', width: 50 },
      { icon: '📦', label: '택배 상자', className: 'low', width: 58 },
    ],
  },
  {
    name: '3단계 · 회사 앞 횡단보도',
    speed: 340,
    spawnMin: 0.68,
    spawnMax: 1.08,
    log: '3단계 진입! 회사가 보입니다. 마지막 집중!',
    obstacles: [
      { icon: '🚧', label: '공사 표지판', className: 'tall fast', width: 52 },
      { icon: '🐱', label: '급한 고양이', className: 'tall fast', width: 50 },
      { icon: '🛴', label: '킥보드', className: 'low fast', width: 62 },
      { icon: '☂️', label: '날아온 우산', className: 'low fast', width: 58 },
    ],
  },
];

const state = {
  phase: 'ready',
  timeLeft: GAME_DURATION,
  life: 3,
  elapsed: 0,
  currentStage: 0,
  speed: stageConfigs[0].speed,
  spawnTimer: 0,
  nextSpawn: 1.4,
  obstacles: [],
  isJumping: false,
  invincible: false,
  lastTimestamp: 0,
  animationId: null,
};

const timeText = document.getElementById('timeText');
const lifeText = document.getElementById('lifeText');
const stageText = document.getElementById('stageText');
const progressFill = document.getElementById('progressFill');
const stage = document.getElementById('stage');
const stageBanner = document.getElementById('stageBanner');
const obstacleLayer = document.getElementById('obstacleLayer');
const hamsterWrap = document.getElementById('hamsterWrap');
const hitFlash = document.getElementById('hitFlash');
const centerMessage = document.getElementById('centerMessage');
const startButton = document.getElementById('startButton');
const logList = document.getElementById('logList');
const resultPanel = document.getElementById('resultPanel');
const endingTitle = document.getElementById('endingTitle');
const endingText = document.getElementById('endingText');
const restartButton = document.getElementById('restartButton');

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
  const remain = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${remain}`;
}

function updateHud() {
  const progress = Math.min(100, Math.floor((state.elapsed / GAME_DURATION) * 100));
  timeText.textContent = formatTime(state.timeLeft);
  lifeText.textContent = '❤'.repeat(state.life) || '0';
  stageText.textContent = `${state.currentStage + 1}단계`;
  stageBanner.textContent = stageConfigs[state.currentStage].name;
  progressFill.style.width = `${progress}%`;
}

function addLog(text) {
  const li = document.createElement('li');
  li.textContent = text;
  logList.prepend(li);
  while (logList.children.length > 5) logList.removeChild(logList.lastChild);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function setNextSpawn() {
  const config = stageConfigs[state.currentStage];
  state.nextSpawn = randomBetween(config.spawnMin, config.spawnMax);
}

function resetGame() {
  cancelAnimationFrame(state.animationId);
  state.phase = 'ready';
  state.timeLeft = GAME_DURATION;
  state.life = 3;
  state.elapsed = 0;
  state.currentStage = 0;
  state.speed = stageConfigs[0].speed;
  state.spawnTimer = 0;
  state.obstacles = [];
  state.isJumping = false;
  state.invincible = false;
  state.lastTimestamp = 0;
  obstacleLayer.innerHTML = '';
  hamsterWrap.classList.remove('jump', 'hit');
  resultPanel.classList.add('hidden');
  centerMessage.classList.remove('hidden');
  centerMessage.querySelector('h2').textContent = '햄찌 출근 준비 완료!';
  centerMessage.querySelector('p').textContent = '장애물이 오면 한 번 눌러 점프하세요.';
  startButton.textContent = '출근 시작';
  logList.innerHTML = '<li>햄찌가 커피와 휴대폰을 챙겼습니다.</li>';
  setNextSpawn();
  updateHud();
}

function startGame() {
  if (state.phase === 'playing') return;
  if (state.phase === 'ended') resetGame();
  state.phase = 'playing';
  state.lastTimestamp = performance.now();
  centerMessage.classList.add('hidden');
  addLog('출근 시작! 3분 동안 장애물을 피하세요.');
  addLog(stageConfigs[0].log);
  state.animationId = requestAnimationFrame(gameLoop);
}

function jump() {
  if (state.phase !== 'playing' || state.isJumping) return;
  state.isJumping = true;
  hamsterWrap.classList.remove('jump');
  void hamsterWrap.offsetWidth;
  hamsterWrap.classList.add('jump');
  setTimeout(() => {
    state.isJumping = false;
    hamsterWrap.classList.remove('jump');
  }, JUMP_TIME);
}

function getStageIndex() {
  return Math.min(2, Math.floor(state.elapsed / STAGE_LENGTH));
}

function checkStageUp() {
  const nextStage = getStageIndex();
  if (nextStage === state.currentStage) return;
  state.currentStage = nextStage;
  state.spawnTimer = 0;
  setNextSpawn();
  addLog(stageConfigs[state.currentStage].log);
  updateHud();
}

function spawnObstacle() {
  const config = stageConfigs[state.currentStage];
  const type = config.obstacles[Math.floor(Math.random() * config.obstacles.length)];
  const element = document.createElement('div');
  element.className = `obstacle ${type.className}`;
  element.textContent = type.icon;
  obstacleLayer.appendChild(element);

  state.obstacles.push({
    x: stage.clientWidth + 80,
    width: type.width,
    label: type.label,
    element,
    hit: false,
  });
}

function removeObstacle(obstacle) {
  obstacle.element.remove();
  state.obstacles = state.obstacles.filter((item) => item !== obstacle);
}

function hitObstacle(obstacle) {
  if (state.invincible || obstacle.hit) return;
  obstacle.hit = true;
  state.life -= 1;
  state.invincible = true;
  updateHud();

  addLog(`${obstacle.label}에 부딪혔어요. 컨디션 -1`);
  hamsterWrap.classList.remove('hit');
  void hamsterWrap.offsetWidth;
  hamsterWrap.classList.add('hit');
  hitFlash.classList.remove('on');
  void hitFlash.offsetWidth;
  hitFlash.classList.add('on');

  setTimeout(() => { state.invincible = false; }, 850);
  if (state.life <= 0) endGame(false);
}

function updateObstacles(delta) {
  [...state.obstacles].forEach((obstacle) => {
    obstacle.x -= state.speed * delta;
    obstacle.element.style.transform = `translateX(${obstacle.x}px)`;

    const isNearPlayer = obstacle.x < PLAYER_X + HIT_RANGE && obstacle.x + obstacle.width > PLAYER_X - HIT_RANGE;
    if (isNearPlayer && !state.isJumping) hitObstacle(obstacle);
    if (obstacle.x < -120) removeObstacle(obstacle);
  });
}

function gameLoop(timestamp) {
  if (state.phase !== 'playing') return;

  const delta = Math.min((timestamp - state.lastTimestamp) / 1000, 0.05);
  state.lastTimestamp = timestamp;
  state.elapsed += delta;
  state.timeLeft = GAME_DURATION - state.elapsed;
  checkStageUp();

  const config = stageConfigs[state.currentStage];
  state.speed = config.speed + (state.elapsed % STAGE_LENGTH) * 0.55;
  state.spawnTimer += delta;

  if (state.spawnTimer >= state.nextSpawn) {
    spawnObstacle();
    state.spawnTimer = 0;
    setNextSpawn();
  }

  updateObstacles(delta);
  updateHud();

  if (state.elapsed >= GAME_DURATION) {
    endGame(true);
    return;
  }

  state.animationId = requestAnimationFrame(gameLoop);
}

function endGame(isWin) {
  if (state.phase === 'ended') return;
  state.phase = 'ended';
  cancelAnimationFrame(state.animationId);

  if (isWin) {
    endingTitle.textContent = '정시 출근 성공!';
    endingText.textContent = '햄찌가 3단계 출근길을 모두 통과했습니다. 오늘도 월급과 커피를 지켰어요.';
    addLog('회사 도착! 햄찌의 출근 미션 성공입니다.');
  } else {
    endingTitle.textContent = '출근 실패!';
    endingText.textContent = '컨디션이 모두 떨어져 햄찌가 잠깐 쉬어가기로 했습니다. 다시 도전해보세요.';
    addLog('햄찌가 지쳐버렸습니다. 다음 출근은 더 안정적으로!');
  }

  resultPanel.classList.remove('hidden');
}

function handleAction(event) {
  const clickedButton = event.target.closest('button');
  if (clickedButton) return;

  if (state.phase === 'ready') {
    startGame();
    return;
  }
  jump();
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', resetGame);
stage.addEventListener('pointerdown', handleAction);
window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space') return;
  event.preventDefault();
  if (state.phase === 'ready') startGame();
  else jump();
});

resetGame();
