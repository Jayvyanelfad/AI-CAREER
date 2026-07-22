const express = require('express');
const router = express.Router();

router.get('/contactus', (req, res) => {
    res.send('Contact Us Route');
});

module.exports = router;
