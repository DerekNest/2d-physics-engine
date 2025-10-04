const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

console.log('Server started on port 8080...');

// --- World Configuration ---
const gravity = 0.5;
const restitution = 0.8;
const numCircles = 25;
const circles = [];
const worldWidth = 800;
const worldHeight = 600;

function getRandomColor() {
  const letters = '89ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

// --- Circle Class ---
class Circle {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.mass = this.radius * this.radius;

    // *** THIS IS THE CHANGE ***
    // Increased the initial velocity multipliers for a more energetic start.
    this.vx = (Math.random() - 0.5) * 20; // Was 10
    this.vy = (Math.random() - 0.5) * 15; // Was 5

    this.isBeingDragged = false;
  }

  update() {
    if (this.isBeingDragged) return;

    this.vy += gravity;
    this.x += this.vx;
    this.y += this.vy;

    if (this.y + this.radius > worldHeight) {
      this.y = worldHeight - this.radius;
      this.vy *= -restitution;
    }
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy *= -restitution;
    }
    if (this.x + this.radius > worldWidth) {
      this.x = worldWidth - this.radius;
      this.vx *= -restitution;
    }
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx *= -restitution;
    }
  }
}

// All other code (init, handleCollisions, gameLoop, WebSocket handlers) remains the same.
function init() {
  for (let i = 0; i < numCircles; i++) {
    const radius = Math.random() * 15 + 10;
    const x = Math.random() * (worldWidth - 2 * radius) + radius;
    const y = Math.random() * (worldHeight / 2 - 2 * radius) + radius;
    const color = getRandomColor();
    circles.push(new Circle(x, y, radius, color));
  }
}

function handleCollisions() {
  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      const c1 = circles[i];
      const c2 = circles[j];
      if (c1.isBeingDragged || c2.isBeingDragged) continue;

      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDist = c1.radius + c2.radius;

      if (distance < minDist) {
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const pos0 = { x: 0, y: 0 };
        const pos1 = { x: dx * cos + dy * sin, y: dy * cos - dx * sin };
        const vel0 = { x: c1.vx * cos + c1.vy * sin, y: c1.vy * cos - c1.vx * sin };
        const vel1 = { x: c2.vx * cos + c2.vy * sin, y: c2.vy * cos - c2.vx * sin };
        const vxTotal = vel0.x - vel1.x;
        vel0.x = ((c1.mass - c2.mass) * vel0.x + 2 * c2.mass * vel1.x) / (c1.mass + c2.mass);
        vel1.x = vxTotal + vel0.x;
        const absV = Math.abs(vel0.x) + Math.abs(vel1.x);
        const overlap = (minDist - distance);
        pos0.x += vel0.x / absV * overlap;
        pos1.x += vel1.x / absV * overlap;
        const pos0F = { x: pos0.x * cos - pos0.y * sin, y: pos0.y * cos + pos0.x * sin };
        const pos1F = { x: pos1.x * cos - pos1.y * sin, y: pos1.y * cos + pos1.x * sin };
        c2.x = c1.x + pos1F.x;
        c2.y = c1.y + pos1F.y;
        c1.x = c1.x + pos0F.x;
        c1.y = c1.y + pos0F.y;
        const vel0F = { x: vel0.x * cos - vel0.y * sin, y: vel0.y * cos + vel0.x * sin };
        const vel1F = { x: vel1.x * cos - vel1.y * sin, y: vel1.y * cos + vel1.x * sin };
        c1.vx = vel0F.x;
        c1.vy = vel0F.y;
        c2.vx = vel1F.x;
        c2.vy = vel1F.y;
      }
    }
  }
}

function gameLoop() {
  circles.forEach(c => c.update());
  handleCollisions();
  const gameState = circles.map((circle, index) => ({
    id: index, x: circle.x, y: circle.y, radius: circle.radius, color: circle.color,
  }));
  const message = JSON.stringify(gameState);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

init();
setInterval(gameLoop, 1000 / 60);

wss.on('connection', ws => {
  console.log('New client connected!');
  ws.on('message', rawMessage => {
    try {
      const data = JSON.parse(rawMessage);
      const circle = circles[data.id];
      if (typeof data.id === 'undefined' || !circle) return;
      switch (data.type) {
        case 'dragStart':
          circle.isBeingDragged = true;
          circle.vx = 0; circle.vy = 0;
          break;
        case 'drag':
          if (circle.isBeingDragged) {
            circle.x = data.x;
            circle.y = data.y;
          }
          break;
        case 'dragEnd':
          circle.isBeingDragged = false;
          break;
      }
    } catch (error) {
      console.error("Failed to parse message or process data:", error);
    }
  });
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

