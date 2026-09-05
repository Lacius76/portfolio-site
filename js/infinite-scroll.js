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

  // Click tracking — transform animations can drop native click
  let pointerDownLink = null;
  let pointerDownX = 0;
  let pointerDownY = 0;

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

  const findCardLink = (target) => {
    if (!(target instanceof Element)) return null;
    const link = target.closest("a[href]");
    if (!link || !col1.contains(link)) return null;
    const href = link.getAttribute("href");
    if (!href || href === "#") return null;
    return link;
  };

  const navigateToCard = (link) => {
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href) return;
    window.location.assign(href);
  };

  window.addEventListener("resize", updateHeights);
  DESKTOP_MQ.addEventListener("change", onBreakpointChange);
  onBreakpointChange();

  if (container) {
    container.addEventListener("mouseenter", () => {
      if (!isAnimated) return;
      // Pause so cards stay still long enough for a reliable click
      targetSpeed1 = 0;
      currentSpeed1 = 0;
    });

    container.addEventListener("mouseleave", () => {
      if (!isAnimated) return;
      targetSpeed1 = baseSpeed1;
      pointerDownLink = null;
    });

    container.addEventListener(
      "wheel",
      (e) => {
        if (!isAnimated) return;

        const scrollFactor = 1.2;
        y1 -= e.deltaY * scrollFactor;

        if (y1 <= -height1) y1 += height1;
        else if (y1 > 0) y1 -= height1;

        col1.style.transform = `translateY(${y1}px)`;
        e.preventDefault();
      },
      { passive: false }
    );

    container.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0) return;
        const link = findCardLink(e.target);
        pointerDownLink = link;
        pointerDownX = e.clientX;
        pointerDownY = e.clientY;
      },
      true
    );

    container.addEventListener(
      "pointerup",
      (e) => {
        if (e.button !== 0) return;
        const link = pointerDownLink;
        pointerDownLink = null;
        if (!link) return;

        const dx = Math.abs(e.clientX - pointerDownX);
        const dy = Math.abs(e.clientY - pointerDownY);
        if (dx > 8 || dy > 8) return;

        // Prefer the link under the pointer after release
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const releaseLink = findCardLink(under) || link;
        e.preventDefault();
        e.stopPropagation();
        navigateToCard(releaseLink);
      },
      true
    );

    container.addEventListener(
      "click",
      (e) => {
        const link = findCardLink(e.target);
        if (!link) return;
        e.preventDefault();
        e.stopPropagation();
        navigateToCard(link);
      },
      true
    );

    let touchStartY = 0;
    let touchMoved = false;

    container.addEventListener(
      "touchstart",
      (e) => {
        if (!isAnimated) return;
        touchStartY = e.touches[0].clientY;
        touchMoved = false;
        const link = findCardLink(e.target);
        pointerDownLink = link;
        pointerDownX = e.touches[0].clientX;
        pointerDownY = e.touches[0].clientY;
      },
      { passive: true }
    );

    container.addEventListener(
      "touchmove",
      (e) => {
        if (!isAnimated) return;

        const currentY = e.touches[0].clientY;
        const deltaY = touchStartY - currentY;
        if (Math.abs(deltaY) > 6) {
          touchMoved = true;
          pointerDownLink = null;
        }
        touchStartY = currentY;

        y1 -= deltaY * 1.5;

        if (y1 <= -height1) y1 += height1;
        else if (y1 > 0) y1 -= height1;

        col1.style.transform = `translateY(${y1}px)`;
        e.preventDefault();
      },
      { passive: false }
    );

    container.addEventListener(
      "touchend",
      (e) => {
        if (touchMoved) {
          pointerDownLink = null;
          return;
        }
        const link = pointerDownLink;
        pointerDownLink = null;
        if (!link) return;
        e.preventDefault();
        navigateToCard(link);
      },
      { passive: false }
    );
  }
});
