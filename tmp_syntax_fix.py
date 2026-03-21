import re

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix common mutation leakage
content = content.replace('}"]`);', '')
content = content.replace('renderFeed();\\n// Notifications Dropdown Toggle', 'renderFeed();\n// Notifications')

# Ensure toBase64 is unique (redundancy check)
lines = content.split('\n')
new_lines = []
found_tobase64 = False
for line in lines:
    if 'const toBase64 =' in line:
        if not found_tobase64:
            new_lines.append(line)
            found_tobase64 = True
        else:
            continue
    else:
        new_lines.append(line)
content = '\n'.join(new_lines)

# Fix possible syntax error in DOMContentLoaded (unclosed strings)
content = re.sub(r'renderFeed\(\);\s*\\n', 'renderFeed();\n', content)

with open('c:/Users/caio/Documents/Antigravity/site-marcenaria/admin/dashboard.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Syntax and leakages fixed.")
