# Production Deployment Guide: Jobe Code Execution Server

This document details the complete step-by-step procedure for deploying and securing the official **Jobe Code Execution Server** (`trampgeek/jobe`) on a separate Virtual Private Server (VPS / Cloud VM) for use with the EduNexus Enterprise LMS.

---

## 1. System Architecture

```text
┌─────────────────────────┐
│     Next.js LMS         │
│     (Vercel / Cloud)    │
└────────────┬────────────┘
             │
             │ HTTPS Request
             ▼
┌─────────────────────────┐
│     LMS Backend API     │
│   (/api/code/run)       │
│   (/api/code/submit)    │
└────────────┬────────────┘
             │
             │ HTTPS (X-API-KEY header)
             ▼
┌─────────────────────────┐
│      Jobe Server        │
│    (Ubuntu VPS / VM)    │
│                         │
│  • Apache / PHP         │
│  • Sandboxed Execution  │
│  • Cgroups & rlimits    │
└─────────────────────────┘
```

> [!IMPORTANT]
> **Security Rule**: The student browser **never** communicates directly with the Jobe server. All code execution requests must flow through the LMS backend where authentication, rate-limiting, and payload sanitization occur.

---

## 2. Server System Requirements

- **Operating System**: Ubuntu 22.04 LTS / 24.04 LTS recommended.
- **CPU**: 2+ Cores (Dedicated CPU recommended for concurrent compilation).
- **RAM**: Minimum 2 GB (4 GB recommended for Java compilation).
- **Disk**: 20 GB SSD.
- **Network**: Static public IPv4 address with custom domain/subdomain e.g. `jobe.yourdomain.com`.

---

## 3. Option A: Native Server Installation (Recommended for Production)

### Step 1: Update System & Install Dependencies

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y \
  apache2 \
  php \
  libapache2-mod-php \
  php-cli \
  php-mbstring \
  php-json \
  php-curl \
  build-essential \
  gcc \
  g++ \
  default-jdk \
  python3 \
  python3-pip \
  git \
  acl \
  cgroup-tools
```

### Step 2: Enable Apache Modules

```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

### Step 3: Clone Jobe Server Repository

```bash
cd /var/www/html
sudo git clone https://github.com/trampgeek/jobe.git jobe
cd /var/www/html/jobe
```

### Step 4: Run the Official Jobe Setup Script

```bash
sudo ./cli/install
```

The installer will:
1. Create the restricted unprivileged user account (`jobe`).
2. Configure Apache Alias and directory permissions.
3. Set up cgroups and rlimits sandbox constraints.

### Step 5: Verify Jobe Installation

Test local REST API execution via curl:

```bash
curl -i http://localhost/jobe/index.php/restapi/languages
```

Expected response (`200 OK` with JSON array of supported languages):

```json
[["c","11.4.0"],["cpp","11.4.0"],["java","17.0.10"],["nodejs","18.19.1"],["python3","3.10.12"]]
```

---

## 4. Option B: Docker Deployment (`jobeinabox`)

For containerized environments, you can run the official `jobeinabox` image.

```bash
docker run -d \
  --name jobe \
  -p 80:80 \
  --restart always \
  --privileged \
  trampgeek/jobeinabox:latest
```

> [!NOTE]
> Jobe requires `--privileged` mode under Docker to set up cgroups and container sandboxes correctly.

---

## 5. Security & API Key Hardening

To restrict Jobe usage so only your LMS backend can execute code, set up an API Key.

### Step 1: Generate a Strong Secret API Key

```bash
openssl rand -hex 32
# Example output: a7f8e912c3d4e5f67890123456789abcdef0123456789abcdef0123456789abc
```

### Step 2: Configure Jobe API Key in Server Config

Edit `/var/www/html/jobe/application/config/config.php` (or Jobe environment configuration):

```php
$config['jobe_api_keys'] = array(
    'a7f8e912c3d4e5f67890123456789abcdef0123456789abcdef0123456789abc' => 'EduNexus LMS Backend'
);
```

