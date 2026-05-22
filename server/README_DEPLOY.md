# Deployment guide — EC2

This file lists step-by-step commands to deploy the server on an Ubuntu EC2 instance.

1) SSH into the instance (from your local machine):

```bash
ssh -i /path/to/key.pem ubuntu@<EC2_PUBLIC_IP>
```

2) (Optional) attach an IAM role to the instance with needed permissions (S3/SSM/SecretsManager). This avoids storing AWS keys on the instance.

3) Use the provided `deploy.sh` script to install runtime and start the app. On the instance:

```bash
# set your repo URL
export REPO_URL=https://github.com/yourname/yourrepo.git
bash server/deploy/deploy.sh
```

4) Create `.env` file on the instance at `/home/ubuntu/app/server/.env` with production variables (see `.env.example`). You can:
- Manually `nano /home/ubuntu/app/server/.env` and paste values, or
- Use `bootstrap_ssm.sh` if you store secrets in SSM:

```bash
export SSM_PREFIX=/travel-app/prod
bash server/deploy/bootstrap_ssm.sh
```

5) Configure nginx: copy `server/deploy/nginx_travel.conf` to `/etc/nginx/sites-available/travel`, enable and restart nginx:

```bash
sudo cp server/deploy/nginx_travel.conf /etc/nginx/sites-available/travel
sudo ln -s /etc/nginx/sites-available/travel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6) Check logs

```bash
pm2 logs travel-server --lines 200
```

7) (Optional) set up HTTPS with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain
```

Notes
- Prefer Mongo Atlas for production rather than running Mongo on the EC2 instance. Set `MONGO_URI` accordingly.
- Do not commit `.env` to source control.
- Use instance IAM role whenever possible. If you must use access keys, store them in SSM and use `bootstrap_ssm.sh`.
