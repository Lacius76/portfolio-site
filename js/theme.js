// Theme toggle — supports multiple buttons (#theme-toggle, #theme-toggle-hero)
if (
  localStorage.getItem("color-theme") === "dark" ||
  (!("color-theme" in localStorage) &&
    window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

function toggleTheme(trigger) {
  if (trigger) {
    trigger.classList.add("theme-toggling");
  }
  if (document.documentElement.classList.contains("dark")) {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("color-theme", "light");
  } else {
    document.documentElement.classList.add("dark");
    localStorage.setItem("color-theme", "dark");
  }
}

document.querySelectorAll("#theme-toggle, #theme-toggle-hero").forEach((btn) => {
  btn.addEventListener("click", function () {
    toggleTheme(btn);
  });
  btn.addEventListener("animationend", function (e) {
    if (e.animationName === "themeIconSpin") {
      btn.classList.remove("theme-toggling");
    }
  });
});
