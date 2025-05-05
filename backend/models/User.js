const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    totalPoints: {
        type: Number,
        default: 0
    },
    rank: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('User', userSchema);