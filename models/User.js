const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: {type: String, unique: true},
    password: String,
    resume: {type: String},
    skills: [String],
    experience: Number,
    currentRole: String, 
    targetRole: String,
    linkedinUrl: String, 
    githubUrl: String,
    location: String,
}, { timestamp: true});

module.exports = mongoose.model('User', userSchema);