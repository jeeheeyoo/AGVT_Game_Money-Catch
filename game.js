// 게임 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const gameClearElement = document.getElementById('gameClear');
const clearScoreElement = document.getElementById('clearScore');
const restartBtn = document.getElementById('restartBtn');
const clearRestartBtn = document.getElementById('clearRestartBtn');
const characterSelectionElement = document.getElementById('characterSelection');

// 오디오 컨텍스트 설정
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = new AudioContext();

// 사운드 매니저
const soundManager = {
    // 돈 획득 사운드 (짧은 고음)
    playMoneySound: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6

        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); // 볼륨 증가 (0.1 -> 0.2)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    },

    // 다이아몬드 획득 사운드 (신비로운 효과)
    playDiamondSound: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        // 화음 생성 (도-미-솔-도)
        const frequencies = [523.25, 659.25, 783.99, 1046.50];

        frequencies.forEach((freq, index) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'triangle';
            oscillator.frequency.value = freq;

            // 시간차를 두고 재생 (아르페지오 효과)
            const startTime = now + (index * 0.05);
            const duration = 0.3;

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    },

    // 게임 오버 사운드 (낮은 톤)
    playGameOverSound: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    },

    // 게임 클리어 사운드 (팡파레)
    playGameClearSound: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        // 팡파레 멜로디 (도-도-도-미-솔-도)
        const notes = [
            { f: 523.25, t: 0, d: 0.1 },   // 도
            { f: 523.25, t: 0.1, d: 0.1 }, // 도
            { f: 523.25, t: 0.2, d: 0.1 }, // 도
            { f: 659.25, t: 0.3, d: 0.2 }, // 미
            { f: 783.99, t: 0.5, d: 0.2 }, // 솔
            { f: 1046.50, t: 0.7, d: 0.4 } // 도
        ];

        notes.forEach(note => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'square';
            oscillator.frequency.value = note.f;

            gainNode.gain.setValueAtTime(0.1, now + note.t);
            gainNode.gain.linearRampToValueAtTime(0, now + note.t + note.d);

            oscillator.start(now + note.t);
            oscillator.stop(now + note.t + note.d);
        });
    }
};

// 캔버스 크기 설정
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

// 게임 상태
let gameState = {
    score: 0,
    lives: 3,
    isGameOver: false,
    moneyCount: 0,
    rockPosition: Math.floor(Math.random() * 5), // 0-4 사이의 랜덤 위치
    diamondCount: 0, // 블루 다이아몬드 카운터
    fallingSpeed: 0.8, // 0.8초
    selectedCharacter: null, // 선택된 캐릭터
    isPlaying: false // 게임 진행 중 여부
};

// 플레이어
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 80,
    width: 60,
    height: 50,
    speed: 7,
    moveLeft: false,
    moveRight: false,
    frame: 0, // 애니메이션 프레임
    frameTimer: 0 // 프레임 타이머
};

// 떨어지는 아이템들
let fallingItems = [];

// 오디오 컨텍스트 초기화 (사용자 상호작용 시)
function initAudio() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// 초기화 함수
function startGameInit() {
    // 키보드 입력
    document.addEventListener('keydown', (e) => {
        initAudio(); // 첫 입력 시 오디오 활성화
        if (e.key === 'ArrowLeft') player.moveLeft = true;
        if (e.key === 'ArrowRight') player.moveRight = true;
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') player.moveLeft = false;
        if (e.key === 'ArrowRight') player.moveRight = false;
    });

    // 캐릭터 선택 이벤트
    const characterCards = document.querySelectorAll('.character-card');
    console.log('Character cards found:', characterCards.length); // 디버깅용 로그

    characterCards.forEach(card => {
        card.addEventListener('click', () => {
            console.log('Character clicked:', card.dataset.character); // 디버깅용 로그
            const character = card.dataset.character;
            selectCharacter(character);
        });
    });

    // 버튼 이벤트 리스너
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    if (clearRestartBtn) clearRestartBtn.addEventListener('click', restartGame);

    // 초기 게임 루프 시작
    gameLoop();
}

// 안전한 초기화 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGameInit);
} else {
    startGameInit();
}

function selectCharacter(type) {
    gameState.selectedCharacter = type;

    // 캐릭터별 스탯 설정
    if (type === 'cat') {
        player.width = 60;
        player.height = 50;
        player.speed = 7;
    } else if (type === 'trex') {
        player.width = 80;
        player.height = 90;
        player.speed = 5;
    }

    // 화면 전환
    if (characterSelectionElement) characterSelectionElement.classList.add('hidden');
    gameState.isPlaying = true;

    // 초기화 및 시작
    restartGame();
    initAudio();
}

