import React, { useState } from 'react';

const RateContent = () => {
    const [rating, setRating] = useState('');
    const [feedback, setFeedback] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();

        const ratingData = {
            rating,
            feedback
        };

        try {
            const response = await fetch('http://localhost:3000/api/ratecontent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ratingData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.text();
            alert(result);
            setRating('');
            setFeedback('');
        } catch (error) {
            console.error('Failed to submit rating:', error);
            alert('Failed to submit rating. Please try again.');
        }
    };

    return (
        <div>
            <h1>Rate Our Content</h1>
            <p>We value your feedback. Please rate our content and share your thoughts.</p>
            <form onSubmit={handleSubmit}>
                <label htmlFor="rating">Rating:</label>
                <select id="rating" name="rating" value={rating} onChange={(e) => setRating(e.target.value)} required>
                    <option value="">Select a rating</option>
                    <option value="5">Excellent</option>
                    <option value="4">Good</option>
                    <option value="3">Average</option>
                    <option value="2">Below Average</option>
                    <option value="1">Poor</option>
                </select>

                <label htmlFor="feedback">Feedback:</label>
                <textarea id="feedback" name="feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} required></textarea>

                <button type="submit">Submit</button>
            </form>
        </div>
    );
};

export default RateContent;
