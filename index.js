//const { fabric } = require("./fabric.min");
//fabric.js를 사용한 코드

const canvas = new fabric.Canvas('c');

// 타일 크기 및 맵 설정
const tileSize = 64; // 각 타일 크기 (64x64)
const gridSize = 7;  // 7x7 맵
let region = '들판 폐허';
let mapTiles = []; // 타일 객체를 담을 배열
const playerImageUrl = './images/Player.png';

// 전역 배열 선언
let canvasObjects = [];

// 객체를 캔버스에 추가하고 배열에 저장하는 함수
function addObjectToCanvas(object) {
    canvas.add(object); // 객체를 캔버스에 추가
    canvasObjects.push(object); // 전역 배열에 객체 저장
}

// 배열의 모든 객체를 순서대로 다시 캔버스에 렌더링하는 함수
function renderObjectsInOrder() {
    canvasObjects.forEach((obj, index) => {
        canvas.moveTo(obj, index); // 배열에 저장된 순서대로 캔버스에 그리기
    });
    canvas.renderAll(); // 캔버스 강제 렌더링
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

        this.initTile(); // 타일 초기화
    }

    // 타일 초기화 함수
    initTile() {
        fabric.Image.fromURL(this.imageUrl, (img) => {
            img.scaleToWidth(this.tileSize);
            img.scaleToHeight(this.tileSize);
            this.tileObject = img;
            this.tileObject.set({
                selectable: false, // 타일 선택 불가능
                hoverCursor: 'default', // 기본 커서 설정
                left: this.x * this.tileSize, // 타일의 X 좌표 설정
                top: this.y * this.tileSize // 타일의 Y 좌표 설정
            });
            //canvas.add(this.tileObject); // 캔버스에 타일 추가
            addObjectToCanvas(this.tileObject); // 타일 추가
        });
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

class Player {
    constructor(x, y, canvas, tileSize, imageUrl) {
        this.x = x; // 플레이어의 X 좌표
        this.y = y; // 플레이어의 Y 좌표
        this.canvas = canvas; // 플레이어가 그려질 캔버스
        this.tileSize = tileSize; // 타일 크기
        this.imageUrl = imageUrl; // 플레이어 이미지 경로
        this.playerObject = null; // fabric.Image 객체

    }

    // 플레이어 초기화 함수
    initPlayer() {
        // 플레이어가 이미 생성되었는지 확인
        if (!this.playerObject) {
            // 플레이어가 생성되지 않은 경우에만 초기화
            fabric.Image.fromURL(this.imageUrl, (img) => {
                img.scaleToWidth(this.tileSize);
                img.scaleToHeight(this.tileSize);
                this.playerObject = img;
                this.playerObject.set({
                    selectable: false, // 선택 불가능
                    hoverCursor: 'default', // 기본 커서 설정
                    left: this.x * this.tileSize, // X 좌표 설정
                    top: this.y * this.tileSize  // Y 좌표 설정
                });
                addObjectToCanvas(this.playerObject); // 플레이어 추가
                this.playerObject.bringToFront(); // 플레이어를 항상 앞으로 가져오기
            });
        } else {
            this.updatePlayerPosition(); // 이미 있으면 위치만 업데이트
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
        }
    }

    // 플레이어 이동 함수
    move(direction, mapTiles) {
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

                // 이동하려는 위치의 타일이 reachable인지 확인
                if (targetTile && targetTile.reachable) {
                    this.x = newX;
                    this.y = newY;
                    this.updatePlayerPosition();

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

// 키보드 입력 이벤트 리스너
document.addEventListener('keydown', function(event) {
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
});


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

        this.initObject(); // 오브젝트 초기화
    }

    // 오브젝트 초기화 함수
    initObject() {
        fabric.Image.fromURL(this.imageUrl, (img) => {
            img.scaleToWidth(this.tileSize);
            img.scaleToHeight(this.tileSize);
            this.object = img;
            this.object.set({
                selectable: false, // 선택 불가능
                hoverCursor: 'default', // 기본 커서 설정
                left: this.x * this.tileSize, // X 좌표 설정
                top: this.y * this.tileSize  // Y 좌표 설정
            });
            //canvas.add(this.object); // 캔버스에 오브젝트 추가
            addObjectToCanvas(this.object); // 오브젝트 추가
        });
    }
}

//무작위 위치에 오브젝트 배치
function placeObjects(floorTiles, objectCounts) {
    for (let objectType in objectCounts) {
        const count = objectCounts[objectType];
        
        for (let i = 0; i < count; i++) {
            // 배치할 타일을 무작위로 선택
            const randomIndex = Math.floor(Math.random() * floorTiles.length);
            const { x, y } = floorTiles[randomIndex];

            // 선택한 타일을 배열에서 제거
            floorTiles.splice(randomIndex, 1);

            // 오브젝트 배치 (여기서 objectType에 따라 다른 이미지나 오브젝트를 배치할 수 있음)
            new ObjectTile(objectType, x, y, tileSize, getObjectImageUrl(objectType));
        }
    }
}

// 타일 유형에 맞는 이미지를 무작위로 선택하는 함수
function getRandomTileImage(tileType, region) {
    const tileImageOptions = tileImages[region][tileType]; // 해당 타일 유형에 맞는 이미지 배열 가져오기
    return tileImageOptions[Math.floor(Math.random() * tileImageOptions.length)]; // 랜덤으로 이미지 선택
}

function generateMap(region) {
    canvas.clear(); // 캔버스를 초기화하여 기존 타일을 모두 제거
    canvasObjects = []; // 이전 객체들을 초기화
    let playerStartPosition = null; // 플레이어 시작 위치 변수 초기화

    const mapIndex = Math.floor(Math.random() * predefinedMaps[region].length); // 무작위 맵 선택
    const selectedMap = predefinedMaps[region][mapIndex];

    let floorTiles = []; // Floor 타일 수집 배열

    for (let row = 0; row < gridSize; row++) {
        mapTiles[row] = [];
        for (let col = 0; col < gridSize; col++) {
            const tileType = selectedMap[row][col];
            const tileImageUrl = getRandomTileImage(tileType, region);
            const reachable = (tileType === 'Floor' || tileType === 'Start' || tileType === 'End');

            const tile = new Tile(tileType, col, row, tileSize, tileImageUrl, reachable);
            mapTiles[row][col] = tile;

            // Floor 타일 저장
            if (tileType === 'Floor') {
                floorTiles.push({ x: col, y: row });
            }

            // Start 타일이 있는 경우, 플레이어 시작 위치 설정
            if (tileType === 'Start') {
                playerStartPosition = { x: col, y: row };
            }
        }
    }

    // 플레이어 시작 위치 설정
    if (playerStartPosition) {
        player.x = playerStartPosition.x;
        player.y = playerStartPosition.y;
    }

    player.initPlayer();

    // 오브젝트 배치
    placeObjects(floorTiles, objectCounts);

    // 플레이어를 맨 위로 이동
    canvas.bringToFront(player.playerObject); // 플레이어 객체를 맨 위로 이동
}

// 현재 상태를 저장하는 변수 ('main'은 메인 화면, 'game'은 게임 화면)
let currentScreen = 'main';

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
    
}

// 화면 전환 함수
function switchScreen() {
    if (currentScreen === 'main') {
        generateMainMenu(); // 메인 화면 생성
    } else if (currentScreen === 'game') {
        generateMap(region); // 게임 화면 생성
    }
}

// 처음에는 메인 화면을 보여줌
switchScreen();

// 렌더링 간격 설정 (60fps, 약 16ms)
const renderInterval = 60; // 1000ms / 60fps = 약 16ms

// 캔버스를 지속적으로 렌더링하는 함수
function startRendering() {
    setInterval(() => {
        renderObjectsInOrder() // 캔버스를 지속적으로 렌더링
    }, renderInterval);
}

// 게임 시작 시 렌더링 시작
startRendering();