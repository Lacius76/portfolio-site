/**
 * Single Column Infinite Vertical Scroll Engine (desktop only)
 *
 * On viewports below lg (1024px), project cards scroll normally with the page.
 */

document.addEventListener("DOMContentLoaded", () => {
  const col1 = document.getElementById("scroll-col-1");
  const container = document.getElementById("infinite-scroll-container");

  if (!col1) return;

  const DESKTOP_MQ = window.matchMedia("(min-width: 1024px)");
  const originalHTML = col1.innerHTML;

  let animationId = null;
  let isAnimated = false;
  let y1 = 0;
  const baseSpeed1 = -40;
  let targetSpeed1 = baseSpeed1;
  let currentSpeed1 = baseSpeed1;
  let height1 = 0;
  let lastTime = performance.now();

  const updateHeights = () => {
    if (!isAnimated) return;
    height1 = col1.scrollHeight / 2;
  };

  const animationLoop = (time) => {
    if (!isAnimated) return;

    const delta = time - lastTime;
    lastTime = time;

    if (!height1) {
      animationId = requestAnimationFrame(animationLoop);
      return;
    }

    const timeRatio = delta / 1000;
    currentSpeed1 += (targetSpeed1 - currentSpeed1) * 0.1;
    y1 += currentSpeed1 * timeRatio;

    if (y1 <= -height1) y1 += height1;
    else if (y1 > 0) y1 -= height1;

    col1.style.transform = `translateY(${y1}px)`;
    animationId = requestAnimationFrame(animationLoop);
  };

  const stopAnimation = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };

  const enableAnimation = () => {
    if (isAnimated) return;
    isAnimated = true;
    container?.classList.add("is-scroll-animated");

    col1.innerHTML = originalHTML + originalHTML;
    col1.style.transform = "";
    y1 = 0;
    currentSpeed1 = baseSpeed1;
    targetSpeed1 = baseSpeed1;
    lastTime = performance.now();

    setTimeout(updateHeights, 150);
    animationId = requestAnimationFrame(animationLoop);
  };

  const disableAnimation = () => {
    if (!isAnimated) return;
    isAnimated = false;
    container?.classList.remove("is-scroll-animated");

    stopAnimation();
    col1.innerHTML = originalHTML;
    col1.style.transform = "";
    height1 = 0;
    y1 = 0;
  };

  const onBreakpointChange = () => {
    if (DESKTOP_MQ.matches) enableAnimation();
    else disableAnimation();
  };

  window.addEventListener("resize", updateHeights);
  DESKTOP_MQ.addEventListener("change", onBreakpointChange);
  onBreakpointChange();

  if (container) {
    container.addEventListener("mouseenter", () => {
      if (!isAnimated) return;
      targetSpeed1 = baseSpeed1 * 3;
    });

    container.addEventListener("mouseleave", () => {
      if (!isAnimated) return;
      targetSpeed1 = baseSpeed1;
    });

    container.addEventListener(
      "wheel",
      (e) => {
        if (!isAnimated) return;

        const scrollFactor = 1.2;
        y1 -= e.deltaY * scrollFactor;

        if (y1 <= -height1) y1 += height1;
        else if (y1 > 0) y1 -= height1;

        e.preventDefault();
      },
      { passive: false }
    );

    let touchStartY = 0;

    container.addEventListener(
      "touchstart",
      (e) => {
        if (!isAnimated) return;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    container.addEventListener(
      "touchmove",
      (e) => {
        if (!isAnimated) return;

        const currentY = e.touches[0].clientY;
        const deltaY = touchStartY - currentY;
        touchStartY = currentY;

        y1 -= deltaY * 1.5;

        if (y1 <= -height1) y1 += height1;
        else if (y1 > 0) y1 -= height1;

        e.preventDefault();
      },
      { passive: false }
    );
  }
});
