const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const { default: mongoose } = require('mongoose');

// Get leaderboard with filters
router.get('/', async (req, res) => {
    try {
        const { filter, userId } = req.query;
        let query = {};
        
        if (filter) {
            const now = new Date();
            if (filter === 'day') {
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const endOfDay = new Date(startOfDay);
                endOfDay.setDate(startOfDay.getDate() + 1);
                query.createdAt = { $gte: startOfDay, $lt: endOfDay };
            } else if (filter === 'month') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                query.createdAt = { $gte: startOfMonth, $lt: endOfMonth };
            } else if (filter === 'year') {
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                query.createdAt = { $gte: startOfYear, $lt: endOfYear };
            }
        }

        let users;
        if (userId) {
            console.log(userId,"userId...");
            
            // Find the user first by searching full text
            // Search for users matching the search term
            const searchedUsers = await User.find({
                $or: [
                    { userId: { $regex: userId, $options: 'i' } },
                    { fullName: { $regex: userId, $options: 'i' } },
                    { email: { $regex: userId, $options: 'i' } }
                ]
            }).lean();

            // Get all other users
            const otherUsers = await User.find({
                _id: { 
                    $nin: searchedUsers.map(user => user._id)
                }
            }).lean();

            // Combine searched and other users, with searched users first
            const allUsers = [...searchedUsers, ...otherUsers];

            if (!allUsers.length) {
                return res.status(404).json({ message: 'No users found' });
            }

            // Get filtered activities for all users
            const activities = await Activity.aggregate([
                { $match: { 
                    ...query,
                    userId: { $in: allUsers.map(user => new mongoose.Types.ObjectId(user._id)) }
                }},
                { $group: {
                    _id: "$userId",
                    filteredPoints: { $sum: "$points" }
                }}
            ]);

            // Create points map for quick lookup
            const pointsMap = activities.reduce((acc, curr) => {
                acc[curr._id.toString()] = curr.filteredPoints;
                return acc;
            }, {});

            // Combine user data with their points and add isSearched flag
            users = allUsers.map(user => ({
                ...user,
                filteredPoints: pointsMap[user._id.toString()] || 0,
                isSearched: searchedUsers.some(searchedUser => 
                    searchedUser._id.toString() === user._id.toString()
                )
            }));

            // Sort searched users first, then by points
            users.sort((a, b) => {
                if (a.isSearched && !b.isSearched) return -1;
                if (!a.isSearched && b.isSearched) return 1;
                return b.filteredPoints - a.filteredPoints;
            });
        } else {
            // Get all users
            const allUsers = await User.find().lean();
            
            // Get filtered activities for all users
            const activities = await Activity.aggregate([
                { $match: query },
                { $group: {
                    _id: "$userId",
                    filteredPoints: { $sum: "$points" }
                }}
            ]);

            // Create a map of userId to filtered points
            const pointsMap = activities.reduce((acc, curr) => {
                acc[curr._id.toString()] = curr.filteredPoints;
                return acc;
            }, {});

            // Combine user data with filtered points
            users = allUsers.map(user => ({
                ...user,
                filteredPoints: pointsMap[user._id.toString()] || 0
            }));
            users.sort((a, b) => b.filteredPoints - a.filteredPoints);
            users = users.map((user, index) => ({
                ...user,
                tempRank: index + 1
            }));
        }

        // Sort by filtered points and assign temporary ranks

        res.json(users);
    } catch (error) {
        console.log(error,"er...");
        
        res.status(500).json({ message: error.message });
    }
});

