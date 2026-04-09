import glob

for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # We replace the classList.add exactly:
    old_code = "link.classList.add('bg-white/[0.08]', 'font-bold', 'text-xl');"
    
    # We remove the weird arbitrary bg class and use direct styling
    new_code = """link.classList.add('font-bold', 'text-xl');
                link.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';"""
    
    if old_code in content:
        new_content = content.replace(old_code, new_code)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Fixed live server background in {f}")

print("Done.")
