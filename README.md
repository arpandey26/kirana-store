# Kirana-Hishab — Local Source Code Package (Fluent 2 UI)

## Folder Structure
```text
kirana-hishab/
├── index.html                      # Modular entry point (links to css/fluent.css & js/app.js)
├── kirana_hishab_standalone.html   # Single-file portable build (all HTML/CSS/JS in one file)
├── css/
│   └── fluent.css                  # Microsoft Fluent 2 UI styles, Mica blur & dark mode tokens
├── js/
│   └── app.js                      # Core Kirana-Hishab engine (Packet+Loose, Packaged, Loose Bulk, POS, Dead-stock, Multi-user roles)
├── LOCAL_AGENT_PROMPT.md           # Prompt to paste into your local AI coding agent (Cursor / Claude Code / Windsurf / Copilot)
├── package.json                    # Quick local dev server scripts
└── README.md                       # Setup & local run instructions
```

## How to Run Locally (3 Easy Ways)
1. **Direct Browser Open (Zero Setup)**: Double-click `index.html` or `kirana_hishab_standalone.html` to open directly in Chrome, Edge, Brave, or Safari.
2. **Using Node.js / npx**:
   ```bash
   npm start
   # Opens at http://localhost:3000
   ```
3. **Using Python**:
   ```bash
   python3 -m http.server 8080
   # Opens at http://localhost:8080
   ```

## How to Use with Your Local AI Agent
Open `LOCAL_AGENT_PROMPT.md`, copy the prompt block, and paste it into your local coding agent so it can verify all files and calculations automatically.
