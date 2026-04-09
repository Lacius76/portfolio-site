import glob
import re

active_logic = """document.addEventListener("DOMContentLoaded", () => {
        // Active page highlight in mobile dropdown
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const dropdownLinks = document.querySelectorAll('#mobile-work-dropdown-content a');
        dropdownLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.remove('text-slate-500', 'dark:text-slate-400');
                // Give it the accent color, a subtle background tint, and bold text
                link.classList.add('text-primary', 'dark:text-white', 'bg-primary/10', 'dark:bg-primary/20', 'font-bold');
            }
        });

        const menuBtn = document.getElementById('menu-button');"""

for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Check if we already injected it
    if "Active page highlight in mobile dropdown" in content:
        continue
        
    # Replace
    new_content = content.replace(
        """document.addEventListener("DOMContentLoaded", () => {
        const menuBtn = document.getElementById('menu-button');""",
        active_logic
    )
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Highlighted applied to {f}")

print("Done.")
