# 🚀 VPS Deployment Guide — Riders Net Profit Watch API

Step-by-step guide to deploy the backend on an Ubuntu VPS using GitHub.

---

## Prerequisites

- A VPS with Ubuntu (root or sudo access)
- VPS IP address
- SSH client (PowerShell, PuTTY, or Windows Terminal)
- A GitHub account
- (Optional) A domain name pointed to your VPS IP

---

## Part A — Push Code to GitHub (on your local machine)

### Step 1 — Initialize Git & Push

Open **PowerShell** on your Windows machine:

```powershell
cd "E:\Riders Net Profit Watch App\backend"

git init
git add .
git commit -m "Initial commit - Riders Net Profit Watch backend"
```

Then go to **https://github.com/new**, create a new repository (e.g. `riders-backend`), and push:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/riders-backend.git
git branch -M main
git push -u origin main
```

> [!IMPORTANT]
> The `.gitignore` already excluded `.env`, `.env.production`, database files, and `node_modules`.
> You'll create the env file directly on the VPS.

---

## Part B — Set Up the VPS (via SSH)

### Step 2 — Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
```

---

### Step 3 — Install Node.js 20

```bash
sudo apt update && sudo apt upgrade -y

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # Should show v20.x.x
npm -v    # Should show 10.x.x
```

---

### Step 4 — Install Nginx, PM2 & Build Tools

```bash
sudo apt install -y nginx build-essential python3
sudo npm install -g pm2
```

---

### Step 5 — Clone the Repo

```bash
sudo mkdir -p /var/www
sudo mkdir -p /var/log/riders-api
sudo chown -R $USER:$USER /var/www /var/log/riders-api

cd /var/www
git clone https://github.com/YOUR_USERNAME/riders-backend.git
```

---

### Step 6 — Install Dependencies

```bash
cd /var/www/riders-backend
npm install --production
```

---

### Step 7 — Create Environment File

```bash
cat > /var/www/riders-backend/.env.production << 'EOF'
NODE_ENV=production
PORT=3000
DB_PATH=./db/riders.db
EOF
```

The database directory and file will be auto-created on first run.

> [!TIP]
> **To copy your existing database** (keep your data), run on your **local Windows machine**:
>
> ```powershell
> scp "E:\Riders Net Profit Watch App\backend\db\riders.db" root@YOUR_VPS_IP:/var/www/riders-backend/db/
> ```

---

### Step 8 — Start with PM2

```bash
cd /var/www/riders-backend

# Start the app
NODE_ENV=production pm2 start ecosystem.config.js

# Verify it's running
pm2 status
pm2 logs riders-api --lines 20

# Enable auto-start on server reboot
pm2 startup
pm2 save
```

---

### Step 9 — Configure Nginx

```bash
# Copy the nginx config
sudo cp /var/www/riders-backend/nginx.conf /etc/nginx/sites-available/riders-api

# Edit it — replace YOUR_DOMAIN_OR_IP with your actual VPS IP or domain
sudo nano /etc/nginx/sites-available/riders-api
#methanin nawattuwe
# Enable the site
sudo ln -s /etc/nginx/sites-available/riders-api /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test & reload
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 10 — Open Firewall

```bash
    sudo ufw allow 'Nginx Full'
    sudo ufw allow OpenSSH
    sudo ufw enable
    sudo ufw status
```

---

### Step 11 — Test It! ✅

From your **local machine**, open a browser or run:

```powershell
curl http://YOUR_VPS_IP/api/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "2026-02-20T08:30:00.000Z" }
```

---

## Part C — Update the Flutter App

### Step 12 — Point App to VPS

In `riders_app/lib/services/api_service.dart`:

1. Change `_vpsBaseUrl` to your VPS IP:

   ```dart
   static const String _vpsBaseUrl = 'http://YOUR_VPS_IP/api';
   ```

2. Set `useVps` to `true`:

   ```dart
   static const bool useVps = true;
   ```

3. Rebuild the APK:
   ```powershell
   cd "E:\Riders Net Profit Watch App\riders_app"
   flutter build apk --release
   ```

---

## (Optional) Enable HTTPS with Let's Encrypt

> [!IMPORTANT]
> You need a **domain name** pointed to your VPS IP for this step.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
sudo certbot renew --dry-run
```

Then update `_vpsBaseUrl` to `'https://yourdomain.com/api'`.

---

## Updating Code (future changes)

When you make changes locally and push to GitHub:

**On your local machine:**

```powershell
cd "E:\Riders Net Profit Watch App\backend"
git add .
git commit -m "your changes"
git push
```

**On your VPS:**

```bash
cd /var/www/riders-backend
git pull
npm install --production   # only if dependencies changed
pm2 restart riders-api
```

---

## Common Commands Reference

| Action             | Command                                  |
| ------------------ | ---------------------------------------- |
| View app status    | `pm2 status`                             |
| View live logs     | `pm2 logs riders-api`                    |
| Restart app        | `pm2 restart riders-api`                 |
| Stop app           | `pm2 stop riders-api`                    |
| Pull latest code   | `cd /var/www/riders-backend && git pull` |
| Reload Nginx       | `sudo systemctl reload nginx`            |
| Check Nginx config | `sudo nginx -t`                          |
| Check firewall     | `sudo ufw status`                        |
| View error logs    | `cat /var/log/riders-api/error.log`      |

---

## Troubleshooting

### App won't start

```bash
cd /var/www/riders-backend
node server.js  # Run directly to see errors
```

### Can't connect from phone

- Ensure firewall allows port 80: `sudo ufw status`
- Ensure Nginx is running: `sudo systemctl status nginx`
- Ensure PM2 app is running: `pm2 status`
- Check the URL in `api_service.dart` matches your VPS IP

### Database issues

- Ensure `/var/www/riders-backend/db/` directory exists
- Ensure the app has write permissions: `sudo chown -R $USER:$USER /var/www/riders-backend`

### better-sqlite3 build errors

```bash
sudo apt install -y build-essential python3
cd /var/www/riders-backend
npm rebuild better-sqlite3
```

### Git clone requires authentication

If your repo is private, use a personal access token:

```bash
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/riders-backend.git
```

Or set up SSH keys on the VPS:

```bash
ssh-keygen -t ed25519
cat ~/.ssh/id_ed25519.pub
# Add this key to GitHub → Settings → SSH keys
git clone git@github.com:YOUR_USERNAME/riders-backend.git
```
