const mongoose = require('mongoose');
const User = require('./models/User');
const Activity = require('./models/Activity');
require('dotenv').config();

const dummyUsers = [
    { userId: 'USER001', fullName: 'John Doe' },
    { userId: 'USER002', fullName: 'Jane Smith' },
    { userId: 'USER003', fullName: 'Bob Johnson' },
    { userId: 'USER004', fullName: 'Alice Brown' },
    { userId: 'USER005', fullName: 'Charlie Wilson' }
];

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Clear existing data
        await User.deleteMany({});
        await Activity.deleteMany({});

        // Create users with proper ObjectId references
        const users = await User.insertMany(dummyUsers.map(user => ({
            ...user,
            _id: new mongoose.Types.ObjectId(),  // Explicitly create ObjectId
            totalPoints: 0 // Initialize totalPoints
        })));

        // Activity types for better filtering
        const activityTypes = ['login', 'post', 'comment', 'share', 'like'];
        const pointValues = {
            login: 10,
            post: 20,
            comment: 15,
            share: 25,
            like: 5
        };

        // Create random activities for each user with more detailed data
        for (const user of users) {
            const numActivities = Math.floor(Math.random() * 10) + 1;
            for (let i = 0; i < numActivities; i++) {
                const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
                const activity = new Activity({
                    userId: user._id,  // Reference user by ObjectId
                    type: activityType,
                    points: pointValues[activityType],
                    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                    // metadata: {
                    //     platform: ['web', 'mobile', 'desktop'][Math.floor(Math.random() * 3)],
                    //     duration: Math.floor(Math.random() * 60) + 1,
                    //     success: Math.random() > 0.1  // 90% success rate
                    // }
                });
                await activity.save();
                user.totalPoints += pointValues[activityType];
                
                // Track activity counts by type
                user.activityCounts = user.activityCounts || {};
                user.activityCounts[activityType] = (user.activityCounts[activityType] || 0) + 1;
            }
            await user.save();
        }

        // Calculate initial ranks with tie handling
        const sortedUsers = await User.find()
            .sort({ totalPoints: -1, 'activityCounts.post': -1 }); // Secondary sort by post count
        
        let currentRank = 1;
        let prevPoints = null;
        let sameRankCount = 0;
        
        for (let i = 0; i < sortedUsers.length; i++) {
            if (prevPoints !== null && prevPoints !== sortedUsers[i].totalPoints) {
                currentRank = i + 1 - sameRankCount;
                sameRankCount = 0;
            } else {
                sameRankCount++;
            }
            
            sortedUsers[i].rank = currentRank;
            sortedUsers[i].lastUpdated = new Date();
            await sortedUsers[i].save();
            prevPoints = sortedUsers[i].totalPoints;
        }

        console.log('Database seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();