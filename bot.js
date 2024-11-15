require('dotenv').config(); // Load environment variables from .env file
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const ytdl = require('ytdl-core');
const fs = require('fs');
const ping = require('ping'); // Import the ping library

// Initialize client with LocalAuth for session persistence
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-bot" }) // "clientId" is used to identify different sessions.
});

// Load environment variables
const botNumber = process.env.BOT_NUMBER || '917034898741';
const aliveMessage = process.env.ALIVE_MESSAGE || `Hi, I am WhatsApp bot. My number is ${botNumber}.`;

client.on('qr', (qr) => {
    console.log("No active session found. Scan the QR code to log in.");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp bot is ready and connected!');
});

client.on('authenticated', (session) => {
    console.log('Session authenticated!');
});

client.on('auth_failure', msg => {
    console.error('Authentication failed. Please scan the QR code again.');
});

client.on('message', async (message) => {
    const { from, body } = message;

    // Alive command
    if (body === '.alive') {
        client.sendMessage(from, aliveMessage);
    }

    // Server ping command
    else if (body.startsWith('.ping')) {
        const server = body.split(' ')[1];
        if (!server) {
            client.sendMessage(from, 'Please provide a server to ping, e.g., `.ping google.com`');
        } else {
            try {
                const res = await ping.promise.probe(server);
                if (res.alive) {
                    client.sendMessage(from, `Ping to ${server} successful! Latency: ${res.time} ms`);
                } else {
                    client.sendMessage(from, `Ping to ${server} failed. Host might be unreachable.`);
                }
            } catch (error) {
                client.sendMessage(from, 'Error pinging the server. Please check the server address.');
            }
        }
    }

    // Command: Download Instagram Video
    else if (body.startsWith('.insta')) {
        const url = body.split(' ')[1];
        try {
            const response = await axios.get(`https://api.instagram-video-download-service.com/?url=${url}`);
            const videoUrl = response.data.video_url;

            client.sendMessage(from, `Here is your video: ${videoUrl}`);
        } catch (error) {
            client.sendMessage(from, 'Failed to download Instagram video.');
        }
    }

    // Command: Download YouTube as MP3
    else if (body.startsWith('.song')) {
        const url = body.split(' ')[1];
        try {
            if (ytdl.validateURL(url)) {
                const info = await ytdl.getInfo(url);
                const audioStream = ytdl(url, { filter: 'audioonly' });

                audioStream.pipe(fs.createWriteStream(`${info.videoDetails.title}.mp3`));
                client.sendMessage(from, 'Your MP3 is being downloaded and will be sent shortly.');
            } else {
                client.sendMessage(from, 'Invalid YouTube URL.');
            }
        } catch (error) {
            client.sendMessage(from, 'Failed to download audio from YouTube.');
        }
    }

    // Command: Download YouTube Video
    else if (body.startsWith('.video')) {
        const url = body.split(' ')[1];
        try {
            if (ytdl.validateURL(url)) {
                const info = await ytdl.getInfo(url);
                const videoStream = ytdl(url, { quality: 'highestvideo' });

                videoStream.pipe(fs.createWriteStream(`${info.videoDetails.title}.mp4`));
                client.sendMessage(from, 'Your video is being downloaded and will be sent shortly.');
            } else {
                client.sendMessage(from, 'Invalid YouTube URL.');
            }
        } catch (error) {
            client.sendMessage(from, 'Failed to download video from YouTube.');
        }
    }
});

client.initialize();
