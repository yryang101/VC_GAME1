const GAME_TIME = 180;
const MAX_HP = 100;
const GROUND_Y = 0;
const FATIGUE_DAMAGE = 1;
const TUTORIAL_SECONDS = 5;
const COFFEE_MIN_INTERVAL = 24000;
const COFFEE_MAX_INTERVAL = 34000;
const PLAY_LOG_KEY = 'hamzziPlayLogsV19';
const BEST_RECORD_KEY = 'hamzziBestRecordsV19';
const BGM_VOLUME_KEY = 'hamzziBgmVolumeV20';
const GUIDE_SEEN_KEY = 'hamzziGuideSeenV29';
const MODE_LABELS = { normal: '기본모드', endless: '무한모드' };

const stageInfo = [
  { stage: 1, name: '1단계 · 집 앞 골목', damage: 3, speed: 6.9, spawn: 1450, fatigueInterval: 10, theme: 'home' },
  { stage: 2, name: '2단계 · 버스 정류장', damage: 5, speed: 8.1, spawn: 1250, fatigueInterval: 6, theme: 'bus' },
  { stage: 3, name: '3단계 · 햄찌컴퍼니 앞', damage: 10, speed: 9.3, spawn: 1080, fatigueInterval: 4, theme: 'office' },
  { stage: 4, name: '4단계 · 야근 러시', damage: 12, speed: 10.5, spawn: 950, fatigueInterval: 3, theme: 'rush' },
];

const objectTypes = [
  { kind: 'obstacle', label: '🚦', className: 'traffic-light', width: 42, height: 58, weight: 28, name: '신호등' },
  { kind: 'obstacle', label: '🚗', className: 'car', width: 60, height: 42, weight: 24, name: '자동차' },
  { kind: 'obstacle', label: '🛴', className: 'kickboard', width: 46, height: 42, weight: 24, name: '킥보드' },
  { kind: 'obstacle', label: '💼', className: 'bag', width: 44, height: 38, weight: 16, name: '서류가방' },
  { kind: 'obstacle', label: '', className: 'tall-barrier', width: 54, height: 108, weight: 10, name: '공사 표지판', requiresDoubleJump: true },
  { kind: 'item', label: '☕', className: 'coffee-item', width: 42, height: 42, weight: 4, name: '커피' },
];

const state = {
  running: false,
  paused: false,
  gameOver: false,
  arriving: false,
  mode: 'normal',
  endlessLevel: 0,
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
  nextCoffeeAt: 0,
  invincibleTimer: 0,
  fatigueTimer: 0,
  passed: 0,
  coffeeCount: 0,
  hitCount: 0,
  playerName: '햄찌',
};

const timeLabel = document.getElementById('timeLabel');
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
const normalModeButton = document.getElementById('normalModeButton');
const endlessModeButton = document.getElementById('endlessModeButton');
const nicknameInput = document.getElementById('nicknameInput');
const pauseButton = document.getElementById('pauseButton');
const pauseMessage = document.getElementById('pauseMessage');
const resumeButton = document.getElementById('resumeButton');
const pauseHomeButton = document.getElementById('pauseHomeButton');
const quitButton = document.getElementById('quitButton');
const resultPanel = document.getElementById('resultPanel');
const endingTitle = document.getElementById('endingTitle');
const endingText = document.getElementById('endingText');
const restartButton = document.getElementById('restartButton');
const homeButton = document.getElementById('homeButton');
const logList = document.getElementById('logList');
const recordList = document.getElementById('recordList');
const stage = document.getElementById('stage');
const pixelOffice = document.querySelector('.pixel-office');
const soundButton = document.getElementById('soundButton');
const bgmVolumeSlider = document.getElementById('bgmVolumeSlider');
const bgmVolumeValue = document.getElementById('bgmVolumeValue');
const mobileJumpButton = document.getElementById('mobileJumpButton');
const touchAppMediaQuery = window.matchMedia('(hover: none) and (pointer: coarse)');
const appSplash = document.getElementById('appSplash');
const mobileHudHp = document.getElementById('mobileHudHp');
const mobileHudTime = document.getElementById('mobileHudTime');
const mobileHudStage = document.getElementById('mobileHudStage');
const mobileGuideButton = document.getElementById('mobileGuideButton');
const mobileSettingsButton = document.getElementById('mobileSettingsButton');
const mobileSettingsOverlay = document.getElementById('mobileSettingsOverlay');
const mobileSettingsCloseButton = document.getElementById('mobileSettingsCloseButton');
const mobileGuideOverlay = document.getElementById('mobileGuideOverlay');
const mobileGuideCloseButton = document.getElementById('mobileGuideCloseButton');
const mobileGuideConfirmButton = document.getElementById('mobileGuideConfirmButton');
const mobileSoundButton = document.getElementById('mobileSoundButton');
const mobileBgmVolumeSlider = document.getElementById('mobileBgmVolumeSlider');
const mobileBgmVolumeValue = document.getElementById('mobileBgmVolumeValue');
const mobileRecordList = document.getElementById('mobileRecordList');
const mobileLogList = document.getElementById('mobileLogList');
const mobileHomeButton = document.getElementById('mobileHomeButton');
const landscapeMediaQuery = window.matchMedia('(orientation: landscape)');

