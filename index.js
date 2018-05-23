require('dotenv').config();

const express = require('express')
    , bodyParser = require('body-parser')
    , cors = require('cors')
    , passport = require('passport')
    , massive = require('massive')
    , session = require('express-session')
    , ugs = require('ultimate-guitar-scraper')
    , bcrypt = require('bcrypt');

const app = express();
const db = app.get('db');
app.use(bodyParser.json());
app.use(cors());

//Middleware
app.use(session({
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

app.get('/api/tabContent', (req, res) => {
    let tabUrl = req.query.tabUrl;

    app.get('db').get_matched_tab(tabUrl).then(dbTab => {

        if (dbTab.length === 0) {
            ugs.get(tabUrl, (error, tab) => {
                app.get('db').store_tab(tab.type, tab.url, tab.artist, tab.name,
                    tab.difficulty, tab.rating, tab.numberRates, tab.content.text).then(response => {
                        res.status(200).send(response);
                    })
            })
        } else {
            res.status(200).send(dbTab[0])
        }
    })
})

app.post('/api/addFavoriteTab', (req, res) => {
    let tabId = req.body.tabId
    let authId = req.body.authId

    app.get('db').add_favorites([tabId, authId]).then((response, error) => {
        res.status(200).send('Tab has been added');
    })
})

app.get('/api/getFavorites/:auth_id', (req, res) => {
    app.get('db').get_favorites(req.params.auth_id).then(response => {
        res.status(200).send(response);
    })
})

app.post('/api/deleteFavorite', (req, res) => {
    const { auth_id, tab_id } = req.body;

    app.get('db').delete_favorite_tab([auth_id, tab_id]).then(response => {
        app.get('db').get_favorites(auth_id).then(userFavorites => {
            res.send(userFavorites);
        });
    })
})

app.get('/api/login/:username/:password', (request, response) => {
    const { username, password } = request.params;

    app.get('db').check_existing_user(username).then(userObj => {
        if (userObj.length) {
            bcrypt.compare(password, userObj[0].password).then((res) => {
                if (res) {
                    response.status(200).send(userObj)
                } else {
                    response.status(400).send('Unauthorized, please check credentials and try again ')
                }
            })
        } else {
            bcrypt.hash(password, 10, function (err, encryptedPassword) {
                let authId = Math.random().toString(36).substring(7);
                app.get('db').create_user([authId, username, encryptedPassword]).then(newUser => {
                    let body = {
                        newUser: newUser,
                        alert: 'Account has been created'
                    }
                    response.status(200).send(body);
                })
            });
        }
    })
})

app.get('/api/logout', (req, res) => {
    req.logout(); //Passport gives us this to terminate a login session
    return res.redirect(302, 'https://tab-slam-webapp.herokuapp.com/home');
})

//NODEMON PORT
const PORT = process.env.PORT || 3020
app.listen(PORT, () => console.log('Reporting for duty on port: ' + PORT));
