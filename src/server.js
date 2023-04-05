require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session');
const passport = require('passport');
const BasecampStrategy = require('passport-basecamp').Strategy;
const axios = require('axios');
const { fetchAllData } = require('./api_fetching');

const culo = 'singh';

// Express e Passport Setup
app.use(session({ secret: 'your_session_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL;

// Passport strategy
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

            const accountId = response.data.accounts[0].id;
            done(null, { accessToken: accessToken, accountId: accountId, profile: profile });
            globalAccessToken = accessToken;
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

// Middleware
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

// Server setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


