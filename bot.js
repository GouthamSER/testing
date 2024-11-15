require('dotenv').config(); // Load environment variables from .env file
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const ytdl = require('ytdl-core');
const fs = require('fs');
const ping = require('ping'); // Import the ping library
const { exec } = require('child_process'); // For YouTube downloads with yt-dlp

// Initialize client with LocalAuth for session persistence
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "whatsapp-bot" }) // "clientId" is used to identify different sessions.
});

// Load environment variables
const botNumber = process.env.BOT_NUMBER || '917034898741';
const aliveMessage = process.env.ALIVE_MESSAGE || `Hi, I am WhatsApp bot. My number is ${botNumber}.`;

// QR Code Generation
client.on('qr', (qr) => {
    console.log("No active session found. Scan the QR code to log in.");
    qrcode.generate(qr, { small: true });
});

// Ready Event
client.on('ready', () => {
    console.log('WhatsApp bot is ready and connected!');
});

// Authentication Events
client.on('authenticated', () => {
    console.log('Session authenticated!');
});

client.on('auth_failure', () => {
    console.error('Authentication failed. Please scan the QR code again.');
});

// Download YouTube Audio Function
const downloadYouTubeAudio = (url, callback) => {
    exec(`yt-dlp -x --audio-format mp3 --cookies ./cookies.txt -o './%(title)s.%(ext)s' ${url}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            callback(`Failed to download audio: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            callback(`Error: ${stderr}`);
            return;
        }
        console.log(`Output: ${stdout}`);
        callback(null, 'Audio downloaded successfully!');
    });
};

// Message Handling
client.on('message', async (message) => {
    const { from, body } = message;

    // Alive Command
    if (body === '.alive') {
        client.sendMessage(from, aliveMessage);
    }

    // Server Ping Command
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

    // Instagram Video Download Command
    else if (body.startsWith('.insta')) {
        const url = body.split(' ')[1];
        if (!url) {
            client.sendMessage(from, 'Please provide a valid Instagram URL.');
            return;
        }
        try {
            const response = await axios.get('instagram-scraper-api2.p.rapidapi.com', {
                params: { url }, // Replace with the API's expected parameters
                headers: { 'X-RapidAPI-Key': '3a49955eeamshb2882e920e90a15p10934ajsnf768dd2159d8' } // Replace with your RapidAPI key
            });
            const videoUrl = response.data.video; // Adjust based on API response structure
            client.sendMessage(from, `Here is your Instagram video: ${videoUrl}`);
        } catch (error) {
            client.sendMessage(from, 'Failed to download Instagram video. Please check the URL.');
            console.error(error.message);
        }
    }

    // YouTube MP3 Download Command
    else if (body.startsWith('.song')) {
        const url = body.split(' ')[1];
        if (!url) {
            client.sendMessage(from, 'Please provide a valid YouTube URL.');
            return;
        }

        downloadYouTubeAudio(url, (error, successMessage) => {
            if (error) {
                client.sendMessage(from, `Failed to download audio. Possible causes:\n- Invalid URL\n- Video requires login or CAPTCHA.\n\nError: ${error}`);
            } else {
                client.sendMessage(from, successMessage);
            }
        });
    }

    // YouTube Video Download Command
    else if (body.startsWith('.video')) {
        const url = body.split(' ')[1];
        if (!ytdl.validateURL(url)) {
            client.sendMessage(from, 'Invalid YouTube URL.');
            return;
        }
        try {
            const videoStream = ytdl(url, { quality: 'highestvideo' });
            const fileName = `video_${Date.now()}.mp4`;
            const filePath = `./${fileName}`;
            const writeStream = fs.createWriteStream(filePath);

            videoStream.pipe(writeStream);

            writeStream.on('finish', () => {
                client.sendMessage(from, `Your video has been downloaded.`);
                client.sendMessage(from, filePath, { sendMediaAsDocument: true });
            });
        } catch (error) {
            if (error.statusCode === 410) {
                client.sendMessage(from, 'Failed to download the video. The video might be restricted or unavailable.');
            } else {
                client.sendMessage(from, 'An unexpected error occurred while downloading the video.');
            }
            console.error(error);
        }
    }
});

// Initialize Client
client.initialize();
