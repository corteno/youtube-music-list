var express = require('express');
var bodyParser = require('body-parser');
var {ObjectID} = require('mongodb');
var getYoutubeVideo = require('./functions/get-youtube-video');


var {mongoose} = require('./db/mongoose');
var {Song} = require('./models/song');
var {User} = require('./models/user');
var {Room} = require('./models/room');

var app = express();
const port = process.env.PORT || 3000;

var jwt = require('express-jwt');
var jwks = require('jwks-rsa');

var jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: "https://corten.eu.auth0.com/.well-known/jwks.json"
    }),
    audience: 'https://yt-music-list.com',
    issuer: "https://corten.eu.auth0.com/",
    algorithms: ['RS256']
});



//app.use(bodyParser.json());
app.use(jwtCheck, bodyParser.json());

app.get('/authorized', jwtCheck, (req, res) => {
    res.send('Secured Resource');
});



app.get('/test', (req, res) => {

    res.send('Hello there');

});


//===============================
//         Song Routes
//===============================

//Send songs to the be added to the list
app.post('/song', (req, res) => {
    var videoID = req.body.id;
    var song = req.body;
    var songDetails = {};


    /*getYoutubeVideo.getVideoDetails(videoID)
     .then((song) => {

     var songToAdd = new Song({
     title: song.title,
     id: song.id,
     duration: song.duration
     });

     songToAdd.save().then((doc) => {
     res.send(doc);
     }, (e) => {
     res.status(400).send(e);
     });

     }, (e) => {
     res.status(400).send();
     });*/

    var songToAdd = new Song({
        title: song.title,
        id: song.id,
        duration: song.duration,
        thumbnail: song.thumbnail
    });

    songToAdd.save().then((doc) => {
        res.send(doc);
    }, (e) => {
        res.status(400).send(e);
    });


});

//Get all songs sent to the list
app.get('/songs', (req, res) => {
    Song.find().then((songs) => {
        res.send({songs});
    }, (e) => {
        res.status(400).send();
    });
});

//Delete a song from a list
app.delete('/song/:id', (req, res) => {
    var id = req.params.id;

    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    Song.findByIdAndRemove(id).then((song) => {

        if (!song) {
            return res.status(404).send();
        }

        res.send(song);

    }, (e) => {
        res.status(400).send();
    });

});

//===============================
//         User Routes
//===============================

//Registering new user
app.post('/user', (req, res) => {
    var user = new User({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email
    });

    User.findOne({username: user.username}).then((doc) => {
        if (doc) {
            return res.status(400).send({error: 'Username is taken!'});
        }

        user.save().then((doc) => {
            res.send(doc);
        }, (e) => {
            res.status(400).send();
        });

    }, (e) => {
        res.status(400).send();
    });
});

//Login
app.post('/login', (req, res) => {
    console.log("Req: ", req);
    var user = new User({
        username: req.body.username,
        password: req.body.password
    });
    console.log("User: ", user);

    User.findOne({username: user.username, password: user.password}).then((doc) => {
        if (doc) {
            return res.send({status: 'Successful login!'});
        }

        res.status(400).send({status: 'Wrong username or password!'});

    }, (e) => {
        res.status(400).send(e);
    });

});


//===============================
//         Room Routes
//===============================

app.post('/room', (req, res) => {
    var room = new Room({
        name: req.body.name,
        password: req.body.password,
        owner: req.body.owner,
        isPublic: req.body.isPublic
    });

    Room.findOne({owner: room.owner}).then((doc) => {
        if (doc) {
            return res.status(400).send({status: 'Owner already has a room!'});
        }


        room.save().then((doc) => {
            res.send(doc);
        }, (e) => {
            res.status(400).send(e);
        });

    }, (e) => {
        res.status(400).send();
    });

});


app.listen(port, () => {
    console.log(`Started up at port ${port}`);
});

module.exports = {app};