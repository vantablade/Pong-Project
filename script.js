const menuScreen = document.getElementById("menuScreen");
const gameScreen = document.getElementById("gameScreen");
const singlePlayerButton = document.getElementById("singlePlayerButton");
const multiPlayerButton = document.getElementById("multiPlayerButton");
const backButton = document.getElementById("backButton");

const leftScoreEl = document.getElementById("leftScore");
const rightScoreEl = document.getElementById("rightScore");
const leftLabelEl = document.getElementById("leftLabel");
const rightLabelEl = document.getElementById("rightLabel");
const modeLabelEl = document.getElementById("modeLabel");
const controlHintEl = document.getElementById("controlHint");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const WINNING_SCORE = 7;
const keys = new Set();

const state = {
  screen: "menu",
  mode: "single",
  running: false,
  matchOver: false,
  winner: "",
  leftScore: 0,
  rightScore: 0,
  lastFrameTime: 0
};

const paddle = {
  width: 14,
  height: 96,
  speed: 430
};

const cpu = {
  speedMultiplier: 0.68,
  reactionWindow: 22,
  returnBias: 0.35
};

const leftPlayer = {
  x: 28,
  y: canvas.height / 2 - paddle.height / 2,
  velocity: 0
};

const rightPlayer = {
  x: canvas.width - 42,
  y: canvas.height / 2 - paddle.height / 2,
  velocity: 0
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 10,
  speed: 355,
  vx: 355,
  vy: 140
};

function updateHud() {
  const isSingle = state.mode === "single";
  leftScoreEl.textContent = state.leftScore;
  rightScoreEl.textContent = state.rightScore;
  leftLabelEl.textContent = isSingle ? "You" : "P1";
  rightLabelEl.textContent = isSingle ? "CPU" : "P2";
  modeLabelEl.textContent = isSingle ? "1 Player" : "2 Player";
  controlHintEl.textContent = isSingle ? "Move: Up / Down" : "P1: W/S  P2: Up/Down";
}

function resetBall(direction = 1) {
  ball.x = canvas.width / 2 - ball.size / 2;
  ball.y = canvas.height / 2 - ball.size / 2;
  ball.speed = 355;
  ball.vx = ball.speed * direction;
  ball.vy = (Math.random() * 2 - 1) * 180;
}

function resetPaddles() {
  leftPlayer.y = canvas.height / 2 - paddle.height / 2;
  rightPlayer.y = canvas.height / 2 - paddle.height / 2;
}

function resetMatch() {
  state.running = false;
  state.matchOver = false;
  state.winner = "";
  state.leftScore = 0;
  state.rightScore = 0;
  state.lastFrameTime = 0;
  resetPaddles();
  resetBall(Math.random() > 0.5 ? 1 : -1);
  updateHud();
}

function showMenu() {
  state.screen = "menu";
  state.running = false;
  state.lastFrameTime = 0;
  keys.clear();
  menuScreen.classList.remove("hidden");
  gameScreen.classList.add("hidden");
}

function startGame(mode) {
  state.mode = mode;
  state.screen = "game";
  resetMatch();
  state.running = true;
  menuScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
}

function clampPaddle(player) {
  player.y = Math.max(14, Math.min(canvas.height - paddle.height - 14, player.y));
}

function updatePlayerMovement(deltaTime) {
  leftPlayer.velocity = 0;
  rightPlayer.velocity = 0;

  if (state.mode === "single") {
    if (keys.has("arrowup")) {
      leftPlayer.velocity = -paddle.speed;
    }
    if (keys.has("arrowdown")) {
      leftPlayer.velocity = paddle.speed;
    }

    const isBallComingToCpu = ball.vx > 0;
    const targetY = isBallComingToCpu
      ? ball.y - paddle.height / 2
      : canvas.height / 2 - paddle.height / 2 + ball.vy * cpu.returnBias;
    const distance = targetY - rightPlayer.y;
    const maxStep = paddle.speed * cpu.speedMultiplier * deltaTime;

    if (Math.abs(distance) > cpu.reactionWindow) {
      rightPlayer.y += Math.max(-maxStep, Math.min(maxStep, distance));
    }
  } else {
    if (keys.has("w")) {
      leftPlayer.velocity = -paddle.speed;
    }
    if (keys.has("s")) {
      leftPlayer.velocity = paddle.speed;
    }
    if (keys.has("arrowup")) {
      rightPlayer.velocity = -paddle.speed;
    }
    if (keys.has("arrowdown")) {
      rightPlayer.velocity = paddle.speed;
    }

    rightPlayer.y += rightPlayer.velocity * deltaTime;
  }

  leftPlayer.y += leftPlayer.velocity * deltaTime;

  clampPaddle(leftPlayer);
  clampPaddle(rightPlayer);
}

