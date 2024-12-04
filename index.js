//const { fabric } = require("./fabric.min");
//fabric.js를 사용한 코드

const canvas = new fabric.Canvas('c');

// 타일 크기 및 맵 설정
const tileSize = 64; // 각 타일 크기 (64x64)
const gridSize = 7;  // 7x7 맵
let region = '들판 폐허';
let mapTiles = []; // 타일 객체를 담을 배열 이것은 맵 생성시에 맵의 타일만을 담는다.
const playerImageUrl = './images/Player.png';
let floor = 1;
let monsterLevel = 'level1'; // 현재 층의 몬스터 레벨

let currentDescriptionWindow = 'A'; // 현재 표시할 창 ('A' 또는 'B')
let descriptionHistoryA = []; // 창 A의 기록 배열
let descriptionHistoryB = ''; // 창 B의 단일 설명 내용
let descriptionImageB = null; // 설명창 B의 이미지 독립 관리
let currentBDisplayedMonster = null; // 설명창 B에 표시된 몬스터를 추적

// 음악 객체를 딕셔너리로 관리
const audioManager = {
    gameMusic: new Audio('./music/evening_sky-196011.mp3'),
    gameOverMusic: new Audio('./music/game-over-arcade-6435.mp3'),
    endingMusic: new Audio('./music/90s-game-ui-7-185100.mp3'),
    bonfire: new Audio('./music/effect/bonfire.mp3'),
    playerMove: new Audio('./music/effect/move.mp3'),
    select: new Audio('./music/effect/select.mp3'),
    hit: new Audio('./music/effect/hit.mp3'),
    monsterDeath: new Audio('./music/effect/monsterDeath.mp3'),
    chestOpen: new Audio('./music/effect/chestOpen.mp3'),
    pickup: new Audio('./music/effect/pickup.mp3')
};

// 반복 설정 초기화
for (let key in audioManager) {
    audioManager[key].loop = key === 'gameMusic'; // gameMusic만 반복 재생
}

// 음악 관리 함수
function controlAudio(action, key, options = {}) {
    const audio = audioManager[key];
    if (!audio) {
        console.warn(`Audio "${key}" not found.`);
        return;
    }

    switch (action) {
        case 'play':
            audio.currentTime = options.startTime || 0;
            audio.volume = options.volume !== undefined ? options.volume : 1.0;
            audio.play();
            break;

        case 'pause':
            audio.pause();
            if (options.reset) {
                audio.currentTime = 0; // 정지 후 시작 위치 초기화
            }
            break;

        case 'stop':
            audio.pause();
            audio.currentTime = 0; // 정지 후 시작 위치 초기화
            break;

        case 'setVolume':
            audio.volume = options.volume !== undefined ? options.volume : audio.volume;
            break;

        default:
            console.warn(`Invalid action "${action}".`);
    }
}

// 렌더링 순서 목록 배열 
const canvasOrder = {
    descriptionBackground: null,
    descriptionText: null,
    descriptionImage: null, // 설명창 A 또는 B 텍스트 이미지
    playerStatsBackground: null,
    playerStatsText: null,
    floorBackground: null,
    floorText: null,
    switchButtonBackground: null, // 전환 버튼 배경
    switchButtonText: null,       // 전환 버튼 텍스트
    descriptionImageB: null       // B 창 이미지
};

// Promise로 이미지 로드를 처리하는 함수
function loadImage(url, options = {}) {
    return new Promise((resolve) => {
        fabric.Image.fromURL(url, (img) => {
            img.set(options);
            resolve(img);
        });
    });
}

// Canvas에 순서대로 이미지를 추가하는 함수
function addImagesToCanvasInOrder(images) {
    images.forEach((img) => canvas.add(img));
    canvas.renderAll();
}

function updateCanvasOrder() {
    // canvasOrder 배열 순서대로 캔버스에 객체를 추가
    for (let key in canvasOrder) {
        const obj = canvasOrder[key];
        if (obj) {
            canvas.bringToFront(obj);
        }
    }

    canvas.renderAll(); // 캔버스 렌더링
}

function clearCanvas(excludeObjects = []) {
    if (!Array.isArray(excludeObjects)) {
        excludeObjects = [excludeObjects];
    }
    const excludeIds = excludeObjects.map(obj => obj.id);

    // 캔버스에서 제외할 객체를 제외한 모든 객체를 제거
    canvas.getObjects().forEach((obj) => {
        if (!excludeIds.includes(obj.id)) {
            canvas.remove(obj);
        }
    });
    canvas.renderAll();
}

//층 표시
function displayFloor() {
    const floorTextContent = `Floor: ${floor}`;

    // 기존 객체 제거
    const existingFloorText = canvas.getObjects().find(obj => obj.id === 'floorText');
    const existingFloorBackground = canvas.getObjects().find(obj => obj.id === 'floorBackground');

    if (existingFloorText) canvas.remove(existingFloorText);
    if (existingFloorBackground) canvas.remove(existingFloorBackground);

    // 층 표시 배경 생성
    const floorBackground = new fabric.Rect({
        left: 447,
        top: -1,
        width: 600,
        height: 64,
        fill: 'black',
        selectable: false,
        hoverCursor: 'default',
        id: 'floorBackground'
    });
    canvas.add(floorBackground);

    // 층 표시 텍스트 객체 생성
    const floorText = new fabric.Text(floorTextContent, {
        left: canvas.width - 150,
        top: 20,
        fontSize: 24,
        fill: 'lightgray',
        fontFamily: 'KoreanFont',
        selectable: false,
        hoverCursor: 'default',
        id: 'floorText'
    });
    canvas.add(floorText);

    canvas.renderAll();
}

function displayGameOver() {
    controlAudio('stop', 'gameMusic');// 기존 배경 음악 정지
    controlAudio('play', 'gameOverMusic');

    // 게임 오버 배경 생성
    const gameOverBackground = new fabric.Rect({
        left: 0,
        top: 0,
        width: canvas.width,
        height: canvas.height,
        fill: 'rgba(0, 0, 0, 0.7)',
        selectable: false,
        hoverCursor: 'default'
    });
    canvas.add(gameOverBackground);

    // 게임 오버 텍스트 생성
    const gameOverText = new fabric.Text('Game Over', {
        left: canvas.width / 2,
        top: canvas.height / 2,
        fontSize: 48,
        fill: 'red',
        fontFamily: 'KoreanFont',
        selectable: false,
        hoverCursor: 'default',
        originX: 'center',
        originY: 'center'
    });
    canvas.add(gameOverText);

    // 리스타트 버튼 추가
    const restartButton = new fabric.Text("다시 시작", {
        left: canvas.width / 2,
        top: canvas.height / 2 + 40,
        fontSize: 24,
        fill: 'white',
        fontFamily: 'KoreanFont',
        selectable: false,
        hoverCursor: 'pointer',
        originX: 'center',
        originY: 'center'
    });

    restartButton.on('mousedown', restartGame); // 리스타트 기능 연결
    canvas.add(restartButton);

    canvas.renderAll();
}

