import re
from bs4 import BeautifulSoup
import glob
import os

files = {
    'Privacy': '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/29/content.md',
    'Terms': '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/30/content.md',
    'Refund': '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/31/content.md',
    'Shipping': '/Users/mangalam/.gemini/antigravity-cli/brain/20237c34-2070-4e09-abc9-4c551acf44a9/.system_generated/steps/32/content.md'
}

for name, path in files.items():
    if not os.path.exists(path): continue
    with open(path, 'r') as f:
        content = f.read()
    
    # Strip everything before "<!doctype html>"
    if "<!doctype html>" in content:
        content = content[content.find("<!doctype html>"):]
        
    soup = BeautifulSoup(content, 'html.parser')
    
    body = soup.find('div', class_='shopify-policy__body')
    if body:
        print(f"=== {name} ===")
        text = ' '.join(body.stripped_strings)
        print(text[:3000]) # Print first 3000 chars for context
        print("\n")
    else:
        print(f"=== {name} (Not found) ===")

