require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session');
const passport = require('passport');
const BasecampStrategy = require('passport-basecamp').Strategy;
const axios = require('axios');
const { Configuration, OpenAIApi } = require("openai");

// Openai setup
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Express - Parsing Setup
app.use(session({ secret: 'your_session_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

// Credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL;
const personalProjectId = 26874141;
const personalCampfire = 4772535975;

// Passport setup
passport.use(new BasecampStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            const response = await axios.get('https://launchpad.37signals.com/authorization.json', {
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'User-Agent': 'ChatGpt Translator (lorenzo.tlili@redergo.com)',
                },
            });

            const accountId = response.data.accounts[0].id; // Retrieve the first account id
            done(null, { accessToken: accessToken, accountId: accountId, profile: profile });
        } catch (error) {
            console.error(error);
            done(error);
        }
    }
));

// Autentication
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.get('/auth/basecamp', passport.authenticate('basecamp'));

app.get('/auth/basecamp/callback', passport.authenticate('basecamp', { failureRedirect: '/login' }),
    function (req, res) {
        // User authenticated
        res.redirect('/');
    }
);

// Webhook post
app.post('/basecamp/webhook', async (req, res) => { 
    console.log(req.body.command);
    res.status(200).end();

    // Translate the message using GPT-4
    if (req.body && req.body.command) {
        const textBeforeTranslation = req.body.command;

        
        async function translateMessage(textBeforeTranslation) {
            try {
                const completion = await openai.createChatCompletion({
                    model: "gpt-4",
                    messages: [
                        { role: "system", content: "You are a helpful assistant that translates Italian to English." },
                        { role: "user", content: `Translate the following Italian text to English: "${textBeforeTranslation}"` },
                    ],
                });
                return completion.data.choices[0].message;
            } catch (error) {
                console.log(error);
            }
        }
        // Output the translated message
        const translatedMessage = await translateMessage(textBeforeTranslation); 
        console.log("Messaggio tradotto in inglese:", translatedMessage.content);

        // Send the translated message to the Campfire
        async function postMessageToCampfire(translatedMessage, accountId, accessToken) {
            console.log('Translated message:', translatedMessage);
        console.log('Account ID:', accountId);
        console.log('Access Token:', accessToken);
            try {
                await axios.post(
                    `https://3.basecampapi.com/${accountId}/buckets/${personalProjectId}/chats/${personalCampfire}/lines.json`,
                    { content: translatedMessage.content },
                    {
                        headers: {
                            'Authorization': 'Bearer ' + accessToken,
                            'Content-Type': 'application/json',
                        },
                    }
                );
            } catch (error) {
                console.error('Errore nell\'inviare il messaggio al Campfire:', error);
            }

            await postMessageToCampfire(translatedMessage, req.accountId, req.accessToken);


        }

        
            
    }

    res.status(200).end();
});




app.use((req, res, next) => {
    if (req.isAuthenticated()) {
        req.accessToken = req.user.accessToken;
        req.accountId = req.user.accountId;
    }
    next();
});



// Routes
app.get('/', async (req, res) => {
    // Check if the user is authenticated
    if (req.isAuthenticated()) {
        try {
            const allData = await fetchAllData(req.accessToken, req.accountId);
            res.send(`<pre>${JSON.stringify(allData, null, 2)}</pre>`);
        } catch (error) {
            console.error(error);
            res.status(500).send('Errore nel recupero dei dati');
        }
    } else {
        res.send('Per favore, autenticati con <a href="/auth/basecamp">Basecamp</a>');
    }
});



// Fetch all the data from the API
async function fetchAllData(accessToken, accountId, page = 1, allData = []) {
    try {
        const response = await axios.get(`https://3.basecampapi.com/${accountId}/buckets/${personalProjectId}/chats/${personalCampfire}/lines.json?page=${page}`, {
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'User-Agent': 'ChatGpt Translator (lorenzo.tlili@redergo.com)',
            },
        });

        if (response.data.length === 0) {
            // Extract only the content of the messages
            const contents = allData.map(line => line.content);
            return contents;
        }

        allData = allData.concat(response.data);
        return fetchAllData(accessToken, accountId, page + 1, allData);
    } catch (error) {
        console.error(error);
        throw new Error('Errore nel recupero dei dati');
    }
}


// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


