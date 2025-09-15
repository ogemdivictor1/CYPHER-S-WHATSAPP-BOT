const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs').promises;
const qrcode = require('qrcode-terminal');
const morgan = require('morgan'); // For request logging

const app = express();
const port = process.env.PORT || 3000;
const SESSION_DIR = path.join(__dirname, '../sessions');

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('combined')); // Log HTTP requests

// Ensure session directory exists
async function ensureSessionDir() {
  try {
    await fs.mkdir(SESSION_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create session directory:', error);
  }
}

// Route: Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Route: Generate pairing code and session
app.post('/pair', async (req, res) => {
  const { phone } = req.body;

  if (!phone || !/^\d{10,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Valid phone number required (10-15 digits, no + or spaces)' });
  }

  try {
    await ensureSessionDir();
    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for Render
      },
    });

    // QR code fallback (logged to console)
    client.on('qr', (qr) => {
      console.log('QR Code (fallback):');
      qrcode.generate(qr, { small: true });
    });

    // Authentication success
    client.on('authenticated', async () => {
      console.log('Authenticated successfully');
      try {
        const sessionFiles = await fs.readdir(SESSION_DIR);
        const sessionData = await Promise.all(
          sessionFiles.map(async (file) => ({
            file,
            content: await fs.readFile(path.join(SESSION_DIR, file), 'utf8'),
          }))
        );
        res.json({ success: true, session: sessionData });
      } catch (error) {
        res.status(500).json({ error: 'Failed to read session data: ' + error.message });
      }
    });

    // Client ready
    client.on('ready', () => {
      console.log('WhatsApp client ready');
    });

    // Authentication failure
    client.on('auth_failure', (msg) => {
      console.error('Authentication failed:', msg);
      res.status(500).json({ error: 'Authentication failed: ' + msg });
    });

    // Initialize client and request pairing code
    await client.initialize();
    const pairingCode = await client.requestPairingCode(phone);
    console.log('Pairing code:', pairingCode);
    res.json({ success: true, pairingCode, message: 'Enter the pairing code in WhatsApp (Settings > Linked Devices > Link with Phone Number)' });

  } catch (error) {
    console.error('Pairing error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Route: Get existing session
app.get('/session', async (req, res) => {
  try {
    const sessionFiles = await fs.readdir(SESSION_DIR).catch(() => []);
    if (!sessionFiles.length) {
      return res.json({ error: 'No session found. Pair first.' });
    }
    const sessionData = await Promise.all(
      sessionFiles.map(async (file) => ({
        file,
        content: await fs.readFile(path.join(SESSION_DIR, file), 'utf8'),
      }))
    );
    res.json({ success: true, session: sessionData });
  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve session: ' + error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
