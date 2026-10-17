const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId

        const existing = await User.findById(userId).select('-password');

        if (!existing) {
            return res.status(400).json({ error: 'User not found' });
        }

        res.json(existing);
    
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/', async (req, res) => {
    try 
    {
        const { name, email, resume, skills, experience, currentRole, targetRole, linkedinUrl, githubUrl, location } = req.body;
        const userId = req.user.userId

        const existing = await User.findById(userId);

        if (!existing) {
            return res.status(400).json({ error: 'User not found' });
        }

        const updated = await User.findByIdAndUpdate(userId, {name, email, resume, skills, experience, currentRole, targetRole, linkedinUrl, githubUrl, location}, {new: true}).select('-password');
        res.json(updated);
    
    } catch (err) {
        res.status(500).json({ message: err.message });
    } 
});


module.exports = router;