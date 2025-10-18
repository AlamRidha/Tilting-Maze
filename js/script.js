Math.minmax = (value, limit) => {
  return Math.max(Math.min(value, limit), -limit);
};

const distance2D = (p1, p2) => {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
};

const getAngle = (p1, p2) => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

const closestItCanBe = (cap, ball) => {
  let angle = getAngle(cap, ball);

  const deltaX = Math.cos(angle) * (wallW / 2 + ballSize / 2);
  const deltaY = Math.sin(angle) * (wallW / 2 + ballSize / 2);

  return { x: cap.x + deltaX, y: cap.y + deltaY };
};

const rollAroundCap = (cap, ball) => {
  const distance = distance2D(cap, ball);
  const minDistance = wallW / 2 + ballSize / 2;

  if (distance <= minDistance) {
    const angle = Math.atan2(ball.y - cap.y, ball.x - cap.x);

    const newX = cap.x + Math.cos(angle) * minDistance;
    const newY = cap.y + Math.sin(angle) * minDistance;

    const normalX = Math.cos(angle);
    const normalY = Math.sin(angle);
    const dotProduct = ball.velocityX * normalX + ball.velocityY * normalY;

    const velocityX = ball.velocityX - 1.8 * dotProduct * normalX;
    const velocityY = ball.velocityY - 1.8 * dotProduct * normalY;

    return {
      x: newX,
      y: newY,
      velocityX: velocityX * 0.7,
      velocityY: velocityY * 0.7,
      nextX: newX + velocityX,
      nextY: newY + velocityY,
    };
  }

  return ball;
};

const slow = (number, difference) => {
  if (Math.abs(number) <= difference) return 0;
  if (number > difference) return number - difference;
  return number + difference;
};

const mazeElement = document.getElementById("maze");
const joystickHeadElement = document.getElementById("joystick-head");
const noteElement = document.getElementById("note");
const restartBtn = document.getElementById("restart-btn");
const modeToggleBtn = document.getElementById("mode-toggle");

// Constants - Diperbarui untuk ukuran maze yang lebih sesuai
const MAX_VELOCITY = 1.5;
// const pathW = 40;
// const wallW = 10;
// const ballSize = 12;
// const holeSize = 20;
const pathW = 32; // Diperkecil
const wallW = 8; // Diperkecil
const ballSize = 8; // Diperkecil
const holeSize = 14; // Diperkecil

let hardMode = false;
let previousTimestamp;
let gameInProgress;
let mouseStartX;
let mouseStartY;
let accelerationX;
let accelerationY;
let frictionX;
let frictionY;
let animationFrameId;

let balls = [];
let ballElements = [];
let holeElements = [];
let completedBalls = 0;
const totalBalls = 4;

// Calculate maze dimensions
const mazeWidth = 10 * (pathW + wallW) + wallW;
const mazeHeight = 9 * (pathW + wallW) + wallW;

// Update maze dimensions
mazeElement.style.width = `${mazeWidth}px`;
mazeElement.style.height = `${mazeHeight}px`;

