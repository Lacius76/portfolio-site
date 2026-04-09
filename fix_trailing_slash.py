import glob

for f in glob.glob("*.html"):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    old_code = "const currentPath = window.location.pathname.split('/').pop().replace('.html', '') || 'index';"
    
    new_code = """let pathParts = window.location.pathname.split('/').filter(Boolean);
        let currentPage = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'index';
        const currentPath = currentPage.replace('.html', '').replace('#', '').split('?')[0];"""
        
    if old_code in content:
        new_content = content.replace(old_code, new_code)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Fixed trailing slash in {f}")

print("Done.")