// 리스타트 기능 구현 (게임 상태 초기화)
function restartGame() {
    // 음악 초기화 및 배경 음악 재생
    controlAudio('stop', 'endingMusic');
    controlAudio('stop', 'gameOverMusic');
    controlAudio('play', 'gameMusic'); // 게임 음악 재생

    // 플레이어 상태 및 게임 설정 초기화
    player.maxhp = 20;
    player.hp = player.maxhp;
    player.maxhpMultiplier = 1.0;
    player.atk = 1;
    player.atkMultiplier = 1.0;
    player.def = 0;
    player.defMultiplier = 1.0;
    player.spd = 1;
    player.spdMultiplier = 1.0;
    player.coin = 0;
    player.coinMultiplier = 1.0;
    floor = 1;
    monsterLevel = 'level1';
    objectCounts.Monster = 5;

    // 인벤토리 초기화
    inventorySlots.forEach(slot => {
        slot.hasRelic = false;
        slot.relic = null;
        if (slot.relicImage) {
            canvas.remove(slot.relicImage);
            slot.relicImage = null;
        }
    });

    // 캔버스를 초기화하고 새로운 맵을 생성
    generateMap(region);
    displayPlayerStats();

    // 플레이어 움직임 활성화
    enablePlayerMovement();
}

// 엔딩 화면 구현
function displayEnding() {
    controlAudio('stop', 'gameMusic'); // 기존 배경 음악 정지
    controlAudio('play', 'endingMusic'); // 클리어 음악 재생
    
    const endingBackground = new fabric.Rect({
        left: 0,
        top: 0,
        width: canvas.width,
        height: canvas.height,
        fill: 'white',
        selectable: false,
        hoverCursor: 'default'
    });
    canvas.add(endingBackground);

    const endingText = new fabric.Text('게임 클리어!', {
        left: canvas.width / 2,
        top: canvas.height / 2 - 20,
        fontSize: 48,
        fill: 'black',
        fontFamily: 'KoreanFont',
        selectable: false,
        hoverCursor: 'default',
        originX: 'center',
        originY: 'center'
    });
    canvas.add(endingText);

    // 다시 플레이 버튼 추가
    const restartButton = new fabric.Text("다시 플레이", {
        left: canvas.width / 2,
        top: canvas.height / 2 + 40,
        fontSize: 24,
        fill: 'black',
        fontFamily: 'KoreanFont',
        selectable: false,
        hoverCursor: 'pointer',
        originX: 'center',
        originY: 'center'
    });

    restartButton.on('mousedown', restartGame); // 리스타트 기능 연결
    canvas.add(restartButton);

    // 플레이어 움직임 비활성화
    disablePlayerMovement();

    canvas.renderAll();
}

function addDescriptionToA(text) {
    // 설명창 A 기록 관리 (최대 5줄 유지)
    descriptionHistoryA.push(text);
    if (descriptionHistoryA.length > 5) {
        descriptionHistoryA.shift(); // 가장 오래된 기록 삭제
    }

    // 만약 현재 창이 A 창이라면 즉시 표시
    if (currentDescriptionWindow === 'A') {
        displayDescription();
    }
}

// 설명창 B의 몬스터 정보를 업데이트하는 함수
function updateDescriptionWindowB(monster) {
    // 몬스터 객체가 유효한지 확인
    if (monster && currentDescriptionWindow === 'B' && currentBDisplayedMonster === monster) {
        // 스탯 정보 텍스트 구성 (몬스터 속성을 직접 참조)
        const descriptionText = `${monster.type} - 몬스터 정보:\nHP: ${monster.hp || 0}/${monster.maxHp || 0}\nATK: ${monster.atk || 0}\nDEF: ${monster.def || 0}\nSPD: ${monster.spd || 0}\nCoins: ${monster.coin || 0}`;

        // 기존 텍스트 객체를 제거하고 새로 추가하여 업데이트
        if (canvasOrder.descriptionText) {
            canvas.remove(canvasOrder.descriptionText);
        }
        const descriptionTextObject = new fabric.Text(descriptionText, {
            left: 100,
            top: 485,
            fontSize: 18,
            fill: 'black',
            fontFamily: 'KoreanFont',
            selectable: false,
            hoverCursor: 'default',
            id: 'descriptionBoxText'
        });
        canvas.add(descriptionTextObject);
        canvasOrder.descriptionText = descriptionTextObject;

        updateCanvasOrder();
        canvas.renderAll();
    }
}

// 몬스터 클릭 시 설명창 B에 표시할 몬스터로 설정
function onMonsterClick(monster) {
    currentBDisplayedMonster = monster;
    updateDescriptionWindowB(monster); // 처음 클릭 시에도 정보 표시
}

function displayDescription(text = '', imageUrl = null) {
    let displayText;

    if (currentDescriptionWindow === 'A') {
        displayText = descriptionHistoryA.join('\n');

        // A 창으로 전환 시 B 창 이미지를 숨김
        if (canvasOrder.descriptionImageB) {
            canvasOrder.descriptionImageB.set('visible', false);
        }
    } else if (currentDescriptionWindow === 'B') {
        if (text) {
            descriptionHistoryB = text;
        }
        displayText = descriptionHistoryB;

        // B 창으로 전환되고 새로운 이미지가 있는 경우 업데이트
        if (imageUrl) {
            // 기존 B 창 이미지 제거 및 초기화
            if (canvasOrder.descriptionImageB) {
                canvas.remove(canvasOrder.descriptionImageB); // 캔버스에서 완전히 제거
                canvasOrder.descriptionImageB = null;         // null로 초기화하여 중복 방지
            }
            fabric.Image.fromURL(imageUrl, (img) => {
                img.scaleToWidth(80);
                img.scaleToHeight(80);
                img.set({
                    left: 10,
                    top: 480,
                    selectable: false,
                    hoverCursor: 'default',
                    id: 'descriptionBoxImage'
                });
                canvas.add(img);
                canvasOrder.descriptionImageB = img; // canvasOrder에 새 이미지 등록
                updateCanvasOrder(); // 순서 재조정
            });
        } else if (canvasOrder.descriptionImageB) {
            // 기존 이미지가 있을 경우 표시만 설정
            canvasOrder.descriptionImageB.set('visible', true);
            updateCanvasOrder();
        }
    }

    // 설명 텍스트 업데이트
    if (canvasOrder.descriptionText) canvas.remove(canvasOrder.descriptionText);
    const descriptionText = new fabric.Text(displayText, {
        left: 100,
        top: 485,
        fontSize: 18,
        fill: 'black',
        fontFamily: 'KoreanFont',
        selectable: false,
        hoverCursor: 'default',
        id: 'descriptionBoxText'
    });
    canvas.add(descriptionText);
    canvasOrder.descriptionText = descriptionText;

    // 설명창 배경 설정
    if (!canvasOrder.descriptionBackground) {
        const descriptionBackground = new fabric.Rect({
            left: 0,
            top: 475,
            width: 600,
            height: 50,
            fill: 'lightgray',
            selectable: false,
            hoverCursor: 'default',
            id: 'descriptionBoxBackground'
        });
        canvas.add(descriptionBackground);
        canvasOrder.descriptionBackground = descriptionBackground;
    }

    updateCanvasOrder();
}

function initializeGameUI() {
    // 설명창 배경 초기화
    let descriptionBackground = canvas.getObjects().find(obj => obj.id === 'descriptionBoxBackground');
    if (!descriptionBackground) {
        descriptionBackground = new fabric.Rect({
            left: 0,
            top: 470,
            width: 600,
            height: canvas.height - 470,
            fill: 'lightgray',
            selectable: false,
            hoverCursor: 'default',
            id: 'descriptionBoxBackground'
        });
        canvas.add(descriptionBackground);
    }

    displayDescription("게임을 시작합니다."); // 창 A의 첫 내용 표시
    addSwitchButton(); // 전환 버튼 추가
}