// Wall metadata - diperbarui koordinat
const walls = [
  // Border walls
  { column: 0, row: 0, horizontal: true, length: 10 },
  { column: 0, row: 0, horizontal: false, length: 9 },
  { column: 0, row: 9, horizontal: true, length: 10 },
  { column: 10, row: 0, horizontal: false, length: 9 },

  // Horizontal walls
  { column: 0, row: 6, horizontal: true, length: 1 },
  { column: 0, row: 8, horizontal: true, length: 1 },
  { column: 1, row: 1, horizontal: true, length: 2 },
  { column: 1, row: 7, horizontal: true, length: 1 },
  { column: 2, row: 2, horizontal: true, length: 2 },
  { column: 2, row: 4, horizontal: true, length: 1 },
  { column: 2, row: 5, horizontal: true, length: 1 },
  { column: 2, row: 6, horizontal: true, length: 1 },
  { column: 3, row: 3, horizontal: true, length: 1 },
  { column: 3, row: 8, horizontal: true, length: 3 },
  { column: 4, row: 6, horizontal: true, length: 1 },
  { column: 5, row: 2, horizontal: true, length: 2 },
  { column: 5, row: 7, horizontal: true, length: 1 },
  { column: 6, row: 1, horizontal: true, length: 1 },
  { column: 6, row: 6, horizontal: true, length: 2 },
  { column: 7, row: 3, horizontal: true, length: 2 },
  { column: 7, row: 7, horizontal: true, length: 2 },
  { column: 8, row: 1, horizontal: true, length: 1 },
  { column: 8, row: 2, horizontal: true, length: 1 },
  { column: 8, row: 3, horizontal: true, length: 1 },
  { column: 8, row: 4, horizontal: true, length: 2 },
  { column: 8, row: 8, horizontal: true, length: 2 },

  // Vertical walls
  { column: 1, row: 1, horizontal: false, length: 2 },
  { column: 1, row: 4, horizontal: false, length: 2 },
  { column: 2, row: 2, horizontal: false, length: 2 },
  { column: 2, row: 5, horizontal: false, length: 1 },
  { column: 2, row: 7, horizontal: false, length: 2 },
  { column: 3, row: 0, horizontal: false, length: 1 },
  { column: 3, row: 4, horizontal: false, length: 1 },
  { column: 3, row: 6, horizontal: false, length: 2 },
  { column: 4, row: 1, horizontal: false, length: 2 },
  { column: 4, row: 6, horizontal: false, length: 1 },
  { column: 5, row: 0, horizontal: false, length: 2 },
  { column: 5, row: 6, horizontal: false, length: 1 },
  { column: 5, row: 8, horizontal: false, length: 1 },
  { column: 6, row: 4, horizontal: false, length: 1 },
  { column: 6, row: 6, horizontal: false, length: 1 },
  { column: 7, row: 1, horizontal: false, length: 4 },
  { column: 7, row: 7, horizontal: false, length: 2 },
  { column: 8, row: 2, horizontal: false, length: 1 },
  { column: 8, row: 4, horizontal: false, length: 2 },
  { column: 9, row: 1, horizontal: false, length: 1 },
  { column: 9, row: 5, horizontal: false, length: 2 },
].map((wall) => ({
  x: wall.column * (pathW + wallW),
  y: wall.row * (pathW + wallW),
  horizontal: wall.horizontal,
  length: wall.length * (pathW + wallW),
}));

const holes = [
  { column: 0, row: 5 },
  { column: 2, row: 0 },
  { column: 2, row: 4 },
  { column: 4, row: 6 },
  { column: 6, row: 2 },
  { column: 6, row: 8 },
  { column: 8, row: 1 },
  { column: 8, row: 2 },
].map((hole) => ({
  x: hole.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
  y: hole.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
}));

// Initialize game
function initGame() {
  console.log("Initializing game...");

  // Pastikan maze element ada dan visible
  if (!mazeElement) {
    console.error("Maze element not found!");
    return;
  }

  console.log("Maze element found:", mazeElement);

  // Create target element
  const target = document.createElement("div");
  target.id = "end";
  target.className = "absolute success-glow";
  target.style.cssText = `
    width: 60px;
    height: 60px;
    border: 4px dashed #10b981;
    border-radius: 50%;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 15;
  `;
  mazeElement.appendChild(target);

  // Draw walls
  walls.forEach(({ x, y, horizontal, length }) => {
    const wall = document.createElement("div");
    wall.className = "wall";

    if (horizontal) {
      wall.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        width: ${length}px;
        height: ${wallW}px;
        z-index: 10;
      `;
    } else {
      wall.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        width: ${wallW}px;
        height: ${length}px;
        z-index: 10;
      `;
    }

    mazeElement.appendChild(wall);
  });

  console.log("Walls drawn:", walls.length);
  resetGame();
}

// Event Listeners (tetap sama seperti sebelumnya)
joystickHeadElement.addEventListener("mousedown", function (event) {
  startGame(event.clientX, event.clientY);
});

joystickHeadElement.addEventListener("touchstart", function (event) {
  event.preventDefault();
  const touch = event.touches[0];
  startGame(touch.clientX, touch.clientY);
});

window.addEventListener("mousemove", function (event) {
  if (gameInProgress) {
    handleJoystickMove(event.clientX, event.clientY);
  }
});

window.addEventListener("touchmove", function (event) {
  if (gameInProgress) {
    event.preventDefault();
    const touch = event.touches[0];
    handleJoystickMove(touch.clientX, touch.clientY);
  }
});

