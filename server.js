const express = require('express');
const session = require('express-session');
const passport = require('passport');
const BasecampStrategy = require('passport-basecamp').Strategy;
const axios = require('axios');
require('dotenv').config();


const app = express();

//oAuth2 setup
app.use(session({ secret: 'your_session_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Configura qui le tue credenziali OAuth2 di Basecamp
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL;

// ...
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
                    'User-Agent': 'ChatGpt Translator (lorenzo.tlili@redergo.com)', // Cambia con il tuo nome app e email
                },
            });

            const accountId = response.data.accounts[0].id; // Prende l'ID del primo account disponibile
            done(null, { accessToken: accessToken, accountId: accountId, profile: profile });
        } catch (error) {
            console.error(error);
            done(error);
        }
    }
));
// ...


passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.get('/auth/basecamp', passport.authenticate('basecamp'));

app.get('/auth/basecamp/callback', passport.authenticate('basecamp', { failureRedirect: '/login' }),
    function (req, res) {
        // Utente autenticato con successo, reindirizza alla pagina desiderata
        res.redirect('/');
    }
);

app.use((req, res, next) => {
    if (req.isAuthenticated()) {
        req.accessToken = req.user.accessToken;
        req.accountId = req.user.accountId;
    }
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

////////////////////////// ROUTES //////////////////////////

app.get('/', async (req, res) => {
    // Controlla se l'utente è autenticato
    if (req.isAuthenticated()) {
        try {
            const allProjects = await fetchAllProjects(req.accessToken, req.accountId);
            res.send(`<pre>${JSON.stringify(allProjects, null, 2)}</pre>`);
        } catch (error) {
            console.error(error);
            res.status(500).send('Errore nel recupero dei progetti');
        }
    } else {
        res.send('Per favore, autenticati con <a href="/auth/basecamp">Basecamp</a>');
    }
});


app.get('/api/projects', async (req, res) => {
    if (!req.isAuthenticated()) {
        res.status(401).send('Non autenticato');
        return;
    }

    try {
        const response = await axios.get(`https://3.basecampapi.com/${req.accountId}/projects.json?page=1`, {
            headers: {
                'Authorization': 'Bearer ' + req.accessToken,
                'User-Agent': 'ChatGpt Translator (lorenzo.tlili@redergo.com)',
            },
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Errore nel recupero dei progetti');
    }
});

async function fetchAllProjects(accessToken, accountId, page = 1, allProjects = []) {
    try {
        const response = await axios.get(`https://3.basecampapi.com/${accountId}/projects.json?page=${page}`, {
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'User-Agent': 'ChatGpt Translator (lorenzo.tlili@redergo.com)',
            },
        });

        if (response.data.length === 0) {
            return allProjects;
        }

        allProjects = allProjects.concat(response.data);
        return fetchAllProjects(accessToken, accountId, page + 1, allProjects);
    } catch (error) {
        console.error(error);
        throw new Error('Errore nel recupero dei progetti');
    }
}


