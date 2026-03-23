import re

with open('work.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Pattern to replace the gradient back to 80% base
old_pattern = r'from-black/60 to-transparent transition-all duration-500 group-hover:from-black/80 pointer-events-none z-10'
new_gradient = r'from-black/80 to-transparent transition-all duration-500 group-hover:from-black/90 pointer-events-none z-10'

res = re.sub(old_pattern, new_gradient, text)

# Just in case, if the previous didn't stick exactly or they mean a fixed height:
# the previous string was h-2/3, which is 'alsó részen' (bottom part).

with open('work.html', 'w', encoding='utf-8') as f:
    f.write(res)

print("Gradient updated to 80%.")