function reflectBall(player, isLeft) {
  const paddleCenter = player.y + paddle.height / 2;
  const ballCenter = ball.y + ball.size / 2;
  const impact = (ballCenter - paddleCenter) / (paddle.height / 2);
  const angle = impact * 1.1;
  ball.speed = Math.min(ball.speed + 24, 640);
  ball.vx = (isLeft ? 1 : -1) * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
}

function checkPaddleCollision() {
  const leftHit =
    ball.x <= leftPlayer.x + paddle.width &&
    ball.y + ball.size >= leftPlayer.y &&
    ball.y <= leftPlayer.y + paddle.height &&
    ball.vx < 0;

  const rightHit =
    ball.x + ball.size >= rightPlayer.x &&
    ball.y + ball.size >= rightPlayer.y &&
    ball.y <= rightPlayer.y + paddle.height &&
    ball.vx > 0;

  if (leftHit) {
    ball.x = leftPlayer.x + paddle.width;
    reflectBall(leftPlayer, true);
  } else if (rightHit) {
    ball.x = rightPlayer.x - ball.size;
    reflectBall(rightPlayer, false);
  }
}

function scorePoint(side) {
  if (side === "left") {
    state.leftScore += 1;
    resetBall(1);
  } else {
    state.rightScore += 1;
    resetBall(-1);
  }

  updateHud();

  if (state.leftScore >= WINNING_SCORE || state.rightScore >= WINNING_SCORE) {
    state.running = false;
    state.matchOver = true;
    if (state.leftScore > state.rightScore) {
      state.winner = state.mode === "single" ? "YOU WIN" : "P1 WINS";
    } else {
      state.winner = state.mode === "single" ? "CPU WINS" : "P2 WINS";
    }
  }
}

function updateBall(deltaTime) {
  ball.x += ball.vx * deltaTime;
  ball.y += ball.vy * deltaTime;

  ball.x = Math.round(ball.x);
  ball.y = Math.round(ball.y);

  if (ball.y <= 8 || ball.y + ball.size >= canvas.height - 8) {
    ball.y = ball.y <= 8 ? 8 : canvas.height - 8 - ball.size;
    ball.vy *= -1;
  }

  checkPaddleCollision();

  if (ball.x < -20) {
    scorePoint("right");
  } else if (ball.x > canvas.width + 20) {
    scorePoint("left");
  }
}

function drawBackground() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#f5f5f5";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.fillStyle = "#d9d9d9";
  for (let y = 18; y < canvas.height - 18; y += 22) {
    ctx.fillRect(canvas.width / 2 - 2, y, 4, 12);
  }
}

function drawPaddle(player) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(Math.round(player.x), Math.round(player.y), paddle.width, paddle.height);
  ctx.fillStyle = "#7a7a7a";
  ctx.fillRect(Math.round(player.x + paddle.width - 3), Math.round(player.y), 3, paddle.height);
}

function drawBall() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(ball.x, ball.y, ball.size, ball.size);
  ctx.fillStyle = "#7a7a7a";
  ctx.fillRect(ball.x + ball.size - 2, ball.y, 2, ball.size);
}

function drawOverlayText() {
  ctx.textAlign = "center";

  if (!state.running && state.matchOver) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 28px Courier New";
    ctx.fillText(state.winner, canvas.width / 2, canvas.height / 2 - 8);
    ctx.fillStyle = "#bdbdbd";
    ctx.font = "500 14px Courier New";
    ctx.fillText("PRESS SPACE TO PLAY AGAIN", canvas.width / 2, canvas.height / 2 + 22);
  }
}

function drawScene() {
  if (state.screen !== "game") {
    return;
  }

  drawBackground();
  drawPaddle(leftPlayer);
  drawPaddle(rightPlayer);
  drawBall();
  drawOverlayText();
}

function frame(timestamp) {
  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  const deltaTime = Math.min((timestamp - state.lastFrameTime) / 1000, 0.0165);
  state.lastFrameTime = timestamp;

  if (state.screen === "game" && state.running) {
    updatePlayerMovement(deltaTime);
    updateBall(deltaTime);
  }

  drawScene();
  requestAnimationFrame(frame);
}

singlePlayerButton.addEventListener("click", () => startGame("single"));
multiPlayerButton.addEventListener("click", () => startGame("multi"));
backButton.addEventListener("click", showMenu);

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "s", "arrowup", "arrowdown", " "].includes(key) || event.key === " ") {
    event.preventDefault();
  }

  if (key === " " && state.screen === "game" && state.matchOver) {
    resetMatch();
    state.running = true;
    return;
  }

  keys.add(key);
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

showMenu();
requestAnimationFrame(frame);

