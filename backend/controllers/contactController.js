const express = require("express");
const Enrollment = require("../models/Enrollment");
const router = express.Router();
const jsPDF = require("jspdf");
const path = require("path");
const fs = require("fs");

// Generate a certificate
const generateCertificate = (userName, courseName) => {
    const doc = new jsPDF();
    doc.text(`Certificate of Completion`, 10, 10);
    doc.text(`This certifies that ${userName} has successfully completed the ${courseName} course.`, 10, 20);
    const filePath = path.join(__dirname, `../certificates/${userName}_${courseName}.pdf`);
    doc.save(filePath);
    return filePath;
};

// API to generate and download a certificate
router.post("/certificate", async (req, res) => {
    const { email, course } = req.body;

    try {
        const enrollment = await Enrollment.findOne({ email });
        if (!enrollment) {
            return res.status(404).json({ error: "User not found" });
        }

        const userName = `${enrollment.firstName} ${enrollment.lastName}`;
        const certificatePath = generateCertificate(userName, course);

        // Add certificate URL to the user's record
        enrollment.certificates.push(certificatePath);
        await enrollment.save();

        res.status(200).json({ certificateUrl: certificatePath });
    } catch (error) {
        res.status(500).json({ error: "Error generating certificate" });
    }
});

module.exports = router;