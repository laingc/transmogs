"""Find short, named previews. Results require manual review before use."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import subprocess
from collect import ROOT, slug

data = json.loads((ROOT / "research/catalogue-source.json").read_text())
chapters = json.loads((ROOT / "research/video-701Q96jKJro.info.json").read_text())["chapters"]
covered = {c["title"].replace("Unholy", "Unholy Weapon") for c in chapters}


def search(record):
    path = ROOT / "research" / f"search-{record['id']}.json"
    if path.exists():
        result = json.loads(path.read_text())
    else:
        command = ["yt-dlp", "--no-update", "--flat-playlist", "--dump-json",
                   f"ytsearch3:WoW \"{record['name']}\" illusion"]
        proc = subprocess.run(command, capture_output=True, text=True, timeout=90)
        result = []
        for line in proc.stdout.splitlines():
            try:
                v = json.loads(line)
                result.append({k: v.get(k) for k in ["id", "title", "duration", "channel", "url"]})
            except json.JSONDecodeError:
                pass
        path.write_text(json.dumps(result, indent=2) + "\n")
    return record["name"], result


with ThreadPoolExecutor(max_workers=5) as pool:
    for name, result in pool.map(search, [r for r in data["entries"] if r["name"] not in covered]):
        print(name, " :: ", " | ".join(f"{v['id']} {v['duration']}s {v['title']}" for v in result), flush=True)
