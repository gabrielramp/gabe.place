// App.js
import { BrowserRouter as Router, Route } from 'react-router-dom';
import Place from './components/Place';
import Navbar from './components/Navbar';
import WelcomeModal from './components/WelcomeModal';
import SongDetails from './components/SongDetails'; // Import the new SongDetails component
import SongDataContext from './contexts/SongDataContext'; // Import the SongDataContext
import React, { useState, useEffect } from "react";
import './App.css';
import { pushRotate as Menu } from 'react-burger-menu'
import { BiMenu } from 'react-icons/bi';
import { Link } from 'react-router-dom';

function App() {
  const [modalShow, setModalShow] = useState(true);
  const [songData, setSongData] = useState(null); // Move songData state here
  const [hover, setHover] = useState(false); // Move hover state here
  const [isMenuOpen, setIsMenuOpen] = useState(false); 

  const closeModal = () => {
    setModalShow(false);
  };

  function toggleScrollable() {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      document.body.setAttribute("style", "position: fixed;");
    }
    else {
      setIsMenuOpen(true);
      document.body.setAttribute("style", "position: static;");
    }
  }

  useEffect(() => {
    const button = document.querySelector('.bm-burger-button');
    if (modalShow) {
      button.style.display = 'none';
    } else {
      button.style.display = 'block';
    }
  }, [modalShow, isMenuOpen]);

  return (
    <div id="outer-container">
      <WelcomeModal className='bigmodal' show={modalShow} close={closeModal} />
      <SongDataContext.Provider value={{ songData, setSongData, hover, setHover }}> {/* Provide the context */}
        <Router>
          <Menu
            pageWrapId="page-wrap"
            outerContainerId="outer-container"
            customBurgerIcon={<BiMenu />}
            onStateChange={toggleScrollable} // Disable scrolling when sidebar menu
          >
            <Link className="nav-item" to="/">/</Link>
            <Link className="nav-item" to="/portfolio">/portfolio</Link>
            <Link className="nav-item" to="/about">/about</Link>
          </Menu>
          
          <main
            id="page-wrap"
            className={isMenuOpen ? 'menu-open' : ''} // Add menu-open class when menu is open
          >
            <Navbar /> 
            <div className="songpopupcontainer">
              <SongDetails className="songpopup"/>  
            </div>
            <Route path="/">
              <Place />
            </Route>
          </main>
        </Router>
      </SongDataContext.Provider>
    </div>
  );
}

export default App;
