# textboard

A visual text collage tool. Upload notes, paste text, and drag word-chunks around a canvas to recompose them.

## Features

- **Upload** `.txt` or `.md` files — text is split into word-chunks and scattered across the canvas
- **Add text** manually via the modal (Ctrl+Enter to confirm)
- **Drag** pieces freely around the canvas
- **Double-click** any piece to edit it inline
- **Controls** — set size, color, and style before adding
- **Scatter** — reshuffles everything with an animation
- **Export** — saves the canvas as an SVG file
- **Keyboard** — `Delete`/`Backspace` removes selected, `Escape` deselects

## Usage

No build step. Just open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server
```

Then visit `http://localhost:3000` (or `8000`).

## Structure

```
index.html   — markup and layout
style.css    — all styles and design tokens
app.js       — drag, drop, split, and canvas logic
```

## License

MIT
