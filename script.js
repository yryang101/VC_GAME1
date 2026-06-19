const state = {
  time: 5,
  mood: 80,
  coffee: 0,
  step: 'start',
  routeScore: 0,
};

const scenes = {
  start: {
    location: '햄찌의 방',
    title: '앗, 알람을 못 들었어요!',
    text: '첫 출근 날인데 출근까지 5분밖에 남지 않았습니다. 햄찌는 휴대폰과 커피를 챙기고 급하게 나가려 합니다.',
    choices: [
      { label: '☕ 커피를 챙긴다', next: 'coffee', effects: { coffee: 1, mood: 8, time: -1 }, log: '커피 획득! 기분은 좋아졌지만 시간이 1분 줄었습니다.' },
      { label: '🏃 바로 뛰어나간다', next: 'street', effects: { mood: -5 }, log: '빠르게 출발했습니다. 커피는 없지만 시간은 아꼈습니다.' },
    ],
  },
  coffee: {
    location: '현관 앞',
    title: '사원증이 안 보여요',
    text: '문 앞에서 사원증이 없다는 사실을 깨달았습니다. 다시 방으로 들어갈까요?',
    choices: [
      { label: '🔍 사원증 찾기', next: 'street', effects: { time: -1, mood: 5, routeScore: 1 }, log: '사원증을 찾았습니다. 회사원 햄찌 준비 완료!' },
      { label: '😎 일단 출발하기', next: 'street', effects: { mood: -8, routeScore: -1 }, log: '사원증 없이 출발했습니다. 조금 불안합니다.' },
    ],
  },
  street: {
    location: '버스 정류장',
    title: '어떤 길로 갈까요?',
    text: '버스는 편하지만 막힐 수 있고, 지하철은 빠르지만 계단이 많습니다.',
    choices: [
      { label: '🚌 버스 타기', next: 'bus', effects: { time: -2, mood: 4 }, log: '버스를 탔습니다. 창밖 구경으로 기분이 조금 좋아졌습니다.' },
      { label: '🚇 지하철 타기', next: 'subway', effects: { time: -1, mood: -4, routeScore: 1 }, log: '지하철을 탔습니다. 빠르지만 사람이 많습니다.' },
    ],
  },
  bus: {
    location: '버스 안',
    title: '고양이가 길을 막고 있어요',
    text: '도로 위에 커다란 고양이가 앉아 버스가 멈췄습니다. 햄찌가 할 수 있는 선택은?',
    choices: [
      { label: '🍪 간식을 건넨다', next: 'crosswalk', effects: { time: -1, mood: 8, routeScore: 1 }, log: '고양이가 만족하며 비켜줬습니다. 귀여운 해결!' },
      { label: '🛴 내려서 킥보드 타기', next: 'crosswalk', effects: { mood: -10, routeScore: 1 }, log: '킥보드로 빠르게 이동했습니다. 햄찌는 조금 긴장했습니다.' },
    ],
  },
  subway: {
    location: '지하철역',
    title: '출구가 너무 많아요',
    text: '2번 출구는 가까워 보이고, 5번 출구는 회사 건물과 연결되어 있다고 합니다.',
    choices: [
      { label: '2번 출구로 나간다', next: 'crosswalk', effects: { time: -1, mood: -4 }, log: '2번 출구로 나왔지만 횡단보도를 하나 더 건너야 합니다.' },
      { label: '5번 출구로 나간다', next: 'crosswalk', effects: { routeScore: 2, mood: 4 }, log: '5번 출구는 회사와 가까웠습니다. 좋은 판단입니다.' },
    ],
  },
  crosswalk: {
    location: '회사 앞 횡단보도',
    title: '마지막 선택입니다',
    text: '신호가 곧 바뀔 것 같습니다. 햄찌는 마지막으로 어떻게 움직일까요?',
    choices: [
      { label: '🚦 신호를 기다린다', next: 'ending', effects: { time: -1, mood: 6, routeScore: 1 }, log: '안전하게 길을 건넜습니다.' },
      { label: '📱 팀장님께 미리 연락한다', next: 'ending', effects: { mood: 10, routeScore: 1 }, log: '상황 공유 완료! 사회생활 점수가 올랐습니다.' },
    ],
  },
};

