const express = require("express");
const router = express.Router();

// ✅ Register New Enrollment (SQLite version)
router.post("/", async (req, res) => {
    try {
        const { firstName, lastName, email, phone, course, experienceLevel } = req.body;
        const db = req.app.locals.db;

        // Check if already enrolled
        const existing = await db.get(
            "SELECT * FROM enrollments WHERE email = ? AND course = ?",
            [email, course]
        );

        if (existing) {
            return res.status(400).json({ error: "You are already enrolled in this course." });
        }

        const result = await db.run(
            "INSERT INTO enrollments (firstName, lastName, email, phone, course, experienceLevel, enrolledAt, progress) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 0)",
            [firstName, lastName, email, phone, course, experienceLevel || 'beginner']
        );

        res.status(201).json({ 
            message: "Enrollment successful", 
            enrollmentId: result.lastID 
        });
    } catch (error) {
        res.status(500).json({ error: "Error creating enrollment", details: error.message });
    }
});

// ✅ Update Course Progress
router.post("/:email/progress", async (req, res) => {
    try {
        const { email } = req.params;
        const { course, progress } = req.body;
        const db = req.app.locals.db;

        const enrollment = await db.get(
            "SELECT * FROM enrollments WHERE email = ? AND course = ?",
            [email, course]
        );

        if (!enrollment) {
            return res.status(404).json({ error: "Enrollment not found" });
        }

        await db.run(
            "UPDATE enrollments SET progress = ? WHERE email = ? AND course = ?",
            [progress, email, course]
        );

        res.status(200).json({ message: "Progress updated", progress });
    } catch (error) {
        res.status(500).json({ error: "Error updating progress", details: error.message });
    }
});

// ✅ Mark Course as Completed
router.post("/:email/complete", async (req, res) => {
    try {
        const { email } = req.params;
        const { course } = req.body;
        const db = req.app.locals.db;

        const enrollment = await db.get(
            "SELECT * FROM enrollments WHERE email = ? AND course = ?",
            [email, course]
        );

        if (!enrollment) {
            return res.status(404).json({ error: "Enrollment not found" });
        }

        await db.run(
            "UPDATE enrollments SET completed = 1, completedAt = datetime('now'), progress = 100 WHERE email = ? AND course = ?",
            [email, course]
        );

        // Generate certificate record
        await db.run(
            "INSERT INTO certificates (email, course, issuedAt, certificateId) VALUES (?, ?, datetime('now'), ?)",
            [email, course, 'CERT-' + Date.now()]
        );

        res.status(200).json({ 
            message: "Course marked as completed. Certificate generated!", 
            certificateId: 'CERT-' + Date.now()
        });
    } catch (error) {
        res.status(500).json({ error: "Error marking course as completed", details: error.message });
    }
});

// ✅ Get User Enrollments
router.get("/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const db = req.app.locals.db;

        const enrollments = await db.all(
            "SELECT * FROM enrollments WHERE email = ?",
            [email]
        );

        res.status(200).json({ enrollments });
    } catch (error) {
        res.status(500).json({ error: "Error fetching enrollments", details: error.message });
    }
});

module.exports = router;