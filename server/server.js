var express = require('express');
var bodyParser = require('body-parser');
var {ObjectID} = require('mongodb');
var getYoutubeVideo = require('./functions/get-youtube-video');


var {mongoose} = require('./db/mongoose');
var {Song} = require('./models/song');

var app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());


//Send songs to the be added to the list
app.post('/song', (req, res) => {
    var videoID = req.body.id;
    var songDetails = {};

    getYoutubeVideo.getVideoDetails(videoID)
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

    if(!ObjectID.isValid(id)){
        return res.status(404).send();
    }

    Song.findByIdAndRemove(id).then((song) => {

        if(!song){
            return res.status(404).send();
        }

        res.send(song);

    }, (e) => {
        res.status(400).send();
    });

});

app.listen(port, () => {
    console.log(`Started up at port ${port}`);
});

module.exports = {app};