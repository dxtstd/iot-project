# Lobster Farm Monitor

Dashboard monitoring tambak lobster dengan login JWT, histori sensor yang tersimpan di PouchDB, dan notifikasi Telegram untuk kondisi abnormal.

## Menjalankan aplikasi

Website menggunakan Nx workspace. Jalankan frontend dan backend sekaligus dari folder `website`:

```bash
cd website
npm install
npm run dev
```

Nx menjalankan API dan dashboard secara paralel. Jika hanya perlu satu aplikasi:

```bash
# API saja
npm run backend

# Dashboard saja
npm run frontend
```

Login menggunakan `AUTH_USERNAME` dan `AUTH_PASSWORD` dari environment backend.

API menggunakan `./data/lobster-farm-monitor` sebagai database PouchDB lokal. Salin konfigurasi berikut ke environment backend jika Telegram ingin diaktifkan:

```env
JWT_SECRET=replace-with-a-long-random-secret
AUTH_USERNAME=admin
AUTH_PASSWORD=replace-with-a-strong-password
TELEGRAM_BOT_TOKEN=your-bot-token
PORT=3000
SENSOR_MODE=dummy
```

Notifikasi harus diaktifkan dari panel pengaturan dashboard dan membutuhkan Telegram chat ID. Endpoint `POST /api/readings` menerima `temperature`, `turbidity`, dan `ph`; pembacaan abnormal akan mengirim alert ketika konfigurasi Telegram lengkap.

## Mode data sensor

Gunakan `SENSOR_MODE=dummy` untuk seed data demo. Untuk sensor nyata melalui MQTT, ubah environment menjadi:

```env
SENSOR_MODE=mqtt
MQTT_URL=mqtt://broker.example.com:1883
MQTT_TOPIC=lobster-farm/sensors
MQTT_USERNAME=
MQTT_PASSWORD=
```

Payload MQTT harus berupa JSON:

```json
{
  "temperature": 30.5,
  "turbidity": 12,
  "ph": 7.2,
  "timestamp": "2026-10-19T09:20:00.000Z"
}
```

Setiap payload valid disimpan ke PouchDB dan diproses oleh aturan notifikasi Telegram yang sama. `POST /api/readings` tetap tersedia untuk testing atau perangkat yang mengirim lewat HTTP.

## Menjalankan dengan Docker

Konfigurasi deployment berada di root repository. Salin `.env.example` menjadi `.env`, lalu pilih mode data:

```bash
docker compose up --build
```

Dashboard tersedia di `http://localhost:8080`. Nginx menyajikan frontend dan meneruskan `/api` ke backend. MQTT broker tersedia di port `1883`, dengan topic default `lobster-farm/sensors`.

Untuk menggunakan sensor nyata, ubah di `.env`:

```env
SENSOR_MODE=mqtt
MQTT_TOPIC=lobster-farm/sensors
```

PouchDB dan data Mosquitto disimpan di Docker volumes agar tidak hilang saat container dibuat ulang.