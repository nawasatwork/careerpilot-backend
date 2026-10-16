const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async(req, res) => {
    try {
        const {name, email, password, resume, skills, experience, currentRole, targetRole, linkedinUrl, githubUrl, location} = req.body;
        
        const existing = await User.findOne({email});
        if (existing) {
            return res.status(400).json({error: 'Email already registered'});
        }

        const hashed = await bcrypt.hash(password, 10);

        const user = new User({name, email, password: hashed, resume, skills, experience, currentRole, targetRole, linkedinUrl, githubUrl, location });
        await user.save();

        res.json({message: 'User registered successfully'});
    } catch (err) {
        res.status(500).json({message: err.message});
    }
});

router.post('/login', async(req, res) => {
    try {
        const {email, password} = req.body;

        const user = await User.findOne({email});
        if (!user) {
            return res.status(400).json({error: 'Invalid credentials'});
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({error: 'Invalid credentials'});
        }

        const token = jwt.sign(
            {userId: user._id},
            process.env.JWT_SECRET,
            {expiresIn: '7d'}
        );

        res.json({ token, user: {id: user._id, name: user.name, email: user.email} });
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

module.exports = router;