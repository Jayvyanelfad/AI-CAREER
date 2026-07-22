const express = require('express');
const router = express.Router();

router.get('/help', (req, res) => {
    res.send('Help Route');
});

module.exports = router;
