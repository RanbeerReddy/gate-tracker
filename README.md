# 🎓 GATE Tracker

> **A production-grade, local-first standalone desktop operating system for GATE CSE preparation.**

[![Electron](https://img.shields.io/badge/Electron-31.7.0-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white)](https://microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 Overview

**GATE Tracker** is a dedicated, standalone Windows desktop application designed to track and optimize your entire GATE CSE preparation lifecycle. It eliminates distractions, replaces fragile spreadsheets, and gives you a unified workspace for study timing, syllabus tracking, question accuracy analysis, spaced repetition revision, mistake reflection, and mock test tracking.

All data is stored **100% locally** on your machine using an embedded SQLite database in WAL (Write-Ahead Logging) mode. No cloud dependencies, no tracking, and no external servers.

---

## ✨ Key Features

### ⏱️ 1. Precision Study Timer & Crash Recovery
- **Activity-Specific Tracking**: Categorize sessions by `Learning`, `Revision`, `PYQs`, `Practice`, `Mock Test`, `Analysis`, `Notes`, or `Doubt Solving`.
- **Granular Hierarchy**: Link sessions directly to Subject → Topic → Subtopic.
- **Abrupt Close & Crash Recovery**: Continuous background state persistence (`active_session` table) restores active timers even if your system restarts or the app closes unexpectedly.
- **Focus Rating & Reflection**: Post-session dialog captures questions solved, focus quality rating (1–5), and custom notes.
- **Persistent Floating Timer Bar**: Stays accessible across all navigation views while studying.

### 📚 2. Complete Pre-seeded GATE CSE Syllabus
Pre-configured with all **13 official GATE CSE subjects** and their comprehensive topic/subtopic hierarchies:
1. **Engineering Mathematics** (Linear Algebra, Calculus, Probability & Statistics)
2. **Discrete Mathematics** (Set Theory, Combinatorics, Graph Theory, Mathematical Logic)
3. **Digital Logic** (Boolean Algebra, Combinational & Sequential Circuits, Number Representations)
4. **Computer Organization & Architecture** (Machine Instructions, ALU, CPU Control Design, Memory Hierarchy, I/O Interface, Pipelining)
5. **Programming & Data Structures** (C Programming, Recursion, Arrays, Stacks, Queues, Linked Lists, Trees, Graphs, Hashing)
6. **Algorithms** (Asymptotic Analysis, Divide & Conquer, Greedy, Dynamic Programming, Graph Algorithms)
7. **Theory of Computation** (Regular Languages, Context-Free Languages, Turing Machines, Decidability)
8. **Compiler Design** (Lexical Analysis, Parsing, Syntax Directed Translation, Intermediate Code, Code Optimization)
9. **Operating Systems** (Processes, Threads, CPU Scheduling, Synchronization, Deadlocks, Memory Management, File Systems)
10. **Databases** (ER Model, Relational Model, SQL, Normalization, Transactions & Concurrency)
11. **Computer Networks** (OSI/TCP-IP Layers, Flow & Error Control, Routing Algorithms, IP Addressing, TCP/UDP, Application Protocols)
12. **General Aptitude** (Verbal Ability, Quantitative Aptitude, Analytical Aptitude, Spatial Aptitude)
13. **Subject-wise Mock Tests**

### 🔄 3. Spaced Repetition Revision Engine
- **Algorithmic Scheduling**: Implements customizable spaced repetition intervals (`1, 3, 7, 14, 30` days).
- **Performance-Adjusted Rescheduling**: Low performance ratings automatically schedule closer revision intervals for immediate reinforcement.
- **Due Now Queue**: One-click quick-rating interface (`1⭐` to `5⭐`) for high-velocity daily revision workflows.

### ❌ 4. Structured Mistake Notebook
- **Mistake Taxonomy**: Categorize errors into `Conceptual Misunderstanding`, `Calculation Error`, `Misread Question`, `Silly Mistake`, `Forgot Concept`, `Forgot Formula`, `Time Pressure`, `Wrong Approach`, or `Lack of Practice`.
- **Reflective Resolution**: Prompts you for *"What went wrong"*, *"Correction"*, and *"What to notice next time"*.
- **Unresolved Tracking**: Filter mistakes by subject, category, and resolution status.

### 📝 5. Previous Year Questions (PYQ) & Question Logger
- **Comprehensive Question Logging**: Track subject, topic, year, difficulty (`Easy`, `Medium`, `Hard`), question type (`MCQ`, `MSQ`, `NAT`), and result.
- **PYQ Filtering**: Drill down into past year questions by year (e.g., 2024, 2023, 2022...), subject, and accuracy.
- **Accuracy Benchmarking**: Color-coded accuracy meters highlight mastery vs. weak areas.

### 📋 6. Mock Test Scorecard Manager
- Detailed scorecard tracking: Total Marks, Score, Attempted, Correct, Wrong, Unattempted, and Negative Marks deduction.
- Accuracy calculation and time-tracking per test.

### 📅 7. Daily Study Planner & 🎯 Multi-Tier Goals
- **Time-Blocked Planner**: Plan your daily study blocks with start/end times and track real-time completion.
- **Tiered Goals**: Set daily, weekly, monthly, and phase-level targets for study hours and question volumes with auto-calculated progress bars.

### 📈 8. Advanced Visual Analytics & 365-Day Activity Heatmap
- **Interactive Recharts**: Daily study hours bar chart, subject distribution pie chart, and daily question accuracy line graphs.
- **Contribution Calendar Heatmap**: Year-round GitHub-style heatmap tracking consistency, active days, and study streaks.
- **Weak Areas Detector**: Automatically identifies topics with `<65%` accuracy or unresolved mistakes.
- **Recommendation Engine**: Dynamic suggestions for overdue revisions and neglected subjects.

### 💾 9. Backup, Data Export & Privacy
- One-click SQLite database backup and restore.
- Full data export and import in standard **JSON** and **CSV** formats.
- Complete offline operation—zero telemetry or external network calls.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Desktop Shell** | Electron 31 | Native Windows windowing, lifecycle, and packaging |
| **Frontend Framework** | React 18 + TypeScript | Component-driven, strictly typed UI |
| **Routing** | React Router (HashRouter) | Safe desktop routing compatible with `file://` protocol |
| **Styling** | Custom Vanilla CSS Tokens | Sleek dark & light modes, smooth animations, zero bloat |
| **Charts & Visuals** | Recharts | Interactive SVG bar, pie, and trend graphs |
| **Database** | SQLite 3 via `better-sqlite3` | Local high-performance relational storage in WAL mode |
| **Build & Bundling** | Vite 5 + esbuild | Ultra-fast HMR and optimized production bundles |
| **Installer** | electron-builder (NSIS) | Desktop installer and portable single `.exe` packages |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or later (v20+ recommended)
- **npm**: v9 or later
- **Operating System**: Windows 10 / 11 (x64)

### Clone & Install
```bash
git clone https://github.com/RanbeerReddy/gate-tracker.git
cd gate-tracker
npm install
```

### Run in Development Mode
```bash
npm run dev
```
*Starts the Vite dev server and launches Electron with live hot-module reloading.*

### Build Production Application
```bash
npm run build
```

### Package Windows Installer (`.exe`)
```bash
npm run package
```
*Outputs the following standalone Windows binaries into the `release/` folder:*
- `release/GATE Tracker Setup 1.0.0.exe` — Full Windows NSIS installer (with Start Menu & Desktop shortcuts)
- `release/GATE Tracker 1.0.0.exe` — Single portable executable (run anywhere without installation)

---

## 📁 Local Data Location

All user databases, active sessions, and rotating logs are stored locally in the standard Windows application data directory:
```text
%APPDATA%\gate-tracker\
├── gate_tracker.db          # Main SQLite database (WAL mode)
├── backups\                 # Automated & manual database backups
└── logs\                    # Daily rotating application logs
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
