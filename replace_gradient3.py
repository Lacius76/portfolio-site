import re

with open('work.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Pattern to replace the current gradient to a constant dark gradient
old_pattern = r'<div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent transition-all duration-500 group-hover:from-black/90 pointer-events-none z-10"></div>'
new_gradient = r'<div class="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none z-10"></div>'

res = re.sub(old_pattern, new_gradient, text)

with open('work.html', 'w', encoding='utf-8') as f:
    f.write(res)

print("Gradient updated to constant dark.")
