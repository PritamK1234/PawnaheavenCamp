# Referral Dashboard PWA - Nginx Configuration

Add the following server blocks to your Nginx config on the VPS (typically at `/etc/nginx/sites-available/pawnahavencamp`).

## 1. Build the Referral PWA

On the VPS, in the project directory:

```bash
npm run build:referral
```

This outputs the built files to `dist/referral/`.

## 2. Nginx Server Block

Add this block alongside your existing public/owner/admin blocks:

```nginx
# =========================
# REFERRAL DASHBOARD (.shop subdomain or separate domain)
# =========================
server {
    server_name referraldashboard.shop www.referraldashboard.shop;

    root /var/www/pawnahavencamp/dist/referral;
    index index.html;

    client_max_body_size 50M;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/pawnahavencamp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pawnahavencamp.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

## 3. Update the HTTP → HTTPS Redirect Block

Add `referraldashboard.shop www.referraldashboard.shop` to the existing redirect block:

```nginx
# =========================
# HTTP → HTTPS REDIRECT
# =========================
server {
    listen 80;
    server_name
        pawnahavencamp.com www.pawnahavencamp.com
        pawnahavencamp.shop www.pawnahavencamp.shop
        pawnahavencamp.cloud www.pawnahavencamp.cloud
        referraldashboard.shop www.referraldashboard.shop;

    return 301 https://$host$request_uri;
}
```

## 4. SSL Certificate for the New Domain

If `referraldashboard.shop` is a completely separate domain (not a subdomain of pawnahavencamp.com), you'll need its own SSL certificate:

```bash
sudo certbot --nginx -d referraldashboard.shop -d www.referraldashboard.shop
```

Then update the `ssl_certificate` paths in the server block to use the new cert:

```nginx
ssl_certificate /etc/letsencrypt/live/referraldashboard.shop/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/referraldashboard.shop/privkey.pem;
```

## 5. Reload Nginx

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Summary

| App | Domain | Build Command | Dist Folder |
|-----|--------|---------------|-------------|
| Public | pawnahavencamp.com | `npm run build:public` | `dist/public/` |
| Owner | pawnahavencamp.shop | `npm run build:owner` | `dist/owner/` |
| Admin | pawnahavencamp.cloud | `npm run build:admin` | `dist/admin/` |
| **Referral** | **referraldashboard.shop** | **`npm run build:referral`** | **`dist/referral/`** |
