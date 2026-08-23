# Trikaar HMS — Developer & Agent Handover Document

This document summarizes the current status, production details, security configurations, and recent bug fixes for the **Trikaar HMS (Spring Boot + React)** application to get other developers or AI agents up to speed instantly.

---

## 🌐 Production Environment Details

* **VPS IP Address:** `72.61.242.209` (user: `root`)
* **Domain Name:** `https://hms.trikaar.tech`
* **Port Mappings:**
  * **Traefik SSL/TLS:** Ports `80` (HTTP) & `443` (HTTPS) are exposed. Traefik automatically routes and manages Let's Encrypt certificates.
  * **Frontend App:** Mapped internally to port `8085` on the host, routed through Traefik.
  * **Backend API:** Mapped internally to port `8080` on the host.
  * **MySQL Database:** Running on internal port `3306`. **Public port exposure (3307/3306) has been completely removed** for security. The database is only accessible inside the secure Docker network.

---

## 🔑 Database Credentials & Security

* **MySQL Database Name:** `trikaar_emr`
* **MySQL Username:** `root`
* **MySQL Password:** `Tr1kaar@DB#2026` *(Updated from the default "root" password inside the container for both remote `%` and local `localhost` access)*

---

## 💾 Daily Automated Database Backups

* **Backup Script on VPS:** `/root/backup_db.sh`
* **Backup Destination on VPS:** `/root/backups/`
* **Execution Cron:** Configured in `crontab` to run daily at **2:00 AM** (`0 2 * * * /root/backup_db.sh`).
* **Retention Policy:** Automatically compresses (`gzip`) the database dump files and deletes backups older than **7 days** to preserve server disk space.

---

## 🛠️ Recent Bug Fixes & Improvements

### 1. Prescription Templates Disappearing Bug (EMR)
* **File:** `frontend-modern/src/pages/doctor/PrescriptionManagement.jsx`
* **The Issue:** A React `useEffect` auto-save hook caused race conditions during page mount/load. If the network was slow or returned no results initially, it would automatically overwrite the custom doctor templates in the database with the hardcoded default templates.
* **The Fix:** Removed the auto-save `useEffect` entirely. Implemented explicit DB saves (`saveTemplatesToDb`) called directly from template modification handlers (`saveTemplate`, `deleteTemplate`, and `saveCurrentAsTemplate`). Templates now persist perfectly across logout and login.

### 2. Sidebar "Sign Out" Button Layout Overlap
* **File:** `frontend-modern/src/layouts/DashboardLayout.jsx`
* **The Issue:** On mobile layouts, the fixed bottom navigation bar (`z-40`) was overlaying on top of the slide-out menu sidebar (`z-30`). This blocked or hid the **Sign Out** button at the bottom of the sidebar.
* **The Fix:** Adjusted the sidebar z-indexes: backdrop overlay is now `z-[45]` and the sidebar container is `z-[49]`. The sidebar now opens cleanly on top of the bottom navigation bar.

### 3. AI Chatbot Bubble & Overlay Overlaps
* **File:** `frontend-modern/src/components/AICopilotPanel.jsx`
* **The Issue:** The floating chatbot bubble button remained visible on top of the text input and send button of the open chatbot panel. Also, the panel would stay open on top of the screen if a user clicked bottom nav tabs.
* **The Fix:** Wrapped the floating bubble button in `{!isOpen && ...}` to hide it when the panel is open. Added `useLocation` from `react-router-dom` to automatically close the chatbot panel when the route path changes.

---

## 🚀 Deployment & CI/CD Commands

### 1. Manual Sync & Rebuild (From Local Mac)
To manually synchronize changes and rebuild/restart the application containers on the VPS:

```bash
# 1. Sync local code to the VPS (excluding build artifacts and dependencies)
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'target' --exclude '.idea' --exclude '.gradle' --exclude 'build' ./ root@72.61.242.209:/opt/hms-springboot/

# 2. Connect via SSH and rebuild all containers (Vite production assets & Maven build)
ssh root@72.61.242.209 "cd /opt/hms-springboot && docker compose down && docker compose up --build -d"

# Or to rebuild ONLY the frontend container (extremely fast):
ssh root@72.61.242.209 "cd /opt/hms-springboot && docker compose up --build -d frontend"
```

### 2. GitHub Actions CI/CD Pipeline
* **Workflow Config:** `.github/workflows/deploy.yml` (configured to trigger automatically on push to the `main` branch).
* **Setup Required:** Add the local Mac's SSH private key (`~/.ssh/id_ed25519` or `~/.ssh/id_rsa`) to your GitHub repository under **Settings > Secrets and variables > Actions** as a new Repository Secret named `VPS_SSH_KEY`.
