Not used. Phones load the full fonts.

# Phone Critical Arabic Font Subsets (`pyftsubset`)

Run these commands from the project root directory on macOS **before** copying `index.html` and the updated CSS files back into your live/Lighthouse test copy.

> **Important:** Do not copy `index.html` and the CSS back until the subset files exist in `assets/fonts/`.

## 1. Install `fonttools` and `brotli`

```bash
pip3 install fonttools brotli
```

## 2. Subset Breakdown

### A. `readex-pro-600-arabic-phone.woff2`
- **Source:** `assets/fonts/readex-pro-600-arabic.woff2`
- **Output:** `assets/fonts/readex-pro-600-arabic-phone.woff2`
- **Used by:** Hero headline (`h1.hero-headline`, ghost and live typewriter text):
  - `"نصنع لك تجارب رقمية تُحدث فرقًا"`
- **Unique characters (21):**
  `" ابةتثجحدرصعفقكلمنيًُ"`
- **Unicode codepoints:**
  `U+0020, U+0627, U+0628, U+0629, U+062A, U+062B, U+062C, U+062D, U+062F, U+0631, U+0635, U+0639, U+0641, U+0642, U+0643, U+0644, U+0645, U+0646, U+064A, U+064B, U+064F`

### B. `ibm-plex-sans-arabic-400-arabic-phone.woff2`
- **Source:** `assets/fonts/ibm-plex-sans-arabic-400-arabic.woff2`
- **Output:** `assets/fonts/ibm-plex-sans-arabic-400-arabic-phone.woff2`
- **Used by:** `body`, loader labels (`.lab-a`, `.lab-b`, `.loader-sr`), and hero description (`.hero-paragraph`):
  - `"جارٍ التحميل"`
  - `"أهلاً بك"`
  - `"اكتمل التحميل"`
  - `"شريكك في تحويل الأفكار إلى حلول رقمية متكاملة، نجمع فيها الإبداع والتكنولوجيا لتنمو علامتك التجارية وتتميز."`
- **Unique characters (28):**
  `" .،أإابةتجحدرزشعفقكلمنهوىيًٍ"`
- **Unicode codepoints:**
  `U+0020, U+002E, U+060C, U+0623, U+0625, U+0627, U+0628, U+0629, U+062A, U+062C, U+062D, U+062F, U+0631, U+0632, U+0634, U+0639, U+0641, U+0642, U+0643, U+0644, U+0645, U+0646, U+0647, U+0648, U+0649, U+064A, U+064B, U+064D`

### C. `ibm-plex-sans-arabic-700-arabic-phone.woff2`
- **Source:** `assets/fonts/ibm-plex-sans-arabic-700-arabic.woff2`
- **Output:** `assets/fonts/ibm-plex-sans-arabic-700-arabic-phone.woff2`
- **Used by:** Loader wordmark (`.loader-mark`), nav CTA (`.ticket-btn`), and hero CTA (`.hero-cta`) after Step 1 maps 600 -> 700 on phones:
  - `"ديجيتال إكسبريس"`
  - `"احجز استشارة مجانية"`
  - `"تواصل معنا"`
- **Unique characters (21):**
  `" إابةتجحدرزسشصعكلمنوي"`
- **Unicode codepoints:**
  `U+0020, U+0625, U+0627, U+0628, U+0629, U+062A, U+062C, U+062D, U+062F, U+0631, U+0632, U+0633, U+0634, U+0635, U+0639, U+0643, U+0644, U+0645, U+0646, U+0648, U+064A`

## 3. Exact `pyftsubset` Commands (macOS)

```bash
pyftsubset assets/fonts/readex-pro-600-arabic.woff2 \
  --output-file=assets/fonts/readex-pro-600-arabic-phone.woff2 \
  --unicodes=U+0020,U+0627,U+0628,U+0629,U+062A,U+062B,U+062C,U+062D,U+062F,U+0631,U+0635,U+0639,U+0641,U+0642,U+0643,U+0644,U+0645,U+0646,U+064A,U+064B,U+064F \
  --layout-features='*' \
  --flavor=woff2 \
  --no-hinting \
  --desubroutinize

pyftsubset assets/fonts/ibm-plex-sans-arabic-400-arabic.woff2 \
  --output-file=assets/fonts/ibm-plex-sans-arabic-400-arabic-phone.woff2 \
  --unicodes=U+0020,U+002E,U+060C,U+0623,U+0625,U+0627,U+0628,U+0629,U+062A,U+062C,U+062D,U+062F,U+0631,U+0632,U+0634,U+0639,U+0641,U+0642,U+0643,U+0644,U+0645,U+0646,U+0647,U+0648,U+0649,U+064A,U+064B,U+064D \
  --layout-features='*' \
  --flavor=woff2 \
  --no-hinting \
  --desubroutinize

pyftsubset assets/fonts/ibm-plex-sans-arabic-700-arabic.woff2 \
  --output-file=assets/fonts/ibm-plex-sans-arabic-700-arabic-phone.woff2 \
  --unicodes=U+0020,U+0625,U+0627,U+0628,U+0629,U+062A,U+062C,U+062D,U+062F,U+0631,U+0632,U+0633,U+0634,U+0635,U+0639,U+0643,U+0644,U+0645,U+0646,U+0648,U+064A \
  --layout-features='*' \
  --flavor=woff2 \
  --no-hinting \
  --desubroutinize
```
