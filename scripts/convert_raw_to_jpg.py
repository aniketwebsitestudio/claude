#!/usr/bin/env python3
"""
Convert Canon CR3 (and other RAW) files to Shopify-ready JPEGs.

Why this exists
---------------
Shopify rejects RAW camera files outright. The Apps Script uploader works
around that by asking Google Drive to re-render the file, but Drive has never
supported Canon CR3 previews, so those 29 files in the sheet cannot be fixed
in the cloud. They have to be developed on a real machine — this script.

What it produces
----------------
JPEGs with the same base name as the original, longest edge capped at 2048px
(Shopify's own recommendation, and comfortably under the 25 MP / 20 MB caps).

Where to put the results
------------------------
Upload each JPEG back into the *same Drive folder* as the CR3 it came from.
Do not rename it and do not delete the CR3 — the uploader matches on base name
and always prefers a JPEG sibling over the RAW original, so the sheet needs no
edit at all. IMG_1234.CR3 in column AD will find IMG_1234.jpg in Drive.

Install
-------
    pip install rawpy pillow

Usage
-----
    python3 convert_raw_to_jpg.py /path/to/photos
    python3 convert_raw_to_jpg.py /path/to/photos --out ./converted
    python3 convert_raw_to_jpg.py /path/to/photos --dry-run
    python3 convert_raw_to_jpg.py /path/to/photos --long-edge 2048 --quality 88
"""

import argparse
import io
import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed

RAW_EXT = {
    ".cr3", ".cr2", ".crw", ".nef", ".nrw", ".arw", ".srf", ".sr2",
    ".dng", ".raf", ".orf", ".rw2", ".pef", ".kdc", ".dcr", ".x3f",
}

DEFAULT_LONG_EDGE = 2048
DEFAULT_QUALITY = 88
MAX_PIXELS = 25_000_000       # Shopify's product-image cap
MAX_BYTES = 20 * 1024 * 1024  # Shopify's file-size cap


def require_deps():
    missing = []
    try:
        import rawpy  # noqa: F401
    except ImportError:
        missing.append("rawpy")
    try:
        import PIL  # noqa: F401
    except ImportError:
        missing.append("pillow")
    if missing:
        sys.exit("Missing dependencies: %s\n\n    pip install %s"
                 % (", ".join(missing), " ".join(missing)))


def fit(size, long_edge):
    """Scale (w, h) so the longest side is at most long_edge. Never enlarges."""
    w, h = size
    longest = max(w, h)
    if longest <= long_edge:
        return None
    scale = long_edge / float(longest)
    return max(1, int(round(w * scale))), max(1, int(round(h * scale)))


def open_raw(path):
    """
    Returns a PIL image for a RAW file.

    Tries the embedded JPEG preview first: Canon writes a full-resolution,
    camera-rendered JPEG inside the CR3, which is both instant to extract and
    closer to what the photographer saw than anything we would develop
    ourselves. Falls back to a real demosaic when the preview is missing or
    too small to be the full frame.
    """
    import rawpy
    from PIL import Image

    with rawpy.imread(path) as raw:
        sizes = raw.sizes
        full_long = max(sizes.width, sizes.height)

        try:
            thumb = raw.extract_thumb()
            if thumb.format == rawpy.ThumbFormat.JPEG:
                img = Image.open(io.BytesIO(thumb.data))
                img.load()
                # A 160px "thumbnail" is not the preview we want.
                if max(img.size) >= min(full_long, DEFAULT_LONG_EDGE):
                    return img.convert("RGB"), "embedded preview"
            elif thumb.format == rawpy.ThumbFormat.BITMAP:
                img = Image.fromarray(thumb.data)
                if max(img.size) >= min(full_long, DEFAULT_LONG_EDGE):
                    return img.convert("RGB"), "embedded preview"
        except (rawpy.LibRawNoThumbnailError, rawpy.LibRawUnsupportedThumbnailError):
            pass
        except Exception:
            pass

        rgb = raw.postprocess(
            use_camera_wb=True,
            no_auto_bright=False,
            output_bps=8,
        )
        return Image.fromarray(rgb), "developed from raw"