window.addEventListener("mouseup", function () {
  resetJoystick();
});

window.addEventListener("touchend", function () {
  resetJoystick();
});

window.addEventListener("keydown", function (event) {
  if (![" ", "H", "h", "E", "e", "R", "r"].includes(event.key)) return;

  event.preventDefault();

  if (event.key == " ") {
    resetGame();
    return;
  }

  if (event.key == "H" || event.key == "h") {
    hardMode = true;
    resetGame();
    updateModeToggleButton();
    return;
  }

  if (event.key == "E" || event.key == "e") {
    hardMode = false;
    resetGame();
    updateModeToggleButton();
    return;
  }

  if (event.key == "R" || event.key == "r") {
    mazeElement.style.transform = "rotateY(0deg) rotateX(0deg)";
    resetJoystick();
    return;
  }
});

restartBtn.addEventListener("click", function () {
  resetGame();
});

modeToggleBtn.addEventListener("click", function () {
  hardMode = !hardMode;
  resetGame();
  updateModeToggleButton();
});

// Game functions (tetap sama)
function startGame(clientX, clientY) {
  if (!gameInProgress) {
    mouseStartX = clientX;
    mouseStartY = clientY;
    gameInProgress = true;
    noteElement.style.opacity = "1";
    joystickHeadElement.style.cssText = `
          animation: none;
          cursor: grabbing;
          transform: scale(1.1);
        `;
    animationFrameId = window.requestAnimationFrame(main);
  }
}

function handleJoystickMove(clientX, clientY) {
  const mouseDeltaX = -Math.minmax(mouseStartX - clientX, 15);
  const mouseDeltaY = -Math.minmax(mouseStartY - clientY, 15);

  joystickHeadElement.style.cssText = `
        left: ${mouseDeltaX}px;
        top: ${mouseDeltaY}px;
        animation: none;
        cursor: grabbing;
        transform: scale(1.1);
      `;

  // Batasi rotasi agar tidak berlebihan
  const rotationY = mouseDeltaX * 0.8;
  const rotationX = mouseDeltaY * 0.8;

  // Gunakan transform 3D dengan perspective
  mazeElement.style.cssText = `
        transform: perspective(1000px) rotateY(${rotationY}deg) rotateX(${-rotationX}deg);
        transform-style: preserve-3d;
      `;

  const gravity = 2;
  const friction = 0.01;

  accelerationX = gravity * Math.sin((rotationY / 180) * Math.PI);
  accelerationY = gravity * Math.sin((rotationX / 180) * Math.PI);
  frictionX = gravity * Math.cos((rotationY / 180) * Math.PI) * friction;
  frictionY = gravity * Math.cos((rotationX / 180) * Math.PI) * friction;
}

function resetJoystick() {
  if (gameInProgress) {
    joystickHeadElement.style.cssText = `
      left: 0;
      top: 0;
      cursor: grab;
      transform: scale(1);
      animation: joystickGlow 1.5s ease-in-out infinite;
    `;

    // Reset transform dengan smooth transition
    mazeElement.style.cssText = `
      transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
      transform-style: preserve-3d;
      transition: transform 0.5s ease-out;
    `;

    // Setelah transisi selesai, hapus transition untuk performa
    setTimeout(() => {
      mazeElement.style.transition = "none";
    }, 500);

    accelerationX = 0;
    accelerationY = 0;
  }
}

function updateModeToggleButton() {
  if (hardMode) {
    modeToggleBtn.innerHTML =
      '<i class="fas fa-shield-alt"></i><span>Easy Mode</span>';
    modeToggleBtn.className =
      "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2";
  } else {
    modeToggleBtn.innerHTML =
      '<i class="fas fa-shield-alt"></i><span>Hard Mode</span>';
    modeToggleBtn.className =
      "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2";
  }
}

function updateBallCounts() {
  document.getElementById("ball-count").textContent = totalBalls;
  document.getElementById("completed-count").textContent = completedBalls;
}

function updateLevelIndicator() {
  const indicator = document.getElementById("level-indicator");
  const modeText = document.getElementById("mode-text");

  if (hardMode) {
    indicator.className =
      "px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium";
    modeText.textContent = "Hard";
  } else {
    indicator.className =
      "px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium";
    modeText.textContent = "Easy";
  }
}

