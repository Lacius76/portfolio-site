import re

with open('work.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Current gradient line:
# <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90"></div>

old_pattern = r'<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90"></div>'
new_gradient = r'<div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent transition-all duration-500 group-hover:from-black/80 pointer-events-none z-10"></div>'

res = re.sub(old_pattern, new_gradient, text)

with open('work.html', 'w', encoding='utf-8') as f:
    f.write(res)

print("Gradient updated.")
