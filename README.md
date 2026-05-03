# Online Clipboard - Zero-Knowledge Encrypted

A high-performance, real-time clipboard application with **extreme privacy** and **developer-centric utility**. Share text, images, and files securely with end-to-end encryption.

![Online Clipboard](public/screenshot-wide.png)

## Features

### 🔐 Zero-Knowledge Encryption
- **AES-GCM client-side encryption** - Your data is encrypted in the browser before transmission
- **Decryption key in URL fragment** - The server never sees the raw data or decryption key
- **PBKDF2 key derivation** - 100,000 iterations for secure key generation

### 📱 Magic Link & QR Code Combo
- **6-digit code** - Easy to remember and share
- **Magic link with embedded key** - Click and decrypt automatically
- **QR code generation** - Instant mobile-to-desktop handoff

### ⏱️ Ephemeral Self-Destruct Modes
- **1 View** - Auto-deletes after first access
- **10 Minutes** - Short-lived sharing
- **1 Hour / 24 Hours** - Extended sharing options

### 🛠️ Developer Toolbox Sidebar
- **JSON Formatter** - Pretty-print and minify JSON
- **Base64 Toggle** - Encode/decode Base64
- **Markdown Preview** - Live markdown rendering

### 📲 PWA Support
- **Install on mobile** - Native-like sharing experience
- **Offline capability** - Core functionality works offline
- **App-like interface** - Standalone mode support

## Architecture

### Security Model
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│  Encrypted   │────▶│    Redis    │
│  (Encrypt)  │     │    Blob      │     │  (Storage)  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                              │
       │         Decryption Key (URL #fragment)       │
       └──────────────────────────────────────────────┘
```

The decryption key is stored in the URL fragment (`#...`) which is **never sent to the server**. This ensures true zero-knowledge architecture.

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes (Edge Runtime)
- **Storage**: Redis (Upstash) with native TTL
- **Encryption**: Web Crypto API (AES-256-GCM)
- **Icons**: Lucide React
- **UI**: Shadcn/UI components

## Getting Started

### Prerequisites
- Node.js 18+
- Redis instance (Upstash recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/online-clipboard.git
cd online-clipboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create a .env.local file with the following:
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Yes |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

Build the application:
```bash
npm run build
```

The `output: 'standalone'` configuration creates an optimized production build.

## Security Considerations

1. **Client-side encryption** ensures the server cannot read your data
2. **URL fragments** (after `#`) are never sent to servers
3. **Auto-expiry** with Redis TTL ensures data doesn't persist indefinitely
4. **Single-view mode** deletes data immediately after access
5. **HTTPS only** - Encryption keys are meaningless over HTTP

## Developer API

### POST /api/clipboard
Store encrypted clipboard data

```json
{
  "encrypted": { "ciphertext": "...", "iv": "..." },
  "salt": "base64_salt",
  "type": "text|image|file",
  "expiryMode": "10min|1hour|24hours|1view"
}
```

### GET /api/clipboard/[code]
Retrieve encrypted clipboard data (decrypt client-side)

### DELETE /api/clipboard/[code]
Delete clipboard entry immediately

## License

MIT License - feel free to use for personal or commercial projects.

## Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

Built with ❤️ for developers who value privacy.