function resetGame() {
  console.log("Resetting game...");

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  previousTimestamp = undefined;
  gameInProgress = false;
  mouseStartX = undefined;
  mouseStartY = undefined;
  accelerationX = undefined;
  accelerationY = undefined;
  frictionX = undefined;
  frictionY = undefined;
  completedBalls = 0;

  updateBallCounts();
  updateLevelIndicator();

  mazeElement.style.cssText = `
    transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
    transform-style: preserve-3d;
    transition: transform 0.5s ease-out;
  `;

  mazeElement.style.transform = "rotateY(0deg) rotateX(0deg)";

  joystickHeadElement.style.cssText = `
        left: 0;
        top: 0;
        cursor: grab;
        animation: joystickGlow 1.5s ease-in-out infinite;
      `;

  if (hardMode) {
    noteElement.innerHTML = `
      <div class="flex items-start space-x-2">
        <div class="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
          <i class="fas fa-exclamation-triangle text-white text-xs"></i>
        </div>
        <div>
          <p class="text-gray-700 font-semibold">Hard Mode Activated!</p>
          <p class="text-gray-600 text-sm">Avoid black holes. Press <kbd class="px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">E</kbd> for Easy Mode</p>
        </div>
      </div>
    `;
  } else {
    noteElement.innerHTML = `
      <div class="flex items-start space-x-2">
        <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
          <i class="fas fa-gamepad text-white text-xs"></i>
        </div>
        <div>
          <p class="text-gray-700 font-semibold">Easy Mode</p>
          <p class="text-gray-600 text-sm">Ready for challenge? Press <kbd class="px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">H</kbd> for Hard Mode</p>
        </div>
      </div>
    `;

    console.log("Game reset complete");
  }

  // Reset balls
  balls = [
    { column: 0, row: 0 },
    { column: 9, row: 0 },
    { column: 0, row: 8 },
    { column: 9, row: 8 },
  ].map((ball) => ({
    x: ball.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
    y: ball.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
    velocityX: 0,
    velocityY: 0,
    completed: false,
  }));

  // Create/update ball elements
  if (ballElements.length === 0) {
    balls.forEach(({ x, y }) => {
      const ball = document.createElement("div");
      ball.className = "ball";
      ball.style.cssText = `
        left: ${x}px; 
        top: ${y}px; 
        width: ${ballSize}px;
        height: ${ballSize}px;
        background-color: #f06449;
      `;
      mazeElement.appendChild(ball);
      ballElements.push(ball);
    });
  } else {
    balls.forEach(({ x, y }, index) => {
      ballElements[index].style.cssText = `
        left: ${x}px; 
        top: ${y}px; 
        width: ${ballSize}px;
        height: ${ballSize}px;
        background-color: #f06449;
      `;
    });
  }

  // Handle black holes
  holeElements.forEach((holeElement) => {
    mazeElement.removeChild(holeElement);
  });
  holeElements = [];

  if (hardMode) {
    holes.forEach(({ x, y }) => {
      const hole = document.createElement("div");
      hole.className = "black-hole";
      hole.style.cssText = `
        left: ${x}px; 
        top: ${y}px; 
        width: ${holeSize}px;
        height: ${holeSize}px;
      `;
      mazeElement.appendChild(hole);
      holeElements.push(hole);
    });
  }
}

