
import os

file_path = 'src/index.css'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replacements for Tailwind arbitrary values
replacements = {
    'rgba(16, 21, 133, 0.08)': 'rgba(16,21,133,0.08)',
    'rgba(16, 21, 133, 0.12)': 'rgba(16,21,133,0.12)',
    'hsl(262, 30%, 90%)': 'hsl(262,30%,90%)',
    'hsl(262, 30%, 85%)': 'hsl(262,30%,85%)',
    'hsl(243, 79%, 29%)': 'hsl(243,79%,29%)',
    'hsl(243, 79%, 29%, 0.1)': 'hsl(243,79%,29%,0.1)', 
}

new_content = content
for old, new in replacements.items():
    new_content = new_content.replace(old, new)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed CSS file.")
else:
    print("No changes needed or patterns not found.")
