"""Manually checked preview timestamps, with creator credits from video metadata."""
import json
from collect import ROOT

GROUPS = {
    "QVX-Cu0-XgY": {
        "Breath of Yu'lon": [5, 10], "Chronos": [15, 20], "Netherflame": [35, 40],
        "Nightmare": [45, 50], "Light of the Earth-Warder": [55, 60],
        "Mark of Shadowmoon": [65, 70], "Mark of the Bleeding Hollow": [75, 80],
        "Mark of the Frostwolf": [85, 90], "Mark of the Shattered Hand": [95, 100],
        "Mark of the Thunderlord": [110, 115], "Colossus": [120, 125],
        "Dancing Steel": [130, 135], "Blade Ward": [140, 145], "Soulfrost": [150, 155],
        "Sunfire": [160, 165], "Beastslayer": [170, 175], "Coldlight": [180, 185],
        "Deathfrost": [190, 195], "Rune of Razorice": [200, 205],
    },
    "hZCoWvXPi_4": {
        "Titanguard": [48, 49], "Mark of Blackrock": [565, 571],
        "Winter's Grasp": [343, 349], "Flames of Ragnaros": [355, 361],
        "Unbreakable Resolve": [701, 702], "Sinwrath": [706, 707],
        "Transcendent Soul": [711, 712], "Wild Soul": [716, 717],
        "Undying Spirit": [771, 772], "Sinsedge": [776, 777], "Devoted Spirit": [781, 782],
        "Icy Chill": [117, 118], "Heartsong": [125, 126], "Windwalk": [120, 123],
        "Avalanche": [159, 162], "Elemental Slayer": [165, 166], "Windsong": [130, 133],
        "Primal Air": [247, 253], "Primal Frost": [256, 259], "Primal Fire": [260, 261],
        "Primal Earth": [262, 264], "Primal Mastery": [265, 267],
        "Hunt's Favor": [783, 787], "Void Edge": [788, 791],
        "Cosmic Flow": [852, 853], "Dreadflame": [857, 858], "Unchained Fury": [862, 863],
        "Primal Storm": [868, 870], "Verdant Crush": [882, 883], "Bronze Infinite": [888, 893],
    },
    "wStbaCgT4wA": {"Summer Sun Blossom": [15, 25, 35]},
    "G1-5TX-QCWc": {"Venomcoil": [5, 25, 65]},
    "6j4WXErrPxM": {"Holy Fire": [2, 6]},
    "-qwc-FXi_xE": {"Galaxy": [2, 6]},
    "WVI6SfG6rR8": {"Arcane": [25, 55]},
    "PmrzGU2o00Q": {"Jackpot": [120, 150]},
    "lX8VChQ2tz8": {"Felshatter": [175, 190]},
    "oAf2guuKILU": {"Stinging Sands": [5, 15]},
    "C-qgVOES0kA": {"Wraithchill": [5, 15]},
    "5sacxh16Zf0": {"Shadow Flame": [4, 8]},
    "hut3BVI0Xsw": {"Flametongue": [5, 11], "Frostbrand": [17, 23], "Rockbiter": [32, 41]},
    "Cu1nj8Usgj8": {"Earthliving": [180, 190]},
    "QuPe4WQIqbA": {"Poisoned": [265, 270]},
    "ApuzL3KyAQ0": {"Windfury": [181, 188]},
    "AzopClLglBY": {"Sha Corruption": [3, 11]},
    "KygfyRaCEIA": {"Glorious Tyranny": [5, 25]},
    "UJk-9aXvYQo": {"Primal Victory": [450, 465]},
    "1aaFPLCTAYw": {"Demonic Tyranny": [3, 11]},
    "j40XeE9VywQ": {"Sinful Flame": [22, 23]},
    "mIWQPSe4Ss8": {"Eternal Flux": [5, 35]},
}

if __name__ == "__main__":
    path = ROOT / "research/video-selections.json"
    selections = json.loads(path.read_text()) if path.exists() else {}
    for video, entries in GROUPS.items():
        metadata = json.loads((ROOT / f"research/video-{video}.info.json").read_text())
        for name, times in entries.items():
            selections[name] = {"video": video, "credit": metadata["uploader"], "times": times}
    path.write_text(json.dumps(selections, indent=2) + "\n")
    source = json.loads((ROOT / "research/catalogue-source.json").read_text())
    missing = [r["name"] for r in source["entries"] if r["name"] not in selections]
    print(f"Selected {len(selections)} effects. Still need: {', '.join(missing)}")
