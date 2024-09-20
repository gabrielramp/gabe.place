import NowPlaying from './NowPlaying'; // Import the NowPlaying component

import './Navbar.css';

function Navbar() {
  return (
    <div className="navbar">
      <div className="nav-items-container">
        {/*<div className="nav-items">
        </div>*/}
        <div className="nowplaying">
          <NowPlaying />
        </div>
      </div>
      
    </div>
  );
}

export default Navbar;