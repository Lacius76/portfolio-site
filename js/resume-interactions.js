document.addEventListener('DOMContentLoaded', () => {
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
    timelineItems.forEach((item) => {
        timelineObserver.observe(item);
    });
});