function main(timestamp) {
  if (!gameInProgress) return;

  if (previousTimestamp === undefined) {
    previousTimestamp = timestamp;
    animationFrameId = window.requestAnimationFrame(main);
    return;
  }

  const timeElapsed = (timestamp - previousTimestamp) / 16;

  try {
    if (accelerationX != undefined && accelerationY != undefined) {
      const velocityChangeX = accelerationX * timeElapsed;
      const velocityChangeY = accelerationY * timeElapsed;
      const frictionDeltaX = frictionX * timeElapsed;
      const frictionDeltaY = frictionY * timeElapsed;

      balls.forEach((ball) => {
        if (velocityChangeX === 0) {
          ball.velocityX = slow(ball.velocityX, frictionDeltaX);
        } else {
          ball.velocityX += velocityChangeX;
          ball.velocityX = Math.minmax(ball.velocityX, MAX_VELOCITY);
          ball.velocityX -= Math.sign(velocityChangeX) * frictionDeltaX;
        }

        if (velocityChangeY === 0) {
          ball.velocityY = slow(ball.velocityY, frictionDeltaY);
        } else {
          ball.velocityY += velocityChangeY;
          ball.velocityY = Math.minmax(ball.velocityY, MAX_VELOCITY);
          ball.velocityY -= Math.sign(velocityChangeY) * frictionDeltaY;
        }

        ball.nextX = ball.x + ball.velocityX;
        ball.nextY = ball.y + ball.velocityY;

        walls.forEach((wall, wi) => {
          if (wall.horizontal) {
            handleHorizontalWallCollision(ball, wall, wi);
          } else {
            handleVerticalWallCollision(ball, wall, wi);
          }
        });

        if (hardMode) {
          holes.forEach((hole, hi) => {
            const distance = distance2D(hole, {
              x: ball.nextX,
              y: ball.nextY,
            });

            if (distance <= holeSize / 2) {
              holeElements[hi].style.backgroundColor = "red";
              holeElements[hi].style.boxShadow = "0 0 20px red";
              throw new Error("The ball fell into a hole");
            }
          });
        }

        ball.x = ball.nextX;
        ball.y = ball.nextY;
      });

      const center = { x: mazeWidth / 2, y: mazeHeight / 2 };
      let newCompleted = 0;

      balls.forEach((ball, index) => {
        const distance = distance2D(ball, center);
        const isCompleted = distance < 30; // Radius target

        if (isCompleted && !ball.completed) {
          ball.completed = true;
          ballElements[index].style.backgroundColor = "#10B981";
          ballElements[index].style.boxShadow = "0 0 15px #10B981";
        }

        if (isCompleted) newCompleted++;

        ballElements[index].style.left = `${ball.x}px`;
        ballElements[index].style.top = `${ball.y}px`;
      });

      completedBalls = newCompleted;
      updateBallCounts();
    }

    if (completedBalls === totalBalls) {
      noteElement.innerHTML = `
        <div class="text-center py-4">
          <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-trophy text-white text-2xl"></i>
          </div>
          <h3 class="text-2xl font-bold text-green-600 mb-2">Congratulations!</h3>
          <p class="text-gray-700 mb-4">You've completed the maze!</p>
          ${
            !hardMode
              ? '<p class="text-gray-600">Try <button id="try-hard" class="text-purple-600 font-semibold hover:text-purple-700 underline">Hard Mode</button> for more challenge!</p>'
              : '<p class="text-gray-600">You mastered Hard Mode! <button id="back-easy" class="text-blue-600 font-semibold hover:text-blue-700 underline">Back to Easy</button></p>'
          }
        </div>
      `;

      const tryHardBtn = document.getElementById("try-hard");
      if (tryHardBtn) {
        tryHardBtn.addEventListener("click", () => {
          hardMode = true;
          resetGame();
          updateModeToggleButton();
        });
      }

      const backEasyBtn = document.getElementById("back-easy");
      if (backEasyBtn) {
        backEasyBtn.addEventListener("click", () => {
          hardMode = false;
          resetGame();
          updateModeToggleButton();
        });
      }

      gameInProgress = false;
    } else {
      previousTimestamp = timestamp;
      animationFrameId = window.requestAnimationFrame(main);
    }
  } catch (error) {
    if (error.message === "The ball fell into a hole") {
      noteElement.innerHTML = `
        <div class="text-center py-4">
          <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-times text-white text-2xl"></i>
          </div>
          <h3 class="text-2xl font-bold text-red-600 mb-2">Game Over!</h3>
          <p class="text-gray-700 mb-4">A ball fell into a black hole!</p>
          <p class="text-gray-600">Press <kbd class="px-2 py-1 bg-gray-200 rounded font-mono">Space</kbd> to restart or 
          <button id="back-easy" class="text-blue-600 font-semibold hover:text-blue-700 underline ml-1">switch to Easy Mode</button></p>
        </div>
      `;

      document.getElementById("back-easy").addEventListener("click", () => {
        hardMode = false;
        resetGame();
        updateModeToggleButton();
      });

      gameInProgress = false;
    } else {
      console.error("Game error:", error);
      noteElement.innerHTML = `<div class="text-center text-red-600">Game error occurred. Please refresh the page.</div>`;
      gameInProgress = false;
    }
  }
}

