var axios = require('axios');
var APIkey = 'AIzaSyDKSHOjEWO3fWq5MWLrJmavVJd7MucgtuQ';

var getVideoDetails = (id) => {
    return new Promise((resolve, reject) => {
        var details = {};


        axios.get('https://www.googleapis.com/youtube/v3/videos?id=' + id + '&key=' + APIkey + '&part=snippet,contentDetails')
            .then((response) => {
                if (response.data.items.length !== 0) {
                    var title = response.data.items[0].snippet.title;
                    var duration = response.data.items[0].contentDetails.duration;

                    details = {
                        title,
                        id,
                        duration
                    };

                    resolve(details);

                } else {
                    reject(Error('Invalid input. Please give a proper youtube link!'));

                }

            })
            .catch(function (error) {
                reject(Error(error));
                console.log(error);
            });


    })
};

/*var getVideoDetails = new Promise((resolve, reject) => {

 var details;

 axios.get('https://www.googleapis.com/youtube/v3/videos?id=' + id + '&key=' + APIkey + '&part=snippet,contentDetails')
 .then((response) => {
 if (response.data.items.length !== 0) {
 var title = response.data.items[0].snippet.title;
 var duration = response.data.items[0].contentDetails.duration;

 details = {
 title,
 id,
 duration
 }

 } else {
 console.log('Invalid input. Please give a proper youtube link!');
 }

 })
 .catch(function (error) {
 console.log(error);
 });

 if (details) {
 resolve(details);
 } else {
 reject(Error("It broke"));
 }

 });*/

module.exports = {getVideoDetails};