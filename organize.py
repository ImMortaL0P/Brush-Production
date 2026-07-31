import os
import glob
import re

public_dir = 'public'

mapping = {
    'hero': [
        'Landing Slideshow 2x f.jpg',
        'Landing Slideshow 3x f.jpg',
        'Landing Slideshow 3x room f.jpg'
    ],
    'categories': [
        'Testimonials 1.jpg',
        'Testimonials 2.jpg',
        'Testimonials 3.jpg'
    ],
    'wall_setups': [
        'wall_setup_bmw_1785314560712.jpg',
        'wall_setup_defender_1785314572482.jpg',
        'wall_setup_porsche_1785314584094.jpg',
        'wall_setup_anime_1785314599991.jpg',
        'wall_setup_samurai_1785314613353.jpg',
        'wall_setup_girl_1785314626601.jpg'
    ],
    'custom_prints': [
        'custom_poster_1785232129819.jpg',
        'custom_split_poster_1785232142561.jpg',
        'custom_split_poster_2x2_1785232154860.jpg',
        'custom_retro_prints_1785232166511.jpg',
        'custom_pocket_photo_1785232177692.jpg',
        'custom_photobooth_strip_1785232188937.jpg'
    ],
    'misc': [
        'ChatGPT Image Jul 31, 2026, 12_36_13 PM.png',
        'app-preview.png',
        'faq-illustration.jpg',
        'Brush Text Arial.png',
        'favicon.png',
        'Apex.jpg',
        'Grossing.png',
        'John Wick.png',
        'grossing-background.gif',
        'life-long-fiction-animation.gif',
        'mobile app.jpg',
        'new arrival.png'
    ]
}

# Move files
file_replacements = {}
for category, files in mapping.items():
    for f in files:
        src = os.path.join(public_dir, f)
        if os.path.exists(src):
            dst = os.path.join(public_dir, 'assets', category, f)
            os.rename(src, dst)
            # URL encode replacement if needed? No, just match the literal strings used in HTML
            file_replacements[f] = f"assets/{category}/{f}"
            # Also handle URL encoded version like Brush%20Text%20Arial.png
            encoded_f = f.replace(' ', '%20')
            if encoded_f != f:
                file_replacements[encoded_f] = f"assets/{category}/{encoded_f}"

# Update HTML and CSS files
target_files = glob.glob(os.path.join(public_dir, '*.html')) + glob.glob(os.path.join(public_dir, '*.css')) + glob.glob(os.path.join(public_dir, '*.js'))

for filepath in target_files:
    with open(filepath, 'r') as file:
        content = file.read()
    
    new_content = content
    for old_path, new_path in file_replacements.items():
        # Use regex to replace exact matches of the filename in src="", href="", url() etc
        # Basic replacement is fine since these are unique image names
        # Just replace "old_path" with "new_path"
        new_content = new_content.replace(f'"{old_path}"', f'"{new_path}"')
        new_content = new_content.replace(f"'{old_path}'", f"'{new_path}'")
        new_content = new_content.replace(f"url({old_path})", f"url({new_path})")
        new_content = new_content.replace(f"url('{old_path}')", f"url('{new_path}')")
        new_content = new_content.replace(f'url("{old_path}")', f'url("{new_path}")')
        
    if new_content != content:
        with open(filepath, 'w') as file:
            file.write(new_content)
        print(f"Updated {filepath}")
