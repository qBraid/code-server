#!/bin/bash

#This will generate all the assets for branding from a single SVG file

SVG="logo.svg"
OUTDIR="."
MEDIADIR="../src/browser/media"
mkdir -p "$OUTDIR"
mkdir -p "$MEDIADIR"

# Step 1: Convert to high-res PNG using Inkscape (preferred) or rsvg-convert
rsvg-convert -w 1024 "$OUTDIR/logo.svg" > "$OUTDIR/logo-raw.png"

# Step 2: Pad to 1024x1024 using ImageMagick
magick convert "$OUTDIR/logo-raw.png" -background none -gravity center -extent 1024x1024 "$OUTDIR/logo-1024.png"

# Step 3: Generate favicon (ICO and SVG)
magick convert "$OUTDIR/logo-1024.png" -resize 64x64 "$OUTDIR/favicon-64.png"
magick convert "$OUTDIR/favicon-64.png" -define icon:auto-resize "$OUTDIR/favicon.ico"

# Create favicon SVG by copying logo SVG and explicitly setting size attributes
cp "$OUTDIR/logo.svg" "$OUTDIR/favicon.svg"
# Add width/height attributes (avoid duplicating existing viewBox)
sed -i.bak 's/<svg/<svg width="64" height="64" /' "$OUTDIR/favicon.svg"
rm "$OUTDIR/favicon.svg.bak"

# Create dark mode favicon by simply copying the sized favicon SVG (no additional CSS needed)
cp "$OUTDIR/favicon.svg" "$OUTDIR/favicon-dark-support.svg"

# Step 4: Generate PWA icons
magick convert "$OUTDIR/logo-1024.png" -resize 192x192 "$OUTDIR/pwa-icon-192.png"
magick convert "$OUTDIR/logo-1024.png" -resize 512x512 "$OUTDIR/pwa-icon-512.png"

# Step 5: Copy all assets to media directory
cp "$OUTDIR/logo.svg" "$MEDIADIR/logo.svg"
cp "$OUTDIR/favicon.ico" "$MEDIADIR/favicon.ico"
cp "$OUTDIR/favicon.svg" "$MEDIADIR/favicon.svg"
cp "$OUTDIR/favicon-dark-support.svg" "$MEDIADIR/favicon-dark-support.svg"
cp "$OUTDIR/pwa-icon-192.png" "$MEDIADIR/pwa-icon-192.png"
cp "$OUTDIR/pwa-icon-512.png" "$MEDIADIR/pwa-icon-512.png"
cp "$OUTDIR/qbraid-tile.png" "$MEDIADIR/qbraid-tile.png"
