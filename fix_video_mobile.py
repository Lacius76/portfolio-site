import glob

f = 'case-study-ewa.html'
with open(f, 'r', encoding='utf-8') as file:
    content = file.read()

old_code = """<video autoplay loop muted playsinline class="w-full h-full object-cover object-left md:object-center opacity-90 mix-blend-screen scale-[0.7] md:scale-100 origin-left md:origin-center transition-transform duration-500">"""

new_code = """<!-- Mobile scale down and pan right to center the left-aligned content safely -->
            <video autoplay loop muted playsinline class="w-full h-full object-cover md:object-center opacity-90 mix-blend-screen scale-[0.8] sm:scale-100 translate-x-[15%] sm:translate-x-0 transition-transform duration-500" style="object-position: 15% center;">"""

content = content.replace(old_code, new_code)
with open(f, 'w', encoding='utf-8') as file:
    file.write(content)
print("Done.")