// 고양이 그리기
function drawCat() {
    const isMoving = player.moveLeft || player.moveRight;

    // 애니메이션 업데이트
    if (isMoving) {
        player.frameTimer++;
        if (player.frameTimer > 5) { // 5프레임마다 다리 교차
            player.frame = (player.frame + 1) % 4; // 0, 1, 2, 3 사이클
            player.frameTimer = 0;
        }
    } else {
        player.frame = 0; // 정지 상태
    }

    ctx.save();
    ctx.translate(player.x + 30, player.y + 25); // 중심점 이동
    if (player.moveLeft) {
        ctx.scale(-1, 1); // 왼쪽 이동 시 좌우 반전
    }

    // 꼬리 (애니메이션)
    ctx.beginPath();
    ctx.moveTo(-20, -5);
    const tailWag = Math.sin(Date.now() / 200) * 5;
    ctx.quadraticCurveTo(-35 + tailWag, -20, -25 + tailWag, -30);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 뒷다리 (왼쪽)
    ctx.fillStyle = '#FFA500'; // 치즈냥이 색상
    ctx.beginPath();
    const backLegL = isMoving ? ((player.frame % 2 === 0) ? 5 : -5) : 0;
    ctx.ellipse(-15 + backLegL, 15, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 앞다리 (왼쪽)
    ctx.beginPath();
    const frontLegL = isMoving ? ((player.frame % 2 !== 0) ? 5 : -5) : 0;
    ctx.ellipse(15 + frontLegL, 15, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 몸통
    ctx.fillStyle = '#FFD700'; // 밝은 치즈색
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 뒷다리 (오른쪽 - 겹침)
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    const backLegR = isMoving ? ((player.frame % 2 !== 0) ? 5 : -5) : 0;
    ctx.ellipse(-15 + backLegR, 15, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 앞다리 (오른쪽 - 겹침)
    ctx.beginPath();
    const frontLegR = isMoving ? ((player.frame % 2 === 0) ? 5 : -5) : 0;
    ctx.ellipse(15 + frontLegR, 15, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 머리
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(15, -15, 16, 0, Math.PI * 2);
    ctx.fill();

    // 귀
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(8, -25);
    ctx.lineTo(15, -38);
    ctx.lineTo(22, -25);
    ctx.fill(); // 오른쪽 귀

    ctx.beginPath();
    ctx.moveTo(2, -22);
    ctx.lineTo(-5, -35);
    ctx.lineTo(-2, -20);
    ctx.fill(); // 왼쪽 귀

    // 눈
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(18, -18, 2, 0, Math.PI * 2); // 오른쪽 눈
    ctx.arc(8, -18, 2, 0, Math.PI * 2); // 왼쪽 눈
    ctx.fill();

    // 코
    ctx.fillStyle = '#FF69B4'; // 분홍 코
    ctx.beginPath();
    ctx.arc(13, -14, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 수염
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, -14); ctx.lineTo(28, -16);
    ctx.moveTo(20, -14); ctx.lineTo(28, -12);
    ctx.moveTo(6, -14); ctx.lineTo(-2, -16);
    ctx.moveTo(6, -14); ctx.lineTo(-2, -12);
    ctx.stroke();

    ctx.restore();
}

// 티라노사우루스 그리기
function drawTRex() {
    const isMoving = player.moveLeft || player.moveRight;

    // 애니메이션 업데이트
    if (isMoving) {
        player.frameTimer++;
        if (player.frameTimer > 8) { // 고양이보다 조금 느리게
            player.frame = (player.frame + 1) % 4;
            player.frameTimer = 0;
        }
    } else {
        player.frame = 0;
    }

    ctx.save();
    ctx.translate(player.x + 40, player.y + 45); // 중심점 이동
    if (player.moveLeft) {
        ctx.scale(-1, 1); // 왼쪽 이동 시 좌우 반전
    }

    // 꼬리 (큰 공룡 꼬리)
    ctx.fillStyle = '#4CAF50'; // 공룡 초록색
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    const tailWag = Math.sin(Date.now() / 300) * 10;
    ctx.quadraticCurveTo(-40 + tailWag, 20, -60 + tailWag, -10); // 긴 꼬리
    ctx.lineTo(-20, -10);
    ctx.fill();

    // 뒷다리 (왼쪽)
    ctx.fillStyle = '#388E3C'; // 어두운 초록색 (다리)
    ctx.beginPath();
    const backLegL = isMoving ? ((player.frame % 2 === 0) ? 10 : -10) : 0;
    ctx.ellipse(-15 + backLegL, 30, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 몸통
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.ellipse(0, 0, 35, 45, -0.2, 0, Math.PI * 2); // 세로로 긴 몸통
    ctx.fill();

    // 뒷다리 (오른쪽 - 겹침)
    ctx.fillStyle = '#388E3C';
    ctx.beginPath();
    const backLegR = isMoving ? ((player.frame % 2 !== 0) ? 10 : -10) : 0;
    ctx.ellipse(15 + backLegR, 30, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 짧은 앞팔
    ctx.fillStyle = '#81C784';
    ctx.beginPath();
    const armWag = Math.sin(Date.now() / 200) * 3;
    ctx.ellipse(25, -5 + armWag, 5, 10, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); // 작은 손가락
    ctx.arc(30, -8 + armWag, 2, 0, Math.PI * 2);
    ctx.fill();

    // 머리 (큰 머리)
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.ellipse(20, -35, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // 입 (살짝 벌린 입)
    ctx.fillStyle = '#FFCDD2'; // 입 안
    ctx.beginPath();
    ctx.moveTo(25, -30);
    ctx.lineTo(40, -30);
    ctx.lineTo(35, -25);
    ctx.fill();

    // 눈
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(25, -42, 3, 0, Math.PI * 2);
    ctx.fill();

    // 이빨 (작고 귀엽게)
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.moveTo(38, -30); ctx.lineTo(40, -28); ctx.lineTo(42, -30);
    ctx.fill();

    ctx.restore();
}

// 플레이어 그리기 (통합)
function drawPlayer() {
    if (gameState.selectedCharacter === 'cat') {
        drawCat();
    } else if (gameState.selectedCharacter === 'trex') {
        drawTRex();
    }
}

// 돈 그리기
function drawMoney(x, y, size) {
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFA500';
    ctx.font = `${size * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('₩', x, y);
}

// 돌 그리기
function drawRock(x, y, size) {
    ctx.fillStyle = '#7F8C8D';
    ctx.strokeStyle = '#34495E';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.8, y - size * 0.3);
    ctx.lineTo(x + size * 0.6, y + size);
    ctx.lineTo(x - size * 0.6, y + size);
    ctx.lineTo(x - size * 0.8, y - size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 돌 질감
    ctx.fillStyle = '#95A5A6';
    ctx.beginPath();
    ctx.arc(x - size * 0.3, y - size * 0.2, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
}

// 블루 다이아몬드 그리기
function drawDiamond(x, y, size) {
    ctx.fillStyle = '#3498DB';
    ctx.strokeStyle = '#2980B9';
    ctx.lineWidth = 2;

    ctx.beginPath();
    // 다이아몬드 모양
    ctx.moveTo(x, y - size); // 위
    ctx.lineTo(x + size * 0.6, y); // 오른쪽
    ctx.lineTo(x, y + size); // 아래
    ctx.lineTo(x - size * 0.6, y); // 왼쪽
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 반짝임 효과
    ctx.fillStyle = '#5DADE2';
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.5);
    ctx.lineTo(x + size * 0.3, y);
    ctx.lineTo(x, y + size * 0.3);
    ctx.lineTo(x - size * 0.3, y);
    ctx.closePath();
    ctx.fill();
}

// 아이템 생성
function createItem() {
    // 10개마다 블루 다이아몬드 1개 (돈 사이클 내에서)
    const isDiamond = gameState.diamondCount === 9;

    // 다이아몬드가 아닐 때만 돌 체크 (5개 중 랜덤한 위치에 돌을 떨어뜨림)
    const isRock = !isDiamond && gameState.moneyCount === gameState.rockPosition;

    const item = {
        x: Math.random() * (canvas.width - 40) + 20,
        y: -30,
        size: isDiamond ? 10 : 15, // 블루 다이아몬드는 돈(15)과 돌(15)보다 작게 (10)
        type: isDiamond ? 'diamond' : (isRock ? 'rock' : 'money'),
        speed: (canvas.height / (gameState.fallingSpeed * 60)) // 픽셀/프레임
    };

    // 다이아몬드가 아닐 때만 돈/돌 사이클 진행
    if (!isDiamond) {
        gameState.moneyCount++;
        // 5개가 떨어지면 카운트 리셋하고 새로운 랜덤 위치 설정
        if (gameState.moneyCount >= 5) {
            gameState.moneyCount = 0;
            gameState.rockPosition = Math.floor(Math.random() * 5);
        }

        // 다이아몬드 카운트 증가 (돈이 떨어지는 기회일 때)
        if (!isRock) {
            gameState.diamondCount++;
            if (gameState.diamondCount >= 10) {
                gameState.diamondCount = 0;
            }
        }
    } else {
        // 다이아몬드가 떨어지면 카운트 리셋
        gameState.diamondCount = 0;
    }

    fallingItems.push(item);
}

// 충돌 감지
function checkCollision(item) {
    return (
        item.x > player.x &&
        item.x < player.x + player.width &&
        item.y + item.size > player.y &&
        item.y - item.size < player.y + player.height
    );
}

// 게임 업데이트
function update() {
    if (gameState.isGameOver || !gameState.isPlaying) return;

    // 플레이어 이동
    if (player.moveLeft && player.x > 0) {
        player.x -= player.speed;
    }
    if (player.moveRight && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }

    // 아이템 업데이트
    for (let i = fallingItems.length - 1; i >= 0; i--) {
        const item = fallingItems[i];
        item.y += item.speed;

        // 충돌 체크
        if (checkCollision(item)) {
            if (item.type === 'money') {
                soundManager.playMoneySound(); // 효과음 재생
                gameState.score += 10;
                scoreElement.textContent = gameState.score;
                fallingItems.splice(i, 1);

                // 100점 달성 시 게임 클리어
                if (gameState.score >= 100) {
                    soundManager.playGameClearSound(); // 효과음 재생
                    gameClear();
                }
            } else if (item.type === 'diamond') {
                soundManager.playDiamondSound(); // 효과음 재생
                gameState.score += 30; // 다이아몬드는 30점
                scoreElement.textContent = gameState.score;
                fallingItems.splice(i, 1);

                // 100점 달성 시 게임 클리어
                if (gameState.score >= 100) {
                    soundManager.playGameClearSound(); // 효과음 재생
                    gameClear();
                }
            } else if (item.type === 'rock') {
                soundManager.playGameOverSound(); // 효과음 재생
                gameOver();
            }
        }

        // 화면 밖으로 나간 아이템 제거
        if (item.y > canvas.height + 30) {
            fallingItems.splice(i, 1);
        }
    }
}

// 게임 그리기
function draw() {
    // 배경 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 플레이어 그리기 (선택된 경우에만)
    if (gameState.selectedCharacter) {
        drawPlayer();
    }

    // 아이템 그리기
    fallingItems.forEach(item => {
        if (item.type === 'money') {
            drawMoney(item.x, item.y, item.size);
        } else if (item.type === 'diamond') {
            drawDiamond(item.x, item.y, item.size);
        } else {
            drawRock(item.x, item.y, item.size);
        }
    });
}

// 게임 루프
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 아이템 생성 타이머
setInterval(() => {
    if (!gameState.isGameOver && gameState.isPlaying) {
        createItem();
    }
}, gameState.fallingSpeed * 1000);

// 게임 시작 (라운드 초기화)
function startGame() {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.isGameOver = false;
    gameState.moneyCount = 0;
    gameState.rockPosition = Math.floor(Math.random() * 5);
    gameState.diamondCount = 0;
    fallingItems = [];

    // 플레이어 위치 초기화
    player.x = canvas.width / 2 - player.width / 2;

    // UI 초기화
    scoreElement.textContent = '0';
    livesElement.textContent = '❤️❤️❤️';
    gameOverElement.classList.add('hidden');
    gameClearElement.classList.add('hidden');
    characterSelectionElement.classList.add('hidden');

    // 게임 상태
    gameState.isPlaying = true;
}

function selectCharacter(type) {
    console.log('Selecting character:', type);
    gameState.selectedCharacter = type;

    // 캐릭터별 스탯 설정
    if (type === 'cat') {
        player.width = 60;
        player.height = 50;
        player.speed = 7;
    } else if (type === 'trex') {
        player.width = 80;
        player.height = 90;
        player.speed = 5;
    }

    // 게임 시작
    startGame();
    initAudio();
}

// 게임 오버
function gameOver() {
    gameState.isGameOver = true;
    gameState.isPlaying = false;
    finalScoreElement.textContent = gameState.score;
    gameOverElement.classList.remove('hidden');
}

// 게임 클리어
function gameClear() {
    gameState.isGameOver = true;
    gameState.isPlaying = false;
    clearScoreElement.textContent = gameState.score;
    gameClearElement.classList.remove('hidden');
}

// 게임 재시작 (메인 메뉴로 돌아가기)
function restartGame() {
    console.log('Returning to menu');
    gameState.isPlaying = false;
    gameState.selectedCharacter = null;
    gameState.isGameOver = false; // 게임 오버 상태 해제 (메뉴 화면용)

    // UI 정리
    gameOverElement.classList.add('hidden');
    gameClearElement.classList.add('hidden');
    characterSelectionElement.classList.remove('hidden');

    // AudioContext 재개
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}
