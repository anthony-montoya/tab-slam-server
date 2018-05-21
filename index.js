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
            response.status(200).send(userObj)
        } else {
            bcrypt.hash(password, 10, function (err, encryptedPassword) {
                let authId = Math.random().toString(36).substring(7);
                app.get('db').create_user([authId, username, encryptedPassword]).then(newUser => {
                    response.status(200).send(newUser);
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

// require('dotenv').config();

// const express = require('express')
//     , bodyParser = require('body-parser')
//     , cors = require('cors')
//     , passport = require('passport')
//     , Auth0Strategy = require('passport-auth0')
//     , massive = require('massive')
//     , session = require('express-session')
//     , ugs = require('ultimate-guitar-scraper');

// const app = express();
// app.use(bodyParser.json());
// app.use(cors());
// // app.use( express.static( `${__dirname}/../build` ) );

// //Middleware
// app.use(session({
//     secret: process.env.SECRET,
//     resave: false,
//     saveUninitialized: true
// }));

// app.use(passport.initialize());
// app.use(passport.session());

// //Connection to the database
// massive(process.env.CONNECTIONSTRING).then(db => {
//     app.set('db', db);
//     console.log('Connection to the database was successfull.');
// }).catch(err => console.log('Connection Error: ' + err));

// //AUTHENTICATION
// passport.use(new Auth0Strategy({
//     domain: process.env.AUTH_DOMAIN,
//     clientID: process.env.AUTH_CLIENT_ID,
//     clientSecret: process.env.AUTH_CLIENT_SECRET,
//     callbackURL: process.env.AUTH_CALLBACK
// }, function (accessToken, refreshToken, extraParams, profile, done) {
//     const db = app.get('db');

//     db.find_user(profile.id).then(user => {
//         if (user[0]) {
//             return done(null, profile);
//         } else {
//             db.create_user([profile.id, profile.displayName, profile.picture]).then(user => {
//                 return done(null, profile);
//             })
//         }
//     })
// }))

// //THIS IS INVOKED ONE TIME TO SET THINGS UP
// passport.serializeUser(function (user, done) {
//     done(null, user);
// })

// //USER COMES FROM SESSION - THIS IS INVOKED FOR EVERY ENDPOINT
// passport.deserializeUser(function (user, done) {
//     done(null, user);
// })

// app.get('/auth', passport.authenticate('auth0'));

// app.get('/auth/callback', passport.authenticate('auth0', {
//     successRedirect: 'https://tab-slam-webapp.herokuapp.com/home',
//     failureRedirect: 'https://tab-slam-webapp.herokuapp.com/home'
// }))

// app.get('/auth/me', (req, res) => {
//     if (!req.user) {
//         return res.status(404).send('User not found');
//     } else {
//         return res.status(200).send(req.user);
//     }
// })

// app.get('/auth/logout', (req, res) => {
//     req.logout(); //Passport gives us this to terminate a login session
//     return res.redirect(302, 'https://tab-slam-webapp.herokuapp.com/home');
// })

// //API CALLS
// //This call will search for two tab types based on band name
// app.get('/api/bandSearch/:bandName', (req, res) => {
//     ugs.search({
//         query: req.params.bandName,
//         type: ['Tab', 'Chords'],
//     }, (error, tabs) => {
//         if (error) {
//             console.log(error);
//         } else {
//             res.status(200).send(tabs);
//         }
//     })
// });

// //This call will search for two tab types based on song name
// app.get('/api/songSearch/:songName', (req, res) => {
//     ugs.search({
//         query: req.params.songName,
//         type: ['Tab', 'Chords'],
//     }, (error, tabs) => {
//         if (error) {
//             console.log(error);
//         } else {
//             res.status(200).send(tabs);
//         }
//     })
// });

// app.get('/api/tabContent', (req, res) => {
//     let tabUrl = req.query.tabUrl;

//     app.get('db').get_matched_tab(tabUrl).then(dbTab => {
//         if (dbTab.length === 0) {
//             ugs.get(tabUrl, (error, tab) => {
//                 app.get('db').store_tab(tab.type, tab.url, tab.artist, tab.name,
//                     tab.difficulty, tab.rating, tab.numberRates, tab.content.text).then(response => {
//                         res.status(200).send(response);
//                     })
//             })
//         } else {
//             res.status(200).send(dbTab[0])
//         }
//     })
// })

// app.post('/api/addFavoriteTab', (req, res) => {
//     let tabId = req.body.tabId
//     let userId = req.body.userId;

//     app.get('db').add_favorites([userId, tabId]).then((response, error) => {
//         res.status(200).send('Tab has been added');
//     })
// })

// app.get('/api/getFavorites/:user_id', (req, res) => {
//     app.get('db').get_favorites(req.params.user_id).then(response => {
//         res.status(200).send(response);
//     })
// })

// app.post('/api/deleteFavorite', (req, res) => {
//     const { user_id, tab_id } = req.body;

//     app.get('db').delete_favorite_tab([user_id, tab_id]).then(response => {
//         app.get('db').get_favorites(user_id).then(userFavorites => {
//             res.send(userFavorites);
//         });
//     })
// })

// //NODEMON PORT
// const PORT = process.env.PORT || 3020
// app.listen(PORT, () => console.log('Reporting for duty on port: ' + PORT));
