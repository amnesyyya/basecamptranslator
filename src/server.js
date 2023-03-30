require('dotenv').config();
const express = require('express');
const app = express();
const axios = require('axios');
const { translateMessage } = require('./openai');

// Parsing Setup
app.use(express.json());

// Webhook Personal
app.post('/basecamp/webhook', async (req, res) => {
    console.log('Messaggio da tradurre:', req.body.command);
    res.status(200).end();


    // Translate the message using GPT-4
    if (req.body && req.body.command) {
        const textBeforeTranslation = req.body.command;

        // Output the translated message
        const translatedMessage = await translateMessage(textBeforeTranslation);
        console.log("Messaggio tradotto:", translatedMessage.content);

        // Send the translated message to the Campfire
        try {
            await axios.post(
                `${req.body.callback_url}`,
                { content: translatedMessage.content },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
        } catch (error) {
            console.error('Errore nell\'inviare il messaggio al Campfire:', error);
        }

    }

    res.status(200).end();
});

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


