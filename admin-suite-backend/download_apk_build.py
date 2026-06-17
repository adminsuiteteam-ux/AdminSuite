import os
import sys
import requests

APK_SOURCE_URL = "https://expo.dev/artifacts/eas/47TAq5JEsAj-i4cZSssthF6K4zAqoApLl2kgYMYRzKE.apk"
TARGET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
TARGET_PATH = os.path.join(TARGET_DIR, "AdminSuite.apk")

def main():
    print("Starting build-time APK download...")
    # Ensure target directory exists
    os.makedirs(TARGET_DIR, exist_ok=True)
    
    # Download file with stream=True and robust timeout settings
    try:
        session = requests.Session()
        print(f"Downloading APK from {APK_SOURCE_URL}...")
        # (Connect timeout of 30 seconds, read timeout is None for streaming large file)
        resp = session.get(APK_SOURCE_URL, stream=True, timeout=(30, None))
        resp.raise_for_status()
        
        total_size = int(resp.headers.get("content-length", 0))
        downloaded = 0
        
        with open(TARGET_PATH, "wb") as f:
            for chunk in resp.iter_content(chunk_size=512 * 1024):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size:
                        pct = downloaded * 100 // total_size
                        sys.stdout.write(f"\r  {pct}% - {downloaded // (1024*1024)}MB / {total_size // (1024*1024)}MB")
                        sys.stdout.flush()
        
        print(f"\n[OK] Successfully downloaded APK to {TARGET_PATH} ({os.path.getsize(TARGET_PATH):,} bytes).")
    except Exception as e:
        print(f"\n[ERROR] Failed to download APK: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
