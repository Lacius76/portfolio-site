import glob

for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # The old matching logic:
    old_logic1 = "const currentPath = window.location.pathname.split('/').pop() || 'index.html';"
    old_logic2 = "if (link.getAttribute('href') === currentPath) {"
    
    new_logic1 = "const currentPath = window.location.pathname.split('/').pop().replace('.html', '') || 'index';"
    new_logic2 = "if (link.getAttribute('href').replace('.html', '') === currentPath) {"
    
    if old_logic1 in content and old_logic2 in content:
        new_content = content.replace(old_logic1, new_logic1).replace(old_logic2, new_logic2)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Fixed routing match in {f}")

print("Done.")
