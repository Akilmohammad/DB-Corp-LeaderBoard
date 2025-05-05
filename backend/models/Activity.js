const mongoose = require('mongoose');
const activitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    type: {                    // Changed from activityType to type
        type: String,
        required: true
    },
    points: {
        type: Number,
        default: 20
    },
    createdAt: {              // Changed from timestamp to createdAt to match the filter query
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Activity', activitySchema);