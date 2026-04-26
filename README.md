# CV Autofill Assistant

Local Chrome/Edge extension that extracts data from a resume and autofills text fields in job application forms.

## What It Does

- loads a resume in `PDF`, `TXT`, or `MD`
- extracts common profile fields such as name, email, phone, address, title, skills, and summary
- stores the profile locally in the browser
- autofills text-based fields on the current page
- leaves `yes/no`, checkboxes, radios, legal questions, and similar sensitive fields for manual review

## Why This MVP Is Useful

Many job application forms repeat the same text inputs again and again. This extension is designed to handle the repetitive part safely:

- text inputs are filled automatically
- ambiguous or high-risk fields stay manual
- everything works locally without a backend

## Load The Extension

1. Open `chrome://extensions/` or `edge://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select [extension](C:\Users\peppe\Desktop\Condivisa2\extension)

## Usage

1. Open the extension popup
2. Upload a resume file
3. Click `Estrai e salva`
4. Review the extracted JSON
5. Correct any field if needed
6. Click `Salva modifiche`
7. Open a job application page
8. Click `Compila questa pagina`
9. Review the filled text fields and complete the remaining manual questions yourself

## Supported Autofill Scope

This MVP is intentionally conservative. It focuses on:

- `input[type="text"]`
- `input[type="email"]`
- `input[type="tel"]`
- `textarea`
- a small subset of clearly textual `select` fields, such as country or city

It intentionally avoids:

- `yes/no` questions
- `radio`
- `checkbox`
- legal authorization questions
- salary expectations
- dates
- file uploads
- CAPTCHA

## Project Structure

- [extension/manifest.json](C:\Users\peppe\Desktop\Condivisa2\extension\manifest.json)
- [extension/popup.html](C:\Users\peppe\Desktop\Condivisa2\extension\popup.html)
- [extension/popup.css](C:\Users\peppe\Desktop\Condivisa2\extension\popup.css)
- [extension/popup.js](C:\Users\peppe\Desktop\Condivisa2\extension\popup.js)
- [extension/profile-parser.mjs](C:\Users\peppe\Desktop\Condivisa2\extension\profile-parser.mjs)
- [extension/content.js](C:\Users\peppe\Desktop\Condivisa2\extension\content.js)

## Development

Install dependencies:

```bash
npm install
```

Run a quick syntax check:

```bash
npm run check
```

## License

This project is released under the [MIT License](C:\Users\peppe\Desktop\Condivisa2\LICENSE).

## Third-Party Code

This repository includes bundled files from PDF.js through `pdfjs-dist` for in-browser PDF parsing.

See [THIRD_PARTY_NOTICES.md](C:\Users\peppe\Desktop\Condivisa2\THIRD_PARTY_NOTICES.md).
