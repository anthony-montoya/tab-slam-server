require('dotenv').config();

const express = require('express')
    , bodyParser = require('body-parser')
    , cors = require('cors')
    , axios = require('axios')
    , passport = require('passport')
    , Auth0Strategy = require('passport-auth0')
    , massive = require('massive')
    , session = require('express-session')
    , ugs = require('ultimate-guitar-scraper');

const app = express();
app.use(bodyParser.json());
app.use(cors());

//Middleware
app.use(
    session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: true
    }));

app.use(passport.initialize());
app.use(passport.session());

//Connection to the database
massive(process.env.CONNECTIONSTRING).then(db => {
    app.set('db', db);
    console.log('Connection to the database was successfull.');
}).catch(err => console.log('Connection Error: ' + err));

//AUTHENTICATION
passport.use(
    new Auth0Strategy(
        {
            domain: process.env.AUTH_DOMAIN,
            clientID: process.env.AUTH_CLIENT_ID,
            clientSecret: process.env.AUTH_CLIENT_SECRET,
            callbackURL: process.env.AUTH_CALLBACK
        }, 
        function (accessToken, refreshToken, extraParams, profile, done) {
            const db = app.get('db');

            db.find_user(profile.id).then(user => {
                if (user[0]) {
                    return done(null, user[0]);
                } else {
                    db.create_user([profile.id, profile.displayName, profile.picture]).then(user => {
                        return done(null, user[0]);
                    })
                }
            })
        }))

//THIS IS INVOKED ONE TIME TO SET THINGS UP
passport.serializeUser(function (user, done) {
    done(null, user);
})

//USER COMES FROM SESSION - THIS IS INVOKED FOR EVERY ENDPOINT
passport.deserializeUser(function (user, done) {
    done(null, user);
})

app.get('/auth', passport.authenticate('auth0'));

app.get('/auth/callback', passport.authenticate('auth0', {
    successRedirect: 'https://tab-slam-webapp.herokuapp.com/home',
    failureRedirect: 'https://tab-slam-webapp.herokuapp.com/home'
}))

app.get('/auth/me', (req, res) => {
    if (!req.user) {
        return res.status(404).send('User not found');
    } else {
        return res.status(200).send(req.user);
    }
})

app.get('/auth/logout', (req, res) => {
    req.logout(); //Passport gives us this to terminate a login session
    return res.redirect(302, '/home');
})

//API CALLS
//This call will search for two tab types based on band name
app.get('/api/bandSearch/:bandName', (req, res) => {
    ugs.search({
        query: req.params.bandName,
        type: ['Tab', 'Chords'],
    }, (error, tabs) => {
        if (error) {
            console.log(error);
        } else {
            res.status(200).send(tabs);
        }
    })
});

//This call will search for two tab types based on song name
app.get('/api/songSearch/:songName', (req, res) => {
    ugs.search({
        query: req.params.songName,
        type: ['Tab', 'Chords'],
    }, (error, tabs) => {
        if (error) {
            console.log(error);
        } else {
            res.status(200).send(tabs);
        }
    })
});

//This will take the url and get the tab if its not in the DB already and then store it
//It will check if it has it before getting it, and if it has it. It will send back the tab content from db.
app.get('/api/tabContent', (req, res) => {
    let tabUrl = req.query.tabUrl;
    let tabDifficulty = req.query.tabDifficulty;

    app.get('db').get_matched_tab(tabUrl).then(dbTab => {
        if (dbTab.length === 0) {
            console.log('hit')
            ugs.get(tabUrl, (error, tab) => {
                console.log(tab)
                app.get('db').store_tab(tab.type, tabUrl, tab.artist, tab.name,
                    tabDifficulty, tab.rating, tab.numberRates, tab.content.text).then(response => {
                        res.status(200).send(response[0]);
                    })
            })
        } else {
            res.status(200).send(dbTab[0])
        }
    })
})

app.post('/api/addFavoriteTab', (req, res) => {
    const { tabId } = req.body;

    app.get('db').add_favorites([req.user.user_id, tabId]).then(response => {
        res.status(200).send('Tab has been added');
    })
})

app.get('/api/getFavorites/:user_id', (req, res) => {
    app.get('db').get_favorites(req.params.user_id).then(response => {
        res.status(200).send(response);
    })
})

app.post('/api/deleteFavorite', (req, res) => {
    const { user_id, tab_id } = req.body;

    app.get('db').delete_favorite_tab([user_id, tab_id]).then(response => {
        app.get('db').get_favorites(user_id).then(userFavorites => {
            res.send(userFavorites);
        });
    })
})

//NODEMON PORT
const PORT = 3050;
app.listen(PORT, () => console.log('Reporting for duty on port: ' + PORT));