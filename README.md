# NoticeLens 2.0

**Understand documents. Discover differences. Make smarter decisions.**

NoticeLens is a React + Express document-intelligence prototype powered by Gemma 4 through the Google GenAI SDK. It analyses common documents, compares two versions, explains findings with source evidence, and supports English/Hindi text and browser voice interaction.

## Features in this release

- Minimal, responsive workspace UI with persistent light/dark mode.
- Analyse PDF, JPG, JPEG, PNG, WEBP, TXT, MD, CSV, DOCX, XLSX, XLS and PPTX files (12 MB maximum per file).
- Extract document purpose, classification, summaries, key information, dates, amounts, conditions, terms and action items.
- Keep transaction/record dates separate from deadlines.
- Evidence-backed findings and warnings for uncertain information.
- Compare two documents and identify added, removed, modified, unchanged and uncertain items.
- Optional preference-based comparison recommendations with explicit trade-offs.
- Ask questions grounded in the uploaded document, in English or Hindi.
- Browser voice input and spoken responses. Voice input is supported in browsers exposing the Web Speech Recognition API; Chrome/Edge are recommended. Typed chat remains available as a fallback.
- Optional personal eligibility check by supplying only relevant details.
- Action checklist and important-date panel.
- Local recent activity list. It stores filenames, titles and summaries in this browser; it does not store original files.
- Fictional sample document and fictional original/revised comparison pair for demos.

## Requirements

- Node.js 22.12+ recommended (Node.js 20.19+ may also work with Vite 7).
- Google AI Studio API key with access to the configured Gemma model.
- Chrome or Edge recommended for browser voice input.

## Setup on Windows PowerShell

1. Extract the ZIP archive.
2. Open the extracted `noticelens` folder in VS Code.
3. Create the server environment file:

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

   If PowerShell says the file already exists, open `server/.env` directly.

4. Get an API key from https://aistudio.google.com/app/apikey and put it in `server/.env`:

   ```env
   GEMINI_API_KEY=your_actual_key_here
   GEMMA_MODEL=gemma-4-26b-a4b-it
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173
   ```

   Keep this key on the server. Never add it to React or commit `server/.env` to GitHub.

5. From the project root, install all workspace dependencies:

   ```powershell
   npm.cmd install
   ```

6. Start the frontend and backend together:

   ```powershell
   npm.cmd run dev
   ```

7. Open http://localhost:5173. Keep the terminal running while using the app.

If `npm` is blocked by PowerShell's script policy, use `npm.cmd` as shown above. If Node or npm is not found, install the current Node.js LTS release from https://nodejs.org/en/download and reopen VS Code.

## Demo flow

1. From Home, choose **Try sample document** or open **Analyse documents** and upload a file.
2. Click **Analyse document**.
3. Review the summary, key facts, requirements, dates, amounts and action steps.
4. Use **Check how this applies to you** with fictional or non-sensitive sample details.
5. Open **AI assistant**, select English or Hindi, type a question or use the microphone.
6. Open **Compare documents**, choose **Load fictional sample pair**, then compare. The sample preference text is fictional and can be edited.
7. Use the moon/sun button in the top bar to switch theme. The selected theme is saved in this browser.

## Supported formats and limitations

- PDF: text-based PDFs are supported. Image-only/scanned PDFs are not OCR-processed in this release; export their relevant pages as JPG/PNG and upload those images instead.
- Images: JPG/JPEG, PNG and WEBP are sent to Gemma as image inputs.
- DOCX: text is extracted using Mammoth.
- XLS/XLSX: worksheets are converted into text tables using SheetJS.
- PPTX: slide text is extracted from the PowerPoint package. Embedded chart images and complex visual layouts may not be represented in the extracted text.
- TXT/MD/CSV: uploaded as text.
- Maximum upload size is 12 MB per file.
- Voice input depends on browser support and microphone permission. If unavailable, use the text box. Spoken reply availability depends on installed device voices.

## API routes

- `GET /api/health` — backend and API-key configuration status.
- `POST /api/analyze` — multipart field `notice`; optional `language` (`English` or `Hindi`).
- `POST /api/compare` — multipart fields `noticeA`, `noticeB`, optional JSON `profile`, and optional `language`.
- `POST /api/chat` — multipart fields `notice`, `question`, optional JSON `history`, and optional `language`.

## Privacy and accuracy

- Uploaded files are kept in server memory for the request and are not written to disk.
- Document content is sent to Google for Gemma processing. Do not upload highly confidential documents unless you are comfortable with that data processing.
- Recent activity stores filenames, titles, categories and short summaries in browser localStorage. It does not store the source files. Clear it from **My library**.
- The app uses temporary client memory for the currently selected file. Refreshing the page clears the current file and analysis.
- AI extraction can be incomplete or wrong. Verify dates, money, eligibility, and legal/financial obligations against the source.
- A comparison does not prove authenticity, legal validity, or which version is officially in force.
- Personalised recommendations use only the preferences supplied and should be treated as decision support, not professional advice.
