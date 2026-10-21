const express = require('express');
const router = express.Router();
const User = require('../models/User');
const upload = require('../config/upload');
const pdf = require('pdf-parse');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

router.post('/resume', upload.single('resume'), async (req, res) => {
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdf(dataBuffer);
    const extractedText = pdfData.text;

    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    const result = await model.generateContent(`
        You are a resume parser. Extract information from this resume and return ONLY a JSON object with these fields:
        {
            "skills": ["array of technical skills"],
            "experience": number of year as integer,
            "currentRole": "current job title",
            "targetRole": what role they seem to be targeting",
            "summary": "2 sentence professional summary"
        }
        
        Resume text:
        ${extractedText}

        Return ONLY the JSON. No markdown, no backticks, no explanation.
    `);

    const parsed = JSON.parse(result.response.text());
    
    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      {
        resume: extractedText,
        skills: parsed.skills,
        experience: parsed.experience,
        currentRole: parsed.currentRole,
        targetRole: parsed.targetRole,
      },
      { new: true }
    ).select('-password');

    res.json({ message: 'Resume uploaded, parsed and profile updated', parsed, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;