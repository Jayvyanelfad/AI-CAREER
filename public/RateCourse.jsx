import React, { useState } from 'react';
import axios from 'axios';

const RateCourse = ({ courseName }) => {
    const [rating, setRating] = useState('');
    const [comment, setComment] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        await axios.post('http://10.24.85.131:5000/rate', {
            course: courseName,
            rating,
            comment
        });
        setRating('');
        setComment('');
        alert('Thank you for your feedback!');
    };

    return (
        <div>
            <h1>Rate {courseName}</h1>
            <form onSubmit={handleSubmit}>
                <label>Rating (1-5):</label>
                <input type="number" value={rating} onChange={(e) => setRating(e.target.value)} required min="1" max="5" />
                <label>Comment:</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} required></textarea>
                <button type="submit">Submit</button>
            </form>
        </div>
    );
};

export default RateCourse;
