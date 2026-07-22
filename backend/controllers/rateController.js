const express = require('express');
const router = express.Router();

router.get('/api/ratecontent', (req, res) => {
    res.json({ message: 'Rate Content API' });
});

module.exports = router;
