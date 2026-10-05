"""Build the offline catalogue and a separate legacy enchant-name index."""
import json
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from PIL import Image
from collect import ROOT, BASE, fetch


def main():
    data = json.loads((ROOT / "research/catalogue-source.json").read_text())
    extras = json.loads((ROOT / "research/video-images.json").read_text())
    tags = {}
    for line in (ROOT / "research/tags.txt").read_text().splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        name, colours, effects, strength = [s.strip() for s in line.split("|")]
        tags[name] = {"colours": colours.split(","), "effects": effects.split(","), "strength": strength}
    for record in data["entries"]:
        record.update(tags[record["name"]])
        record["images"].extend(extras.get(record["name"], []))
        record["tags"] = record["colours"] + record["effects"] + [record["strength"]]
        for image in record["images"]:
            with Image.open(ROOT / image["src"]) as im:
                im.verify()
        assert len(record["images"]) >= 3, record["name"]
        record["category"] = {"Default": "Default", "Crafting": "Crafting", "Drops": "Dungeon & raid",
                              "Reputation": "Reputation", "Class-specific": "Class-specific",
                              "Events and promotions": "Event & promotion", "Player vs. Player": "Rated PvP"}[record["category"]]
        record["availability"] = "Regular source"
        if record["category"] == "Rated PvP":
            record["availability"] = "Season / rating restricted"
        elif record["category"] == "Event & promotion":
            record["availability"] = "Event / promotion restricted"
        if record["name"] == "Stinging Sands":
            record["availability"] = "Retired reward"
        record["note"] = ""
        if record["category"] == "Class-specific":
            record["note"] = "Class restriction applies. See the acquisition source for requirements."
        if record["name"] in {"Devoted Spirit", "Undying Spirit", "Hunt's Favor", "Sinsedge", "Void Edge"}:
            record["note"] = "Primarily a weapon coating or recolour, with little or no surrounding glow. Included for comparison."
        if record["name"] == "Power Torrent":
            record["note"] = "The animation alternates between orange and purple. Both phases are pictured."

    # Preserve older recipe names separately: a shared colour does not prove a shared visual.
    soup = BeautifulSoup(fetch(BASE + "/wiki/Weapon_glow"), "html.parser")
    legacy = []
    seen = set()
    for row in soup.select(".mw-parser-output table tr"):
        cells = row.find_all("td", recursive=False)
        if len(cells) < 5:
            continue
        link = next((a for a in cells[1].select("a[href]") if not a["href"].startswith("/wiki/File:") and a.get_text(strip=True)), None)
        if not link:
            continue
        name = link.get_text(" ", strip=True).strip("[]")
        name = re.sub(r"^Enchant (Weapon|2H Weapon) - ", "", name)
        section = row.find_previous("h3").get_text(" ", strip=True)
        if section.startswith("Two"):
            name += " (2H)"
        if name in seen:
            continue
        seen.add(name)
        legacy.append({"name": name, "appearance": cells[0].get_text(" ", strip=True),
                       "source": urljoin(BASE, link["href"]), "slot": "Two-handed" if "(2H)" in name else "Melee"})
    data["legacy"] = legacy
    data["imageCount"] = sum(len(r["images"]) for r in data["entries"])
    data["scope"] = "All 90 visible weapon illusions listed by Warcraft Wiki at collection time, excluding Hide Weapon Enchant. Older glowing stat-enchant recipes have a separate reference index. This is not an exhaustive database of every stat enchant or temporary weapon imbue across every WoW edition."
    data["imageNote"] = "Real game screenshots and distinct frames from credited preview videos. Frames from the same video are animation moments, not independent photo shoots. Historical previews can differ from today's rendering. Colour, effect, and strength tags are editorial visual descriptions."
    data["sources"] = [BASE + "/wiki/Illusion", BASE + "/wiki/Weapon_glow"]
    (ROOT / "data.js").write_text("window.GALLERY_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
    print(f"Built {len(data['entries'])} illusions, {data['imageCount']} pictures, {len(legacy)} legacy recipe references.")


if __name__ == "__main__":
    main()
