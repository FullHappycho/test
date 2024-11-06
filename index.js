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
    // 매개변수로 단일 객체가 전달된 경우 배열로 변환
    if (!Array.isArray(excludeObjects)) {
        excludeObjects = [excludeObjects];
    }

    // 제외할 객체의 ID 목록을 생성
    const excludeIds = excludeObjects.map(obj => obj.id);

    // 제외할 객체를 제외한 모든 객체를 캔버스에서 제거
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
        left: 25,     // 버튼 x 좌표 (예: 200px 너비 이미지)
        top: 400,                         // 버튼 y 좌표
        onClick: function() {             // 클릭 시 이벤트
            currentScreen = 'game';
            generateMap(region);          // 게임 시작
        }
    },
    {
        src: './images/Button_GameSetting.png',
        left: 25,     // 버튼 x 좌표 (예: 200px 너비 이미지)
        top: 500,                         // 버튼 y 좌표
        onClick: function() {             
        }
    }
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
        ]
    ],
    '동굴': [
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

        // 설명 텍스트 
        const description = `${this.type} - HP: ${this.hp}/${this.maxHp}, ATK: ${this.atk}, DEF: ${this.def}, SPD: ${this.spd}, 보유 코인: ${this.coin}`;
        addClickEventToObjects(this.monsterObject, description, this.imageUrl);

        return [img, this.healthBar];
    }

    // 체력 업데이트 메서드
    // 체력 업데이트 시 canvas.add 직접 호출
    updateHealth(newHp) {
        this.hp = newHp;
        const newWidth = (this.hp / this.maxHp) * 50;
        this.healthBar.set({ width: newWidth });
        this.healthBar.left = this.monsterObject.left + (this.tileSize - newWidth) / 2;
        canvas.renderAll();
    }
}

function engageCombat(player, monster, tile) {
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
        this.hp = 20;
        this.atk = 5;
        this.def = 0;
        this.spd = 1;
        this.coin = 0;
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
                    addRelicToInventory(getRandomRelic());
                    addDescriptionToA("유물을 획득했습니다!");
                    canvas.remove(targetTile.relicChest.chestObject);
                    delete targetTile.relicChest;
                }

                // 이동 가능한 경우에만 플레이어 위치 업데이트
                else if (targetTile && targetTile.reachable) {
                    this.x = newX;
                    this.y = newY;
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
    { name: 'Cursed Sword', grade: 'Curse', description: '공격력 증가, 방어력 감소', effect: () => { player.atk += 3; player.def -= 1; }},
    { name: 'Healing Herb', grade: 'Common', description: '체력을 5 회복합니다', effect: () => { player.hp = Math.min(player.hp + 5, player.maxhp); }},
    { name: 'Magic Amulet', grade: 'Rare', description: '속도 증가', effect: () => { player.spd += 1; }},
    { name: 'Legendary Armor', grade: 'Legendary', description: '방어력 크게 증가', effect: () => { player.def += 5; }}
];

function createInventory() {
    const inventoryX = 480; // 층 표시 아래, 전환 버튼 위의 위치
    const inventoryY = 100;
    const slotSize = 64;
    const inventory = [];

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 2; col++) {
            const slot = new fabric.Rect({
                left: inventoryX + col * slotSize,
                top: inventoryY + row * slotSize,
                width: slotSize,
                height: slotSize,
                fill: 'lightgray',
                stroke: 'black',
                strokeWidth: 1,
                selectable: false,
                hoverCursor: 'default'
            });
            canvas.add(slot);
            inventory.push(slot);
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

async function handlePlayerMoveToChest(player, chest, mapTiles) {
    // 유물 획득 로직 구현
    addRelicToInventory(getRandomRelic());
    addDescriptionToA("유물을 획득했습니다!");
    
    // 상자 제거
    canvas.remove(chest.chestObject);
    delete mapTiles[chest.y][chest.x].relicChest;
}

function getRandomRelic() {
    return relics[Math.floor(Math.random() * relics.length)];
}

function addRelicToInventory(relic) {
    // 인벤토리에 유물 추가하는 로직 (인벤토리 UI와 연동)
    addDescriptionToA(`유물 "${relic.name}" (${relic.grade})를 획득했습니다!`);
    relic.effect();
    displayPlayerStats();
}



//배치할 오브젝트 수를 설정
const objectCounts = {
    'Monster': 5,
    'Shop': 1,
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

// 게임 맵을 순서대로 생성하는 함수
async function generateMap(region) {
    if (floor > 5) {
        monsterLevel = 'level2';
    }

    const descriptionBackground = canvas.getObjects().find(obj => obj.id === 'descriptionBoxBackground');
    const descriptionText = canvas.getObjects().find(obj => obj.id === 'descriptionBoxText');
    const switchButtonBackground = canvas.getObjects().find(obj => obj.id === 'switchButtonBackground');
    const switchButtonText = canvas.getObjects().find(obj => obj.id === 'switchButtonText');
    clearCanvas([descriptionBackground, descriptionText, switchButtonBackground, switchButtonText]); // 설명창 요소 제외하고 캔버스를 초기화하여 기존 타일을 모두 제거

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

    // 설명창 배경과 텍스트가 제거되지 않고 유지되도록 보장
    //initializeGameUI();

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

/*
// 메뉴 화면을 생성하는 함수
function generateMainMenu() {
    // 캔버스 초기화
    canvas.clear();

    // 이미지 배열을 순회하며 캔버스에 이미지 추가
    menuImages.forEach(function(imageConfig) {
        fabric.Image.fromURL(imageConfig.src, function(img) {
            img.set({
                left: imageConfig.left,
                top: imageConfig.top,
                selectable: false,
                hoverCursor: 'default'
            });

            // 클릭 이벤트가 있으면 설정
            if (imageConfig.onClick) {
                img.on('mousedown', imageConfig.onClick);
            }

            // 캔버스에 이미지 추가
            canvas.add(img);
        });
        
    });
    
}*/

// 화면 전환 함수
async function switchScreen() {
    if (currentScreen === 'main') {
        await loadMainMenuImages();
    } else if (currentScreen === 'game') {
        await generateMap(region);
    }
}

// 처음에는 메인 화면을 보여줌
initializeGameUI();
switchScreen();

// 렌더링 간격 설정 (60fps)
//const renderInterval = 60;
