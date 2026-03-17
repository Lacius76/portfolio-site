document.addEventListener("DOMContentLoaded", () => {
    const section = document.querySelector(".stacked-cards-section");
    const container = document.querySelector(".cards-container");
    const tracker = document.querySelector(".scroll-tracker");

    if (!section || !container || !tracker) return;

    const cards = Array.from(container.querySelectorAll(".stacked-card"));
    const cardCount = cards.length;
    if (!cardCount) return;

    const totalSteps = cardCount - 1;

    // ─── LERP (Linear interpolation) ─────────────────────────────────
    // Adaptive lerp: gentle at small deltas (slow scroll),
    // aggressive at large deltas (fast scroll) so animation keeps up.
    const LERP_MIN = 0.04;  // gentle for slow scroll
    const LERP_MAX = 0.15;  // snappy for fast scroll
    function lerp(current, target, _unused) {
        const delta = Math.abs(target - current);
        // Ramp factor: small delta → LERP_MIN, large delta → LERP_MAX
        const factor = LERP_MIN + Math.min(delta / 50, 1) * (LERP_MAX - LERP_MIN);
        return current + (target - current) * factor;
    }

    // Per-card animated state — we interpolate THESE toward target values
    const state = cards.map(() => ({
        ty: 0, scale: 1, brightness: 1, opacity: 1, zIndex: 3
    }));

    // ─── Scroll progress ─────────────────────────────────────────────
    function getProgress() {
        const trackerRect = tracker.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const totalScroll = tracker.offsetHeight;
        const scrolled = windowHeight - trackerRect.top;
        const raw = Math.max(0, Math.min(1, scrolled / totalScroll));

        // Symmetric dead zones: 15% dwell at start and end
        const buffer = 0.15;
        if (raw < buffer)       return 0;
        if (raw > 1 - buffer)   return 1;
        return (raw - buffer) / (1 - 2 * buffer);
    }

    // ─── Smoothstep easing ───────────────────────────────────────────
    function easeInOut(t) { return t * t * (3 - 2 * t); }

    // ─── Compute TARGET values for each card ─────────────────────────
    function computeTargets(progress) {
        const step = 1 / totalSteps;
        const rawStep = progress / step;
        const transitionIndexRaw = Math.floor(rawStep);
        const transitionIndex = Math.min(transitionIndexRaw, totalSteps - 1);
        const pLinear = rawStep - transitionIndexRaw;
        const p = easeInOut(pLinear);

        const allDone = progress >= 1;
        const completedSteps = allDone ? totalSteps : transitionIndex;
        const frontCardIndex = completedSteps % cardCount;
        const isTransitioning = !allDone;

        const targets = [];

        cards.forEach((card, i) => {
            const rank = (i - frontCardIndex + cardCount) % cardCount;

            // Rest position for this rank
            const restTy = rank * 18;
            const restScale = 1 - rank * 0.05;
            const restBrightness = 1 - rank * 0.2;
            const restZ = cardCount - rank;

            // Next rank (one step closer to front)
            const nextRank = Math.max(rank - 1, 0);
            const nextTy = nextRank * 18;
            const nextScale = 1 - nextRank * 0.05;
            const nextBrightness = 1 - nextRank * 0.2;

            let ty = restTy;
            let scale = restScale;
            let brightness = restBrightness;
            let opacity = 1;
            let zIndex = restZ;

            if (isTransitioning) {
                if (rank === 0) {
                    // Front card exits upward
                    ty = -p * 100;
                    scale = 1 - p * 0.08;
                    brightness = 1;
                    // Only dim slightly while overlapping, then restore once behind
                    opacity = p < 0.5 ? 1 : 1;
                    zIndex = p < 0.5 ? cardCount + 1 : 0;
                } else {
                    // Other cards advance toward front
                    ty = restTy + p * (nextTy - restTy);
                    scale = restScale + p * (nextScale - restScale);
                    brightness = restBrightness + p * (nextBrightness - restBrightness);

                    if (rank === 1) {
                        opacity = 0.7 + p * 0.3;
                    }
                }
            }

            targets.push({ ty, scale, brightness, opacity, zIndex });
        });

        return targets;
    }

    // ─── Animation loop ──────────────────────────────────────────────
    let animating = false;

    function animate() {
        const progress = getProgress();
        const targets = computeTargets(progress);
        let needsUpdate = false;

        cards.forEach((card, i) => {
            const t = targets[i];
            const s = state[i];

            // Lerp continuous values toward targets
            s.ty = lerp(s.ty, t.ty, null);
            s.scale = lerp(s.scale, t.scale, null);
            s.brightness = lerp(s.brightness, t.brightness, null);
            s.opacity = lerp(s.opacity, t.opacity, null);

            // z-index snaps immediately (no lerp — must be integer)
            s.zIndex = t.zIndex;

            // Apply styles
            card.style.transform = `translateY(${s.ty.toFixed(2)}px) scale(${s.scale.toFixed(4)})`;
            card.style.filter = `brightness(${s.brightness.toFixed(3)})`;
            card.style.opacity = s.opacity.toFixed(3);
            card.style.zIndex = s.zIndex;

            // Check if we're still moving (threshold for floating point)
            if (Math.abs(s.ty - t.ty) > 0.1 ||
                Math.abs(s.scale - t.scale) > 0.001 ||
                Math.abs(s.brightness - t.brightness) > 0.005 ||
                Math.abs(s.opacity - t.opacity) > 0.005) {
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            requestAnimationFrame(animate);
        } else {
            animating = false;
        }
    }

    function startAnimation() {
        if (!animating) {
            animating = true;
            requestAnimationFrame(animate);
        }
    }

    // ─── Initial paint: snap to correct positions immediately ────────
    const initialTargets = computeTargets(getProgress());
    cards.forEach((card, i) => {
        const t = initialTargets[i];
        state[i] = { ...t };
        card.style.transform = `translateY(${t.ty}px) scale(${t.scale})`;
        card.style.filter = `brightness(${t.brightness})`;
        card.style.opacity = t.opacity;
        card.style.zIndex = t.zIndex;
    });

    // ─── Event listeners ─────────────────────────────────────────────
    window.addEventListener("scroll", startAnimation, { passive: true });
    window.addEventListener("resize", () => {
        // On resize, snap immediately then start animating
        const targets = computeTargets(getProgress());
        cards.forEach((card, i) => {
            state[i] = { ...targets[i] };
            card.style.transform = `translateY(${targets[i].ty}px) scale(${targets[i].scale})`;
            card.style.filter = `brightness(${targets[i].brightness})`;
            card.style.opacity = targets[i].opacity;
            card.style.zIndex = targets[i].zIndex;
        });
    });
});
