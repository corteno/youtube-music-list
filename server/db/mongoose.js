var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://corten:shepard75@ds151060.mlab.com:51060/youtube-music-app'); /*'mongodb://localhost:27017/yt-list-app');*/


module.exports = {mongoose};