Restart Apache:

```bash
sudo systemctl restart apache2
```

---

## 6. HTTPS & Domain Setup (Nginx Reverse Proxy + Let's Encrypt)

If using Nginx as an SSL terminator in front of Apache:

### Nginx Virtual Host Configuration (`/etc/nginx/sites-available/jobe.conf`)

```nginx
server {
    server_name jobe.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for code execution
        proxy_connect_timeout 15s;
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
    }
}
```

### Enable HTTPS with Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d jobe.yourdomain.com
```

---

## 7. Firewall Rules (UFW)

Only allow incoming HTTP/HTTPS connections from your LMS Backend IP address:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp

# Restrict port 443 to LMS Backend Server IP
sudo ufw allow from <YOUR_LMS_BACKEND_IP> to any port 443 proto tcp

sudo ufw enable
```

---

## 8. LMS Environment Configuration

Configure the LMS backend environment variables in `.env.local` or Vercel / Cloud platform settings.

### Development Environment (`.env.local`)

```env
JOBE_URL=http://localhost/jobe/index.php/restapi
JOBE_API_KEY=
JOBE_TIMEOUT=10000
JOBE_DEFAULT_TIME_LIMIT=5
JOBE_DEFAULT_MEMORY_LIMIT=256
```

### Production Environment (`.env.production` / Vercel Environment)

```env
JOBE_URL=https://jobe.yourdomain.com/jobe/index.php/restapi
JOBE_API_KEY=a7f8e912c3d4e5f67890123456789abcdef0123456789abcdef0123456789abc
JOBE_TIMEOUT=10000
JOBE_DEFAULT_TIME_LIMIT=5
JOBE_DEFAULT_MEMORY_LIMIT=256
```

---

## 9. Health Check Verification

Test the health check endpoint from your LMS backend:

```bash
curl http://localhost:3000/api/code/health
```

Expected Output:

```json
{
  "service": "Jobe Code Execution Engine",
  "status": "healthy",
  "jobe_url": "http://localhost/jobe/index.php/restapi",
  "latency_ms": 42,
  "supported_languages_count": 5,
  "timestamp": "2026-08-09T19:40:00.000Z"
}
```

---

## 10. Troubleshooting Guide

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **`503 Jobe Engine Unavailable`** | Apache server is down or `JOBE_URL` incorrect. | Run `sudo systemctl status apache2` on Jobe server. Check `JOBE_URL` in `.env.local`. |
| **`403 Forbidden`** | API key missing or invalid in `X-API-KEY` header. | Verify `JOBE_API_KEY` matches config in Jobe `$config['jobe_api_keys']`. |
| **`Time Limit Exceeded (Outcome 13)`** | Student code contains an infinite loop. | Expected behavior. Default limit is 5 seconds. |
| **`Compilation Error (Outcome 11)`** | Syntax error in student solution. | Inspect `cmpinfo` output returned in response payload. |
| **`Server Overload (Outcome 21)`** | Too many simultaneous code compilation jobs. | Scale Jobe VPS RAM/CPU or add load balancing across multiple Jobe instances. |

---

## 11. Production Security Checklist

- [x] Jobe server is hosted on a separate VM/VPS from the main LMS application.
- [x] Student browser **never** calls Jobe URL directly.
- [x] All communication between LMS Backend and Jobe uses HTTPS in production.
- [x] `JOBE_API_KEY` is configured and required for all Jobe REST API requests.
- [x] Source code size is limited to 64 KB per request.
- [x] Stdin input size is limited to 32 KB per request.
- [x] CPU execution time limit is capped (default 5 seconds).
- [x] Memory consumption limit is enforced via cgroups (default 256 MB).
- [x] Hidden test case inputs and expected outputs are never returned to the student browser.
- [x] Jobe server firewall (UFW) restricts traffic to LMS Backend IP address.
