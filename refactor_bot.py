import re
import os

base_dir = "/Users/laszlofoldvary/Library/Mobile Documents/com~apple~CloudDocs/Documents/portfolio-site"
hero_grid_path = os.path.join(base_dir, "css", "hero-grid.css")
bot_css_path = os.path.join(base_dir, "css", "bot.css")
index_html_path = os.path.join(base_dir, "index.html")
bot_js_path = os.path.join(base_dir, "js", "bot-drag.js")

# 1. Extract CSS from hero-grid.css
with open(hero_grid_path, "r") as f:
    hg_lines = f.readlines()

bot_css_lines = []
new_hg_lines = []
in_bot_section = False

for line in hg_lines:
    if "/* --- AI BOT ANIMATIONS --- */" in line:
        in_bot_section = True
    
    if in_bot_section:
        bot_css_lines.append(line)
        if ".bot-mouth-el {" in line: # the last block
            pass # wait for the closing brace
    else:
        new_hg_lines.append(line)

    if in_bot_section and line.strip() == "}" and len(bot_css_lines) > 700:
        # We know it ends around line 990, after .bot-mouth-el
        # Let's be precise: it ends after .bot-mouth-el rule
        if bot_css_lines[-4].strip().startswith(".bot-mouth-el"):
            in_bot_section = False

with open(bot_css_path, "w") as f:
    f.writelines(bot_css_lines)

with open(hero_grid_path, "w") as f:
    f.writelines(new_hg_lines)

# 2. Extract HTML from index.html
with open(index_html_path, "r") as f:
    html_content = f.read()

bot_html_match = re.search(r'(<!-- Floating AI-Bott 9000 Character -->.*?</div><!-- end aiBotDragWrapper -->)', html_content, re.DOTALL)
if bot_html_match:
    bot_html = bot_html_match.group(1)
    
    # Comment out the bot in index.html for testing backup
    new_html_content = html_content.replace(bot_html, f"<!-- BOT_BACKUP_START\n{bot_html}\nBOT_BACKUP_END -->\n" + '<div id="bot-injection-point"></div>')
    
    # Add bot.css to index.html 
    new_html_content = new_html_content.replace('<link rel="stylesheet" href="css/hero-grid.css" />', '<link rel="stylesheet" href="css/hero-grid.css" />\n  <link rel="stylesheet" href="css/bot.css" />')
    
    with open(index_html_path, "w") as f:
        f.write(new_html_content)
    
    # 3. Inject HTML in bot-drag.js
    with open(bot_js_path, "r") as f:
        bot_js = f.read()
    
    injection_code = f"""
    // INJECT BOT HTML
    const botHTML = `{bot_html}`;
    const injectionPoint = document.getElementById('bot-injection-point') || document.body;
    if (!document.getElementById('aiBotDragWrapper')) {{
        injectionPoint.insertAdjacentHTML('beforeend', botHTML);
    }}
    """
    if "// INJECT BOT HTML" not in bot_js:
        bot_js = bot_js.replace("document.addEventListener('DOMContentLoaded', () => {", "document.addEventListener('DOMContentLoaded', () => {\\n" + injection_code)
    
    with open(bot_js_path, "w") as f:
        f.write(bot_js)
    
    print("Refactoring complete.")
else:
    print("Could not find bot HTML in index.html")