function handleHorizontalWallCollision(ball, wall, wallIndex) {
  if (
    ball.nextY + ballSize / 2 >= wall.y - wallW / 2 &&
    ball.nextY - ballSize / 2 <= wall.y + wallW / 2
  ) {
    const wallStart = { x: wall.x, y: wall.y };
    const wallEnd = { x: wall.x + wall.length, y: wall.y };

    if (
      ball.nextX + ballSize / 2 >= wallStart.x - wallW / 2 &&
      ball.nextX < wallStart.x
    ) {
      const distance = distance2D(wallStart, { x: ball.nextX, y: ball.nextY });
      if (distance < ballSize / 2 + wallW / 2) {
        const closest = closestItCanBe(wallStart, {
          x: ball.nextX,
          y: ball.nextY,
        });
        const rolled = rollAroundCap(wallStart, {
          x: closest.x,
          y: closest.y,
          velocityX: ball.velocityX,
          velocityY: ball.velocityY,
        });
        Object.assign(ball, rolled);
      }
    }

    if (
      ball.nextX - ballSize / 2 <= wallEnd.x + wallW / 2 &&
      ball.nextX > wallEnd.x
    ) {
      const distance = distance2D(wallEnd, { x: ball.nextX, y: ball.nextY });
      if (distance < ballSize / 2 + wallW / 2) {
        const closest = closestItCanBe(wallEnd, {
          x: ball.nextX,
          y: ball.nextY,
        });
        const rolled = rollAroundCap(wallEnd, {
          x: closest.x,
          y: closest.y,
          velocityX: ball.velocityX,
          velocityY: ball.velocityY,
        });
        Object.assign(ball, rolled);
      }
    }

    if (ball.nextX >= wallStart.x && ball.nextX <= wallEnd.x) {
      if (ball.nextY < wall.y) {
        ball.nextY = wall.y - wallW / 2 - ballSize / 2;
      } else {
        ball.nextY = wall.y + wallW / 2 + ballSize / 2;
      }
      ball.velocityY = -ball.velocityY / 3;
    }
  }
}

function handleVerticalWallCollision(ball, wall, wallIndex) {
  if (
    ball.nextX + ballSize / 2 >= wall.x - wallW / 2 &&
    ball.nextX - ballSize / 2 <= wall.x + wallW / 2
  ) {
    const wallStart = { x: wall.x, y: wall.y };
    const wallEnd = { x: wall.x, y: wall.y + wall.length };

    if (
      ball.nextY + ballSize / 2 >= wallStart.y - wallW / 2 &&
      ball.nextY < wallStart.y
    ) {
      const distance = distance2D(wallStart, { x: ball.nextX, y: ball.nextY });
      if (distance < ballSize / 2 + wallW / 2) {
        const closest = closestItCanBe(wallStart, {
          x: ball.nextX,
          y: ball.nextY,
        });
        const rolled = rollAroundCap(wallStart, {
          x: closest.x,
          y: closest.y,
          velocityX: ball.velocityX,
          velocityY: ball.velocityY,
        });
        Object.assign(ball, rolled);
      }
    }

    if (
      ball.nextY - ballSize / 2 <= wallEnd.y + wallW / 2 &&
      ball.nextY > wallEnd.y
    ) {
      const distance = distance2D(wallEnd, { x: ball.nextX, y: ball.nextY });
      if (distance < ballSize / 2 + wallW / 2) {
        const closest = closestItCanBe(wallEnd, {
          x: ball.nextX,
          y: ball.nextY,
        });
        const rolled = rollAroundCap(wallEnd, {
          x: closest.x,
          y: closest.y,
          velocityX: ball.velocityX,
          velocityY: ball.velocityY,
        });
        Object.assign(ball, rolled);
      }
    }

    if (ball.nextY >= wallStart.y && ball.nextY <= wallEnd.y) {
      if (ball.nextX < wall.x) {
        ball.nextX = wall.x - wallW / 2 - ballSize / 2;
      } else {
        ball.nextX = wall.x + wallW / 2 + ballSize / 2;
      }
      ball.velocityX = -ball.velocityX / 3;
    }
  }
}

// Initialize the game when loaded
window.addEventListener("DOMContentLoaded", initGame);