function addSwitchButton() {
    const buttonBackground = new fabric.Rect({
        left: 540,
        top: 447,
        width: 60,
        height: 25,
        fill: 'skyblue',
        selectable: false,
        hoverCursor: 'pointer',
        id: 'switchButtonBackground'
    });
    const buttonText = new fabric.Text('전환', {
        left: 550,
        top: 447,
        fontSize: 20,
        fill: 'black',
        fontFamily: 'KoreanFont',
        selectable: false,
        hoverCursor: 'pointer',
        id: 'switchButtonText'
    });

    const toggleDescriptionWindow = () => {
        controlAudio('play', 'select');
        currentDescriptionWindow = (currentDescriptionWindow === 'A') ? 'B' : 'A';
        displayDescription();
    };

    buttonBackground.on('mousedown', toggleDescriptionWindow);
    buttonText.on('mousedown', toggleDescriptionWindow);

    canvas.add(buttonBackground);
    canvas.add(buttonText);

    // canvasOrder에 버튼 배경과 텍스트 추가
    canvasOrder.switchButtonBackground = buttonBackground;
    canvasOrder.switchButtonText = buttonText;

    updateCanvasOrder();
}

function addClickEventToObjects(object, description, imageUrl) {
    object.on('mousedown', () => {
        if (currentDescriptionWindow === 'B') {
            controlAudio('play', 'select');
            displayDescription(description, imageUrl);
        }
    });
}

// 이미지 정보를 담은 배열 생성
const menuImages = [
    {
        src: './images/main.png', // 배경 이미지 경로
        left: 0, // 배경 이미지의 x 좌표
        top: 0,  // 배경 이미지의 y 좌표
        onClick: null // 클릭 이벤트 없음
    },
    {
        src: './images/Game_Title.png',   // 이미지 경로
        left: 200,     // 이미지 x 좌표 (예: 300px 너비 이미지)
        top: 25,                          // 이미지 y 좌표
        onClick: null                     // 클릭 이벤트 없음 (제목 이미지이므로)
    },
    {
        src: './images/Button_GameStart.png',
        left: 20,     // 버튼 x 좌표 (예: 200px 너비 이미지)
        top: 500,                         // 버튼 y 좌표
        onClick: function() {             // 클릭 시 이벤트
            currentScreen = 'game';
            generateMap(region);          // 게임 시작
            controlAudio('play', 'gameMusic'); // 게임 음악 재생
        }
    }
    /*
    {
        src: './images/Button_GameSetting.png',
        left: 25,     // 버튼 x 좌표 (예: 200px 너비 이미지)
        top: 500,                         // 버튼 y 좌표
        onClick: function() {             
        }
    }
    */
    // 다른 이미지나 버튼 추가 가능
];

// Tile 클래스 정의
class Tile {
    constructor(type, x, y, tileSize, imageUrl, reachable) {
        this.type = type; // 타일의 타입 (예: 'Wall', 'Floor', 'Start', 'End', 'River')
        this.x = x; // 타일의 X 좌표
        this.y = y; // 타일의 Y 좌표
        this.tileSize = tileSize; // 타일 크기
        this.imageUrl = imageUrl; // 타일 이미지 URL
        this.reachable = reachable; // 이 타일로 이동 가능한지 여부 (true: 이동 가능, false: 이동 불가)
        this.tileObject = null; // fabric.Image 객체
        this.monster = null; // 타일에 몬스터가 있는지 확인하기 위한 속성

    }

    // 타일 초기화 함수
    async initTile() {
        const img = await loadImage(this.imageUrl, {
            selectable: false,
            hoverCursor: 'default',
            left: this.x * this.tileSize,
            top: this.y * this.tileSize,
            width: this.tileSize,
            height: this.tileSize
        });
        this.tileObject = img;
        return img;
    }
}

// 타일 유형에 따른 이미지 배열 정의
const tileImages = { 
    '들판 폐허' :
    {
      'Wall': ['./images/Area1Wall1.png', './images/Area1Wall2.png', './images/Area1Wall3.png', './images/Area1Wall4.png'],
      'Floor': ['./images/Area1Floor2.png', './images/Area1Floor3.png', './images/Area1Floor4.png', './images/Area1Floor5.png',
        './images/Area1Floor6.png', './images/Area1Floor7.png', './images/Area1Floor8.png', './images/Area1Floor9.png'],
      'Start': ['./images/Area1Start1.png'],
      'End': ['./images/Area1Exit1.png', './images/Area1Exit2.png', './images/Area1Exit3.png', './images/Area1Exit4.png'],
      'River': ['./images/Area1River1.png', './images/Area1River2.png', './images/Area1River3.png', './images/Area1River4.png']
    },
    '동굴' : 
    {
      'Wall': ['./images/Area2Wall1.png', './images/Area2Wall2.png', './images/Area2Wall3.png', './images/Area2Wall4.png'],
      'Floor': ['./images/Area2Floor2.png', './images/Area2Floor3.png', './images/Area2Floor4.png', './images/Area2Floor5.png',
        './images/Area2Floor6.png', './images/Area2Floor7.png', './images/Area2Floor8.png', './images/Area2Floor9.png'],
      'Start': ['./images/Area2Start1.png'],
      'End': ['./images/Area2Exit1.png', './images/Area2Exit2.png', './images/Area2Exit3.png', './images/Area2Exit4.png'],
      'River': ['./images/Area2River1.png', './images/Area2River2.png', './images/Area2River3.png', './images/Area2River4.png']
    }
};

