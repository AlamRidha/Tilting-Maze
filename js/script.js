Math.minmax = (value, limit) => {
  return Math.max(Math.min(value, limit), -limit);
};

const distance2D = (p1, p2) => {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
};

// Angle between the two points
const getAngle = (p1, p2) => {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

// The closest a ball and a wall cap can be
const closestItCanBe = (cap, ball) => {
  let angle = getAngle(cap, ball);

  const deltaX = Math.cos(angle) * (wallW / 2 + ballSize / 2);
  const deltaY = Math.sin(angle) * (wallW / 2 + ballSize / 2);

  return { x: cap.x + deltaX, y: cap.y + deltaY };
};

// Roll the ball around the wall cap
const rollAroundCap = (cap, ball) => {
  const distance = distance2D(cap, ball);
  const minDistance = wallW / 2 + ballSize / 2;

  if (distance <= minDistance) {
    // Normalize vector from cap to ball
    const angle = Math.atan2(ball.y - cap.y, ball.x - cap.x);

    // Position ball at minimum distance
    const newX = cap.x + Math.cos(angle) * minDistance;
    const newY = cap.y + Math.sin(angle) * minDistance;

    // Reflect velocity with damping
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

// Decreases the absolute value of a number but keeps it's sign, doesn't go below abs 0
const slow = (number, difference) => {
  if (Math.abs(number) <= difference) return 0;
  if (number > difference) return number - difference;
  return number + difference;
};

const mazeElement = document.getElementById("maze");
const joystickHeadElement = document.getElementById("joystick-head");
const noteElement = document.getElementById("note");
const restartBtn = document.getElementById("restart-btn");

// Constants
const MAX_VELOCITY = 1.5;
const pathW = 25;
const wallW = 10;
const ballSize = 10;
const holeSize = 18;

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

const debugMode = false;

let balls = [];
let ballElements = [];
let holeElements = [];

// Wall metadata
const walls = [
  // Border
  { column: 0, row: 0, horizontal: true, length: 10 },
  { column: 0, row: 0, horizontal: false, length: 9 },
  { column: 0, row: 9, horizontal: true, length: 10 },
  { column: 10, row: 0, horizontal: false, length: 9 },

  // Horizontal lines starting in 1st column
  { column: 0, row: 6, horizontal: true, length: 1 },
  { column: 0, row: 8, horizontal: true, length: 1 },

  // Horizontal lines starting in 2nd column
  { column: 1, row: 1, horizontal: true, length: 2 },
  { column: 1, row: 7, horizontal: true, length: 1 },

  // Horizontal lines starting in 3rd column
  { column: 2, row: 2, horizontal: true, length: 2 },
  { column: 2, row: 4, horizontal: true, length: 1 },
  { column: 2, row: 5, horizontal: true, length: 1 },
  { column: 2, row: 6, horizontal: true, length: 1 },

  // Horizontal lines starting in 4th column
  { column: 3, row: 3, horizontal: true, length: 1 },
  { column: 3, row: 8, horizontal: true, length: 3 },

  // Horizontal lines starting in 5th column
  { column: 4, row: 6, horizontal: true, length: 1 },

  // Horizontal lines starting in 6th column
  { column: 5, row: 2, horizontal: true, length: 2 },
  { column: 5, row: 7, horizontal: true, length: 1 },

  // Horizontal lines starting in 7th column
  { column: 6, row: 1, horizontal: true, length: 1 },
  { column: 6, row: 6, horizontal: true, length: 2 },

  // Horizontal lines starting in 8th column
  { column: 7, row: 3, horizontal: true, length: 2 },
  { column: 7, row: 7, horizontal: true, length: 2 },

  // Horizontal lines starting in 9th column
  { column: 8, row: 1, horizontal: true, length: 1 },
  { column: 8, row: 2, horizontal: true, length: 1 },
  { column: 8, row: 3, horizontal: true, length: 1 },
  { column: 8, row: 4, horizontal: true, length: 2 },
  { column: 8, row: 8, horizontal: true, length: 2 },

  // Vertical lines after the 1st column
  { column: 1, row: 1, horizontal: false, length: 2 },
  { column: 1, row: 4, horizontal: false, length: 2 },

  // Vertical lines after the 2nd column
  { column: 2, row: 2, horizontal: false, length: 2 },
  { column: 2, row: 5, horizontal: false, length: 1 },
  { column: 2, row: 7, horizontal: false, length: 2 },

  // Vertical lines after the 3rd column
  { column: 3, row: 0, horizontal: false, length: 1 },
  { column: 3, row: 4, horizontal: false, length: 1 },
  { column: 3, row: 6, horizontal: false, length: 2 },

  // Vertical lines after the 4th column
  { column: 4, row: 1, horizontal: false, length: 2 },
  { column: 4, row: 6, horizontal: false, length: 1 },

  // Vertical lines after the 5th column
  { column: 5, row: 0, horizontal: false, length: 2 },
  { column: 5, row: 6, horizontal: false, length: 1 },
  { column: 5, row: 8, horizontal: false, length: 1 },

  // Vertical lines after the 6th column
  { column: 6, row: 4, horizontal: false, length: 1 },
  { column: 6, row: 6, horizontal: false, length: 1 },

  // Vertical lines after the 7th column
  { column: 7, row: 1, horizontal: false, length: 4 },
  { column: 7, row: 7, horizontal: false, length: 2 },

  // Vertical lines after the 8th column
  { column: 8, row: 2, horizontal: false, length: 1 },
  { column: 8, row: 4, horizontal: false, length: 2 },

  // Vertical lines after the 9th column
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
  // Draw walls
  walls.forEach(({ x, y, horizontal, length }) => {
    const wall = document.createElement("div");
    wall.setAttribute("class", "wall");
    wall.style.cssText = `
          left: ${x}px;
          top: ${y}px;
          width: ${wallW}px;
          height: ${length}px;
          transform: rotate(${horizontal ? -90 : 0}deg);
        `;

    mazeElement.appendChild(wall);
  });

  resetGame();
}

// Event Listeners
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
  if (![" ", "H", "h", "E", "e"].includes(event.key)) return;

  event.preventDefault();

  if (event.key == " ") {
    resetGame();
    return;
  }

  if (event.key == "H" || event.key == "h") {
    hardMode = true;
    resetGame();
    return;
  }

  if (event.key == "E" || event.key == "e") {
    hardMode = false;
    resetGame();
    return;
  }
});

restartBtn.addEventListener("click", function () {
  resetGame();
});

// Game functions
function startGame(clientX, clientY) {
  if (!gameInProgress) {
    mouseStartX = clientX;
    mouseStartY = clientY;
    gameInProgress = true;
    noteElement.style.opacity = 0;
    joystickHeadElement.style.cssText = `
          animation: none;
          cursor: grabbing;
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
      `;

  const rotationY = mouseDeltaX * 0.8;
  const rotationX = mouseDeltaY * 0.8;

  mazeElement.style.cssText = `
        transform: rotateY(${rotationY}deg) rotateX(${-rotationX}deg)
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
    `;

    // Gradually reduce acceleration
    accelerationX = 0;
    accelerationY = 0;
  }
}

function resetGame() {
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

  mazeElement.style.cssText = `
        transform: rotateY(0deg) rotateX(0deg)
      `;

  joystickHeadElement.style.cssText = `
        left: 0;
        top: 0;
        animation: glow 0.6s infinite alternate ease-in-out 4s;
        cursor: grab;
      `;

  if (hardMode) {
    noteElement.innerHTML = `<h3><b>Instructions:</b></h3>
      Click the joystick to start!
          <p>Hard mode, Avoid black holes. Back to easy mode? Press E</p>`;
  } else {
    noteElement.innerHTML = `<h3><b>Instructions:</b></h3>
      Click the joystick to start!
          <p>Move every ball to the center. Ready for hard mode? Press H</p>`;
  }
  noteElement.style.opacity = 1;

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
  }));

  // Create ball elements if they don't exist
  if (ballElements.length === 0) {
    balls.forEach(({ x, y }) => {
      const ball = document.createElement("div");
      ball.setAttribute("class", "ball");
      ball.style.cssText = `left: ${x}px; top: ${y}px; `;
      mazeElement.appendChild(ball);
      ballElements.push(ball);
    });
  } else {
    // Update existing ball positions
    balls.forEach(({ x, y }, index) => {
      ballElements[index].style.cssText = `left: ${x}px; top: ${y}px; `;
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
      hole.setAttribute("class", "black-hole");
      hole.style.cssText = `left: ${x}px; top: ${y}px; `;
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
        // Apply physics to X axis
        if (velocityChangeX === 0) {
          ball.velocityX = slow(ball.velocityX, frictionDeltaX);
        } else {
          ball.velocityX += velocityChangeX;
          ball.velocityX = Math.minmax(ball.velocityX, MAX_VELOCITY);
          ball.velocityX -= Math.sign(velocityChangeX) * frictionDeltaX;
        }

        // Apply physics to Y axis
        if (velocityChangeY === 0) {
          ball.velocityY = slow(ball.velocityY, frictionDeltaY);
        } else {
          ball.velocityY += velocityChangeY;
          ball.velocityY = Math.minmax(ball.velocityY, MAX_VELOCITY);
          ball.velocityY -= Math.sign(velocityChangeY) * frictionDeltaY;
        }

        // Calculate next position
        ball.nextX = ball.x + ball.velocityX;
        ball.nextY = ball.y + ball.velocityY;

        // Collision detection with walls
        walls.forEach((wall, wi) => {
          if (wall.horizontal) {
            handleHorizontalWallCollision(ball, wall, wi);
          } else {
            handleVerticalWallCollision(ball, wall, wi);
          }
        });

        // Check for holes in hard mode
        if (hardMode) {
          holes.forEach((hole, hi) => {
            const distance = distance2D(hole, {
              x: ball.nextX,
              y: ball.nextY,
            });

            if (distance <= holeSize / 2) {
              holeElements[hi].style.backgroundColor = "red";
              throw new Error("The ball fell into a hole");
            }
          });
        }

        // Update ball position
        ball.x = ball.nextX;
        ball.y = ball.nextY;
      });

      // Update ball visuals
      balls.forEach(({ x, y }, index) => {
        ballElements[index].style.cssText = `left: ${x}px; top: ${y}px; `;
      });
    }

    // Win condition
    const center = { x: 350 / 2, y: 315 / 2 };
    if (balls.every((ball) => distance2D(ball, center) < 65 / 2)) {
      noteElement.innerHTML = `Congrats, you did it!
          ${!hardMode ? "<p>Press H for hard mode</p>" : ""}`;
      noteElement.style.opacity = 1;
      gameInProgress = false;
    } else {
      previousTimestamp = timestamp;
      animationFrameId = window.requestAnimationFrame(main);
    }
  } catch (error) {
    if (error.message === "The ball fell into a hole") {
      noteElement.innerHTML = `A ball fell into a black hole! Press space to reset the game.
          <p>Back to easy? Press E</p>`;
      noteElement.style.opacity = 1;
      gameInProgress = false;
    } else {
      console.error("Game error:", error);
      noteElement.innerHTML = `Game error occurred. Press space to restart.`;
      noteElement.style.opacity = 1;
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

    // Check left cap collision
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

    // Check right cap collision
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

    // Check main wall body collision
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

    // Check top cap collision
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

    // Check bottom cap collision
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

    // Check main wall body collision
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
