const themeToggleBtn = document.getElementById('theme-toggle');

themeToggleBtn.addEventListener('click', function () {
    // Trigger spin animation
    themeToggleBtn.classList.add('theme-toggling');

    // Only toggling the 'dark' class on the html tag
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
    }
});

// Remove spin class when animation completes so it can replay on next click
themeToggleBtn.addEventListener('animationend', function (e) {
    if (e.animationName === 'themeIconSpin') {
        themeToggleBtn.classList.remove('theme-toggling');
    }
});