// Recalculate leaderboard
router.post('/recalculate', async (req, res) => {
    try {
        // Get existing users
        const users = await User.find().lean();
        
        // Add random activities for each user
        const activities = [];
        for (const user of users) {
            const numActivities = Math.floor(Math.random() * 5) + 1; // 1-5 activities
            for (let i = 0; i < numActivities; i++) {
                activities.push({
                    userId: user._id,
                    points: 20,
                    type: 'login',
                    timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
                });
            }
        }
        console.log(activities,"activities....");
        
        // Insert all activities
        await Activity.insertMany(activities);

        // Recalculate total points for each user
        const userPoints = await Activity.aggregate([
            { $group: {
                _id: "$userId",
                totalPoints: { $sum: "$points" }
            }}
        ]);

        // Update each user's total points
        for (const userPoint of userPoints) {
            await User.updateOne(
                { _id: userPoint._id },
                { $set: { totalPoints: userPoint.totalPoints }}
            );
        }

        // Get all users sorted by total points
        const updatedUsers = await User.find()
            .sort({ totalPoints: -1 })
            .lean();

        // Update ranks handling ties
        let currentRank = 1;
        let prevPoints = null;

        for (let i = 0; i < updatedUsers.length; i++) {
            if (prevPoints !== null && prevPoints !== updatedUsers[i].totalPoints) {
                currentRank = i + 1;
            }

            await User.updateOne(
                { _id: updatedUsers[i]._id },
                { $set: { rank: currentRank }}
            );

            prevPoints = updatedUsers[i].totalPoints;
        }

        res.json({
            message: 'Dummy data added and leaderboard recalculated successfully',
            activitiesAdded: activities.length,
            usersUpdated: updatedUsers.length
        });
    } catch (error) {
        console.error('Error adding dummy data:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add activity
router.post('/activity', async (req, res) => {
    try {
        const { userId, type, points = 20 } = req.body;  // Changed activityType to type to match schema

        // Validate required fields
        if (!userId || !type) {
            return res.status(400).json({ message: 'userId and type are required' });
        }

        // Find user first to get the ObjectId
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create activity with proper schema
        const activity = new Activity({
            userId: user._id,  // Use the user's ObjectId
            type,             // Use type instead of activityType
            points,
            createdAt: new Date()
        });
        await activity.save();

        // Update user points atomically
        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id },  // Use _id instead of userId
            { $inc: { totalPoints: points }},
            { new: true }
        );

        res.status(201).json({
            activity,
            userPoints: updatedUser.totalPoints
        });
    } catch (error) {
        console.error('Error adding activity:', error);
        res.status(400).json({ message: error.message });
    }
});

// Add dummy data and recalculate
router.post('/add-dummy-data', async (req, res) => {
    try {
        // Get existing users
        const users = await User.find().lean();
        
        // Add random activities for each user
        const activities = [];
        for (const user of users) {
            const numActivities = Math.floor(Math.random() * 5) + 1; // 1-5 activities
            for (let i = 0; i < numActivities; i++) {
                activities.push({
                    userId: user._id,
                    points: 20,
                    timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
                });
            }
        }
        console.log(activities,"activities....");
        
        // Insert all activities
        await Activity.insertMany(activities);

        // Recalculate total points for each user
        const userPoints = await Activity.aggregate([
            { $group: {
                _id: "$userId",
                totalPoints: { $sum: "$points" }
            }}
        ]);

        // Update each user's total points
        for (const userPoint of userPoints) {
            await User.updateOne(
                { _id: userPoint._id },
                { $set: { totalPoints: userPoint.totalPoints }}
            );
        }

        // Get all users sorted by total points
        const updatedUsers = await User.find()
            .sort({ totalPoints: -1 })
            .lean();

        // Update ranks handling ties
        let currentRank = 1;
        let prevPoints = null;

        for (let i = 0; i < updatedUsers.length; i++) {
            if (prevPoints !== null && prevPoints !== updatedUsers[i].totalPoints) {
                currentRank = i + 1;
            }

            await User.updateOne(
                { _id: updatedUsers[i]._id },
                { $set: { rank: currentRank }}
            );

            prevPoints = updatedUsers[i].totalPoints;
        }

        res.json({
            message: 'Dummy data added and leaderboard recalculated successfully',
            activitiesAdded: activities.length,
            usersUpdated: updatedUsers.length
        });
    } catch (error) {
        console.error('Error adding dummy data:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;