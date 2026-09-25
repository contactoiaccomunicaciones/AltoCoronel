---
name: Mobile photo orientation
description: Avoid rotated user-uploaded photos when processing images with EXIF orientation.
---

Auto-orient iPhone photos before resizing, brightening, cropping, or sending them through an image editor. Keep the original and visually inspect the normalized derivative before using it on the site.

**Why:** An image edit returned rotated for an iPhone photo tagged with EXIF orientation; explicitly applying orientation before processing preserved the intended composition.

**How to apply:** Check EXIF orientation on uploaded mobile photos, normalize pixels on a derivative, and confirm the output is upright before integrating it.