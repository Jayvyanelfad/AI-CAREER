import React from 'react';

const Help = () => {
    return (
        <div>
            <h1>Need Help?</h1>
            <p>If you have any questions or need assistance, please reach out to us using the contact form below.</p>
            <form>
                <label htmlFor="helpName">Name:</label>
                <input type="text" id="helpName" name="helpName" required />

                <label htmlFor="helpEmail">Email:</label>
                <input type="email" id="helpEmail" name="helpEmail" required />

                <label htmlFor="helpMessage">Message:</label>
                <textarea id="helpMessage" name="helpMessage" required></textarea>

                <button type="submit">Submit</button>
            </form>
        </div>
    );
};

export default Help;
