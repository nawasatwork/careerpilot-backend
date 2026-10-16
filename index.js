require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
    tls: true,
    tlsAllowInvalidCertificates: true,
}).then(()=> console.log('MongoDB connected'))
.catch(err => console.log('Connection Error: ', err));

const PORT = process.env.PORT || 5000;

const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

app.use('/auth', authRoutes);


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));