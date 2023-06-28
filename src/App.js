// App.js
import { BrowserRouter as Router, Route } from 'react-router-dom';
import Place from './components/Place';
import Navbar from './components/Navbar';
import WelcomeModal from './components/WelcomeModal';
import SongDetails from './components/SongDetails'; // Import the new SongDetails component
import SongDataContext from './contexts/SongDataContext'; // Import the SongDataContext
import React, { useState } from "react";
import './App.css';

function App() {
  const [modalShow, setModalShow] = useState(true);
  const [songData, setSongData] = useState(null); // Move songData state here
  const [hover, setHover] = useState(false); // Move hover state here

  const closeModal = () => {
    setModalShow(false);
  };

  return (
    <SongDataContext.Provider value={{ songData, setSongData, hover, setHover }}> {/* Provide the context */}
      <Router>
        <Navbar /> 
        <WelcomeModal show={modalShow} close={closeModal} />
        <div className="songpopupcontainer">
          <SongDetails className="songpopup"/>  
        </div>
        <Route path="/">
          <Place />
        </Route>
      </Router>
    </SongDataContext.Provider>
  );
}

export default App;
