document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const targetWidth = bar.getAttribute('data-width');
                // Small delay to ensure the transition is visible if it happens immediately on load
                setTimeout(() => {
                    bar.style.width = targetWidth;
                }, 100);
                observer.unobserve(bar);
            }
        });
    }, observerOptions);

    const skillBars = document.querySelectorAll('.skill-bar');
    skillBars.forEach(bar => {
        observer.observe(bar);
    });

    // Resume Timeline Reveal
    const timelineObserverOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };

    const timelineObserver = new IntersectionObserver((entries, timelineObserver) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                timelineObserver.unobserve(entry.target);
            }
        });
    }, timelineObserverOptions);

    const timelineItems = document.querySelectorAll('.resume-timeline-item');
    timelineItems.forEach((item, index) => {
        // Optional: add staggered delay based on index if multiple appear at once
        if (index > 0) {
            // item.style.transitionDelay = `${index * 50}ms`; // Removing direct inline delay to keep it simple
        }
        timelineObserver.observe(item);
    });
});
