"""Collect attributable source images and catalogue rows from Warcraft Wiki."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from io import BytesIO
from pathlib import Path
import hashlib
import json
import re
import time
from urllib.parse import quote, urljoin

from bs4 import BeautifulSoup
from PIL import Image, ImageDraw
import requests

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "research" / "cache"
MEDIA = ROOT / "assets" / "images"
BASE = "https://warcraft.wiki.gg"


def fetch(url):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / hashlib.sha256(url.encode()).hexdigest()
    if path.exists():
        return path.read_bytes()
    for attempt in range(4):
        response = requests.get(url, timeout=60, headers={"User-Agent": "WeaponGlowGallery/1.0 (personal research)"})
        if response.status_code == 429 or response.status_code >= 500:
            time.sleep(3 * (attempt + 1))
            continue
        response.raise_for_status()
        path.write_bytes(response.content)
        return response.content
    raise RuntimeError(f"Could not retrieve {url}")


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def save_image(url, key, source, caption):
    MEDIA.mkdir(parents=True, exist_ok=True)
    image = Image.open(BytesIO(fetch(url))).convert("RGB")
    image.thumbnail((1600, 1200))
    path = MEDIA / f"{key}.webp"
    image.save(path, "WEBP", quality=88)
    return {"src": str(path.relative_to(ROOT)), "original": url, "source": source,
            "caption": caption, "width": image.width, "height": image.height,
            "credit": "Warcraft Wiki contributors / Blizzard Entertainment"}


def main():
    soup = BeautifulSoup(fetch(BASE + "/wiki/Illusion"), "html.parser")
    content = soup.select_one(".mw-parser-output")
    records = []
    for table in content.select("table.darktable"):
        heading = table.find_previous(["h3", "h4"]).get_text(" ", strip=True).replace("[ edit ]", "").strip()
        for row in table.select("tr"):
            cells = row.find_all("td", recursive=False)
            if not cells:
                continue
            name = cells[0].get_text(" ", strip=True)
            if name == "Hide Weapon Enchant":
                continue
            link = cells[0].select_one("a[href]")
            page = urljoin(BASE, link["href"]) if link else BASE + "/wiki/Illusion#" + heading.replace(" ", "_")
            records.append({"id": slug(name), "name": name, "category": heading,
                            "acquisition": " · ".join(c.get_text(" ", strip=True).replace("[", "").replace("]", "") for c in cells[1:]) or "Unlocked by default",
                            "source": page, "images": []})
    by_name = {r["name"]: r for r in records}
    jobs = []
    for box in content.select(".gallerybox"):
        caption = box.select_one(".gallerytext").get_text(" ", strip=True)
        name = re.sub(r" \(while .*\)", "", caption)
        img = box.select_one("img")
        if name not in by_name or not img:
            continue
        url = urljoin(BASE, img["src"])
        url = re.sub(r"/thumb/(.+)/[^/]+\?", r"/\1?", url)
        source = urljoin(BASE, box.select_one("a[href]")["href"])
        jobs.append((name, url, source, caption))

    def download(job):
        name, url, source, caption = job
        return name, save_image(url, slug(caption), source, caption + " — reference screenshot")

    with ThreadPoolExecutor(max_workers=4) as pool:
        for name, image in pool.map(download, jobs):
            by_name[name]["images"].append(image)
    data = {"checked": str(date.today()), "source": BASE + "/wiki/Illusion", "entries": records}
    (ROOT / "research" / "catalogue-source.json").write_text(json.dumps(data, indent=2) + "\n")

    for start in range(0, len(records), 24):
        batch = records[start:start + 24]
        sheet = Image.new("RGB", (1200, ((len(batch) + 3) // 4) * 170), "#161822")
        draw = ImageDraw.Draw(sheet)
        for i, record in enumerate(batch):
            x, y = (i % 4) * 300, (i // 4) * 170
            if record["images"]:
                image = Image.open(ROOT / record["images"][0]["src"])
                image.thumbnail((292, 140))
                sheet.paste(image, (x + (300 - image.width) // 2, y))
            draw.text((x + 8, y + 145), record["name"], fill="white")
        sheet.save(ROOT / "research" / f"contact-{start // 24 + 1}.jpg")
    print(f"Collected {len(records)} entries, {len(jobs)} images.")
    print("No image:", [r["name"] for r in records if not r["images"]])


if __name__ == "__main__":
    main()
