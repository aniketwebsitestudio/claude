#!/usr/bin/env python3
"""Render the Elementor template JSON into Elementor-like markup + CSS for visual QA.

Mimics how Elementor emits styles: per-element rules keyed on .elementor-element-{id},
with tablet (<=1024px) and mobile (<=767px) media queries — not inline styles.
"""
import json, html, base64, re

SRC = "/home/user/claude/elementor/six-ways-to-be-here.json"
d = json.load(open(SRC, encoding="utf-8"))

rules = {"": [], "tablet": [], "mobile": []}


def add(dev, sel, decls):
    if decls:
        rules[dev].append("%s{%s}" % (sel, ";".join(decls)))


def dim_css(prop, p):
    return "%s:%s%s %s%s %s%s %s%s" % (prop, p["top"], p["unit"], p["right"], p["unit"],
                                       p["bottom"], p["unit"], p["left"], p["unit"])


def sz(v):
    return "%s%s" % (v["size"], v["unit"])


def container_decls(s, dev):
    sfx = "" if dev == "" else "_" + dev
    o = []
    if dev == "":
        o.append("display:flex")
        o.append("flex-direction:%s" % s.get("flex_direction", "column"))
        if s.get("flex_align_items"):
            o.append("align-items:%s" % s["flex_align_items"])
        if s.get("background_color"):
            o.append("background-color:%s" % s["background_color"])
        if s.get("width"):
            o.append("width:%s" % sz(s["width"]))
    else:
        if s.get("flex_direction" + sfx):
            o.append("flex-direction:%s" % s["flex_direction" + sfx])
        if s.get("width" + sfx):
            o.append("width:%s" % sz(s["width" + sfx]))
    if s.get("padding" + sfx):
        o.append(dim_css("padding", s["padding" + sfx]))
    if s.get("margin" + sfx):
        o.append(dim_css("margin", s["margin" + sfx]))
    g = s.get("flex_gap" + sfx)
    if g:
        o.append("gap:%s%s %s%s" % (g.get("row", 0), g["unit"], g.get("column", 0), g["unit"]))
    return o


def typo_decls(s, dev):
    sfx = "" if dev == "" else "_" + dev
    o = []
    if dev == "":
        if s.get("title_color"):
            o.append("color:%s" % s["title_color"])
        if s.get("typography_font_family"):
            o.append("font-family:\"%s\",Georgia,serif" % s["typography_font_family"])
        if s.get("typography_font_weight"):
            o.append("font-weight:%s" % s["typography_font_weight"])
        if s.get("typography_letter_spacing"):
            o.append("letter-spacing:%s" % sz(s["typography_letter_spacing"]))
        if s.get("typography_line_height"):
            o.append("line-height:%s" % sz(s["typography_line_height"]))
    if s.get("typography_font_size" + sfx):
        o.append("font-size:%s" % sz(s["typography_font_size" + sfx]))
    return o


