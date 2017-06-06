var express = require('express');
var bodyParser = require('body-parser');
var {ObjectID} = require('mongodb');
var open = require('open');
var http = require('http');

var {mongoose} = require('./db/mongoose');
var {Song} = require('./models/song');
var {User} = require('./models/user');
var {Room} = require('./models/room');
var {Playlist} = require('./models/playlist');

var app = express();

const port = process.env.PORT || 3000;
var server = app.listen(port);
var io = require('socket.io')(server);

server.listen(port, () => {
    console.log(`Started up at port ${port}`);
});

//SOCKET.IO STUFF


//Need to make them in the proper place
io.on('connection', (socket) => {
    console.log('a user connected');

    socket.emit('rooms', {message: 'Connected to Rooms'});

    socket.on('createRoom', (data) => {
        socket.broadcast.emit('rooms', {refresh: true});

        console.log(data);
    });

    socket.on('leaveRoom', (data) => {
        socket.emit('test', data);
    });

    socket.emit('enterRoom', {message: 'Entered room'});
    socket.on('enterRoom', (data) => {
        socket.emit('enterRoom', {message: data.id});
        socket.emit(data.id, {message: `Welcome to room ${data.id}`});
    });

    /*socket.on('enterRoom', (data) => {
        socket.emit('rooms', {data});
        console.log('Entered room' + data);
    });*/


    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


//EXPRESS ROUTES
//Need this to enable CORS else it whines, figure out how to only allow it to one domain like yt.borsodidavid.com
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


app.use(bodyParser.json());


app.get('/test', (req, res) => {

    res.send('Hello there');

});


//===============================
//         Song Routes
//===============================

//Send songs to the be added to the list
app.post('/song', (req, res) => {
    var song = req.body;
    var roomID = req.body.roomId;


    Playlist.findOne({id: roomID}).then((doc) => {
        if (doc) {
            var songToAdd = new Song({
                title: song.title,
                id: song.id,
                duration: song.duration,
                thumbnail: song.thumbnail
            });

            let playlistArray = doc.songs;
            playlistArray.push(songToAdd);

            console.log(doc, playlistArray);

            Playlist.update({_id: doc._id}, {
                songs: playlistArray
            })
                .then((doc) => {
                    res.send(doc);
                }, (e) => {
                    res.status(400).send(e);
                });

        }

    }, (e) => {
        res.status(400).send("Room doesn't exist!");
    });


});

//Get all songs sent to the list
app.get('/songs/:id', (req, res) => {
    Playlist.findOne({id: req.params.id}).then((doc) => {
        if (doc) {
            res.send(doc);
        } else {
            res.status(400).send(`No such playlist! ID: ${req.params.id}`);
        }
    }, (e) => {
        res.status(400).send(e);
    });


    /*Song.find().then((songs) => {
     res.send({songs});
     }, (e) => {
     res.status(400).send();
     });*/
});

//Delete a song from a list
app.delete('/song/:playlistId/:songId', (req, res) => {
    let playlistId = req.params.playlistId;
    let songId = req.params.songId;

    Playlist.findOne({id: playlistId}).then((doc) => {
        if (doc) {
            let playlist = doc;

            playlist.songs.forEach((song) => {

                if (song._id == songId) {
                    //console.log(song._id, songId);
                    playlist.songs.splice(playlist.songs.indexOf(song), 1);
                    //console.log(playlist.songs);

                    Playlist.findOneAndUpdate({id: playlistId}, playlist)
                        .then((doc) => {
                            if (doc) {
                                //console.log(doc);
                                return res.send(doc);
                            }

                        }, (e) => {
                            console.log(e);
                        });
                }


            });
            /*res.status(400).send('No such song found!');*/

        } else {
            res.status(400).send(`No such playlist to remove from! ID: ${playlistId}`);
        }

    }, (e) => {
        res.status(400).send(e);
    });


    /*Song.findByIdAndRemove(playlistId).then((song) => {

     if (!song) {
     return res.status(404).send();
     }

     res.send(song);

     }, (e) => {
     res.status(400).send();
     });*/

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

//Creating room
app.post('/room', (req, res) => {
    let roomOK = false;
    let playlistOK = false;

    var room = new Room({
        name: req.body.name,
        password: req.body.password,
        owner: req.body.owner,
        isPublic: req.body.isPublic,
        id: req.body.id
    });

    var playlist = new Playlist({
        id: req.body.id,
        songs: []
    });

    Room.findOne({owner: room.owner}).then((doc) => {
        if (doc) {
            return res.status(400).send({status: 'Owner already has a room!'});
        }

        Playlist.findOne({id: playlist.id}).then((doc) => {
            if (doc) {
                return res.status(400).send({status: 'Room already exists'});
            }

            playlist.save().then((doc) => {

                room.save().then((doc) => {
                    res.send(doc);


                }, (e) => {
                    res.status(400).send(e);
                });

                console.log(doc);
            }, (e) => {
                res.status(400).send(e);
            });

        }, (e) => {
            res.status(400).send(e);
        });


        room.save().then((doc) => {
            if (doc) {
                res.send(doc);
            } else {
                res.status(400).send('Error while creating Room');
            }

            // response.concat(doc + "\n");


        }, (e) => {
            res.status(400).send(e);
        });


    }, (e) => {
        res.status(400).send();
    });

});

//Joining room
app.get('/room/:id', (req, res) => {
    Room.find({id: req.params.id}).then((doc) => {
        if (doc) {
            return res.send(doc);
        }
    }, (e) => {
        res.status(400).send(e);
    });
});

app.get('/rooms', (req, res) => {
    Room.find().sort('-date').then((rooms) => {

        /*//Need to make them in the proper place
         io.on('connection', (socket) => {
         console.log('a user connected');

         socket.emit('rooms', {message: 'Connected to Rooms'});

         socket.on('createRoom', (data) =>{
         socket.broadcast.emit('rooms', {refresh: true});

         console.log(data);
         });



         socket.on('disconnect', () => {
         console.log('user disconnected');
         });
         });*/


        res.send({rooms});

    }, (e) => {
        res.status(400).send();
    });

});

app.get('/', (req, res) => {
    res.send('Hello world');
});

/*app.listen(port, () => {
 console.log(`Started up at port ${port}`);

 });*/



/*io.listen(port);*/


module.exports = {app};