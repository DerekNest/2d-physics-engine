// --- WebSocket Server Setup ---
// Import the WebSocket library, which allows for real-time, two-way communication.
const WebSocket = require('ws');
// Create a new WebSocket server instance that listens for connections on port 8080.
const wss = new WebSocket.Server({ port: 8080 });

// Log a message to the console to confirm that the server has started successfully.
console.log('Server started on port 8080...');

// --- World Configuration & Physics Constants ---
const gravity = 0.5; // Represents the downward acceleration applied to all circles each frame.
const restitution = 0.8; // The "bounciness" factor. 1 is a perfect bounce, 0 is no bounce.
const numCircles = 25; // The total number of circles to create in the simulation.
const circles = []; // An array to store all the circle objects in our world.
const worldWidth = 800; // The width of the simulation area, matching the client's canvas.
const worldHeight = 600; // The height of the simulation area, matching the client's canvas.

/**
 * Generates a random hexadecimal color code.
 * @returns {string} A color string, e.g., '#89CDEF'.
 */
function getRandomColor() {
  const letters = '89ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

// --- Circle Class ---
// Defines the blueprint for every object in our physics simulation.
class Circle {
  constructor(x, y, radius, color) {
    this.x = x; // Horizontal position.
    this.y = y; // Vertical position.
    this.radius = radius;
    this.color = color;
    this.mass = this.radius * this.radius; // Mass is proportional to the area of the circle.

    // Assign a random initial velocity to make the start more dynamic.
    this.vx = (Math.random() - 0.5) * 20;
    this.vy = (Math.random() - 0.5) * 15;

    // A flag to determine if the circle's physics should be paused for user interaction.
    this.isBeingDragged = false;
  }

  // Updates the circle's state for the next frame of the simulation.
  update() {
    // If a user is dragging the circle, pause its physics calculations.
    if (this.isBeingDragged) return;

    // Apply gravity to the vertical velocity.
    this.vy += gravity;

    // Update the position based on the current velocity.
    this.x += this.vx;
    this.y += this.vy;

    // --- Boundary Collision Detection & Response ---
    // Floor
    if (this.y + this.radius > worldHeight) {
      this.y = worldHeight - this.radius; // Correct position to prevent sinking.
      this.vy *= -restitution; // Reverse and dampen vertical velocity.
    }
    // Ceiling
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy *= -restitution;
    }
    // Right Wall
    if (this.x + this.radius > worldWidth) {
      this.x = worldWidth - this.radius;
      this.vx *= -restitution;
    }
    // Left Wall
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx *= -restitution;
    }
  }
}

// --- Simulation Initialization ---
/**
 * Creates the initial set of circles and populates the world.
 */
function init() {
  for (let i = 0; i < numCircles; i++) {
    const radius = Math.random() * 15 + 10;
    const x = Math.random() * (worldWidth - 2 * radius) + radius;
    const y = Math.random() * (worldHeight / 2 - 2 * radius) + radius;
    const color = getRandomColor();
    circles.push(new Circle(x, y, radius, color));
  }
}

/**
 * Detects and resolves collisions between every pair of circles.
 */
function handleCollisions() {
  // Use a nested loop to check every unique pair of circles.
  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      const c1 = circles[i];
      const c2 = circles[j];

      // Skip collision checks if one of the circles is being dragged by a user.
      if (c1.isBeingDragged || c2.isBeingDragged) continue;

      // --- Collision Detection ---
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDist = c1.radius + c2.radius;

      // If the distance is less than the sum of radii, they are colliding.
      if (distance < minDist) {
        // --- Collision Resolution (Physics Calculation) ---
        // This complex block of code calculates the elastic collision response
        // based on the conservation of momentum and kinetic energy.
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        // Rotate velocities to a 1D axis for easier calculation.
        const vel0 = { x: c1.vx * cos + c1.vy * sin, y: c1.vy * cos - c1.vx * sin };
        const vel1 = { x: c2.vx * cos + c2.vy * sin, y: c2.vy * cos - c2.vx * sin };

        // Apply conservation of momentum formula.
        const vxTotal = vel0.x - vel1.x;
        vel0.x = ((c1.mass - c2.mass) * vel0.x + 2 * c2.mass * vel1.x) / (c1.mass + c2.mass);
        vel1.x = vxTotal + vel0.x;

        // Positional correction to prevent circles from overlapping.
        const overlap = (minDist - distance);
        const absV = Math.abs(vel0.x) + Math.abs(vel1.x);
        const pos0 = { x: 0, y: 0 };
        const pos1 = { x: dx * cos + dy * sin, y: dy * cos - dx * sin };
        pos0.x += vel0.x / absV * overlap;
        pos1.x += vel1.x / absV * overlap;

        // Rotate corrected positions back to the original coordinate system.
        const pos0F = { x: pos0.x * cos - pos0.y * sin, y: pos0.y * cos + pos0.x * sin };
        const pos1F = { x: pos1.x * cos - pos1.y * sin, y: pos1.y * cos + pos1.x * sin };
        c2.x = c1.x + pos1F.x;
        c2.y = c1.y + pos1F.y;
        c1.x = c1.x + pos0F.x;
        c1.y = c1.y + pos0F.y;

        // Rotate final velocities back to the original coordinate system.
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

// --- Main Game Loop ---
/**
 * The heartbeat of the server-side simulation.
 */
function gameLoop() {
  // 1. Update the state of every circle in the world.
  circles.forEach(c => c.update());
  handleCollisions();

  // 2. Prepare the game state to be sent to all clients.
  // We create a simplified array of objects containing only what clients need to render.
  const gameState = circles.map((circle, index) => ({
    id: index, // The array index serves as a unique ID.
    x: circle.x,
    y: circle.y,
    radius: circle.radius,
    color: circle.color,
  }));

  // 3. Broadcast the game state to every connected client.
  const message = JSON.stringify(gameState);
  wss.clients.forEach(client => {
    // Only send to clients that have an open and active connection.
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Create the initial world state.
init();
// Start the game loop, running it approximately 60 times per second (1000ms / 60).
setInterval(gameLoop, 1000 / 60);

// --- WebSocket Connection Handling ---
// This block runs whenever a new client (a browser) connects to the server.
wss.on('connection', ws => {
  console.log('New client connected!');

  // This block runs whenever the server receives a message from a specific client.
  ws.on('message', rawMessage => {
    // Use a try...catch block to prevent one bad message from crashing the server.
    try {
      const data = JSON.parse(rawMessage);
      const circle = circles[data.id];

      // Ignore messages that don't have an ID or have an invalid one.
      if (typeof data.id === 'undefined' || !circle) return;

      // Handle different types of messages from the client.
      switch (data.type) {
        case 'dragStart':
          circle.isBeingDragged = true;
          circle.vx = 0;
          circle.vy = 0; // Stop the circle's movement.
          break;
        case 'drag':
          if (circle.isBeingDragged) {
            // Update the circle's position directly based on the user's mouse.
            circle.x = data.x;
            circle.y = data.y;
          }
          break;
        case 'dragEnd':
          circle.isBeingDragged = false; // Resume physics calculations.
          break;
      }
    } catch (error) {
      console.error("Failed to parse message or process data:", error);
    }
  });

  // This block runs when a client disconnects.
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Note: The server does not send any initial "hello" message to clients upon connection.