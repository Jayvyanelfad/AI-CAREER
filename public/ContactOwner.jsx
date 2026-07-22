import React from 'react';

const ContactOwner = () => {
    return (
        <div>
            <h1>Contact the Owner</h1>
            <p>For any queries or feedback directly for the owner, please use the form below.</p>
            <form>
                <label htmlFor="ownerName">Name:</label>
                <input type="text" id="ownerName" name="ownerName" required />

                <label htmlFor="ownerEmail">Email:</label>
                <input type="email" id="ownerEmail" name="ownerEmail" required />

                <label htmlFor="ownerMessage">Message:</label>
                <textarea id="ownerMessage" name="ownerMessage" required></textarea>

                <button type="submit">Submit</button>
            </form>
        </div>
    );
};

export default ContactOwner;