def convert_one(path, out_dir, long_edge, quality, force):
    """Runs in a worker process. Returns (path, status, detail)."""
    from PIL import Image

    base = os.path.splitext(os.path.basename(path))[0]
    dest = os.path.join(out_dir or os.path.dirname(path), base + ".jpg")

    if os.path.exists(dest) and not force:
        return path, "skip", "%s already exists" % os.path.basename(dest)

    try:
        img, how = open_raw(path)
    except Exception as e:
        return path, "fail", "%s: %s" % (type(e).__name__, e)

    original = img.size

    target = fit(img.size, long_edge)
    if target:
        img = img.resize(target, Image.LANCZOS)

    # Belt and braces: honour the pixel cap even if --long-edge was raised.
    while img.size[0] * img.size[1] > MAX_PIXELS:
        img = img.resize((img.size[0] // 2, img.size[1] // 2), Image.LANCZOS)

    q = quality
    while True:
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=q, optimize=True,
                 progressive=True, subsampling="4:2:0")
        if buf.tell() <= MAX_BYTES or q <= 60:
            break
        q -= 8

    os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
    with open(dest, "wb") as fh:
        fh.write(buf.getvalue())

    detail = "%dx%d -> %dx%d, %.1f MB, %s" % (
        original[0], original[1], img.size[0], img.size[1],
        buf.tell() / 1048576.0, how)
    if q != quality:
        detail += ", quality %d" % q
    return path, "ok", detail


def find_raw(root, recursive):
    if os.path.isfile(root):
        return [root] if os.path.splitext(root)[1].lower() in RAW_EXT else []

    found = []
    if recursive:
        for dirpath, _, names in os.walk(root):
            for n in sorted(names):
                if os.path.splitext(n)[1].lower() in RAW_EXT:
                    found.append(os.path.join(dirpath, n))
    else:
        for n in sorted(os.listdir(root)):
            full = os.path.join(root, n)
            if os.path.isfile(full) and os.path.splitext(n)[1].lower() in RAW_EXT:
                found.append(full)
    return found


def main():
    ap = argparse.ArgumentParser(
        description="Convert CR3/NEF/other RAW files to Shopify-ready JPEGs.")
    ap.add_argument("source", help="RAW file, or a folder of them")
    ap.add_argument("--out", help="output folder (default: next to each original)")
    ap.add_argument("--long-edge", type=int, default=DEFAULT_LONG_EDGE,
                    help="cap the longest side at this many pixels (default %d)"
                         % DEFAULT_LONG_EDGE)
    ap.add_argument("--quality", type=int, default=DEFAULT_QUALITY,
                    help="JPEG quality, 1-95 (default %d)" % DEFAULT_QUALITY)
    ap.add_argument("--recursive", action="store_true",
                    help="walk sub-folders too")
    ap.add_argument("--force", action="store_true",
                    help="overwrite JPEGs that already exist")
    ap.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) - 1),
                    help="parallel workers")
    ap.add_argument("--dry-run", action="store_true",
                    help="list what would be converted and stop")
    args = ap.parse_args()

    if not os.path.exists(args.source):
        sys.exit("No such file or folder: %s" % args.source)

    files = find_raw(args.source, args.recursive)
    if not files:
        sys.exit("No RAW files found in %s" % args.source)

    print("Found %d RAW file(s)." % len(files))
    if args.dry_run:
        for f in files:
            print("  %s -> %s.jpg" % (f, os.path.splitext(os.path.basename(f))[0]))
        return

    require_deps()

    if args.out:
        os.makedirs(args.out, exist_ok=True)

    counts = {"ok": 0, "skip": 0, "fail": 0}
    failures = []

    with ProcessPoolExecutor(max_workers=args.jobs) as pool:
        futures = {
            pool.submit(convert_one, f, args.out, args.long_edge,
                        args.quality, args.force): f
            for f in files
        }
        for i, fut in enumerate(as_completed(futures), 1):
            path, status, detail = fut.result()
            counts[status] += 1
            mark = {"ok": ".", "skip": "-", "fail": "X"}[status]
            print("[%d/%d] %s %s  %s" % (i, len(files), mark,
                                         os.path.basename(path), detail))
            if status == "fail":
                failures.append((path, detail))

    print("\n%d converted, %d skipped, %d failed."
          % (counts["ok"], counts["skip"], counts["fail"]))

    if failures:
        print("\nFailed:")
        for path, detail in failures:
            print("  %s\n    %s" % (path, detail))

    if counts["ok"]:
        print("\nNext: upload the .jpg files into the SAME Drive folder as the "
              "originals.\nKeep the names as they are and leave the RAW files "
              "in place — the uploader\nprefers a JPEG sibling automatically, "
              "so the sheet needs no changes.")

    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