let audioContext = null;
let masterGain = null;
let bgmGain = null;
let soundEnabled = true;
let audioUnlocked = false;
let bgmTimer = null;
let currentBgmTrack = null;
let bgmStep = 0;
let bgmVolume = Number(localStorage.getItem(BGM_VOLUME_KEY) || 35);
if (!Number.isFinite(bgmVolume)) bgmVolume = 35;
bgmVolume = Math.max(0, Math.min(100, bgmVolume));
let mobileSettingsPausedRun = false;
let mobileGuidePausedRun = false;
let splashFinished = false;

function isMobileAppInputMode() {
  return touchAppMediaQuery.matches;
}

function isMobileLandscapeMode() {
  return isMobileAppInputMode() && landscapeMediaQuery.matches;
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    bgmGain = audioContext.createGain();
    masterGain.gain.value = 0.26;
    bgmGain.gain.value = bgmVolume / 100;
    bgmGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  audioUnlocked = true;
  return audioContext;
}

function updateSoundButton() {
  if (!soundButton) return;
  soundButton.textContent = soundEnabled ? '🔊 사운드 ON' : '🔇 사운드 OFF';
  soundButton.classList.toggle('muted', !soundEnabled);
  if (mobileSoundButton) {
    mobileSoundButton.textContent = soundEnabled ? '사운드 ON' : '사운드 OFF';
    mobileSoundButton.classList.toggle('muted', !soundEnabled);
  }
}

function updateBgmVolumeUI() {
  const normalized = Math.max(0, Math.min(100, Math.round(bgmVolume)));
  bgmVolume = normalized;
  if (bgmVolumeSlider) bgmVolumeSlider.value = String(normalized);
  if (bgmVolumeValue) bgmVolumeValue.textContent = `${normalized}%`;
  if (mobileBgmVolumeSlider) mobileBgmVolumeSlider.value = String(normalized);
  if (mobileBgmVolumeValue) mobileBgmVolumeValue.textContent = `${normalized}%`;
}

function applyBgmVolume() {
  updateBgmVolumeUI();
  if (bgmGain) {
    const ctx = audioContext;
    const target = bgmVolume / 100;
    if (ctx) {
      bgmGain.gain.cancelScheduledValues(ctx.currentTime);
      bgmGain.gain.setTargetAtTime(target, ctx.currentTime, 0.035);
    } else {
      bgmGain.gain.value = target;
    }
  }
}

function setBgmVolume(value) {
  bgmVolume = Math.max(0, Math.min(100, Number(value)));
  if (!Number.isFinite(bgmVolume)) bgmVolume = 35;
  localStorage.setItem(BGM_VOLUME_KEY, String(Math.round(bgmVolume)));
  applyBgmVolume();
}

function playTone({ frequency = 440, duration = 0.12, type = 'square', volume = 0.35, slideTo = null, delay = 0, destination = null }) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const target = destination || masterGain;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), start + duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(target);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function playNoise({ duration = 0.12, volume = 0.22, delay = 0 }) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const start = ctx.currentTime + delay;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(masterGain);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function playSound(type) {
  if (!soundEnabled) return;
  switch (type) {
    case 'jump':
      playTone({ frequency: 520, slideTo: 760, duration: 0.10, type: 'square', volume: 0.18 });
      break;
    case 'doubleJump':
      playTone({ frequency: 720, slideTo: 1040, duration: 0.11, type: 'square', volume: 0.2 });
      playTone({ frequency: 1040, duration: 0.08, type: 'triangle', volume: 0.12, delay: 0.06 });
      break;
    case 'coffee':
      playTone({ frequency: 660, duration: 0.09, type: 'triangle', volume: 0.18 });
      playTone({ frequency: 880, duration: 0.12, type: 'triangle', volume: 0.16, delay: 0.08 });
      break;
    case 'hit':
      playNoise({ duration: 0.10, volume: 0.18 });
      playTone({ frequency: 150, slideTo: 85, duration: 0.16, type: 'sawtooth', volume: 0.18 });
      break;
    case 'success':
      playTone({ frequency: 523, duration: 0.13, type: 'triangle', volume: 0.16 });
      playTone({ frequency: 659, duration: 0.13, type: 'triangle', volume: 0.16, delay: 0.12 });
      playTone({ frequency: 784, duration: 0.22, type: 'triangle', volume: 0.18, delay: 0.24 });
      break;
    case 'fail':
      playTone({ frequency: 260, slideTo: 150, duration: 0.35, type: 'sawtooth', volume: 0.16 });
      playTone({ frequency: 196, slideTo: 110, duration: 0.38, type: 'triangle', volume: 0.13, delay: 0.12 });
      break;
    case 'rank':
      playTone({ frequency: 587, duration: 0.10, type: 'triangle', volume: 0.14 });
      playTone({ frequency: 740, duration: 0.11, type: 'triangle', volume: 0.14, delay: 0.10 });
      break;
    case 'newRecord':
      playTone({ frequency: 880, duration: 0.09, type: 'square', volume: 0.16 });
      playTone({ frequency: 1175, duration: 0.10, type: 'square', volume: 0.16, delay: 0.09 });
      playTone({ frequency: 1568, duration: 0.16, type: 'triangle', volume: 0.15, delay: 0.18 });
      break;
    default:
      break;
  }
}

