"""Extract verified video timestamps as separate, credited gallery images."""
import json
import subprocess
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw
from collect import ROOT, MEDIA, slug


def frame(video_id, seconds, output):
    candidates = [p for p in (ROOT / "research").glob(f"video-{video_id}.*") if p.suffix in {".mp4", ".mkv", ".webm"}]
    if not candidates:
        raise RuntimeError(f"Download {video_id} first")
    result = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", str(seconds),
                    "-i", str(candidates[0]), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], check=True, capture_output=True)
    Image.open(BytesIO(result.stdout)).convert("RGB").save(output, "WEBP", quality=88)


def chapter_frames():
    data = json.loads((ROOT / "research/catalogue-source.json").read_text())
    info = json.loads((ROOT / "research/video-701Q96jKJro.info.json").read_text())
    names = {r["name"] for r in data["entries"]}
    selections = {}
    for chapter in info["chapters"]:
        name = "Unholy Weapon" if chapter["title"] == "Unholy" else chapter["title"]
        if name in names:
            selections[name] = {"video": info["id"], "credit": info["uploader"],
                                "times": [chapter["start_time"] + 5, chapter["start_time"] + 11]}
    path = ROOT / "research/video-selections.json"
    if path.exists():
        selections.update(json.loads(path.read_text()))
    path.write_text(json.dumps(selections, indent=2) + "\n")
    return selections


def extract():
    selections = chapter_frames()
    extras = {}
    for name, selection in selections.items():
        images = []
        for index, seconds in enumerate(selection["times"]):
            path = MEDIA / f"{slug(name)}-video-{index + 1}.webp"
            if not path.exists():
                frame(selection["video"], seconds, path)
            with Image.open(path) as image:
                width, height = image.size
            url = f"https://www.youtube.com/watch?v={selection['video']}&t={int(seconds)}s"
            images.append({"src": str(path.relative_to(ROOT)), "original": url, "source": url,
                           "caption": f"Animation frame at {int(seconds) // 60}:{int(seconds) % 60:02d}",
                           "credit": f"{selection['credit']} / Blizzard Entertainment", "width": width, "height": height})
        extras[name] = images
    (ROOT / "research/video-images.json").write_text(json.dumps(extras, indent=2) + "\n")
    print(f"Extracted {sum(map(len, extras.values()))} frames for {len(extras)} effects")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        video_id = sys.argv[1]
        start, end, step = map(int, sys.argv[2:5])
        times = list(range(start, end, step))
        for batch_start in range(0, len(times), 30):
            batch = times[batch_start:batch_start + 30]
            sheet = Image.new("RGB", (1500, ((len(batch) + 3) // 4) * 236), "#161822")
            draw = ImageDraw.Draw(sheet)
            for i, seconds in enumerate(batch):
                path = ROOT / "research" / f"frame-{video_id}-{seconds}.webp"
                if not path.exists():
                    frame(video_id, seconds, path)
                image = Image.open(path)
                image.thumbnail((370, 208))
                x, y = i % 4 * 375, i // 4 * 236
                sheet.paste(image, (x, y))
                draw.text((x + 8, y + 211), str(seconds), fill="white")
            path = ROOT / "research" / f"review-{video_id}-{start}-{batch_start // 30 + 1}.jpg"
            sheet.save(path)
            print(path)
    else:
        extract()
