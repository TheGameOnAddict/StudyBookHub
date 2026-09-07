# 📖 StudyBookHub

> A private, local-first digital textbook reader, handwritten note taking, and study progress tracker built with React, TypeScript, Tailwind CSS, PDF.js, and Dexie IndexedDB. Styled in an elegant lavender purple & white aesthetic.

[![Deploy to GitHub Pages](https://github.com/TheGameOnAddict/StudyBookHub/actions/workflows/deploy.yml/badge.svg)](https://github.com/TheGameOnAddict/StudyBookHub/actions/workflows/deploy.yml)

---

## ✨ Features

- 🔒 **100% Local-First & Privacy-Focused**:
  - Your PDF textbooks are stored locally in your browser's IndexedDB.
  - Large PDF files are **never uploaded to external servers**.
- ✍️ **Handwritten Drawing & Stylus Annotations**:
  - Full support for Apple Pencil, stylus, touch, and mouse input.
  - **Pen**, **Highlighter** (semi-transparent), and **Stroke Eraser**.
  - Customizable colors (Lavender, Violet, Sky, Mint, Gold, Rose, Obsidian).
  - Normalization engine: drawings stay anchored precisely when zooming or switching devices.
  - **Read/Scroll Mode vs Draw Mode** toggle for smooth iPad and tablet touch handling.
- 🖍️ **Text Highlighting & Margin Notes**:
  - Select text natively on any page to apply instant pastel highlights.
  - Attach quick study thoughts or summary notes to highlights.
  - Add freeform margin notes to any page.
  - Export all book notes to Markdown (`.md`) with one click.
- 📊 **Study Tracking & Organization**:
  - Visual bookshelf with page progress bars (`% studied`, `Page X of Y`).
  - Chapter selector with embedded PDF Table of Contents.
  - Filter books by *All*, *In Progress*, and *Completed* (with celebratory confetti!).
  - Bookmark favorite pages with 1 click.
- 🔍 **Instant Global Search**:
  - Search across all book titles, notes, and highlighted text excerpts.
  - Click any search result to jump directly to that book and page.
- ☁️ **Cloud Sync & Offline Backup**:
  - **Google Drive Sync**: Optional 1-click Google Sign-in to sync notes, drawings, and progress to your private Google Drive.
  - **Instant Local File Backup**: Zero-setup `.json` export and import that works completely offline on phone, tablet, or desktop.
- 📱 **Responsive & Mobile/Tablet Ready**:
  - Optimized for phones, Android tablets, iPad, and desktop viewports.

---

## 🚀 Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/TheGameOnAddict/StudyBookHub.git
cd StudyBookHub

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🌐 Deploying to GitHub Pages

This repository is already configured with an automated GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### How to enable GitHub Pages:

1. Push your changes to the `main` branch:
   ```bash
   git add .
   git commit -m "feat: complete StudyBookHub setup"
   git push -u origin main
   ```
2. Open your repository on GitHub: [github.com/TheGameOnAddict/StudyBookHub](https://github.com/TheGameOnAddict/StudyBookHub)
3. Go to **Settings** &rarr; **Pages**.
4. Under **Build and deployment** &gt; **Source**, select **GitHub Actions**.
5. The deployment workflow will run automatically. Once completed, your app will be live at:
   `https://thegameonaddict.github.io/StudyBookHub/`

---

## ☁️ Setting Up Google Drive Sync (Optional)

To enable 1-click Google account sync for your deployment:

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. `StudyBookHub`).
3. Under **APIs & Services** &gt; **Library**, enable **Google Drive API**.
4. Under **APIs & Services** &gt; **Credentials**, click **Create Credentials** &rarr; **OAuth client ID**.
   - Application type: **Web application**
   - Authorized JavaScript origins: Add `http://localhost:5173` and `https://thegameonaddict.github.io`
5. Copy your **Client ID** and paste it into the **Cloud Sync** modal in the web app!

> 💡 **Tip:** If you prefer zero configuration, you can also use the **Export File (.json)** and **Import File (.json)** buttons in the Cloud Sync dialog anytime to back up and transfer your study notes across devices.

---

## 🛠️ Built With

- [Vite](https://vitejs.dev/) & [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [Dexie.js (IndexedDB)](https://dexie.com/)
- [Lucide Icons](https://lucide.dev/)
- [Canvas Confetti](https://www.kirilv.com/canvas-confetti/)