def render(e):
    s, eid = e["settings"], e["id"]
    cls = s.get("_css_classes", "")
    esel = ".elementor-element-%s" % eid

    if e["elType"] == "container":
        for dev in ("", "tablet", "mobile"):
            add(dev, esel, container_decls(s, dev))
        inner = "".join(render(c) for c in e["elements"])
        tag = s.get("html_tag", "div")
        if s.get("content_width") == "boxed":
            bw = s.get("boxed_width", {}).get("size", 1140)
            # Elementor boxed: outer full width, inner constrained, flex props move inward
            rules[""][-1] = rules[""][-1]  # keep
            add("", esel + " > .e-con-inner",
                ["max-width:%spx" % bw, "width:100%", "margin:0 auto", "display:flex",
                 "flex-direction:%s" % s.get("flex_direction", "column")]
                + (["align-items:%s" % s["flex_align_items"]] if s.get("flex_align_items") else [])
                + ([("gap:%s%s %s%s" % (s["flex_gap"].get("row", 0), s["flex_gap"]["unit"],
                                        s["flex_gap"].get("column", 0), s["flex_gap"]["unit"]))]
                   if s.get("flex_gap") else []))
            for dev in ("tablet", "mobile"):
                sfx = "_" + dev
                o = []
                if s.get("flex_direction" + sfx):
                    o.append("flex-direction:%s" % s["flex_direction" + sfx])
                g = s.get("flex_gap" + sfx)
                if g:
                    o.append("gap:%s%s %s%s" % (g.get("row", 0), g["unit"],
                                                g.get("column", 0), g["unit"]))
                add(dev, esel + " > .e-con-inner", o)
            return '<%s class="e-con e-flex e-con-boxed elementor-element elementor-element-%s %s"><div class="e-con-inner">%s</div></%s>' % (
                tag, eid, cls, inner, tag)
        return '<%s class="e-con e-flex e-con-full elementor-element elementor-element-%s %s">%s</%s>' % (
            tag, eid, cls, inner, tag)

    wt = e["widgetType"]
    for dev in ("", "tablet", "mobile"):
        add(dev, esel + " .elementor-heading-title" if wt == "heading" else esel,
            typo_decls(s, dev))
    wrap = ('<div class="elementor-element elementor-element-%s elementor-widget '
            'elementor-widget-%s %s"><div class="elementor-widget-container">%s</div></div>')

    if wt == "heading":
        tag = s.get("header_size", "h2")
        return wrap % (eid, wt, cls,
                       '<%s class="elementor-heading-title">%s</%s>' % (tag, s["title"], tag))
    if wt == "text-editor":
        return wrap % (eid, wt, cls, s["editor"])
    if wt == "button":
        body = ('<div class="elementor-button-wrapper"><a class="elementor-button elementor-button-link" href="%s" role="button">'
                '<span class="elementor-button-content-wrapper">'
                '<span class="elementor-button-text">%s</span>'
                '<span class="elementor-button-icon">&#8594;</span>'
                '</span></a></div>') % (s["link"]["url"], html.escape(s["text"]))
        return wrap % (eid, wt, cls, body)
    if wt == "html":
        return wrap % (eid, wt, cls, s["html"])
    return ""


body = "".join(render(e) for e in d["content"])

css = "\n".join(rules[""])
css += "\n@media(max-width:1024px){%s}" % "\n".join(rules["tablet"])
css += "\n@media(max-width:767px){%s}" % "\n".join(rules["mobile"])

BASE = """
*{margin:0;padding:0;box-sizing:border-box}
body{background:#F2F4F1;font-family:system-ui}
.e-con{position:relative;width:100%;max-width:100%}
.e-con>.elementor-widget{width:100%;max-width:100%}
.e-con-inner>.elementor-widget{width:100%;max-width:100%}
a{text-decoration:none;color:inherit}
img{max-width:100%}
.before,.after{padding:120px 40px;font:300 18px/1.6 system-ui;color:#0B211F}
"""

page = ("<!doctype html><html><head><meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
        "<title>Preview — Six ways to be here</title>"
        "<style>%s</style><style>%s</style></head><body>"
        "<div class=\"before\">Content above the section</div>%s"
        "<div class=\"after\">Content below the section</div></body></html>") % (BASE, css, body)

open("/home/user/claude/elementor/preview.html", "w", encoding="utf-8").write(page)

# local-image variant (the CDN host is unreachable from this sandbox)
cols = ["#1D4A45", "#397f79", "#489a8f", "#83931f", "#D9764F", "#153733"]
i = [0]


def rep(m):
    c = cols[i[0] % 6]
    i[0] += 1
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">'
           '<rect width="800" height="1000" fill="%s"/>'
           '<text x="40" y="120" fill="#fff" font-size="60" font-family="serif">%d</text></svg>'
           % (c, i[0]))
    return 'src="data:image/svg+xml;base64,' + base64.b64encode(svg.encode()).decode() + '"'


open("/home/user/claude/elementor/preview-local.html", "w", encoding="utf-8").write(
    re.sub(r'src="https://pikaso[^"]*"', rep, page))
print("wrote preview.html / preview-local.html")
