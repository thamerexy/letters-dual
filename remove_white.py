from PIL import Image, ImageDraw

def floodfill_white():
    img = Image.open('public/logo.png').convert("RGBA")
    # Replace the white outer border (floodfill from top left corner) with completely transparent pixels
    ImageDraw.floodfill(img, (0, 0), (255, 255, 255, 0), thresh=40)
    # the logo might also have white edges on the other corners, flood fill them too
    width, height = img.size
    ImageDraw.floodfill(img, (width - 1, 0), (255, 255, 255, 0), thresh=40)
    ImageDraw.floodfill(img, (0, height - 1), (255, 255, 255, 0), thresh=40)
    ImageDraw.floodfill(img, (width - 1, height - 1), (255, 255, 255, 0), thresh=40)
    img.save('public/logo.png', "PNG")
    print("Background removed successfully!")

floodfill_white()
