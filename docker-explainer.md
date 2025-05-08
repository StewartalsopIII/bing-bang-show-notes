# Docker Deployment Guide for Bing Bang Show Notes

This guide covers building, pushing, and deploying the **Bing Bang Show Notes Generator** with Docker, then exposing it securely at
`https://shownotes.getcrazywisdom.com` through Nginx and Let's Encrypt.

---
## 1. Local Development & Multi-arch Build

Our production server runs **linux/amd64**, while local development is on Apple Silicon (ARM). Build a compatible image and push it to Docker Hub in one step:

```bash
# From inside the repo root
# Tag format: <DockerHub-username>/bing-bang-show-notes:latest

docker buildx build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_GEMINI_API_KEY="$NEXT_PUBLIC_GEMINI_API_KEY" \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_c2FmZS1zb2xlLTk2LmNsZXJrLmFjY291bnRzLmRldiQ" \
  -t stewartalsop/bing-bang-show-notes:latest \
  --push .
```

What this does:
1. Cross-compiles the image for linux/amd64.
2. Injects the **public** build-time env var `NEXT_PUBLIC_GEMINI_API_KEY` (required by Next.js during `npm run build`).
3. Tags the result `stewartalsop/bing-bang-show-notes:latest`.
4. Pushes the image directly to Docker Hub.

> 📝 If you prefer a non-public key at build time, pass a dummy and use a real key at runtime via `--env-file` (shown below).

---
## 2. DNS

1. Point an **A record** for `shownotes.getcrazywisdom.com` to your server's public IPv4 address.
2. Wait for propagation (usually a few minutes).

---
## 3. Server Setup

Assumptions:
• Ubuntu 22/24 server (`linux/amd64`) with Docker & Docker Compose installed.  
• User `newuser` (adjust as needed).  
• We will bind the container's port 3000 to host port **3005** (leaving 3000 free for other apps).

### 3.1 Connect & pull
```bash
ssh newuser@your-server-ip

# Pull the latest image
docker pull stewartalsop/bing-bang-show-notes:latest
```

### 3.2 Prepare runtime env
Create `shownotes.env` on the server (same directory where you run Docker):
```bash
# shownotes.env
NEXT_PUBLIC_GEMINI_API_KEY=your_real_gemini_api_key
```
> `NEXT_PUBLIC_...` is intentionally public; it is downloaded by the browser. **Do not put secrets here.**

### 3.3 Run / update container
```bash
# Stop & remove any existing container
docker stop bing-bang-show-notes || true
docker rm   bing-bang-show-notes || true

# Ensure port 3005 is free
sudo lsof -i :3005 || true

# Launch new container
docker run -d --name bing-bang-show-notes \
  -p 3005:3000 \
  --env-file shownotes.env \
  --restart unless-stopped \
  stewartalsop/bing-bang-show-notes:latest

# Follow logs
docker logs -f bing-bang-show-notes
```
Application should now respond at `http://67.205.163.48:3005`.

---
## 4. Reverse Proxy with Nginx + Certbot

### 4.1 Install Nginx & Certbot
```bash
sudo apt update && sudo apt install -y nginx python3-certbot-nginx
```

### 4.2 Create Nginx server block
```bash
sudo nano /etc/nginx/sites-available/shownotes
```
Paste:
```nginx
server {
  listen 80;
  server_name shownotes.getcrazywisdom.com;

  location / {
    proxy_pass http://127.0.0.1:3005;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```
Enable & test:
```bash
sudo ln -s /etc/nginx/sites-available/shownotes /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4.3 Obtain SSL certificate
```bash
sudo certbot --nginx -d shownotes.getcrazywisdom.com --non-interactive --agree-tos -m stewartalsopIII@gmail.com --redirect
```
Certbot will:
1. Provision a Let's Encrypt certificate.
2. Update the Nginx block to redirect HTTP→HTTPS.
3. Reload Nginx.

Now visit **https://shownotes.getcrazywisdom.com** 🎉

---
## 5. Updating the App
1. Re-run the buildx command locally (or rely on CI) to push a new `latest` image.
2. On the server:
   ```bash
   docker pull stewartalsop/bing-bang-show-notes:latest
   docker stop bing-bang-show-notes && docker rm bing-bang-show-notes
   # Run again as in section 3.3
   ```

---
## 6. Common Docker Commands
```bash
# View logs
docker logs -f bing-bang-show-notes

# List running containers
docker ps

# Enter a running container shell
docker exec -it bing-bang-show-notes /bin/sh

# Check container resource usage
docker stats bing-bang-show-notes
```

---
## 7. Troubleshooting

### "Address already in use" on port 3005
```bash
sudo lsof -i :3005
# or
sudo netstat -tulpn | grep 3005
```
Stop the offending process or change the host port mapping:
```bash
# Use host 3006 instead
-d -p 3006:3000 \
```

### Slow responses / 504 timeouts
1. Increase `NEXT_PUBLIC_GEMINI_API_KEY` quota or retry later.
2. Add diagnostic `console.log`s in `src/lib/geminiService.ts`, rebuild, redeploy, and watch logs.

---
Happy shipping! 🚀 