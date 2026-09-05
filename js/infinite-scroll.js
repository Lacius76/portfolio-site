/**
 * Single Column Infinite Vertical Scroll Engine (desktop only)
 *
 * On viewports below lg (1024px), project cards scroll normally with the page.
 * Off-screen card videos are paused to reduce decode/compositing jank.
 */

document.addEventListener("DOMContentLoaded", () => {
  const col1 = document.getElementById("scroll-col-1");
  const container = document.getElementById("infinite-scroll-container");
  const clipRoot =
    container?.querySelector(".scroll-mask-wrapper") || container;

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
  let frameCount = 0;
  let videos = [];

  // Click tracking — transform animations can drop native click
  let pointerDownLink = null;
  let pointerDownX = 0;
  let pointerDownY = 0;

  const refreshVideos = () => {
    videos = Array.from(col1.querySelectorAll("video"));
    videos.forEach((video) => {
      video.muted = true;
      video.playsInline = true;
      video.removeAttribute("autoplay");
      // Start paused; visibility sync will play only on-screen ones
      try {
        video.pause();
      } catch (_) {}
    });
    syncVideoPlayback();
  };

  const isVideoVisible = (video) => {
    const root = isAnimated && clipRoot ? clipRoot : null;
    const rootRect = root
      ? root.getBoundingClientRect()
      : {
          top: 0,
          bottom: window.innerHeight,
          left: 0,
          right: window.innerWidth,
        };
    const rect = video.getBoundingClientRect();
    // Small margin so cards start/stop slightly before fully entering/leaving
    const margin = 40;
    return (
      rect.bottom > rootRect.top - margin &&
      rect.top < rootRect.bottom + margin &&
      rect.right > rootRect.left &&
      rect.left < rootRect.right
    );
  };

  const syncVideoPlayback = () => {
    videos.forEach((video) => {
      const visible = isVideoVisible(video);
      if (visible) {
        if (video.paused) {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        }
      } else if (!video.paused) {
        video.pause();
      }
    });
  };

  const updateHeights = () => {
    if (!isAnimated) return;
    height1 = col1.scrollHeight / 2;
  };

  const animationLoop = (time) => {
    if (!isAnimated) return;

    const delta = Math.min(time - lastTime, 32); // cap hitch spikes
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

    col1.style.transform = `translate3d(0, ${y1}px, 0)`;

    frameCount += 1;
    // Sync video play/pause every ~8 frames (~130ms) — cheap enough, not every frame
    if (frameCount % 8 === 0) syncVideoPlayback();

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
    frameCount = 0;

    refreshVideos();
    setTimeout(() => {
      updateHeights();
      syncVideoPlayback();
    }, 150);
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
    refreshVideos();
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

  window.addEventListener("resize", () => {
    updateHeights();
    syncVideoPlayback();
  });
  DESKTOP_MQ.addEventListener("change", onBreakpointChange);
  onBreakpointChange();

  // Mobile / non-animated: still pause off-screen videos while page scrolls
  if (!DESKTOP_MQ.matches) {
    refreshVideos();
  }
  window.addEventListener("scroll", () => {
    if (isAnimated) return;
    syncVideoPlayback();
  }, { passive: true });

  if (container) {
    container.addEventListener("mouseenter", () => {
      if (!isAnimated) return;
      // Pause so cards stay still long enough for a reliable click
      targetSpeed1 = 0;
      currentSpeed1 = 0;
      syncVideoPlayback();
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

        col1.style.transform = `translate3d(0, ${y1}px, 0)`;
        syncVideoPlayback();
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

        col1.style.transform = `translate3d(0, ${y1}px, 0)`;
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