function getBgmPattern(track) {
  if (track === 'rush') {
    return { interval: 155, lead: [784, 988, 880, 784, 1046, 988, 880, 988], bass: [196, 196, 220, 220, 247, 247, 220, 220], type: 'square', leadVolume: 0.14, bassVolume: 0.08 };
  }
  if (track === 'play') {
    return { interval: 205, lead: [523, 659, 784, 659, 698, 784, 880, 784], bass: [131, 131, 165, 165, 147, 147, 196, 196], type: 'triangle', leadVolume: 0.13, bassVolume: 0.07 };
  }
  return { interval: 260, lead: [392, 494, 523, 494, 440, 523, 587, 523], bass: [98, 98, 131, 131, 110, 110, 147, 147], type: 'triangle', leadVolume: 0.11, bassVolume: 0.06 };
}

function playBgmStep() {
  if (!soundEnabled || !currentBgmTrack || state.paused || state.gameOver || state.arriving) return;
  const pattern = getBgmPattern(currentBgmTrack);
  const index = bgmStep % pattern.lead.length;
  playTone({ frequency: pattern.lead[index], duration: (pattern.interval / 1000) * 0.82, type: pattern.type, volume: pattern.leadVolume, destination: bgmGain });
  if (index % 2 === 0) {
    playTone({ frequency: pattern.bass[index], duration: (pattern.interval / 1000) * 1.35, type: 'sine', volume: pattern.bassVolume, destination: bgmGain });
  }
  bgmStep += 1;
}

function stopBgm() {
  if (bgmTimer) clearInterval(bgmTimer);
  bgmTimer = null;
  currentBgmTrack = null;
  bgmStep = 0;
}

function startBgm(track = 'main') {
  if (!soundEnabled || !audioUnlocked) return;
  getAudioContext();
  applyBgmVolume();
  if (currentBgmTrack === track && bgmTimer) return;
  stopBgm();
  currentBgmTrack = track;
  bgmStep = 0;
  const pattern = getBgmPattern(track);
  playBgmStep();
  bgmTimer = setInterval(playBgmStep, pattern.interval);
}

function getActiveBgmTrack() {
  if (state.running && !state.paused && !state.gameOver) return state.mode === 'endless' && state.stage >= 4 ? 'rush' : 'play';
  if (!state.gameOver && !state.arriving) return 'main';
  return null;
}

function refreshBgm() {
  if (!soundEnabled || !audioUnlocked) {
    stopBgm();
    return;
  }
  const track = getActiveBgmTrack();
  if (track) startBgm(track);
  else stopBgm();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  updateSoundButton();
  if (soundEnabled) {
    getAudioContext();
    applyBgmVolume();
    playSound('rank');
    refreshBgm();
  } else {
    stopBgm();
  }
}

function getStageConfig() {
  const base = stageInfo[state.stage - 1] || stageInfo[stageInfo.length - 1];
  if (state.mode !== 'endless' || state.stage < 4) return base;

  const level = state.endlessLevel;
  return {
    ...base,
    name: level > 0 ? `무한 ${4 + level}단계 · 야근 출근길` : base.name,
    damage: Math.min(20, base.damage + Math.floor(level / 2)),
    speed: Math.min(12.5, base.speed + level * 0.35),
    spawn: Math.max(760, base.spawn - level * 70),
    fatigueInterval: Math.max(2, base.fatigueInterval - Math.floor(level / 2)),
  };
}

function getRandomSpawnDelay(cfg) {
  const minDelay = Math.max(850, cfg.spawn * 0.65);
  const maxDelay = cfg.spawn * 1.25;
  return minDelay + Math.random() * (maxDelay - minDelay);
}

function getNextCoffeeTime() {
  return state.elapsed * 1000 + COFFEE_MIN_INTERVAL + Math.random() * (COFFEE_MAX_INTERVAL - COFFEE_MIN_INTERVAL);
}

function getTypeByClass(className) {
  return objectTypes.find((type) => type.className === className);
}

