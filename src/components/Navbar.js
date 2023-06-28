import { Link } from 'react-router-dom';
import NowPlaying from './NowPlaying'; // Import the NowPlaying component

import './Navbar.css';

function Navbar() {
  return (
    <div className="navbar">
      <div className="nav-items-container">
        <div className="nav-items">
          <Link className="nav-item" to="/">/</Link>
          <Link className="nav-item" to="/portfolio">/portfolio</Link>
          <Link className="nav-item" to="/about">/about</Link>
        </div>
        <div className="nowplaying">
          <NowPlaying />
        </div>
      </div>
      
    </div>
  );
}

export default Navbar;
