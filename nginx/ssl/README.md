# SSL Certificates Directory

This directory should contain your SSL certificates for production:

## Required Files
- `fullchain.pem` - Full certificate chain
- `privkey.pem` - Private key

## Getting Certificates

### Option 1: Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy to this directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./
```

### Option 2: Self-Signed (Development Only)
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem -out fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## Security Notes
- Never commit real certificates to version control
- Use proper file permissions (chmod 600)
- Set up auto-renewal for Let's Encrypt
