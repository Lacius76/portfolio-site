import glob
import re

for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # We want to replace the classList.add arguments
    old_code = "link.classList.add('text-primary', 'dark:text-white', 'bg-primary/10', 'dark:bg-primary/20', 'font-bold');"
    new_code = "link.classList.add('text-primary', 'dark:text-white', 'bg-primary/10', 'dark:bg-primary/20', 'font-bold', 'text-lg', 'tracking-wide');"
    
    # wait, to make sure it stands out maybe I should add tracking-wide or just text-lg
    new_code_pure = "link.classList.add('text-primary', 'dark:text-white', 'bg-primary/10', 'dark:bg-primary/20', 'font-bold', 'text-lg');"
    
    if old_code in content:
        new_content = content.replace(old_code, new_code_pure)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Updated font size in {f}")

print("Done.")
