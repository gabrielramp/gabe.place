import { BrowserRouter as Router, Route } from 'react-router-dom';

import Place from './components/Place';
import Navbar from './components/Navbar';
import WelcomeModal from './components/WelcomeModal';
import React, { useState } from "react";

function App() {
  const [modalShow, setModalShow] = useState(true);

  const closeModal = () => {
    setModalShow(false);
  };
  
  return (
    <Router>
      <Navbar />
      <WelcomeModal show={modalShow} close={closeModal} />
      <Route path="/">
        <Place />
      </Route>
    </Router>
  );
}

export default App;
