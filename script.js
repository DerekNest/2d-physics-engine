// --- Setup ---
const canvas = document.getElementById('physicsCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions based on window size, but with a max
const canvasWidth = Math.min(window.innerWidth * 0.9, 800);
const canvasHeight = Math.min(window.innerHeight * 0.7, 600);
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// --- Configuration ---
const gravity = 0.5; // A constant downward acceleration
const restitution = 0.8; // Bounciness factor (0 = no bounce, 1 = perfect bounce)
const numCircles = 25;
const circles = [];

// --- Utility Function ---
function getRandomColor() {
    const letters = '89ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * letters.length)];
    }
    return color;
}

// --- Circle Class ---
// This class represents a single object in our physics world.
class Circle {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;

        this.mass = this.radius * this.radius; // Mass proportional to size
        // Velocity components
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 5;
    }

    // Draw the circle on the canvas
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    // Update the circle's state for the next frame
    update() {
        // Apply gravity
        this.vy += gravity;

        // Update position based on velocity
        this.x += this.vx;
        this.y += this.vy;

        // --- Boundary Collision Detection ---
        // Check for collision with the floor
        if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.vy *= -restitution; // Reverse and dampen velocity
        }

        // Check for collision with the ceiling
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -restitution;
        }

        // Check for collision with the right wall
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -restitution;
        }

        // Check for collision with the left wall
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -restitution;
        }
    }
}

// --- Initialization ---
function init() {
    for (let i = 0; i < numCircles; i++) {
        const radius = Math.random() * 15 + 10;
        // Ensure circles don't spawn inside walls
        const x = Math.random() * (canvas.width - 2 * radius) + radius;
        const y = Math.random() * (canvas.height / 2 - 2 * radius) + radius;
        const color = getRandomColor();
        circles.push(new Circle(x, y, radius, color));
    }
}

function handleCollisions() {
    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            const c1 = circles[i];
            const c2 = circles[j];
            const dx = c2.x - c1.x;
            const dy = c2.y - c1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = c1.radius + c2.radius;
            if (distance < minDist) {
                // 1. Positional Correction
                // Simple elastic collision response
                const angle = Math.atan2(dy, dx);
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);
                // Rotate circle positions
                const pos0 = { x: 0, y: 0 };
                const pos1 = { x: dx * cos + dy * sin, y: dy * cos - dx * sin };
                // Rotate circle velocities
                const vel0 = { x: c1.vx * cos + c1.vy * sin, y: c1.vy * cos - c1.vx * sin };
                const vel1 = { x: c2.vx * cos + c2.vy * sin, y: c2.vy * cos - c2.vx * sin };
                // Conservation of momentum in 1D
                const vxTotal = vel0.x - vel1.x;
                vel0.x = ((c1.mass - c2.mass) * vel0.x + 2 * c2.mass * vel1.x) / (c1.mass + c2.mass);
                vel1.x = vxTotal + vel0.x;
                // Update positions to avoid overlap
                const absV = Math.abs(vel0.x) + Math.abs(vel1.x);
                const overlap = (minDist - distance);
                pos0.x += vel0.x / absV * overlap;
                pos1.x += vel1.x / absV * overlap;
                // Rotate positions back
                const pos0F = { x: pos0.x * cos - pos0.y * sin, y: pos0.y * cos + pos0.x * sin };
                const pos1F = { x: pos1.x * cos - pos1.y * sin, y: pos1.y * cos + pos1.x * sin };
                // Update actual positions
                c2.x = c1.x + pos1F.x;
                c2.y = c1.y + pos1F.y;
                c1.x = c1.x + pos0F.x;
                c1.y = c1.y + pos0F.y;
                // Rotate velocities back
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

// --- Main Animation Loop ---
// This is the heartbeat of the engine.
function animate() {
    // Clear the entire canvas for the next frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw every circle
    for (const circle of circles) {
        circle.update();
        circle.draw();
    }

    // Handle collisions between circles
    handleCollisions();
    // Request the next frame
    requestAnimationFrame(animate);
}

// --- Start the engine ---
init();
animate();
