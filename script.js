// --- Setup ---
const canvas = document.getElementById('physicsCanvas');
const ctx = canvas.getContext('2d');

const canvasWidth = 800;
const canvasHeight = 600;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// --- Networking ---
const socket = new WebSocket('ws://localhost:8080');

let circlesToDraw = [];
let isDragging = false;
let draggedCircleId = null;
let offsetX = 0;
let offsetY = 0;

socket.onopen = () => {
    console.log('Successfully connected to the WebSocket server!');
    // The problematic "hello" message has been removed from here.
};

socket.onmessage = event => {
    const gameState = JSON.parse(event.data);
    circlesToDraw = gameState;
};

socket.onclose = () => {
    console.log('Disconnected from the WebSocket server.');
};

socket.onerror = error => {
    console.error('WebSocket error:', error);
};

// --- User Input Handling ---
function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

canvas.addEventListener('mousedown', (e) => {
    const mousePos = getMousePos(canvas, e);
    for (let i = circlesToDraw.length - 1; i >= 0; i--) {
        const circle = circlesToDraw[i];
        const dx = mousePos.x - circle.x;
        const dy = mousePos.y - circle.y;
        if (dx * dx + dy * dy < circle.radius * circle.radius) {
            isDragging = true;
            draggedCircleId = circle.id;
            offsetX = dx;
            offsetY = dy;
            socket.send(JSON.stringify({ type: 'dragStart', id: draggedCircleId }));
            break;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const mousePos = getMousePos(canvas, e);
    const newX = mousePos.x - offsetX;
    const newY = mousePos.y - offsetY;
    socket.send(JSON.stringify({ type: 'drag', id: draggedCircleId, x: newX, y: newY }));
});

canvas.addEventListener('mouseup', () => {
    if (isDragging) {
        socket.send(JSON.stringify({ type: 'dragEnd', id: draggedCircleId }));
        isDragging = false;
        draggedCircleId = null;
    }
});

// --- Main Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const circle of circlesToDraw) {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = circle.color;
        ctx.fill();
        ctx.closePath();
    }
}

animate();

