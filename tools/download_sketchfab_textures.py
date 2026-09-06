#!/usr/bin/env python3
"""
Downloads all 23 original PBR textures (4K/2K) for the T-72B3 model from Sketchfab.
"""
import os
import re
import html
import json
import urllib.request

MODEL_ID = "2d7917083b0d445384cfd3268d190db7"
EMBED_URL = f"https://sketchfab.com/models/{MODEL_ID}/embed"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "t72b3", "textures")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Fetching metadata from: {EMBED_URL}")
    
    req = urllib.request.Request(EMBED_URL, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"})
    with urllib.request.urlopen(req) as resp:
        html_text = resp.read().decode("utf-8")
        
    matches = re.findall(r"<!--({.+?})-->", html_text)
    if len(matches) < 3:
        raise ValueError("Could not find embedded metadata block")
        
    b2 = json.loads(html.unescape(matches[2]))
    textures = b2.get(f"/i/models/{MODEL_ID}/textures?optimized=1", {}).get("results", [])
    
    print(f"Found {len(textures)} PBR texture maps. Downloading to: {OUTPUT_DIR}\n")
    
    for idx, t in enumerate(textures, 1):
        name = t.get("name")
        imgs = t.get("images", [])
        if not imgs:
            continue
        max_img = max(imgs, key=lambda x: x.get("width", 0))
        img_url = max_img.get("url")
        w, h = max_img.get("width", 0), max_img.get("height", 0)
        size = max_img.get("size", 0)
        
        target_path = os.path.join(OUTPUT_DIR, name)
        print(f"[{idx}/{len(textures)}] Downloading {name} ({w}x{h}, {size/1024/1024:.2f} MB)...")
        
        req_img = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)"})
        with urllib.request.urlopen(req_img) as in_f, open(target_path, "wb") as out_f:
            out_f.write(in_f.read())
            
    print("\n✓ All textures downloaded successfully!")

if __name__ == "__main__":
    main()
