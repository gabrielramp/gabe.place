import React, { useEffect, useState } from "react";
import "./WelcomeModal.css";
import { X } from 'react-bootstrap-icons';
import SocialIcon from "./SocialIcon";

import LinkedInIcon from "./icons/linkedin.svg";
import GitHubIcon from "./icons/github.svg";
import DiscordIcon from "./icons/discord.svg";
import InstagramIcon from "./icons/instagram.svg";

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
    }, 1000); // Change every second

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
            <SocialIcon icon={LinkedInIcon} link="https://www.linkedin.com" />
            <SocialIcon icon={GitHubIcon} link="https://github.com/gabrielramp" />
            <SocialIcon icon={DiscordIcon} link="https://discord.com/" />
            <SocialIcon icon={InstagramIcon} link="https://www.instagram.com/gabriel.ramp/" />
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
        </div>
        <div className="block2">
          <h1 className="header2" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            {currentEmoji} Leave your mark!
          </h1>
          <p className="body2" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            This remake of Reddit's 2017 /r/Place experiment updates real-time for all users on the site, made with React and Konva. 
          </p>
          <p className="body3" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            If you're seeing this text, I'm lying. But soon! 
          </p>
          <p style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            I created this feature with my friend <a href="https://github.com/Wenzel-Z" style={{ textDecoration: 'underline', color:'#b0b0b0'}}>Zach</a>, who worked on the database and socket! <br/>
          </p>
        </div>
        <div className="block3">
          <h1 className="header2" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
          🚧 This site is under construction!
          </h1>
          <p className="body2" style={{ fontFamily: 'Roboto-Medium', textAlign: 'left' }}>
            Thanks for checking my site out before I release it! If I gave you the link, you're special to me!
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
