// Navbar
import Navbar from './components/navbar/Navbar';

// Spotify feature
import SongDetails from './components/navbar/SongDetails'; // Import the new SongDetails component
import SongDataContext from './contexts/SongDataContext'; // Import the SongDataContext

// WelcomeModal
import WelcomeModal from './components/welcome-modal/WelcomeModal';

// WifeyWoes
import WifeyWoes from './components/wifey-woes/WifeyWoes';

// Place Feature
import Place from './components/place-feature/place_new'; // Ensure this is the PixiJS-based Place component

// React imports
import './App.css';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from "react";
import { pushRotate as Menu } from 'react-burger-menu';
import { Link } from 'react-router-dom';

function App() {
  const [modalShow, setModalShow] = useState(true);
  const [songData, setSongData] = useState(null);
  const [hover, setHover] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Toast state and helper
  const [toastMsg, setToastMsg] = useState('');
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 7000);
  }, []);

  const isWifeyRoute = window.location.pathname.startsWith('/wifeywoes');

  const closeModal = () => {
    setModalShow(false);
  };

  function toggleScrollable() {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      document.body.setAttribute("style", "position: fixed;");
    } else {
      setIsMenuOpen(true);
      document.body.setAttribute("style", "position: static;");
    }
  }

  useEffect(() => {
    const button = document.querySelector('.bm-burger-button');
    if (button) {
      if (modalShow) {
        button.style.display = 'none';
      } else {
        button.style.display = 'block';
      }
    }
  }, [modalShow, isMenuOpen]);

  // hamburger menu icon in Menu <>             customBurgerIcon={<BiMenu />}
  return (
    <div id="outer-container">
      {toastMsg && <div className="toast">{toastMsg}</div>}
      { !isWifeyRoute && (
        <WelcomeModal className='bigmodal' show={modalShow} close={closeModal} />
      )}
      <SongDataContext.Provider value={{ songData, setSongData, hover, setHover }}> {/* Provide the context */}
        <Router>
          { !isWifeyRoute && (
            <Menu
              pageWrapId="page-wrap"
              outerContainerId="outer-container"
              onStateChange={toggleScrollable}
            >
              <Link className="nav-item" to="/">/</Link>
              <Link className="nav-item" to="/portfolio">/portfolio</Link>
              <Link className="nav-item" to="/about">/about</Link>
            </Menu>
          ) }
          
          <main
            id="page-wrap"
            className={isMenuOpen ? 'menu-open' : ''} // Add menu-open class when menu is open
          >
            { !isWifeyRoute && (
              <>
                <Navbar />
                <div className="songpopupcontainer">
                  <SongDetails className="songpopup"/>
                </div>
              </>
            ) }
            <Switch>
              <Route exact path="/">
                <Place />
              </Route>
              <Route path="/wifeywoes">
                <WifeyWoes showToast={showToast} />
              </Route>
            </Switch>
          </main>
        </Router>
      </SongDataContext.Provider>
    </div>
  );
}

export default App;
