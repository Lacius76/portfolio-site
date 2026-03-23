import re

with open('work.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Video/Image Container Z-index to z-0
pattern_img = r'<div class="absolute inset-0 transition-transform duration-1000 group-hover:scale-105">'
new_img = r'<div class="absolute inset-0 transition-transform duration-1000 group-hover:scale-105 z-0">'
text = text.replace(pattern_img, new_img)

# 2. Update Gradient Container Z-index to z-20
pattern_grad = r'<div class="absolute inset-x-0 bottom-0 h-\[60%\] pointer-events-none z-10" style="background: linear-gradient\(to top, rgba\(0,0,0,0.95\) 0%, rgba\(0,0,0,0.7\) 40%, transparent 100%\);"></div>'
new_grad = r'<div class="absolute inset-x-0 bottom-0 h-[60%] pointer-events-none z-20" style="background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 40%, transparent 100%);"></div>'
text = re.sub(pattern_grad, new_grad, text)

# 3. Update Text Container Z-index to z-30
pattern_text = r'<div class="absolute bottom-0 left-0 right-0 p-6 translate-y-2 opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 font-sans">'
new_text = r'<div class="absolute bottom-0 left-0 right-0 p-6 translate-y-2 opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 font-sans z-30 pointer-events-none">'
text = text.replace(pattern_text, new_text)

with open('work.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Z-indexes strictly applied.")
