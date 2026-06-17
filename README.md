# BigQuery Release Pulse

A premium, modern dashboard built with **Python Flask** and **Vanilla Web Technologies** that parses the official Google Cloud BigQuery RSS/Atom release notes feed, breaks down update points, and enables seamless sharing of individual updates to X/Twitter.

---

## Features

*   **Live XML Feed Parsing**: Automatically fetches, reads, and formats the BigQuery release stream from the official feed.
*   **Granular Update Extraction**: Splits composite daily release notes into individual categorized entries (`Feature`, `Announcement`, `Deprecation`, `Fix`, `General`) for targeted review.
*   **In-Memory Caching**: Implements a 1-hour cache layer to reduce server load and enhance performance, with force-refresh options.
*   **Fault-Tolerant Fallback**: Serves cached data with warning indicators if the remote server is down.
*   **Advanced UI Filters**: Instant keyword search and checkbox category toggling on the client-side.
*   **Interactive X / Twitter Composer**: Formats and packages selected updates to fit the 280-character limit, complete with a visual X Post mockup preview and one-click clipboard copying.

---

## Directory Structure

```text
bq-releases-notes/
├── app.py                  # Flask web server, XML parser, and API cache logic
├── templates/
│   └── index.html          # Semantic HTML layout and custom vector SVG icons
├── static/
│   ├── css/
│   │   └── style.css       # Premium HSL dark theme, glassmorphic layout, and shimmer keyframes
│   └── js/
│       └── app.js          # Client-side state controller, filters, and sharing scripts
├── .gitignore              # Configured build, environment, and system exclusions
└── README.md               # Project documentation
```

---

## Installation & Setup

Ensure you have **Python 3** installed on your system.

### 1. Clone the project files
Navigate to your working directory:
```bash
cd bq-releases-notes
```

### 2. Install dependencies
Install Flask inside your environment:
```bash
pip install flask
```

### 3. Launch the Server
Execute the application script:
```bash
python app.py
```
*(Or use `py app.py` on Windows systems).*

The application will start in debug mode on **`http://127.0.0.1:5000`**.

---

## Architecture Flow

The system coordinates the client browser, local Flask server, and the remote Google feed:

1.  **Browser Setup**: On page load, `app.js` issues a request to the Flask server's `/api/notes` route.
2.  **Server Parsing**: `app.py` pulls the XML feed, utilizes `ElementTree` to parse namespaced elements, and employs regular expressions to partition articles by `<h3>` headings.
3.  **UI Render**: The frontend hides the shimmer skeleton loading states and populates date-grouped cards.
4.  **Composition & Share**: Clicking any card activates the composer sidebar. A sanitizing parser strips out formatting tags, compiles a formatted text buffer with truncated descriptions, and opens the X Web Intent window upon confirmation.

---

## Developer Operations

### Pushing changes to GitHub
To push changes to your repository (`KaggleAIBQ-event-talks-app`):
```bash
git add .
git commit -m "Update project files"
git push origin main
```
