var mongoose = require('mongoose');

var Room = mongoose.model({
    name: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    }
});

module.exports = {Room};