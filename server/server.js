var express = require('express');
var bodyParser = require('body-parser');
var {ObjectID} = require('mongodb');
var open = require('open');
var http = require('http');
var cors = require('cors');

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
    let roomId;

    //socket.emit('rooms', {message: 'Connected to Rooms'});

    socket.on('createRoom', (data) => {
        socket.broadcast.emit('rooms', {refresh: true});

        console.log(data);
    });

    socket.on('leaveRooms', (data) => {
        //console.log(`${data.username} left rooms`);
        socket.leave('rooms');
    });


    //If a client wants other clients to refresh
    //E.g.: in case of adding a new
    socket.on('refresh', (data) => {
        console.log('refresh', data.type);
        if (data.type === 'playlist') {
            socket.broadcast.emit('refresh', {
                type: data.type
            });
        }

    });


    //Joining a room
    socket.on('subscribe', (data) => {
        let roomId = data.roomId;

        //Setting the nickname to a combination of the username and the roomId
        //So on disconnect I can read the value, split along the slash
        //And run the proper
        socket.nickname = data.username + "/" + data.roomId;

        socket.join(roomId, () => {
            console.log("Subscribe", data, socket.rooms);

        });

        //Appeding user to database
        Room.findOneAndUpdate({id: roomId}, {
                $addToSet: {
                    userlist: data.username
                }
            },
            {
                new: true
            }
        ).then((doc) => {
            //console.log(doc);
            console.log('Emitting room userlist');

            //Sometimes it throws an error for not existing variable
            if (doc.userlist) {
                //Emitting only the userlist array to the clients in that specific room
                io.sockets.emit(roomId, doc.userlist);
            }
        })
            .catch((e) => {
                console.log(e);
            });


    });

    socket.on('unsubscribe', (data) => {
        //Finding the room and removing the leaving user from the list
        Room.findOneAndUpdate({id: data.roomId}, {$pull: {userlist: data.username}}, {new: true})
            .then((doc) => {
                //console.log(doc);
                console.log(`${data.username} unsubscribed from room ${data.roomId}`);

                //Disconnect before sending the broadcast
                //So the leaving client won't get the updated user list
                socket.disconnect();

                //Need to send only an array since that's what the frontend expects
                io.sockets.emit('refresh', {
                    type: 'userlist',
                    content: doc.userlist
                });

            })
            .catch((e) => {
                console.log(e);
            });


    });

    socket.on('disconnect', () => {
        if (socket.nickname) {
            let split = socket.nickname.split("/");
            let username = split[0];
            let roomId = split[1];


            Room.findOneAndUpdate({id: roomId}, {$pull: {userlist: username}}, {new: true})
                .then((doc) => {
                    //console.log(doc);
                    console.log(`${username} disconnected from room ${roomId}`);
                    //Disconnect before sending the broadcast
                    //So the leaving client won't get the updated user list
                    socket.disconnect();

                    //Need to send only an array since that's what the frontend expects
                    io.sockets.emit('refresh', doc.userlist);

                })
                .catch((e) => {
                    console.log(e);
                });

        }

    });
});


//EXPRESS ROUTES
//Need this to enable CORS else it whines, figure out how to only allow it to one domain like yt.borsodidavid.com
/*app.use(function (req, res, next) {
 res.header("Access-Control-Allow-Origin", "*");
 res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
 next();
 });*/

app.use(cors());


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

            //console.log(doc, playlistArray);

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
        res.send({rooms});

    }, (e) => {
        res.status(400).send();
    });

});

app.delete('/room/:roomId', (req, res) => {
    Room.findOneAndRemove({id: req.params.roomId})
        .then((doc) => {
            Playlist.findOneAndRemove({id: req.params.roomId})
                .then((doc) => {
                    console.log('Delete playlist:', doc);
                    res.send('Room and playlist deleted');

                })
                .catch((e) => {
                    console.log(e);
                    res.status(400).send();
                });

            console.log('Delete room:', doc);
        })
        .catch((e) => {
            console.log(e);
            res.status(400).send();
        });
});


module.exports = {app};