const predefinedMaps = {
    '들판 폐허': [
        // 맵 1
        [
            ['Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall'],
            ['Wall', 'Floor', 'Floor', 'Wall', 'Floor', 'Floor', 'Wall'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['Start', 'Floor', 'Wall', 'Floor', 'Wall', 'Floor', 'End'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['Wall', 'Floor', 'Floor', 'Wall', 'Floor', 'Floor', 'Wall'],
            ['Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall']
        ],
        // 맵 2
        [
            ['Start', 'Floor', 'Floor', 'Floor', 'Floor', 'Wall', 'Wall'],
            ['Wall', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Wall'],
            ['Wall', 'Floor', 'Wall', 'Wall', 'Wall', 'Floor', 'Wall'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Wall'],
            ['Floor', 'Floor', 'Wall', 'Floor', 'Floor', 'Floor', 'Wall'],
            ['Floor', 'Wall', 'Wall', 'Floor', 'Wall', 'Floor', 'Wall'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'End']
        ],
        // 맵 3
        [
            ['End', 'Floor', 'Floor', 'Floor', 'River', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'River', 'Floor', 'River'],
            ['Floor', 'Floor', 'River', 'Floor', 'River', 'Floor', 'River'],
            ['River', 'Floor', 'River', 'Floor', 'Floor', 'Floor', 'River'],
            ['River', 'Floor', 'River', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['River', 'Floor', 'Floor', 'Floor', 'River', 'Floor', 'Start'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'River', 'Floor', 'Floor']
        ],
        // 맵 4
        [
            ['Start', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'End'],
            ['Floor', 'Floor', 'Floor', 'Wall', 'Wall', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['River', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'River'],
            ['River', 'River', 'River', 'Floor', 'Floor', 'Floor', 'River'],
            ['River', 'River', 'River', 'River', 'River', 'River', 'River'],
            ['River', 'River', 'River', 'River', 'River', 'River', 'River']
        ],
        // 맵 5
        [
            ['River', 'River', 'Floor', 'Floor', 'Floor', 'River', 'River'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Wall', 'Wall', 'Wall', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'End', 'Wall', 'Start', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Wall', 'Wall', 'Wall', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['River', 'River', 'Floor', 'Floor', 'Floor', 'River', 'River']
        ],
        // 맵 6
        [
            ['Wall', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Wall'],
            ['Wall', 'Floor', 'Wall', 'Wall', 'Floor', 'Floor', 'Wall'],
            ['Floor', 'Floor', 'Start', 'Wall', 'Floor', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'River', 'Wall', 'River', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Wall', 'End', 'Floor', 'Floor'],
            ['Wall', 'Floor', 'Floor', 'Wall', 'Wall', 'Floor', 'Wall'],
            ['Wall', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Wall']
        ],
        // 맵 7
        [
            ['Wall', 'Wall', 'Floor', 'Floor', 'Floor', 'Floor', 'End'],
            ['Wall', 'Floor', 'Floor', 'Wall', 'Floor', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Wall', 'Floor'],
            ['Floor', 'Floor', 'Wall', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['Floor', 'Wall', 'Floor', 'Floor', 'Wall', 'Wall', 'Wall'],
            ['Start', 'Floor', 'Floor', 'Wall', 'Wall', 'Wall', 'Wall']
        ],
        // 맵 8
        [
            ['Floor', 'Floor', 'Floor', 'Start', 'Floor', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['Floor', 'Wall', 'Floor', 'Floor', 'Floor', 'Wall', 'Floor'],
            ['Floor', 'Wall', 'Floor', 'Floor', 'Floor', 'Wall', 'Floor'],
            ['Floor', 'Wall', 'Floor', 'River', 'Floor', 'Wall', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'River', 'Floor', 'Floor', 'Floor'],
            ['River', 'River', 'Floor', 'End', 'Floor', 'River', 'River']
        ],
        // 맵 9
        [
            ['River', 'River', 'River', 'River', 'River', 'Wall', 'Start'],
            ['River', 'River', 'River', 'Floor', 'Floor', 'Wall', 'Floor'],
            ['River', 'River', 'Floor', 'Floor', 'Floor', 'Wall', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Wall', 'Floor', 'Floor', 'Floor'],
            ['End', 'Floor', 'Floor', 'Wall', 'Wall', 'Wall', 'Wall']
        ],
        // 맵 10
        [
            ['River', 'River', 'River', 'River', 'River', 'River', 'River'],
            ['River', 'River', 'Floor', 'Floor', 'Floor', 'River', 'River'],
            ['River', 'Floor', 'Floor', 'Floor', 'River', 'River', 'River'],
            ['River', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'River'],
            ['River', 'Floor', 'Wall', 'Wall', 'Floor', 'Floor', 'River'],
            ['River', 'Floor', 'End', 'Wall', 'Start', 'Floor', 'River'],
            ['Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall']
        ],
        // 맵 11
        [
            ['River', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall'],
            ['River', 'River', 'River', 'Floor', 'Floor', 'Wall', 'Wall'],
            ['River', 'River', 'Floor', 'Floor', 'Floor', 'Wall', 'Wall'],
            ['River', 'Floor', 'Floor', 'Floor', 'Floor', 'Wall', 'Wall'],
            ['River', 'Start', 'Floor', 'Floor', 'Floor', 'End', 'Wall'],
            ['River', 'River', 'Floor', 'Floor', 'Floor', 'Floor', 'Wall'],
            ['River', 'River', 'River', 'River', 'Floor', 'Floor', 'Wall']
        ]
    ],
    '동굴': [
        // 맵 1
        [
            ['End', 'Floor', 'Floor', 'Floor', 'River', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'River', 'Floor', 'River'],
            ['Floor', 'Floor', 'River', 'Floor', 'River', 'Floor', 'River'],
            ['River', 'Floor', 'River', 'Floor', 'Floor', 'Floor', 'River'],
            ['River', 'Floor', 'River', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['River', 'Floor', 'Floor', 'Floor', 'River', 'Floor', 'Start'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'River', 'Floor', 'Floor']
        ],
        // 맵 2
        [
            ['Start', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'End'],
            ['Floor', 'Floor', 'Floor', 'Wall', 'Wall', 'Floor', 'Floor'],
            ['Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor'],
            ['River', 'Floor', 'Floor', 'Floor', 'Floor', 'Floor', 'River'],
            ['River', 'River', 'River', 'Floor', 'Floor', 'Floor', 'River'],
            ['River', 'River', 'River', 'River', 'River', 'River', 'River'],
            ['River', 'River', 'River', 'River', 'River', 'River', 'River']
        ]
    ]
};

// 층에 따른 몬스터 정보 배열
const monsterData = {
    level1 : [
        {
            type: 'Slime',
            imageUrl: './images/Slime.png',
            maxHp: 10,
            atk: 1,
            def: 0,
            spd: 1,
            coin: 5
        },
        {
            type: 'Bat',
            imageUrl: './images/Bat.png',
            maxHp: 6,
            atk: 2,
            def: 0,
            spd: 3,
            coin: 8
        }
    ],
    level2 : [
        {
            type: 'Goblin',
            imageUrl: './images/Goblin.png',
            maxHp: 20,
            atk: 4,
            def: 0,
            spd: 2,
            coin: 15
        },
        {
            type: 'Orc',
            imageUrl: './images/Orc.png',
            maxHp: 30,
            atk: 6,
            def: 1,
            spd: 1,
            coin: 20
        }
    ],
    level3 : [
        {
            type: 'Hunter',
            imageUrl: './images/Hunter.png',
            maxHp: 25,
            atk: 4,
            def: 2,
            spd: 4,
            coin: 30
        },
        {
            type: 'Golem',
            imageUrl: './images/Golem.png',
            maxHp: 40,
            atk: 3,
            def: 5,
            spd: 1,
            coin: 42
        }
    ],
    level4 : [
        {
            type: 'Devil',
            imageUrl: './images/Devil.png',
            maxHp: 20,
            atk: 5,
            def: 0,
            spd: 10,
            coin: 55
        },
        {
            type: 'Dragon',
            imageUrl: './images/Dragon.png',
            maxHp: 60,
            atk: 10,
            def: 3,
            spd: 2,
            coin: 83
        }
    ]
};

class Monster {
    constructor(type, x, y, tileSize, imageUrl, maxHp, atk, def, spd, coin) {
        this.type = type; // 몬스터 타입 (예: 'Slime', 'Bat')
        this.x = x; // 몬스터의 X 좌표
        this.y = y; // 몬스터의 Y 좌표
        this.tileSize = tileSize; // 타일 크기
        this.imageUrl = imageUrl; // 몬스터 이미지 경로
        this.maxHp = maxHp; // 최대 체력
        this.hp = maxHp; // 현재 체력
        this.atk = atk; // 공격력
        this.def = def; // 방어력
        this.spd = spd; // 속도
        this.coin = coin; // 돈
        this.monsterObject = null; // fabric.Image 객체
        
    }

    // 몬스터 초기화 함수
    async initMonster() {
        const img = await loadImage(this.imageUrl, {
            selectable: false,
            hoverCursor: 'default',
            left: this.x * this.tileSize,
            top: this.y * this.tileSize,
            width: this.tileSize,
            height: this.tileSize
        });
        this.monsterObject = img;

        const healthBarWidth = 50; // 체력바 최대 너비
        this.healthBar = new fabric.Rect({
            selectable: false, 
            hoverCursor: 'default',
            left: img.left + (this.tileSize - healthBarWidth) / 2,
            top: img.top + 2,
            width: 50,
            height: 4,
            fill: 'red'
        });

        // 설명창 B 업데이트를 위한 클릭 이벤트 연결
        this.monsterObject.on('mousedown', () => onMonsterClick(this));

        // 설명 텍스트 
        const description = `${this.type} - MAX_HP: ${this.maxHp}, ATK: ${this.atk}, DEF: ${this.def}, SPD: ${this.spd}, 보유 코인: ${this.coin}`;
        addClickEventToObjects(this.monsterObject, description, this.imageUrl);

        return [img, this.healthBar];
    }

    // 현재 몬스터 상태를 반환하는 함수 추가
    getCurrentStats() {
        return `HP: ${this.hp}/${this.maxHp}\nATK: ${this.atk}\nDEF: ${this.def}\nSPD: ${this.spd}\nCoins: ${this.coin}`;
    }

    // 체력 업데이트 메서드
    updateHealth(newHp) {
        this.hp = newHp;
        const newWidth = (this.hp / this.maxHp) * 50;
        this.healthBar.set({ width: newWidth });
        this.healthBar.left = this.monsterObject.left + (this.tileSize - newWidth) / 2;
        canvas.renderAll();
    }
    
}

function engageCombat(player, monster, tile) {
    controlAudio('play', 'hit');
    // 공격 순서 결정: 속도에 따라 순서 설정
    if (player.spd > monster.spd) {
        playerAttack(player, monster); // 플레이어가 먼저 공격
        if (monster.hp > 0) {
            monsterAttack(player, monster); // 몬스터가 반격
        }
    } else if (player.spd < monster.spd) {
        monsterAttack(player, monster); // 몬스터가 먼저 공격
        if (player.hp > 0) {
            playerAttack(player, monster); // 플레이어가 반격
        }
    } else {
        // 속도가 같다면 무작위로 순서 결정
        if (Math.random() < 0.5) {
            playerAttack(player, monster);
            if (monster.hp > 0) {
                monsterAttack(player, monster);
            }
        } else {
            monsterAttack(player, monster);
            if (player.hp > 0) {
                playerAttack(player, monster);
            }
        }
    }

    // 몬스터의 체력 업데이트
    monster.updateHealth(monster.hp); // 몬스터의 체력바와 텍스트 업데이트

    // 전투 종료 후 몬스터가 죽으면 제거
    if (monster.hp <= 0) {
        controlAudio('play', 'monsterDeath');
        // 플레이어가 몬스터의 코인을 획득
        player.coin += monster.coin;
        addDescriptionToA(`플레이어가 ${monster.type}를 처치하고 ${monster.coin} 코인을 획득했습니다!`);
        updateCanvasOrder()

        canvas.remove(monster.monsterObject);
        canvas.remove(monster.healthBar);
        
        // 타일이 정의되어 있고, 타일이 현재 몬스터를 참조하고 있을 때만
        if (tile && tile.monster === monster) {
            tile.monster = null; // 타일의 몬스터 속성을 null로 설정
        }

        displayPlayerStats()
    }
}

function playerAttack(player, monster) {
    const damage = Math.max(1, player.atk - monster.def);
    monster.hp -= damage;
    addDescriptionToA(`공격으로 ${monster.type}에게 ${damage} 피해를 가했습니다.`);

    /*
    // 설명창 B에 표시된 몬스터일 경우 스탯 업데이트
    updateDescriptionWindowB(monster);
    */
}

function monsterAttack(player, monster) {
    player.hp -= Math.max(1, monster.atk - player.def);
    addDescriptionToA(`${monster.type}로 부터 ${monster.atk - player.def} 피해를 받았습니다.`);
    displayPlayerStats(); // 플레이어 체력 정보 갱신

    // 체력이 0 이하가 되면 게임 오버 상태 표시
    if (player.hp <= 0) {
        displayGameOver();
        document.removeEventListener('keydown', handlePlayerMove); // 플레이어 입력 비활성화
    }
}

function healPlayer(amount) {
    player.hp = Math.min(player.maxhp, player.hp + amount); // 최대 체력 이상으로 회복되지 않음
    displayPlayerStats(); // 체력 정보 갱신
}

function healPlayerBonfire(amount) {
    controlAudio('play', 'bonfire');
    player.hp = Math.min(player.maxhp, player.hp + Math.round(player.maxhp/2) + amount); // 최대 체력 이상으로 회복되지 않음
    displayPlayerStats(); // 체력 정보 갱신
}

function checkAdjacentMonsters(player, mapTiles) {
    const adjacentTiles = [
        { x: player.x - 1, y: player.y }, // 왼쪽
        { x: player.x + 1, y: player.y }, // 오른쪽
        { x: player.x, y: player.y - 1 }, // 위
        { x: player.x, y: player.y + 1 }  // 아래
    ];

    adjacentTiles.forEach(tile => {
        if (tile.x >= 0 && tile.x < mapTiles[0].length && tile.y >= 0 && tile.y < mapTiles.length) {
            const adjacentTile = mapTiles[tile.y][tile.x];
            if (adjacentTile && adjacentTile.monster) {
                // 몬스터의 속도가 플레이어보다 높을 경우 또는 같을 경우 무작위로 공격
                if (adjacentTile.monster.spd > player.spd || (adjacentTile.monster.spd === player.spd && Math.random() < 0.5)) {
                    monsterAttack(player, adjacentTile.monster);
                }
            }
        }
    });
}

// Bonfire 클래스 정의
class Bonfire {
    constructor(x, y, tileSize, imageUrl) {
        this.x = x;
        this.y = y;
        this.tileSize = tileSize;
        this.imageUrl = imageUrl;
        this.bonfireObject = null;
    }

    async initBonfire() {
        const img = await loadImage(this.imageUrl, {
            selectable: false,
            hoverCursor: 'default',
            left: this.x * this.tileSize,
            top: this.y * this.tileSize,
            width: this.tileSize,
            height: this.tileSize
        });
        this.bonfireObject = img;
        return img;
    }
}

class Player {
    constructor(x, y, canvas, tileSize, imageUrl) {
        this.x = x; // 플레이어의 X 좌표
        this.y = y; // 플레이어의 Y 좌표
        this.canvas = canvas; // 플레이어가 그려질 캔버스
        this.tileSize = tileSize; // 타일 크기
        this.imageUrl = imageUrl; // 플레이어 이미지 경로
        this.playerObject = null; // fabric.Image 객체

        this.maxhp = 20;
        this.maxhpMultiplier = 1.0;
        this.hp = 20;
        this.atk = 1;
        this.atkMultiplier = 1.0;
        this.def = 0;
        this.defMultiplier = 1.0;
        this.spd = 1;
        this.spdMultiplier = 1.0;
        this.coin = 0;
        this.coinMultiplier = 1.0;
        
    }

    // 플레이어 초기화 함수
    async initPlayer() {
        if (!this.playerObject) {
            const img = await loadImage(this.imageUrl, {
                selectable: false,
                hoverCursor: 'default',
                left: this.x * this.tileSize,
                top: this.y * this.tileSize,
                width: this.tileSize,
                height: this.tileSize
            });
            this.playerObject = img;
            this.canvas.add(this.playerObject);
        } else {
            this.updatePlayerPosition();
        }
    }

    // 플레이어 위치 업데이트 함수
    updatePlayerPosition() {
        if (this.playerObject) {
            this.playerObject.set({
                left: this.x * this.tileSize,
                top: this.y * this.tileSize
            });
            this.playerObject.bringToFront(); // 플레이어를 항상 앞으로 가져오기
            this.canvas.renderAll(); // 위치 업데이트 후 캔버스를 렌더링
        }
    }

    // 플레이어 이동 함수
    async move(direction, mapTiles, inventorySlots) {
        // mapTiles가 정의되지 않았거나 빈 배열이면 아무 동작도 하지 않음
        if (!mapTiles || mapTiles.length === 0) {
            return;
        }

        let newX = this.x;
        let newY = this.y;

        // 방향에 따라 새로운 좌표 계산
        if (direction === 'up' && this.y > 0) {
            newY--;
        } else if (direction === 'down' && this.y < mapTiles.length - 1) {
            newY++;
        } else if (direction === 'left' && this.x > 0) {
            newX--;
        } else if (direction === 'right' && this.x < mapTiles[0].length - 1) {
            newX++;
        }

        // 새로운 좌표가 유효한지 확인
        if (newY >= 0 && newY < mapTiles.length) {
            if (newX >= 0 && newX < mapTiles[newY].length) {
                const targetTile = mapTiles[newY][newX];

                // 상자와 상호작용하여 유물 획득
                if (targetTile && targetTile.objectType === 'RelicChest') {
                    const chest = targetTile.object;
                    await chest.openChest(inventorySlots); // 인벤토리에 무작위 유물 추가
                    mapTiles[newY][newX].object = null; // 상자 제거
                    return; // 상자와 상호작용 후 이동하지 않음
                }
                
                // 몬스터와 상호작용
                if (targetTile && targetTile.monster) {
                    engageCombat(this, targetTile.monster, targetTile);
                }

                // 화톳불과 상호작용하여 체력 회복
                else if (targetTile && targetTile.bonfire) {
                    healPlayerBonfire(0); // 화톳불로 체력 회복
                    this.canvas.remove(targetTile.bonfire.bonfireObject); // Bonfire 제거
                    delete targetTile.bonfire; // 타일의 화톳불 속성 제거
                }

                else if (targetTile && targetTile.relicChest) {
                    const relic = getRandomRelic();
                    if (relic) {
                        promptRelicDecision(relic); // 유물 획득 여부 결정 함수 호출
                    } else {
                        addDescriptionToA("상자에는 아무것도 없습니다.");
                    }
                    canvas.remove(targetTile.relicChest.chestObject);
                    delete targetTile.relicChest;
                }

                // 이동 가능한 경우에만 플레이어 위치 업데이트
                else if (targetTile && targetTile.reachable) {
                    this.x = newX;
                    this.y = newY;
                    controlAudio('play', 'playerMove');
                    this.updatePlayerPosition();
                    checkAdjacentMonsters(this, mapTiles); // 인접한 몬스터가 있으면 공격 받을 수 있음

                    // End 타일에 도달한 경우 맵을 재생성
                    if (targetTile.type === 'End') {
                        generateMap(region); // 새로운 맵 생성
                    }
                }
            }
        }
    }
}

let player = new Player(0, 0, canvas, tileSize, playerImageUrl); // 플레이어 객체를 전역으로 선언

function disablePlayerMovement() {
    document.removeEventListener('keydown', handlePlayerMove);
}

function enablePlayerMovement() {
    document.addEventListener('keydown', handlePlayerMove);
}

// 플레이어 속성 정보를 화면 왼쪽 아래에 표시하는 함수
function displayPlayerStats() {
    const statsTextContent = `HP: ${player.hp}/${player.maxhp}    ATK: ${player.atk}    DEF: ${player.def}    SPD: ${player.spd}    Coins: ${player.coin}`;

    // 기존 스탯 텍스트 및 배경 제거
    const existingBackground = canvas.getObjects().find(obj => obj.id === 'playerStatsBackground');
    const existingText = canvas.getObjects().find(obj => obj.id === 'playerStatsText');

    if (existingBackground) canvas.remove(existingBackground);
    if (existingText) canvas.remove(existingText);

    // 스탯 배경 생성
    const playerStatsBackground = new fabric.Rect({
        left: 0,
        top: 447,
        width: 600,
        height: 25,
        fill: 'black',
        selectable: false,
        hoverCursor: 'default',
        id: 'playerStatsBackground'
    });
    canvas.add(playerStatsBackground);

    // 스탯 텍스트 생성
    const playerStatsText = new fabric.Text(statsTextContent, {
        left: 20,
        top: 447,
        fontSize: 24,
        fill: 'lightgray',
        fontFamily: 'KoreanFont',
        selectable: false,
        hoverCursor: 'default',
        id: 'playerStatsText'
    });
    canvas.add(playerStatsText);

    canvasOrder.playerStatsText = playerStatsText;
    updateCanvasOrder();
}

function handlePlayerMove(event) {
    // 플레이어 움직임 처리 코드
    if (player) {  // player가 정의되어 있는지 확인
        switch(event.key) {
            case 'ArrowUp':
                player.move('up', mapTiles);  // mapTiles 전달
                break;
            case 'ArrowDown':
                player.move('down', mapTiles);
                break;
            case 'ArrowLeft':
                player.move('left', mapTiles);
                break;
            case 'ArrowRight':
                player.move('right', mapTiles);
                break;
        }
    }
}

document.addEventListener('keydown', handlePlayerMove);

const relics = [
    {
        name: '예리한 검',
        grade: '희귀',
        description: '예리한 검 - 희귀\n공격력 4 증가', 
        effect: () => { player.atk += 4;}, 
        imageUrl: './images/sword.png'
    },
    { 
        name: '도끼', 
        grade: '일반', 
        description: '도끼 - 일반\n공격력 2 증가', 
        effect: () => { player.atk += 2;}, 
        imageUrl: './images/Axe.png' 
    },
    { 
        name: '회복 물약', 
        grade: '일반', 
        description: '회복 물약 - 일반\n얻는 즉시, 체력을 20 회복합니다', 
        effect: () => { player.hp = Math.min(player.hp + 20, player.maxhp); }, 
        imageUrl: './images/potion2.png' 
    },
    { 
        name: '마법 목걸이', 
        grade: '일반', 
        description: '마법 목걸이 - 일반\n속도 1 증가', 
        effect: () => { player.spd += 1; }, 
        imageUrl: './images/necklace.png' 
    },
    { 
        name: '튼튼한 갑옷', 
        grade: '희귀', 
        description: '튼튼한 갑옷 - 희귀\n방어력 3 증가', 
        effect: () => { player.def += 3; }, 
        imageUrl: './images/armor.png' 
    },
    { 
        name: '악마의 피리', 
        grade: '저주', 
        description: '악마의 피리 - 저주\n방어력 1, 속도 1 증가\n앞으로 나오는 맵의 몬스터 수 2 증가', 
        effect: () => { player.def += 1; player.spd += 1; objectCounts.Monster += 2}, 
        imageUrl: './images/flute.png' 
    },
    { 
        name: '반짝이는 반지', 
        grade: '희귀', 
        description: '반짝이는 반지 - 희귀\n공격력 1, 방어력 1 증가', 
        effect: () => { player.atk += 1; player.def += 1; }, 
        imageUrl: './images/ring.png' 
    },
    { 
        name: '가벼운 물약', 
        grade: '희귀', 
        description: '속도 물약 - 희귀\n속도 3 증가', 
        effect: () => { player.spd += 3; }, 
        imageUrl: './images/potion3.png' 
    },
    { 
        name: '무거운 물약', 
        grade: '일반', 
        description: '무거운 물약 - 일반\n방어력 1 증가', 
        effect: () => { player.def += 1; }, 
        imageUrl: './images/potion1.png' 
    },
    { 
        name: '거대한 팔찌', 
        grade: '희귀', 
        description: '거대한 팔찌 - 희귀\n최대 체력 10 증가', 
        effect: () => { player.maxhp += 10; }, 
        imageUrl: './images/hand.png' 
    },
    { 
        name: '사탕', 
        grade: '일반', 
        description: '사탕 - 일반\n최대 체력 5 증가, 그리고 체력을 5 회복', 
        effect: () => { player.maxhp += 5; player.hp = Math.min(player.hp + 5, player.maxhp)}, 
        imageUrl: './images/candy.png' 
    },
    { 
        name: '신비한 물약', 
        grade: '전설', 
        description: '신비한 물약 - 전설\n최대 체력 20 증가, 그리고 체력을 20 회복', 
        effect: () => { player.maxhp += 20; player.hp = Math.min(player.hp + 20, player.maxhp)}, 
        imageUrl: './images/big_potion.png' 
    },
    { 
        name: '기사 투구', 
        grade: '전설', 
        description: '기사 투구 - 전설\n얻는 즉시, 현재 속도 만큼 방어력 증가', 
        effect: () => { player.def += player.spd;}, 
        imageUrl: './images/helmet.png' 
    },
    /*
    { 
        name: '파괴 지시자의 지휘봉', 
        grade: '희귀', 
        description: '몬스터에게 가하는 유물 피해가 25% 추가', 
        imageUrl: './images/DestructionWand.png',
        effect: () => { player.additionalRelicDamage = 1.25; }
    },
    { 
        name: '종말의 선언문', 
        grade: '전설', 
        description: '40턴마다 모든 몬스터 즉사', 
        imageUrl: './images/ApocalypseScroll.png',
        effect: () => { player.doomCounter = 40; }
    },
    { 
        name: '공기 가방', 
        grade: '일반', 
        description: '인벤토리 빈 칸 1개당 방어력 1 증가', 
        imageUrl: './images/AirBag.png',
        effect: () => { player.def = player.baseDef + inventorySlots.filter(slot => !slot.hasRelic).length; }
    },
    { 
        name: '레몬맛 사탕', 
        grade: '일반', 
        description: '몬스터에게서 얻는 돈 20% 증가', 
        imageUrl: './images/LemonCandy.png',
        effect: () => { player.coinMultiplier = 1.2; }
    },
    { 
        name: '고대왕의 검', 
        grade: '전설', 
        description: '공격 시 25% 확률로 추가 피해 2', 
        imageUrl: './images/AncientKingsSword.png',
        effect: () => { player.hasAncientSword = true; }
    },
    { 
        name: '절규의 반지', 
        grade: '희귀', 
        description: '유물을 버릴 때마다 모든 적에게 3 피해', 
        imageUrl: './images/ScreamRing.png',
        effect: () => { player.hasScreamRing = true; }
    }
    */
];

const inventorySlots = []; // 전역 선언

function createInventory() {
    const inventoryX = 460;
    const inventoryY = 100;
    const slotSize = 64;

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 2; col++) {
            const slot = new fabric.Rect({
                left: inventoryX + col * slotSize,
                top: inventoryY + row * slotSize,
                width: slotSize,
                height: slotSize,
                fill: 'lightgray',
                stroke: 'black',
                strokeWidth: 4,
                selectable: false,
                hoverCursor: 'default',
                id: `inventorySlot_${row}_${col}` // 고유 ID 설정
            });
            canvas.add(slot);
            inventorySlots.push(slot);
        }
    }
}
createInventory();

class RelicChest {
    constructor(x, y, tileSize, imageUrl) {
        this.x = x;
        this.y = y;
        this.tileSize = tileSize;
        this.imageUrl = imageUrl;
        this.chestObject = null;
    }

    async initChest() {
        const img = await loadImage(this.imageUrl, {
            selectable: false,
            hoverCursor: 'default',
            left: this.x * this.tileSize,
            top: this.y * this.tileSize,
            width: this.tileSize,
            height: this.tileSize
        });
        this.chestObject = img;
        return img;
    }
}

function promptRelicDecision(relic) {
    controlAudio('play', 'chestOpen');
    disablePlayerMovement();  // 플레이어 동작 비활성화

    const overlay = new fabric.Rect({
        left: 0,
        top: 0,
        width: gridSize * tileSize,
        height: gridSize * tileSize,
        fill: 'rgba(0, 0, 0, 0.7)',
        selectable: false,
        hoverCursor: 'default'  // 커서를 기본 상태로 유지
    });
    canvas.add(overlay);

    let img;
    fabric.Image.fromURL(relic.imageUrl, (loadedImg) => {
        img = loadedImg;
        img.set({
            left: (gridSize * tileSize) / 2 - img.width / 2,
            top: 150,
            selectable: false,
            hoverCursor: 'default'  // 커서가 변하지 않도록 설정
        });
        canvas.add(img);

        img.on('mousedown', () => {controlAudio('play', 'select'); displayDescription(relic.description, relic.imageUrl)});
    });

    const messageText = new fabric.Text("이 유물을 획득하시겠습니까?", {
        left: (gridSize * tileSize) / 2 - 100,
        top: 250,
        fontSize: 20,
        fill: 'white',
        selectable: false,
        hoverCursor: 'default'
    });
    canvas.add(messageText);

    const yesButton = new fabric.Text("네", {
        left: (gridSize * tileSize) / 2 - 50,
        top: 300,
        fontSize: 20,
        fill: 'white',
        selectable: false,
        hoverCursor: 'pointer'
    });
    yesButton.on('mousedown', () => {
        addRelicToInventory(relic);
        removePromptOverlay([overlay, img, messageText, yesButton, noButton]);
    });
    canvas.add(yesButton);

    const noButton = new fabric.Text("아니오", {
        left: (gridSize * tileSize) / 2 + 20,
        top: 300,
        fontSize: 20,
        fill: 'white',
        selectable: false,
        hoverCursor: 'pointer'
    });
    noButton.on('mousedown', () => {
        removePromptOverlay([overlay, img, messageText, yesButton, noButton]);
    });
    canvas.add(noButton);
}

function removePromptOverlay(objects) {
    objects.forEach((obj) => canvas.remove(obj));
    enablePlayerMovement();  // 플레이어 동작 재활성화
    canvas.renderAll();
}

function getRandomRelic() {
    const availableRelics = relics.filter(relic => 
        !inventorySlots.some(slot => slot.relic && slot.relic.name === relic.name)
    );

    if (availableRelics.length === 0) {
        addDescriptionToA("상자에는 아무것도 없습니다.");
        return null;
    }

    return availableRelics[Math.floor(Math.random() * availableRelics.length)];
}

function addRelicToInventory(relic) {
    if (!relic) {
        addDescriptionToA("상자에는 아무것도 없습니다.");
        return;
    }

    const emptySlot = inventorySlots.find(slot => !slot.hasRelic);
    if (!emptySlot) {
        addDescriptionToA("인벤토리가 가득 차서 유물을 획득할 수 없습니다.");
        return;
    }

    controlAudio('play', 'pickup');
    addDescriptionToA(`유물 "${relic.name}" (${relic.grade})를 획득했습니다!`);
    relic.effect();
    displayPlayerStats();

    fabric.Image.fromURL(relic.imageUrl, (img) => {
        img.set({
            left: emptySlot.left + 2,
            top: emptySlot.top + 2,
            selectable: false,
            hoverCursor: 'default',
        });
        canvas.add(img);
        emptySlot.hasRelic = true;
        emptySlot.relic = relic;
        emptySlot.relicImage = img;

        img.on('mousedown', () => displayDescription(relic.description, relic.imageUrl));
    });
}

//배치할 오브젝트 수를 설정
const objectCounts = {
    'Monster': 5,
    'Shop': 0,
    'RelicChest': 2,
    'Bonfire': 1
};

function getObjectImageUrl(objectType) {
    const objectImages = {
        'Monster': './images/Slime.png',
        'Shop': './images/Shop.png',
        'RelicChest': './images/Chest.png',
        'Bonfire': './images/Bonfire.png'
    };
    
    return objectImages[objectType];
}

class ObjectTile {
    constructor(type, x, y, tileSize, imageUrl) {
        this.type = type; // 오브젝트 타입 (예: 'Monster', 'Shop', 'RelicChest', 'Bonfire')
        this.x = x; // 오브젝트의 X 좌표
        this.y = y; // 오브젝트의 Y 좌표
        this.tileSize = tileSize; // 타일 크기
        this.imageUrl = imageUrl; // 오브젝트 이미지 URL
        this.object = null; // fabric.Image 객체

    }

    // 오브젝트 초기화 함수
    async initObject() {
        const img = await loadImage(this.imageUrl, {
            selectable: false,
            hoverCursor: 'default',
            left: this.x * this.tileSize,
            top: this.y * this.tileSize,
            width: this.tileSize,
            height: this.tileSize
        });
        this.object = img;
        return img;
    }
}

//무작위 위치에 오브젝트 배치
// ObjectTile을 캔버스에 추가하는 함수
async function placeObjects(floorTiles, objectCounts) {
    const objectPromises = [];

    for (let objectType in objectCounts) {
        const count = objectCounts[objectType];
        
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * floorTiles.length);
            const { x, y } = floorTiles[randomIndex];
            floorTiles.splice(randomIndex, 1);

            if (objectType === 'Bonfire') {
                const bonfire = new Bonfire(x, y, tileSize, getObjectImageUrl('Bonfire'));
                mapTiles[y][x].bonfire = bonfire;
                objectPromises.push(bonfire.initBonfire());
            } else if (objectType === 'Monster') {
                const randomMonster = monsterData[monsterLevel][Math.floor(Math.random() * monsterData[monsterLevel].length)];
                const monster = new Monster(randomMonster.type, x, y, tileSize, randomMonster.imageUrl, randomMonster.maxHp, randomMonster.atk, randomMonster.def, randomMonster.spd, randomMonster.coin);
                mapTiles[y][x].monster = monster;
                objectPromises.push(...await monster.initMonster());
            } else if (objectType === 'RelicChest') { // RelicChest 설정 부분
                    const chest = new RelicChest(x, y, tileSize, getObjectImageUrl('RelicChest'));
                    mapTiles[y][x].relicChest = chest; // 타일에 relicChest 속성으로 설정
                    objectPromises.push(chest.initChest());
            } else {
                const object = new ObjectTile(objectType, x, y, tileSize, getObjectImageUrl(objectType));
                objectPromises.push(object.initObject());
            }
        }
    }

    const loadedObjects = await Promise.all(objectPromises);
    addImagesToCanvasInOrder(loadedObjects);
}

// 메뉴 이미지를 순서대로 로드하는 함수
async function loadMainMenuImages() {
    const imagePromises = menuImages.map((config) => loadImage(config.src, {
        left: config.left,
        top: config.top,
        selectable: false,
        hoverCursor: 'default',
        hasControls: false
    }).then((img) => {
        if (config.onClick) img.on('mousedown', config.onClick);
        return img;
    }));

    const images = await Promise.all(imagePromises);
    addImagesToCanvasInOrder(images);
}


// 타일 유형에 맞는 이미지를 무작위로 선택하는 함수
function getRandomTileImage(tileType, region) {
    const tileImageOptions = tileImages[region][tileType]; // 해당 타일 유형에 맞는 이미지 배열 가져오기
    return tileImageOptions[Math.floor(Math.random() * tileImageOptions.length)]; // 랜덤으로 이미지 선택
}

// 게임 맵을 생성하는 함수
async function generateMap(region) {
    if (floor == 10) {
        monsterLevel = 'level2';
    }

    if (floor == 25) {
        monsterLevel = 'level3';
    }

    if (floor == 35) {
        monsterLevel = 'level4';
    }

    if (floor == 50) {
        displayEnding(); // 엔딩 화면 표시
        return;
    }

    //const inventoryImages = inventorySlots
    //.map(slot => slot.relicImage)
    //.filter(img => img); // null 또는 undefined 값 제외

    // 인벤토리에 있는 유물 이미지와 슬롯을 초기화에서 제외
    const descriptionBackground = canvas.getObjects().find(obj => obj.id === 'descriptionBoxBackground');
    const descriptionText = canvas.getObjects().find(obj => obj.id === 'descriptionBoxText');
    const switchButtonBackground = canvas.getObjects().find(obj => obj.id === 'switchButtonBackground');
    const switchButtonText = canvas.getObjects().find(obj => obj.id === 'switchButtonText');
    const inventoryImages = inventorySlots.map(slot => slot.relicImage).filter(img => img);
    clearCanvas([descriptionBackground, descriptionText, switchButtonBackground, switchButtonText, ...inventorySlots, ...inventoryImages]); // 설명창 요소 제외하고 캔버스를 초기화하여 기존 타일을 모두 제거


    canvasObjects = [];
    let playerStartPosition = null;
    let floorTiles = []; // Floor 타일 수집 배열

    const mapIndex = Math.floor(Math.random() * predefinedMaps[region].length);
    const selectedMap = predefinedMaps[region][mapIndex];

    // 모든 타일을 비동기 로딩 후 순서대로 추가
    const tilePromises = [];
    for (let row = 0; row < gridSize; row++) {
        mapTiles[row] = [];
        for (let col = 0; col < gridSize; col++) {
            const tileType = selectedMap[row][col];
            const tileImageUrl = getRandomTileImage(tileType, region);
            const reachable = (tileType === 'Floor' || tileType === 'Start' || tileType === 'End');
            
            const tile = new Tile(tileType, col, row, tileSize, tileImageUrl, reachable);
            mapTiles[row][col] = tile;
            tilePromises.push(tile.initTile());

            if (tileType === 'Floor') {
                floorTiles.push({ x: col, y: row });
            }
            if (tileType === 'Start') {
                playerStartPosition = { x: col, y: row };
            }
        }
    }

    // 모든 타일 로딩 후 캔버스에 추가
    const loadedTiles = await Promise.all(tilePromises);
    addImagesToCanvasInOrder(loadedTiles);

    // 플레이어 시작 위치 설정 및 캔버스에 추가
    if (playerStartPosition) {
        player.x = playerStartPosition.x;
        player.y = playerStartPosition.y;
    }
    await player.initPlayer();

    // 오브젝트 배치
    await placeObjects(floorTiles, objectCounts);

    // 플레이어 객체를 항상 최상위로 배치
    canvas.bringToFront(player.playerObject);

    // 플레이어 속성 정보와 현재 층 표시
    displayPlayerStats();
    displayFloor();

    // 다음 맵을 위해 층 수 증가
    floor++;
}

// 현재 상태를 저장하는 변수 ('main'은 메인 화면, 'game'은 게임 화면)
let currentScreen = 'main';

// 화면 전환 함수
async function switchScreen() {
    if (currentScreen === 'main') {
        await loadMainMenuImages();
    } else if (currentScreen === 'game') {
        await generateMap(region);
    }
}

// 처음에는 메인 화면을 보여줌

// 메인 화면 로딩 시 메인 메뉴 음악 재생
window.addEventListener('DOMContentLoaded', () => {
    initializeGameUI();
    switchScreen();
});
