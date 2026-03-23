import re

with open('work.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Strip trailing whitespaces (spaces/tabs) from the right side of each line
cleaned_lines = [line.rstrip(' \t\r\n') + '\n' for line in lines]

with open('work.html', 'w', encoding='utf-8') as f:
    f.writelines(cleaned_lines)

print("Trailing whitespaces removed.")
