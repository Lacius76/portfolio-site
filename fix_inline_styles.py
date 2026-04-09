import glob

for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    old_code = """                link.classList.remove('text-slate-500', 'dark:text-slate-400');
                link.classList.add('font-bold', 'text-xl');
                link.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';"""
    
    new_code = """                link.style.fontSize = '1.25rem';
                link.style.fontWeight = '700';
                link.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';"""
    
    if old_code in content:
        new_content = content.replace(old_code, new_code)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Fixed to inline styles: {f}")

print("Done.")
