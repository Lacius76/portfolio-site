import glob

for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # We replace the classList.add exactly:
    old_code = "link.classList.add('text-primary', 'dark:text-white', 'bg-primary/10', 'dark:bg-primary/20', 'font-bold', 'text-xl');"
    # We remove the weird text-primary/bg-primary classes and just use the translucent white
    new_code = "link.classList.add('bg-white/[0.08]', 'font-bold', 'text-xl');"
    
    if old_code in content:
        new_content = content.replace(old_code, new_code)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Fixed background in {f}")

print("Done.")
