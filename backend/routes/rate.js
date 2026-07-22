const express = require('express');
const router = express.Router();

router.get('/ratecontent', (req, res) => {
    res.send('Rate Content Route');
});

module.exports = router;
