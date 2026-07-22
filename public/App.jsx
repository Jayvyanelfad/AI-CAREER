import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import Home from './pages/Home';
import Help from './pages/Help';
import ContactOwner from './pages/ContactOwner';
import RateContent from './pages/RateContent';
import './App.css';

function App() {
    return (
        <Router>
            <div className="container">
                <nav>
                    <Link to="/">Home</Link>
                    <Link to="/help">Help</Link>
                    <Link to="/contact-owner">Contact Owner</Link>
                    <Link to="/rate-content">Rate Our Content</Link>
                </nav>
                <Switch>
                    <Route exact path="/" component={Home} />
                    <Route path="/help" component={Help} />
                    <Route path="/contact-owner" component={ContactOwner} />
                    <Route path="/rate-content" component={RateContent} />
                </Switch>
                <footer>
                    <p>&copy; 2024 Personal Development Academy. All rights reserved.</p>
                </footer>
            </div>
        </Router>
    );
}

export default App;
