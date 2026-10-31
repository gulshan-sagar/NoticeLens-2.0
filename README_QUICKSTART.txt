NOTICELENS 2.0 — QUICK START

1) Install Node.js 22.12+ (Node 20.19+ may also work).
2) Open the extracted noticelens folder in VS Code.
3) Create server/.env from server/.env.example:
   Copy-Item server/.env.example server/.env
4) Add your Google AI Studio key as GEMINI_API_KEY in server/.env.
5) From the noticelens root folder run:
   npm.cmd install
   npm.cmd run dev
6) Open http://localhost:5173

Use the moon/sun button to switch light/dark mode.
For a quick demo, load the fictional sample document or the fictional sample comparison pair.

Voice input works in browsers supporting Web Speech Recognition (Chrome/Edge recommended).
Scanned PDFs need to be exported as JPG/PNG pages in this version.
Never upload server/.env or share your API key.
