# Deployment dengan Database External (localhost)

Panduan ini untuk deployment di mana PostgreSQL sudah terinstall di VPS dan ingin Docker container connect ke database tersebut (bukan containerized DB).

## Konfigurasi PostgreSQL di Host

### 1. Edit postgresql.conf

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
# atau lokasi sesuai OS Anda
```

Cari baris `listen_addresses` dan ubah menjadi:

```conf
listen_addresses = '*'
```

### 2. Edit pg_hba.conf

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Tambahkan baris di bagian akhir untuk mengizinkan koneksi dari Docker network:

```conf
# Docker network (172.x.x.x)
host    all             all             172.0.0.0/8             scram-sha-256

# Atau spesifik subnet Docker Anda
host    all             all             172.17.0.0/16           scram-sha-256
```

### 3. Restart PostgreSQL

```bash
sudo systemctl restart postgresql
# atau
sudo service postgresql restart
```

### 4. Cek Firewall

```bash
# Cek apakah port 5432 terbuka
sudo ufw allow 5432/tcp
# atau
sudo firewall-cmd --add-port=5432/tcp --permanent
sudo firewall-cmd --reload
```

## Deployment

### 1. Setup Environment Variables

Buat file `.env`:

```env
APP_NAME=Emwal
APP_ENV=production
APP_KEY=base64:xxxxxxxxxxxxxxxx
APP_DEBUG=false
APP_URL=http://your-domain.com

# Database external (localhost/host)
DB_CONNECTION=pgsql
DB_HOST=host.docker.internal  # atau IP VPS Anda, atau 172.17.0.1
DB_PORT=5432
DB_DATABASE=akuntansi
DB_USERNAME=postgres
DB_PASSWORD=your_db_password

# Session & Cache (bisa juga external DB, atau Redis jika ada)
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

**Pilihan DB_HOST:**
- `host.docker.internal` - untuk Docker Desktop (Mac/Windows) atau Docker Linux baru
- `172.17.0.1` - IP default docker0 bridge di Linux
- `your.vps.ip.address` - IP publik VPS (jika PostgreSQL listen di semua interface)

### 2. Jalankan dengan docker-compose

```bash
# Build dan jalankan
docker compose -f docker-compose.external-db.yml up -d --build

# Cek logs
docker compose -f docker-compose.external-db.yml logs -f app
```

### 3. Verifikasi Koneksi

```bash
# Test koneksi dari container
docker compose -f docker-compose.external-db.yml exec app php artisan db:show

# Atau masuk container dan test
docker compose -f docker-compose.external-db.yml exec app sh
# lalu: pg_isready -h ${DB_HOST} -p ${DB_PORT}
```

## Troubleshooting

### Connection refused

1. **Cek PostgreSQL listen addresses:**
   ```bash
   sudo netstat -tlnp | grep 5432
   # atau
   sudo ss -tlnp | grep 5432
   ```
   Harus tampil `0.0.0.0:5432` atau `:::5432`, bukan `127.0.0.1:5432` saja.

2. **Cek pg_hba.conf:**
   Pastikan ada rule untuk Docker subnet.

3. **Cek dari container:**
   ```bash
   docker run --rm postgres:16-alpine pg_isready -h host.docker.internal -p 5432
   ```

### Linux: host.docker.internal tidak resolve

Jika menggunakan Linux dan `host.docker.internal` tidak bekerja:

**Opsi 1:** Gunakan IP docker0
```bash
ip addr show docker0
# Cari inet, biasanya 172.17.0.1
```

Set di `.env`:
```env
DB_HOST=172.17.0.1
```

**Opsi 2:** Gunakan network_mode host (tidak bisa port mapping)
Edit `docker-compose.external-db.yml`:
```yaml
services:
  app:
    network_mode: host
    # Hapus bagian ports dan networks
```

### Permission denied

Pastikan user PostgreSQL ada dan password benar:

```bash
sudo -u postgres psql -c "\du"

# Buat user jika belum ada
sudo -u postgres createuser -P your_username
sudo -u postgres createdb -O your_username akuntansi
```

## Maintenance

```bash
# Restart services
docker compose -f docker-compose.external-db.yml restart

# Update aplikasi
git pull
docker compose -f docker-compose.external-db.yml up -d --build

# Backup database dari host
docker exec -it akuntansi-app pg_dump -h ${DB_HOST} -U ${DB_USERNAME} ${DB_DATABASE} > backup.sql
```

## Keamanan

1. **Jangan expose port 5432 ke publik** - hanya bind ke localhost atau Docker network
2. **Gunakan password kuat** untuk database user
3. **SSL/TLS** - untuk production, enable SSL di PostgreSQL dan Laravel
4. **Firewall** - pastikan hanya port 80/443 dan SSH yang terbuka ke publik

Contoh iptables untuk block 5432 dari luar:
```bash
sudo iptables -A INPUT -p tcp --dport 5432 -s 172.17.0.0/16 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5432 -j DROP
```