function formatClock(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const ss = String(safeSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatTime(seconds) {
  if (state.mode === 'endless') return formatClock(seconds);
  return formatClock(Math.max(0, Math.ceil(GAME_TIME - seconds)));
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
  syncMobileSettingsLists();
}

function updateHUD() {
  const cfg = getStageConfig();
  if (timeLabel) timeLabel.textContent = state.mode === 'endless' ? '생존 시간' : '남은 시간';
  timeText.textContent = formatTime(state.elapsed);
  hpText.textContent = `${Math.max(0, Math.round(state.hp))} / 100`;
  hpFill.style.width = `${Math.max(0, Math.min(100, state.hp))}%`;
  stageText.textContent = state.mode === 'endless' && state.stage >= 4 ? `무한 ${4 + state.endlessLevel}단계` : `${state.stage}단계`;
  if (mobileHudTime) mobileHudTime.textContent = timeText.textContent;
  if (mobileHudHp) mobileHudHp.textContent = hpText.textContent;
  if (mobileHudStage) mobileHudStage.textContent = stageText.textContent;
  stageBanner.textContent = cfg.name;
  const progress = state.mode === 'endless' ? ((state.elapsed % 60) / 60) * 100 : Math.min(100, (state.elapsed / GAME_TIME) * 100);
  progressFill.style.width = `${progress}%`;
  stage.dataset.theme = cfg.theme;
}

function setMode(mode) {
  state.mode = mode === 'endless' ? 'endless' : 'normal';
  if (normalModeButton) normalModeButton.classList.toggle('selected', state.mode === 'normal');
  if (endlessModeButton) endlessModeButton.classList.toggle('selected', state.mode === 'endless');
  if (!state.running && !state.gameOver) updateHUD();
}

function resetGame() {
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.arriving = false;
  state.hp = MAX_HP;
  state.elapsed = 0;
  state.endlessLevel = 0;
  state.stage = 1;
  state.y = GROUND_Y;
  state.velocityY = 0;
  state.jumpCount = 0;
  state.objects.forEach(o => o.el.remove());
  state.objects = [];
  state.spawnTimer = 0;
  state.nextSpawnDelay = getRandomSpawnDelay(stageInfo[0]);
  state.nextCoffeeAt = COFFEE_MIN_INTERVAL + Math.random() * 5000;
  state.invincibleTimer = 0;
  state.fatigueTimer = 0;
  state.passed = 0;
  state.coffeeCount = 0;
  state.hitCount = 0;
  state.lastTime = 0;
  hamsterWrap.style.transition = '';
  hamsterWrap.style.left = '';
  hamsterWrap.style.opacity = '';
  hamsterWrap.style.transform = 'translateY(0px)';
  hamsterWrap.classList.remove('hit', 'jumping', 'arriving', 'entering-office');
  stage.classList.remove('office-arrival');
  if (pixelOffice) pixelOffice.classList.remove('office-open');
  resultPanel.classList.add('hidden');
  centerMessage.classList.remove('hidden');
  centerMessage.querySelector('h2').textContent = '햄찌 출근 준비 완료!';
  centerMessage.querySelector('p').textContent = state.mode === 'endless'
    ? '무한모드는 HP가 0이 될 때까지 계속됩니다. 일시정지 후 기록 저장으로 종료할 수 있어요.'
    : '스페이스/클릭/터치로 점프하세요. 공중에서 한 번 더 누르면 더블점프가 됩니다.';
  startButton.textContent = state.mode === 'endless' ? '무한 출근 시작' : '출근 시작';
  startButton.disabled = false;
  if (pauseButton) pauseButton.classList.add('hidden');
  if (mobileJumpButton) mobileJumpButton.disabled = true;
  if (pauseMessage) pauseMessage.classList.add('hidden');
  if (pauseHomeButton) pauseHomeButton.classList.add('hidden');
  if (quitButton) quitButton.classList.add('hidden');
  if (nicknameInput) nicknameInput.disabled = false;
  logList.innerHTML = '<li>햄찌가 휴대폰과 사원증을 챙겼습니다.</li>';
  renderPlayLogs();
  syncMobileSettingsLists();
  setMode(state.mode);
  updateHUD();
  refreshBgm();
}

function startGame() {
  getAudioContext();
  state.playerName = sanitizeName(nicknameInput ? nicknameInput.value : '햄찌');
  resetGame();
  state.playerName = sanitizeName(nicknameInput ? nicknameInput.value : state.playerName);
  startButton.disabled = true;
  if (nicknameInput) nicknameInput.disabled = true;
  let count = TUTORIAL_SECONDS;
  centerMessage.querySelector('h2').textContent = `${state.playerName}님, 출근 준비!`;
  centerMessage.querySelector('p').textContent = state.mode === 'endless'
    ? `무한모드: 오래 버틸수록 등급이 올라갑니다. ${count}초 후 시작됩니다.`
    : `장애물은 피하고, 커피는 획득하세요. ${count}초 후 출근이 시작됩니다.`;
  startButton.textContent = '준비 중...';
  refreshBgm();

  const countdown = setInterval(() => {
    count -= 1;
    if (count <= 0) {
      clearInterval(countdown);
      beginRun();
      return;
    }
    centerMessage.querySelector('p').textContent = state.mode === 'endless'
      ? `무한모드: 오래 버틸수록 등급이 올라갑니다. ${count}초 후 시작됩니다.`
      : `장애물은 피하고, 커피는 획득하세요. ${count}초 후 출근이 시작됩니다.`;
  }, 1000);
}

function beginRun() {
  state.running = true;
  state.paused = false;
  state.lastTime = 0;
  centerMessage.classList.add('hidden');
  if (pauseButton) pauseButton.classList.remove('hidden');
  if (mobileJumpButton) mobileJumpButton.disabled = false;
  addLog(`${state.playerName}님의 ${MODE_LABELS[state.mode]} 시작! 신호등, 자동차, 킥보드는 점프로 피하세요.`);
  addLog('공사 표지판은 높아서 더블점프 타이밍이 중요합니다.');
  startBgm('play');
  requestAnimationFrame(loop);
}

function jump() {
  if (!state.running || state.paused || state.gameOver) return;
  if (state.jumpCount >= state.maxJumps) return;

  state.velocityY = state.jumpCount === 0 ? 13.8 : 12.4;
  state.jumpCount += 1;
  playSound(state.jumpCount === 1 ? 'jump' : 'doubleJump');
  hamsterWrap.classList.add('jumping');

  if (state.jumpCount === 2) addLog('더블점프! 햄찌가 공중에서 한 번 더 폴짝 뛰었습니다.');
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

function createObject(forcedType = null) {
  const type = forcedType || pickWeightedType();
  const el = document.createElement('div');
  el.className = `obstacle ${type.className} ${type.kind}`;
  el.textContent = type.label;
  el.setAttribute('aria-label', type.name);
  el.style.width = `${type.width}px`;
  el.style.height = `${type.height}px`;

  const baseBottom = 58;
  const isAirCoffee = type.kind === 'item' && Math.random() < 0.3;
  const yOffset = isAirCoffee ? 96 : 0;
  el.style.bottom = `${baseBottom + yOffset}px`;
  if (isAirCoffee) el.classList.add('air-item');

  obstacleLayer.appendChild(el);

  state.objects.push({
    el,
    x: stage.clientWidth + 80,
    y: yOffset,
    width: type.width,
    height: type.height,
    kind: type.kind,
    name: type.name,
    requiresDoubleJump: Boolean(type.requiresDoubleJump),
    passed: false,
    collected: false,
    resolved: false,
  });
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
  const isTall = object.el.classList.contains('tall-barrier');
  let xPadding = isItem ? 0.18 : 0.28;
  let yTopPadding = isItem ? 0.18 : 0.34;
  let yBottomPadding = isItem ? 0.12 : 0.20;
  if (isTall) {
    xPadding = 0.22;
    yTopPadding = 0.10;
    yBottomPadding = 0.08;
  }
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
  playSound('hit');
  state.invincibleTimer = 800;
  hamsterWrap.classList.add('hit');
  hitFlash.classList.remove('show');
  void hitFlash.offsetWidth;
  hitFlash.classList.add('show');
  addLog(`${object ? object.name : '장애물'} 충돌! ${state.stage}단계 피해 HP -${cfg.damage}`);
  setTimeout(() => hamsterWrap.classList.remove('hit'), 450);
  if (state.hp <= 0) endGame(false);
}

function collectCoffee(object) {
  if (object.collected) return;
  object.collected = true;
  state.coffeeCount += 1;
  playSound('coffee');
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
  const nextStage = state.mode === 'endless'
    ? (state.elapsed < 30 ? 1 : state.elapsed < 60 ? 2 : state.elapsed < 120 ? 3 : 4)
    : (state.elapsed < 60 ? 1 : state.elapsed < 120 ? 2 : 3);
  const nextEndlessLevel = state.mode === 'endless' && nextStage >= 4 ? Math.max(0, Math.floor(Math.max(0, state.elapsed - 120) / 45)) : 0;
  const stageChanged = nextStage !== state.stage;
  const endlessLevelChanged = nextEndlessLevel !== state.endlessLevel;
  if (!stageChanged && !endlessLevelChanged) return;

  state.stage = nextStage;
  state.endlessLevel = nextEndlessLevel;
  state.fatigueTimer = 0;
  state.nextSpawnDelay = getRandomSpawnDelay(getStageConfig());
  const cfg = getStageConfig();

  if (state.mode === 'endless' && state.stage >= 4) {
    if (stageChanged) addLog('4단계 진입! 야근 러시가 시작되어 장애물과 피로가 더 강해집니다.');
    else if (endlessLevelChanged && state.endlessLevel > 0) addLog(`무한 ${4 + state.endlessLevel}단계! 출근길이 더 빨라졌습니다.`);
    refreshBgm();
    return;
  }

  if (state.stage === 3) addLog('3단계 진입! 햄찌컴퍼니가 가까워져 누적 피로가 5초마다 증가합니다.');
  else addLog(`${state.stage}단계 진입! 장애물이 더 빨라지고 피로가 ${cfg.fatigueInterval}초마다 쌓입니다.`);
  refreshBgm();
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
    const coffeeType = getTypeByClass('coffee-item');
    const shouldForceCoffee = coffeeType && state.elapsed * 1000 >= state.nextCoffeeAt;
    if (shouldForceCoffee) {
      createObject(coffeeType);
      state.nextCoffeeAt = getNextCoffeeTime();
    } else {
      createObject();
    }
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
    if (object.kind === 'item') collectCoffee(object);
    else resolveObstacle(object);
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
  if (state.mode === 'endless') {
    const seconds = Math.floor(state.elapsed);
    if (seconds >= 300) return 'S';
    if (seconds >= 240) return 'A';
    if (seconds >= 180) return 'B';
    if (seconds >= 120) return 'C';
    if (seconds >= 60) return 'D';
    return 'F';
  }
  if (!success || state.hp <= 0) return 'F';
  const hp = Math.round(state.hp);
  if (hp >= 95) return 'S';
  if (hp >= 80) return 'A';
  if (hp >= 60) return 'B';
  if (hp >= 40) return 'C';
  return 'D';
}

function readBestRecords() {
  try { return JSON.parse(localStorage.getItem(BEST_RECORD_KEY)) || {}; } catch { return {}; }
}

function readPlayLogs() {
  try {
    const logs = JSON.parse(localStorage.getItem(PLAY_LOG_KEY));
    return Array.isArray(logs) ? logs : [];
  } catch { return []; }
}

function savePlayLog(record) {
  const logs = readPlayLogs();
  logs.unshift(record);
  localStorage.setItem(PLAY_LOG_KEY, JSON.stringify(logs.slice(0, 10)));
}

function saveBestRecord(record) {
  const rankScore = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
  const records = readBestRecords();
  const best = records[record.mode] || null;
  const isEndless = record.mode === 'endless';
  const isBetter = !best ||
    rankScore[record.rank] > rankScore[best.rank] ||
    (rankScore[record.rank] === rankScore[best.rank] && isEndless && record.time > best.time) ||
    (rankScore[record.rank] === rankScore[best.rank] && !isEndless && record.hp > best.hp) ||
    (rankScore[record.rank] === rankScore[best.rank] && record.hp === best.hp && record.passed > best.passed);
  if (isBetter) {
    records[record.mode] = record;
    localStorage.setItem(BEST_RECORD_KEY, JSON.stringify(records));
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
    `<li><strong>${log.name}</strong> · ${MODE_LABELS[log.mode] || '기본모드'} · ${log.rank}등급 · ${log.mode === 'endless' ? `생존 ${formatClock(log.time)}` : `HP ${log.hp}`} · 회피 ${log.passed}개 · ${formatDate(log.date)}</li>`
  )).join('');
}

function syncMobileSettingsLists() {
  if (mobileRecordList && recordList) mobileRecordList.innerHTML = recordList.innerHTML;
  if (mobileLogList && logList) mobileLogList.innerHTML = logList.innerHTML;
}

function openMobileSettings() {
  if (!mobileSettingsOverlay) return;
  syncMobileSettingsLists();
  updateSoundButton();
  updateBgmVolumeUI();
  mobileSettingsPausedRun = Boolean(state.running && !state.paused && !state.gameOver);
  if (mobileSettingsPausedRun) {
    state.paused = true;
    state.lastTime = 0;
    stopBgm();
  }
  if (mobileJumpButton) mobileJumpButton.disabled = true;
  document.body.classList.add('mobile-settings-open');
  mobileSettingsOverlay.classList.remove('hidden');
  mobileSettingsOverlay.setAttribute('aria-hidden', 'false');
}

function closeMobileSettings() {
  if (!mobileSettingsOverlay) return;
  mobileSettingsOverlay.classList.add('hidden');
  mobileSettingsOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('mobile-settings-open');
  if (mobileSettingsPausedRun && state.running && !state.gameOver) {
    state.paused = false;
    if (mobileJumpButton) mobileJumpButton.disabled = false;
    refreshBgm();
    requestAnimationFrame(loop);
  } else if (mobileJumpButton) {
    mobileJumpButton.disabled = !state.running || state.paused || state.gameOver || state.arriving;
  }
  mobileSettingsPausedRun = false;
}

function hasSeenMobileGuide() {
  return localStorage.getItem(GUIDE_SEEN_KEY) === 'true';
}

function setMobileGuideSeen() {
  localStorage.setItem(GUIDE_SEEN_KEY, 'true');
}

function openMobileGuide({ markSeen = false } = {}) {
  if (!mobileGuideOverlay) return;
  if (markSeen) setMobileGuideSeen();
  mobileGuidePausedRun = Boolean(state.running && !state.paused && !state.gameOver);
  if (mobileGuidePausedRun) {
    state.paused = true;
    state.lastTime = 0;
    stopBgm();
  }
  if (mobileJumpButton) mobileJumpButton.disabled = true;
  document.body.classList.add('mobile-guide-open');
  mobileGuideOverlay.classList.remove('hidden');
  mobileGuideOverlay.setAttribute('aria-hidden', 'false');
}

function closeMobileGuide({ markSeen = true } = {}) {
  if (!mobileGuideOverlay) return;
  if (markSeen) setMobileGuideSeen();
  mobileGuideOverlay.classList.add('hidden');
  mobileGuideOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('mobile-guide-open');
  if (mobileGuidePausedRun && state.running && !state.gameOver) {
    state.paused = false;
    if (mobileJumpButton) mobileJumpButton.disabled = false;
    refreshBgm();
    requestAnimationFrame(loop);
  } else if (mobileJumpButton) {
    mobileJumpButton.disabled = !state.running || state.paused || state.gameOver || state.arriving;
  }
  mobileGuidePausedRun = false;
}

function maybeShowMobileGuide() {
  if (!splashFinished || !isMobileLandscapeMode() || hasSeenMobileGuide()) return;
  if (mobileSettingsOverlay && !mobileSettingsOverlay.classList.contains('hidden')) return;
  if (mobileGuideOverlay && !mobileGuideOverlay.classList.contains('hidden')) return;
  openMobileGuide({ markSeen: false });
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

  if (state.mode === 'normal' && state.elapsed >= GAME_TIME) {
    startArrivalSequence();
    return;
  }
  requestAnimationFrame(loop);
}

function startArrivalSequence() {
  if (state.arriving || state.gameOver) return;
  state.arriving = true;
  stopBgm();
  state.running = false;
  state.paused = false;
  state.objects.forEach((object) => object.el.remove());
  state.objects = [];
  state.y = GROUND_Y;
  state.velocityY = 0;
  state.jumpCount = 0;
  updateHUD();
  if (pauseButton) pauseButton.classList.add('hidden');
  if (mobileJumpButton) mobileJumpButton.disabled = true;
  if (pauseMessage) pauseMessage.classList.add('hidden');
  if (pauseHomeButton) pauseHomeButton.classList.add('hidden');
  hamsterWrap.classList.remove('hit', 'jumping');
  hamsterWrap.classList.add('arriving');
  stage.classList.add('office-arrival');
  hamsterWrap.style.opacity = '1';
  hamsterWrap.style.transition = 'left 1.45s ease-in, transform .28s ease, opacity .45s ease';
  hamsterWrap.style.transform = 'translateY(0px)';
  hamsterWrap.style.left = `${Math.max(120, stage.clientWidth - 158)}px`;
  addLog('출근 성공 직전! 햄찌가 햄찌컴퍼니 문 앞까지 달려갑니다.');

  setTimeout(() => {
    if (pixelOffice) pixelOffice.classList.add('office-open');
    playSound('success');
    addLog('햄찌컴퍼니 출입문이 열렸습니다. 햄찌가 안으로 들어갑니다!');
  }, 980);

  setTimeout(() => {
    hamsterWrap.classList.add('entering-office');
    hamsterWrap.style.transform = 'translateY(0px) scale(.72)';
    hamsterWrap.style.opacity = '0';
  }, 1420);

  setTimeout(() => {
    hamsterWrap.classList.remove('arriving', 'entering-office');
    endGame(true, 'arrival');
  }, 2150);
}

function goHome() {
  resetGame();
}

function pauseGoHome() {
  if (!state.running || state.gameOver) return;
  const confirmed = window.confirm('처음으로 돌아가시겠어요? 현재 진행 중인 기록은 저장되지 않습니다.');
  if (!confirmed) return;
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.arriving = false;
  resetGame();
  addLog('메인 화면으로 돌아왔습니다. 새 출근을 준비하세요.');
}

function endGame(success, reason = 'hp0') {
  if (state.gameOver) return;
  state.gameOver = true;
  stopBgm();
  state.running = false;
  state.arriving = false;
  if (nicknameInput) nicknameInput.disabled = false;
  if (pauseButton) pauseButton.classList.add('hidden');
  if (mobileJumpButton) mobileJumpButton.disabled = true;
  if (pauseMessage) pauseMessage.classList.add('hidden');
  if (pauseHomeButton) pauseHomeButton.classList.add('hidden');
  if (quitButton) quitButton.classList.add('hidden');
  updateHUD();
  resultPanel.classList.remove('hidden');

  const rank = getRank(success);
  const finalRecord = {
    name: state.playerName,
    rank,
    mode: state.mode,
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
  syncMobileSettingsLists();

  if (!success) playSound('fail');
  else playSound('rank');
  if (record.updated) setTimeout(() => playSound('newRecord'), success ? 260 : 180);

  const bestText = record.best
    ? `최고 기록: ${record.best.name} / ${MODE_LABELS[record.best.mode]} / ${record.best.rank}등급 / ${record.best.mode === 'endless' ? `생존 ${formatClock(record.best.time)}` : `HP ${record.best.hp}`} / 회피 ${record.best.passed}개`
    : '최고 기록: 아직 없음';
  const newRecordText = record.updated ? '<br><strong class="new-record">NEW BEST!</strong>' : '';

  if (state.mode === 'endless') {
    endingTitle.textContent = reason === 'quit' ? `기록 저장 완료! ${rank}등급` : `무한모드 종료! ${rank}등급`;
    endingText.innerHTML = `${state.playerName}님의 햄찌가 ${formatClock(finalRecord.time)} 동안 버텼습니다.<br>남은 HP: ${finalRecord.hp} / 회피 장애물: ${state.passed}개<br>커피 획득: ${state.coffeeCount}잔 / 피격 횟수: ${state.hitCount}회<br>${bestText}${newRecordText}`;
  } else if (success) {
    endingTitle.textContent = `출근 성공! ${rank}등급`;
    endingText.innerHTML = `${state.playerName}님의 햄찌가 햄찌컴퍼니에 무사히 도착했습니다.<br>남은 HP: ${finalRecord.hp} / 회피 장애물: ${state.passed}개<br>커피 획득: ${state.coffeeCount}잔 / 피격 횟수: ${state.hitCount}회<br>${bestText}${newRecordText}`;
  } else {
    endingTitle.textContent = `출근 실패! ${rank}등급`;
    endingText.innerHTML = `${state.playerName}님의 햄찌가 출근길에서 녹초가 됐습니다.<br>버틴 시간: ${formatClock(state.elapsed)} / 회피 장애물: ${state.passed}개<br>커피 획득: ${state.coffeeCount}잔 / 피격 횟수: ${state.hitCount}회<br>${bestText}${newRecordText}`;
  }
}

function quitEndlessRun() {
  if (state.mode !== 'endless' || !state.running || state.gameOver) return;
  endGame(true, 'quit');
}

function togglePause() {
  if (!state.running || state.gameOver) return;
  state.paused = !state.paused;
  if (state.paused) {
    state.lastTime = 0;
    if (pauseMessage) pauseMessage.classList.remove('hidden');
    if (pauseHomeButton) pauseHomeButton.classList.remove('hidden');
    if (quitButton) quitButton.classList.toggle('hidden', state.mode !== 'endless');
    if (mobileJumpButton) mobileJumpButton.disabled = true;
    if (pauseButton) pauseButton.textContent = '계속하기';
    stopBgm();
    addLog('일시정지! 햄찌가 잠깐 숨을 고릅니다.');
  } else {
    if (pauseMessage) pauseMessage.classList.add('hidden');
    if (pauseHomeButton) pauseHomeButton.classList.add('hidden');
    if (quitButton) quitButton.classList.add('hidden');
    if (mobileJumpButton) mobileJumpButton.disabled = false;
    if (pauseButton) pauseButton.textContent = '일시정지';
    addLog('다시 출근 시작!');
    refreshBgm();
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
if (homeButton) homeButton.addEventListener('click', goHome);
if (pauseButton) pauseButton.addEventListener('click', togglePause);
if (resumeButton) resumeButton.addEventListener('click', togglePause);
if (pauseHomeButton) pauseHomeButton.addEventListener('click', pauseGoHome);
if (quitButton) quitButton.addEventListener('click', quitEndlessRun);
if (normalModeButton) normalModeButton.addEventListener('click', () => setMode('normal'));
if (endlessModeButton) endlessModeButton.addEventListener('click', () => setMode('endless'));
if (soundButton) soundButton.addEventListener('click', toggleSound);
if (bgmVolumeSlider) bgmVolumeSlider.addEventListener('input', (event) => setBgmVolume(event.target.value));
if (mobileSettingsButton) mobileSettingsButton.addEventListener('click', openMobileSettings);
if (mobileSettingsCloseButton) mobileSettingsCloseButton.addEventListener('click', closeMobileSettings);
if (mobileSettingsOverlay) {
  mobileSettingsOverlay.addEventListener('pointerdown', (event) => {
    if (event.target === mobileSettingsOverlay) closeMobileSettings();
  });
}
if (mobileSoundButton) mobileSoundButton.addEventListener('click', toggleSound);
if (mobileBgmVolumeSlider) mobileBgmVolumeSlider.addEventListener('input', (event) => setBgmVolume(event.target.value));
if (mobileHomeButton) {
  mobileHomeButton.addEventListener('click', () => {
    closeMobileSettings();
    if (state.running && !state.gameOver) pauseGoHome();
    else goHome();
  });
}
if (mobileGuideButton) mobileGuideButton.addEventListener('click', () => openMobileGuide({ markSeen: false }));
if (mobileGuideCloseButton) mobileGuideCloseButton.addEventListener('click', () => closeMobileGuide());
if (mobileGuideConfirmButton) mobileGuideConfirmButton.addEventListener('click', () => closeMobileGuide());
if (mobileGuideOverlay) {
  mobileGuideOverlay.addEventListener('pointerdown', (event) => {
    if (event.target === mobileGuideOverlay) closeMobileGuide();
  });
}
document.addEventListener('keydown', handleInput);
if (mobileJumpButton) {
  mobileJumpButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    jump();
  });
}
stage.addEventListener('pointerdown', (event) => {
  if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT') return;
  if (isMobileAppInputMode()) return;
  if (state.paused) return;
  jump();
});

updateSoundButton();
updateBgmVolumeUI();
resetGame();
syncMobileSettingsLists();
if (appSplash) {
  window.setTimeout(() => {
    appSplash.classList.add('hidden');
    document.body.classList.remove('splash-active');
    splashFinished = true;
    maybeShowMobileGuide();
  }, 1400);
} else {
  document.body.classList.remove('splash-active');
  splashFinished = true;
  maybeShowMobileGuide();
}
window.addEventListener('orientationchange', () => {
  window.setTimeout(maybeShowMobileGuide, 250);
});
if (touchAppMediaQuery.addEventListener) {
  touchAppMediaQuery.addEventListener('change', maybeShowMobileGuide);
}
if (landscapeMediaQuery.addEventListener) {
  landscapeMediaQuery.addEventListener('change', maybeShowMobileGuide);
}
