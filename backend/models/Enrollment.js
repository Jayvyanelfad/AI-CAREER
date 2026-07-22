const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true }, // Hashed password
    progress: { type: Map, of: Number, default: {} }, // Track progress for courses
    completedCourses: { type: [String], default: [] } // Store completed courses
});

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
module.exports = Enrollment;