const timeText = document.getElementById('timeText');
const moodText = document.getElementById('moodText');
const coffeeText = document.getElementById('coffeeText');
const locationText = document.getElementById('locationText');
const storyTitle = document.getElementById('storyTitle');
const storyText = document.getElementById('storyText');
const choices = document.getElementById('choices');
const logList = document.getElementById('logList');
const hamsterWrap = document.getElementById('hamsterWrap');
const resultPanel = document.getElementById('resultPanel');
const endingTitle = document.getElementById('endingTitle');
const endingText = document.getElementById('endingText');
const restartButton = document.getElementById('restartButton');

function applyEffects(effects = {}) {
  state.time += effects.time || 0;
  state.mood += effects.mood || 0;
  state.coffee += effects.coffee || 0;
  state.routeScore += effects.routeScore || 0;
  state.mood = Math.max(0, Math.min(100, state.mood));
}

function addLog(text) {
  const li = document.createElement('li');
  li.textContent = text;
  logList.prepend(li);
}

function updateStatus() {
  timeText.textContent = `${Math.max(0, state.time)}분`;
  moodText.textContent = state.mood;
  coffeeText.textContent = state.coffee;
}

function renderScene(sceneKey) {
  if (sceneKey === 'ending') {
    showEnding();
    return;
  }

  state.step = sceneKey;
  const scene = scenes[sceneKey];
  locationText.textContent = scene.location;
  storyTitle.textContent = scene.title;
  storyText.textContent = scene.text;
  choices.innerHTML = '';

  scene.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.textContent = choice.label;
    button.addEventListener('click', () => selectChoice(choice));
    choices.appendChild(button);
  });

  updateStatus();
}

function selectChoice(choice) {
  applyEffects(choice.effects);
  addLog(choice.log);
  hamsterWrap.classList.remove('bump');
  void hamsterWrap.offsetWidth;
  hamsterWrap.classList.add('bump');
  updateStatus();

  setTimeout(() => renderScene(choice.next), 260);
}

function showEnding() {
  updateStatus();

  const success = state.time >= 0 && state.mood >= 35 && state.routeScore >= 1;
  const perfect = success && state.time >= 1 && state.mood >= 80 && state.coffee >= 1;

  if (perfect) {
    endingTitle.textContent = '퍼펙트 출근 성공!';
    endingText.textContent = '햄찌는 커피와 사원증까지 챙기고 여유 있게 도착했습니다. 오늘의 MVP는 햄찌입니다.';
  } else if (success) {
    endingTitle.textContent = '출근 성공!';
    endingText.textContent = '조금 아슬아슬했지만 햄찌는 무사히 회사에 도착했습니다. 첫 출근 미션 완료!';
  } else if (state.time < 0) {
    endingTitle.textContent = '지각 엔딩';
    endingText.textContent = '햄찌가 너무 많은 선택지를 고민하다가 지각했습니다. 다음에는 더 빠른 루트를 찾아보세요.';
  } else {
    endingTitle.textContent = '녹초 엔딩';
    endingText.textContent = '회사에는 도착했지만 햄찌의 기분이 너무 낮아졌습니다. 커피나 안전한 선택이 필요했어요.';
  }

  resultPanel.classList.remove('hidden');
}

function restartGame() {
  state.time = 5;
  state.mood = 80;
  state.coffee = 0;
  state.step = 'start';
  state.routeScore = 0;
  logList.innerHTML = '<li>게임 시작! 햄찌가 눈을 떴습니다.</li>';
  resultPanel.classList.add('hidden');
  renderScene('start');
}

restartButton.addEventListener('click', restartGame);
renderScene('start');
