const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.get('/match', async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');

        if (!user.resume) {
            return res.status(400).json({ error: 'Please upload your resume first' })
        }

        const query = user.targetRole || user.currentRole || 'Full Stack Developer';

        const response = await axios.get('https://jsearch.p.rapidapi.com/search-v2', {
            params: {
                query: query,
                page: '1',
                num_pages: '1',
                date_posted: 'all',
                country: 'pk'
            },
            headers: {
                'X-RapidAPI-Key': process.env.JSEARCH_API_KEY,
                'X-RapidAPI-Host': process.env.JSEARCH_API_HOST
            }
        });

        const jobs = response.data.data.jobs.slice(0, 10);

        const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

        const scoringPrompt = `
            You are a job matching expert. Score each job 1-10 based on how well it matches this candidate profile.
            
            Candidate:
            - Skills: ${user.skills.join(', ')}
            - Current Role: ${user.currentRole}
            - Target Role: ${user.targetRole}
            - Experience: ${user.experience} years
            
            Jobs to score:
            ${jobs.map((job, i) => `
                ${i + 1}. ${job.job_title} at ${job.employer_name}
                Description: ${job.job_description?.slice(0, 300)}
            `).join('\n')}
            
            Return ONLY a JSON array:
            [
                {
                "index": 1,
                "score": 8,
                "reason": "Strong match because..."
                }
            ]
            No markdown, no backticks.
        `;

        const aiResult = await model.generateContent(scoringPrompt);
        const scores = JSON.parse(aiResult.response.text());

        const matchedJobs = jobs.map((job, i) => ({
            title: job.job_title,
            company: job.employer_name,
            location: job.job_city || job.job_country,
            url: job.job_apply_link,
            score: scores[i]?.score || 0,
            reason: scores[i]?.reason || '',
            posted: job.job_posted_at_datetime_utc
        }));

        matchedJobs.sort((a, b) => b.score - a.score);

        res.json({ jobs: matchedJobs });
    } catch (err) {
        console.log('Full error:', err.response?.data);
        console.log('Status:', err.response?.status);
        res.status(500).json({ error: err.message, details: err.response?.data });
    }
});

router.post('/cover-letter', async (req, res) => {
    try {
        const {jobTitle, company, jobDescription} = req.body;

        if (!jobTitle || !company || !jobDescription) {
            return res.status(400).json({error: 'Job title, company and description are required'});
        }

        const user = await User.findById(req.user.userId).select('-password');

        if (!user.resume) {
            return res.status(400).json({error: 'Please upload your resume first'});
        }

        const model = genAI.getGenerativeModel({model: 'gemini-3.8-flash'});

        const result = await model.generateContent(`
            Write a professional cover letter for this candidate applying to this job.
            
            Candidate Resume:
            ${user.resume}

            Job Title: ${jobTitle}
            Company: ${company}
            Job Description: ${jobDescription.slice(0, 1000)}

            Requirements:
            - 3 paragraph max
            - Professional but personable tone
            - Reference specific skills from resume that match the job
            - Do not use generic phrase like "I am writing to express my interest"
            - End with a confident closing
            - No placeholders like [Your Name] - use the actual name from the resume
        `);

        res.json({coverLetter: result.response.text()});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

module.exports = router;
