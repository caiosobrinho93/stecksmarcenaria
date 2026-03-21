import re

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
found_tobase64 = False
for line in lines:
    if 'const toBase64 = file =>' in line:
        if not found_tobase64:
            new_lines.append(line)
            found_tobase64 = True
        else:
            continue
    else:
        new_lines.append(line)

content = "".join(new_lines)

# Fix empty admin summary display logic
content = content.replace('// Notifications Dropdown Toggle', 'renderFeed();\\n// Notifications Dropdown Toggle')

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Duplicates cleaned.")
