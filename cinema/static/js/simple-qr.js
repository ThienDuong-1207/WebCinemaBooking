// Simple QR Code generator using canvas
function generateSimpleQR(text, size = 200) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = size;
    canvas.height = size;
    
    // Simple pattern-based QR code simulation
    const gridSize = 25; // 25x25 grid
    const cellSize = size / gridSize;
    
    // Fill background white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Generate pseudo-random pattern based on text
    ctx.fillStyle = '#000000';
    
    // Create deterministic pattern from text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff;
    }
    
    // Generate pattern
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const seed = hash + row * gridSize + col;
            const random = Math.abs(Math.sin(seed)) * 10000;
            const shouldFill = (random % 100) < 45; // ~45% fill rate
            
            // Always fill corner squares (QR code markers)
            const isCorner = (row < 7 && col < 7) || 
                           (row < 7 && col >= gridSize - 7) || 
                           (row >= gridSize - 7 && col < 7);
            
            if (shouldFill || isCorner) {
                ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
    }
    
    // Add corner position markers
    drawPositionMarker(ctx, 0, 0, cellSize);
    drawPositionMarker(ctx, (gridSize - 7) * cellSize, 0, cellSize);
    drawPositionMarker(ctx, 0, (gridSize - 7) * cellSize, cellSize);
    
    return canvas;
}

function drawPositionMarker(ctx, x, y, cellSize) {
    ctx.fillStyle = '#000000';
    // Outer square
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
    // Inner white square
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
    // Center black square
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
}

// Export function
window.generateSimpleQR = generateSimpleQR; 