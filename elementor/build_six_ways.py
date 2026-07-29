#!/usr/bin/env python3
"""Wrap six-ways.html into an importable Elementor template (single HTML widget)."""

import json
import random

random.seed(20260729)


def eid():
    return "".join(random.choice("0123456789abcdef") for _ in range(7))


BLOCK = open("/home/user/claude/elementor/six-ways.html", encoding="utf-8").read()

zero = {"unit": "px", "top": "0", "right": "0", "bottom": "0", "left": "0", "isLinked": True}

widget = {
    "id": eid(),
    "elType": "widget",
    "widgetType": "html",
    "settings": {"html": BLOCK},
    "elements": [],
}

section = {
    "id": eid(),
    "elType": "container",
    "settings": {
        "content_width": "full",
        "html_tag": "div",
        "padding": zero,
        "margin": zero,
        "flex_gap": {"unit": "px", "size": 0, "column": "0", "row": "0", "isLinked": True},
        "_css_classes": "sneh-exp-wrap",
    },
    "elements": [widget],
    "isInner": False,
}

template = {
    "content": [section],
    "page_settings": [],
    "version": "0.4",
    "title": "Six ways to be here — Experiences",
    "type": "section",
}

out = "/home/user/claude/elementor/six-ways-to-be-here.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(template, f, ensure_ascii=False, indent=2)

print("wrote", out, "(%d KB)" % (len(json.dumps(template)) // 1024))
