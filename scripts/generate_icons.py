from PIL import Image

sizes = [
    (16, 'icon-16.png', (52,152,219)),
    (48, 'icon-48.png', (34,197,94)),
    (128, 'icon-128.png', (236,72,153)),
]

for size, name, color in sizes:
    img = Image.new('RGBA', (size, size), color + (255,))
    img.save('icons/' + name)

print('Generated icons: ' + ', '.join(n for _, n, _ in sizes))
