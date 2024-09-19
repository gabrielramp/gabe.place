import React, { useEffect, useState } from "react";
import "./WelcomeModal.css";
import { X } from 'react-bootstrap-icons';
import SocialIcon from "./SocialIcon";

import LinkedInIcon from "./icons/linkedin.svg";
import GitHubIcon from "./icons/github.svg";
import DiscordIcon from "./icons/discord.svg";
import InstagramIcon from "./icons/instagram.svg";
import { ReactComponent as AppleLogo } from "./icons/Apple_logo_black.svg";

const WelcomeModal = (props) => {

  const calculateAge = () => {
    const birthDate = new Date(2000, 5, 7); // Note: JavaScript counts months from 0
    const today = new Date();
    let age = today - birthDate;
    age = age / 1000 / 60 / 60 / 24 / 365.25; // Convert from milliseconds to years
    return age.toFixed(4);
  };

  const closeModal = (e) => {
    if (e.target.className === 'modal show-modal') {
      props.close();
    }
  }

  // Emoji array for place header
  const emojis = ["🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜"];
  const [currentEmoji, setCurrentEmoji] = useState(emojis[0]);
  useEffect(() => {
    const interval = setInterval(() => {
      // Get the index of the current emoji
      const currentEmojiIndex = emojis.indexOf(currentEmoji);

      // If the current emoji is the last one in the array, reset to the first emoji
      // Otherwise, move to the next emoji
      if (currentEmojiIndex === emojis.length - 1) {
        setCurrentEmoji(emojis[0]);
      } else {
        setCurrentEmoji(emojis[currentEmojiIndex + 1]);
      }
    }, 600); // Change every second

    // Cleanup function to clear the interval when the component unmounts
    return () => {
      clearInterval(interval);
    };
  }, [currentEmoji]); 

  return (
    <div className={props.show ? "modal show-modal" : "modal hide-modal"} onClick={closeModal}>
      <div className="modal-content">
        <div className="headerItems">
          <div className="social-icons">
            <SocialIcon icon={LinkedInIcon} link="https://www.linkedin.com/in/gabrielramp/" />
            <SocialIcon icon={GitHubIcon} link="https://github.com/gabrielramp" />
            <SocialIcon icon={DiscordIcon} link="https://discord.com/" />
            <SocialIcon icon={InstagramIcon} link="https://www.instagram.com/jetsetworm/" />
          </div>
          <div className="close-button-container">
            <X className="close-button" onClick={props.close} />
          </div>
          <h1 className="header1" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            Hey, I'm <span style={{ color: '#0047ab' }}>Gabe</span> 😃
          </h1>
          <p className="flavor1" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            I'm a ~{calculateAge()} year old software engineer currently based out of Orlando, FL.
          </p>
          <p className="flavor1" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            I just finished up contributing to Machine Learning @ <AppleLogo className="apple-logo" /> and am obtaining my Computer Science Bachelor's at UCF in 2025.
          </p>
        </div>
        <div className="block2">
          <h1 className="header2" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            {currentEmoji} Place Tiles!
          </h1>
          <p className="body2" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            This canvas is updated real-time and directly inspired by Reddit's 2017 /r/Place experiment, made with React and PixiJS. 
          </p>
          <p style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
          </p>
          <p style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
          </p>
          <p style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
          </p>
        </div>
        <div className="block3">
          <h1 className="header2" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
          🎵 Peep What I'm Listening To!
          </h1>
          <p className="body2" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            Please. I spent way too long on this feature. Live Spotify snooper using Spotify API, React, and CSS. 
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
