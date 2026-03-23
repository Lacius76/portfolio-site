/**
 * Single Column Infinite Vertical Scroll Engine
 * 
 * Replaces the static project grid with a highly-performant, GPU-accelerated
 * scrolling interface driven by requestAnimationFrame.
 */

document.addEventListener("DOMContentLoaded", () => {
    const col1 = document.getElementById("scroll-col-1");
  
    if (!col1) return;
  
    // Seamless duplication: Clone the existing cards so we have 2 full sets for wrapping
    col1.innerHTML += col1.innerHTML;
  
    // Variables for motion
    let y1 = 0;
    
    // Base speed (pixels per second)
    const baseSpeed1 = -40;
  
    // Current target speeds for lerping
    let targetSpeed1 = baseSpeed1;
  
    // Current real speeds
    let currentSpeed1 = baseSpeed1;
  
    let height1 = 0;
  
    const updateHeights = () => {
        // One set height is total scrollHeight / 2 because we duplicated it once.
        height1 = col1.scrollHeight / 2;
    };
  
    // Delay highly calculating heights immediately to let images/videos paint
    setTimeout(updateHeights, 150);
    window.addEventListener("resize", updateHeights);
  
    // Time tracking for consistent frame velocity
    let lastTime = performance.now();
  
    const animationLoop = (time) => {
        const delta = time - lastTime;
        lastTime = time;
  
        if (!height1) {
            requestAnimationFrame(animationLoop);
            return;
        }
  
        const timeRatio = delta / 1000;
  
        // Lerp velocities for smooth speed-shifting
        currentSpeed1 += (targetSpeed1 - currentSpeed1) * 0.1;
  
        // Move columns
        y1 += currentSpeed1 * timeRatio;
  
        // Wraparound Logic for seamless loop
        if (y1 <= -height1) y1 += height1;
        else if (y1 > 0) y1 -= height1;
  
        // Apply GPU accelerated transform
        col1.style.transform = `translateY(${y1}px)`;
  
        requestAnimationFrame(animationLoop);
    };
  
    requestAnimationFrame(animationLoop);
  
    // --- Interactions --- //
    const container = document.getElementById("infinite-scroll-container");
    
    if (container) {
        // Hover Speed Up
        container.addEventListener("mouseenter", () => {
            targetSpeed1 = baseSpeed1 * 3;
        });
        
        container.addEventListener("mouseleave", () => {
            targetSpeed1 = baseSpeed1;
        });
  
        // Manual Trackpad/Mouse Wheel scroll inside container
        container.addEventListener("wheel", (e) => {
            // Accelerate slightly for responsiveness
            const scrollFactor = 1.2;
            y1 -= (e.deltaY * scrollFactor);
            
            // Reapply bounds instantly to avoid visual tearing
            if (y1 <= -height1) y1 += height1;
            else if (y1 > 0) y1 -= height1;
            
            // Prevent default page scrolling if they are over the grid
            e.preventDefault();
        }, { passive: false });
  
        // Mobile Touch Gestures
        let touchStartY = 0;
        container.addEventListener("touchstart", (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
  
        container.addEventListener("touchmove", (e) => {
            const currentY = e.touches[0].clientY;
            const deltaY = touchStartY - currentY;
            touchStartY = currentY;
            
            // Apply larger factor for touch to feel natural
            const touchFactor = 1.5;
            y1 -= (deltaY * touchFactor);
            
            if (y1 <= -height1) y1 += height1;
            else if (y1 > 0) y1 -= height1;
            
            e.preventDefault();
        }, { passive: false });
    }
});
