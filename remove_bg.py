import sys
from rembg import remove
from PIL import Image

def main():
    input_path = 'public/logo.png'
    output_path = 'public/logo.png'
    print("Loading image...")
    try:
        input_img = Image.open(input_path)
        print("Processing with rembg...")
        output_img = remove(input_img)
        print("Saving transparent image...")
        output_img.save(output_path, 'PNG')
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
