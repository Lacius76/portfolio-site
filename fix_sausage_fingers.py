import glob

for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    old_code = """<div id="mobile-work-header"
            class="flex items-center justify-center w-full gap-1 transition-all duration-300">"""
            
    # Sometimes it might be on one line due to formatting variations from earlier scripts or editors
    old_code_flexible = 'id="mobile-work-header"\n            class="flex items-center justify-center w-full gap-1 transition-all duration-300"'
    
    new_code = 'id="mobile-work-header"\n            class="flex items-center justify-center w-full gap-5 transition-all duration-300"'
    
    if old_code_flexible in content:
        new_content = content.replace(old_code_flexible, new_code)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Fixed sausage-finger gap in {f}")

print("Done.")
