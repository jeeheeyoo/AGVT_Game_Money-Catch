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
    fallingSpeed: 0.8 // 0.8초
};

// 플레이어
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 80,
    width: 50,
    height: 60,
    speed: 7,
    moveLeft: false,
    moveRight: false
};

// 떨어지는 아이템들
let fallingItems = [];

// 키보드 입력
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') player.moveLeft = true;
    if (e.key === 'ArrowRight') player.moveRight = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') player.moveLeft = false;
    if (e.key === 'ArrowRight') player.moveRight = false;
});

// 플레이어 그리기
function drawPlayer() {
    // 몸
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(player.x + 25, player.y + 15, 12, 0, Math.PI * 2);
    ctx.fill();

    // 눈
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x + 20, player.y + 12, 2, 0, Math.PI * 2);
    ctx.arc(player.x + 30, player.y + 12, 2, 0, Math.PI * 2);
    ctx.fill();

    // 미소
    ctx.beginPath();
    ctx.arc(player.x + 25, player.y + 15, 6, 0, Math.PI);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 몸통
    ctx.fillStyle = '#4ECDC4';
    ctx.fillRect(player.x + 15, player.y + 27, 20, 25);

    // 팔
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(player.x + 5, player.y + 30, 10, 15);
    ctx.fillRect(player.x + 35, player.y + 30, 10, 15);

    // 다리
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(player.x + 17, player.y + 52, 7, 8);
    ctx.fillRect(player.x + 26, player.y + 52, 7, 8);
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

// 아이템 생성
function createItem() {
    // 5개 중 랜덤한 위치에 돌을 떨어뜨림
    const isRock = gameState.moneyCount === gameState.rockPosition;

    const item = {
        x: Math.random() * (canvas.width - 40) + 20,
        y: -30,
        size: 15,
        type: isRock ? 'rock' : 'money',
        speed: (canvas.height / (gameState.fallingSpeed * 60)) // 픽셀/프레임
    };

    gameState.moneyCount++;

    // 5개가 떨어지면 카운트 리셋하고 새로운 랜덤 위치 설정
    if (gameState.moneyCount >= 5) {
        gameState.moneyCount = 0;
        gameState.rockPosition = Math.floor(Math.random() * 5);
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
    if (gameState.isGameOver) return;

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
                gameState.score += 10;
                scoreElement.textContent = gameState.score;
                fallingItems.splice(i, 1);

                // 100점 달성 시 게임 클리어
                if (gameState.score >= 100) {
                    gameClear();
                }
            } else if (item.type === 'rock') {
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

    // 플레이어 그리기
    drawPlayer();

    // 아이템 그리기
    fallingItems.forEach(item => {
        if (item.type === 'money') {
            drawMoney(item.x, item.y, item.size);
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
    if (!gameState.isGameOver) {
        createItem();
    }
}, gameState.fallingSpeed * 1000);

// 게임 오버
function gameOver() {
    gameState.isGameOver = true;
    finalScoreElement.textContent = gameState.score;
    gameOverElement.classList.remove('hidden');
}

// 게임 클리어
function gameClear() {
    gameState.isGameOver = true;
    clearScoreElement.textContent = gameState.score;
    gameClearElement.classList.remove('hidden');
}

// 게임 재시작
function restartGame() {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.isGameOver = false;
    gameState.moneyCount = 0;
    gameState.rockPosition = Math.floor(Math.random() * 5);
    fallingItems = [];
    player.x = canvas.width / 2 - 25;

    scoreElement.textContent = '0';
    livesElement.textContent = '❤️❤️❤️';
    gameOverElement.classList.add('hidden');
    gameClearElement.classList.add('hidden');
}

restartBtn.addEventListener('click', restartGame);
clearRestartBtn.addEventListener('click', restartGame);

// 게임 시작
gameLoop();
