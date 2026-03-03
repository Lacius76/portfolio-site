/**
 * AI Bot Drag & Drop Script
 * Makes the AI Bot panel freely draggable across the page.
 * Uses the gradient header bar as the drag handle.
 * Supports both mouse (desktop) and touch (mobile) interactions.
 */
document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.getElementById('aiBotDragWrapper');
    if (!wrapper) return;

    const botCard = document.getElementById('aiBotCard');
    if (!botCard) return;

    // The gradient header is the drag handle
    const dragHandle = botCard.querySelector('.bg-gradient-to-r');
    if (!dragHandle) return;

    // --- Drag handle cursor ---
    dragHandle.style.cursor = 'grab';
    dragHandle.style.userSelect = 'none';
    dragHandle.style.touchAction = 'none';

    let isDragging = false;
    let isInitialized = false;
    let hasBeenTouched = false;
    let offsetX = 0;
    let offsetY = 0;
    let lastDragX = 0;
    let lastDragY = 0;

    // --- Eye tracking during drag ---
    const eyes = botCard.querySelectorAll('.bot-eye');
    const maxEyeMove = 6; // max pixels the pupil can shift

    function setEyePosition(moveX, moveY) {
        // Clamp values
        moveX = Math.max(-maxEyeMove, Math.min(maxEyeMove, moveX));
        moveY = Math.max(-maxEyeMove, Math.min(maxEyeMove, moveY));
        eyes.forEach(eye => {
            eye.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    }

    function resetEyes() {
        eyes.forEach(eye => {
            eye.style.transform = 'translate(0px, 0px)';
        });
    }

    /**
     * Initialize fixed positioning.
     * Called lazily on first drag to ensure animations have completed
     * and the element is visible + has correct dimensions.
     */
    function initFixedPosition() {
        if (isInitialized) return;

        // Make wrapper visible if it was hidden (about-me page uses hidden xl:flex)
        wrapper.classList.remove('hidden');
        wrapper.style.display = 'flex';

        // Force a reflow so getBoundingClientRect returns correct values
        wrapper.offsetHeight;

        const rect = wrapper.getBoundingClientRect();

        // Check if the element has valid dimensions — if not, use a default position
        let startX = rect.left;
        let startY = rect.top;

        // If element is off-screen or has zero size, place it at a sensible default
        if (rect.width === 0 || rect.height === 0 || startX < 0 || startY < 0 ||
            startX > window.innerWidth || startY > window.innerHeight) {
            startX = window.innerWidth - 300;
            startY = 100;
        }

        // Clamp within viewport
        startX = Math.max(0, Math.min(startX, window.innerWidth - rect.width));
        startY = Math.max(0, Math.min(startY, window.innerHeight - rect.height));

        // Move wrapper to body level so it escapes any parent stacking context
        // (e.g. work page hero section has z-0, covered by content-wrapper z-10)
        document.body.appendChild(wrapper);

        // Convert to fixed positioning
        wrapper.style.position = 'fixed';
        wrapper.style.left = startX + 'px';
        wrapper.style.top = startY + 'px';
        wrapper.style.right = 'auto';
        wrapper.style.bottom = 'auto';
        wrapper.style.zIndex = '9999';
        wrapper.style.margin = '0';
        wrapper.style.pointerEvents = 'auto';
        wrapper.style.opacity = '1';
        wrapper.style.transform = 'none';
        wrapper.style.animation = 'none';

        // Remove positioning classes that may interfere
        wrapper.classList.remove('absolute', 'relative');

        isInitialized = true;
    }

    function onDragStart(clientX, clientY) {
        // Initialize on first interaction
        initFixedPosition();

        isDragging = true;
        // Expose drag state globally so page-level eye tracking can pause
        window._botDragging = true;
        const wrapperRect = wrapper.getBoundingClientRect();
        offsetX = clientX - wrapperRect.left;
        offsetY = clientY - wrapperRect.top;
        lastDragX = clientX;
        lastDragY = clientY;
        dragHandle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';

        // Eyes look UP — user grabbed the header (above the face)
        setEyePosition(0, -maxEyeMove);

        // First touch reaction — only once per page load
        if (!hasBeenTouched) {
            hasBeenTouched = true;
            const botConsole = document.getElementById('botConsole');
            if (botConsole) {
                // Stop any running page-level typewriter first
                if (window._botTypingInterval) {
                    clearInterval(window._botTypingInterval);
                    window._botTypingInterval = null;
                }
                const touchMsg = "Ohh! You touched me! Easy now... I'm ticklish.";
                // Simple typewriter effect (self-contained)
                let i = 0;
                botConsole.textContent = '';
                const typeInterval = setInterval(() => {
                    if (i < touchMsg.length) {
                        botConsole.textContent += touchMsg.charAt(i);
                        i++;
                    } else {
                        clearInterval(typeInterval);
                    }
                }, 40);
            }
        }
    }

    function onDragMove(clientX, clientY) {
        if (!isDragging) return;

        let newX = clientX - offsetX;
        let newY = clientY - offsetY;

        // Boundary check: keep within viewport
        const wrapperWidth = wrapper.offsetWidth;
        const wrapperHeight = wrapper.offsetHeight;
        const maxX = window.innerWidth - wrapperWidth;
        const maxY = window.innerHeight - wrapperHeight;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        wrapper.style.left = newX + 'px';
        wrapper.style.top = newY + 'px';

        // Eyes follow drag direction
        const deltaX = clientX - lastDragX;
        const deltaY = clientY - lastDragY;
        // Amplify small movements for visible eye response
        const eyeX = Math.max(-maxEyeMove, Math.min(maxEyeMove, deltaX * 1.5));
        const eyeY = Math.max(-maxEyeMove, Math.min(maxEyeMove, deltaY * 1.5));
        setEyePosition(eyeX, eyeY);

        lastDragX = clientX;
        lastDragY = clientY;
    }

    function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        window._botDragging = false;
        dragHandle.style.cursor = 'grab';
        document.body.style.userSelect = '';

        // Eyes smoothly return to center (forward-looking)
        resetEyes();
    }

    // --- Mouse Events ---
    dragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onDragStart(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            onDragMove(e.clientX, e.clientY);
        }
    });

    document.addEventListener('mouseup', () => {
        onDragEnd();
    });

    // --- Touch Events ---
    dragHandle.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
            const touch = e.touches[0];
            onDragStart(touch.clientX, touch.clientY);
        }
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) {
            e.preventDefault();
            const touch = e.touches[0];
            onDragMove(touch.clientX, touch.clientY);
        }
    }, { passive: false });

    document.addEventListener('touchend', () => {
        onDragEnd();
    });

    // --- Recalculate bounds on resize ---
    window.addEventListener('resize', () => {
        if (!isInitialized || isDragging) return;
        const wrapperWidth = wrapper.offsetWidth;
        const wrapperHeight = wrapper.offsetHeight;
        const currentX = parseInt(wrapper.style.left) || 0;
        const currentY = parseInt(wrapper.style.top) || 0;
        const maxX = window.innerWidth - wrapperWidth;
        const maxY = window.innerHeight - wrapperHeight;

        wrapper.style.left = Math.max(0, Math.min(currentX, maxX)) + 'px';
        wrapper.style.top = Math.max(0, Math.min(currentY, maxY)) + 'px';
    });

    // --- Auto-initialize after hero animations complete ---
    // Hero animations take ~2.4s max (1.6s delay + 0.8s animation).
    // We initialize after that to pick up the correct position.
    setTimeout(() => {
        if (!isInitialized) {
            initFixedPosition();
        }
    }, 2600);

    // --- Random Unprompted Messages ---
    function scheduleRandomMessage() {
        // Random time between 45 seconds and 135 seconds (45000 to 135000 ms)
        const delay = Math.random() * 90000 + 45000;

        setTimeout(() => {
            const botConsole = document.getElementById('botConsole');
            // Only show if not currently dragging and console exists
            if (botConsole && !isDragging) {
                // Clear any existing typing interval to prevent text overlap
                if (window._botTypingInterval) {
                    clearInterval(window._botTypingInterval);
                    window._botTypingInterval = null;
                }
                const msg = "I wanted to say something... but while thinking, I forgot what it was.";
                let i = 0;
                botConsole.textContent = '';

                // Shy blink animation (3 times rapidly)
                const eyes = document.querySelectorAll('.bot-eye');
                if (eyes.length > 0) {
                    let blinkCount = 0;
                    const maxBlinks = 3;
                    const originalHeights = Array.from(eyes).map(eye => eye.style.height || getComputedStyle(eye).height);

                    const blinkInterval = setInterval(() => {
                        if (blinkCount >= maxBlinks) {
                            clearInterval(blinkInterval);
                            return;
                        }

                        // Close eyes
                        eyes.forEach(eye => {
                            eye.style.transition = 'height 0.1s ease-in-out';
                            eye.style.height = '2px';
                        });

                        // Open eyes
                        setTimeout(() => {
                            eyes.forEach((eye, idx) => {
                                eye.style.height = originalHeights[idx];
                            });

                            // Reset transition after opening
                            setTimeout(() => {
                                eyes.forEach(eye => {
                                    if (eye.id !== 'botRightEye') { // don't permanently override hero-grid.js wink logic if any
                                        eye.style.transition = '';
                                    }
                                });
                            }, 100);
                        }, 120);

                        blinkCount++;
                    }, 400); // Blink every 400ms
                }

                window._botTypingInterval = setInterval(() => {
                    if (i < msg.length) {
                        botConsole.textContent += msg.charAt(i);
                        i++;
                    } else {
                        clearInterval(window._botTypingInterval);
                        window._botTypingInterval = null;
                    }
                }, 40);
            }
            // Schedule the next one recursively
            scheduleRandomMessage();
        }, delay);
    }

    // Start the random message cycle after an initial 10s delay to avoid interrupting greetings
    setTimeout(scheduleRandomMessage, 10000);
});
