import React from "react";

const SocialIcon = ({ icon, link }) => {
  return (
    <a href={link} target="_blank" rel="noopener noreferrer">
      <img src={icon} alt="Social Icon" />
    </a>
  );
};

export default SocialIcon;