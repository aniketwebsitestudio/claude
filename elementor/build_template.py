#!/usr/bin/env python3
"""Wrap a self-contained HTML block into an importable Elementor template.

    python3 build_template.py <block.html> <out.json> "<Template title>"
"""

import json
import random
import sys


def eid():
    return "".join(random.choice("0123456789abcdef") for _ in range(7))


def build(src, out, title):
    random.seed(title)
    block = open(src, encoding="utf-8").read()
    zero = {"unit": "px", "top": "0", "right": "0", "bottom": "0", "left": "0", "isLinked": True}

    template = {
        "content": [{
            "id": eid(),
            "elType": "container",
            "settings": {
                "content_width": "full",
                "html_tag": "div",
                "padding": zero,
                "margin": zero,
                "flex_gap": {"unit": "px", "size": 0, "column": "0", "row": "0", "isLinked": True},
            },
            "elements": [{
                "id": eid(),
                "elType": "widget",
                "widgetType": "html",
                "settings": {"html": block},
                "elements": [],
            }],
            "isInner": False,
        }],
        "page_settings": [],
        "version": "0.4",
        "title": title,
        "type": "section",
    }

    with open(out, "w", encoding="utf-8") as f:
        json.dump(template, f, ensure_ascii=False, indent=2)
    print("wrote %s (%d KB)" % (out, len(json.dumps(template)) // 1024))


if __name__ == "__main__":
    if len(sys.argv) == 4:
        build(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        build("six-ways.html", "six-ways-to-be-here.json",
              "Six ways to be here — Experiences")
        build("reviews-carousel.html", "reviews-carousel.json",
              "Guest stories — Reviews carousel")
