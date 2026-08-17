import sys, os
import urllib.request
import urllib.parse
import json
import time
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.mysql_session import SessionLocal
from app.models.mysql import TouristPlace

def get_wiki_image(search_query: str) -> str:
    # Proper User-Agent is REQUIRED by Wikipedia to prevent 429 Too Many Requests
    headers = {'User-Agent': 'YatrikaCrawler/2.0 (studentproject@example.com)'}
    
    url_search = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(search_query)}&utf8=&format=json&srlimit=1"
    req_search = urllib.request.Request(url_search, headers=headers)
    
    try:
        with urllib.request.urlopen(req_search, context=ctx, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            results = data.get("query", {}).get("search", [])
            if not results:
                return None
            title = results[0]["title"]
            
            url_img = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=pageimages&format=json&pithumbsize=800"
            req_img = urllib.request.Request(url_img, headers=headers)
            
            with urllib.request.urlopen(req_img, context=ctx, timeout=10) as img_resp:
                img_data = json.loads(img_resp.read().decode('utf-8'))
                pages = img_data.get("query", {}).get("pages", {})
                for page_info in pages.values():
                    if "thumbnail" in page_info:
                        return page_info["thumbnail"]["source"]
    except urllib.error.HTTPError as he:
        if he.code == 429:
            print(f"  [!] 429 Too Many Requests! Sleeping for 10s...")
            time.sleep(10)
            return get_wiki_image(search_query) # Retry
    except Exception as e:
        print(f"  [!] Failed Wikipedia fetch for '{search_query}': {e}")
    return None

def update_images():
    db = SessionLocal()
    places = db.query(TouristPlace).all()
    print(f"Found {len(places)} places. Checking for generic/missing images...")
    
    updated_count = 0
    passed_count = 0
    
    for i, place in enumerate(places, start=1):
        if place.photo_url and "wikimedia" in place.photo_url:
            passed_count += 1
            if passed_count % 50 == 0:
                print(f"[{i}/{len(places)}] Verified already has wiki photo...")
            continue
            
        # Build search query "Name City" Focus
        query = f"{place.name} {place.city if place.city else ''}".strip()
        time.sleep(0.5)
        
        img_url = get_wiki_image(query)
        
        if img_url:
            place.photo_url = img_url
            updated_count += 1
            if updated_count % 5 == 0:
                print(f"[{i}/{len(places)}] Repaired photo for: {place.name}")
        else:
            # Fallback if Wikipedia fails to find an image
            place.photo_url = "https://images.unsplash.com/photo-1506461883276-594a12b11dc3?w=800"
            print(f"[{i}/{len(places)}] Set scenic fallback for: {place.name}")

    db.commit()
    db.close()
    print(f"\nDone! Successfully repaired {updated_count} places.")

if __name__ == "__main__":
    update_images()
