import React, { useContext, useEffect, useState } from 'react';
import SongDataContext from '../contexts/SongDataContext';

import './SongDetails.css'; // Import the new CSS

function SongDetails() {
    const { songData, hover } = useContext(SongDataContext);
  
    const [progressMs, setProgressMs] = useState(songData ? songData.progress_ms : 0);
    const [currentTime, setCurrentTime] = useState("");
    const [totalTime, setTotalTime] = useState("");
    
    useEffect(() => {
      if (songData) {
        setProgressMs(songData.progress_ms);
        setTotalTime(formatTime(songData.item.duration_ms));
      }
    }, [songData]);
  
    useEffect(() => {
      const intervalId = setInterval(() => {
        setProgressMs(prevProgressMs => {
          const newProgressMs = prevProgressMs + 1000;
          setCurrentTime(formatTime(newProgressMs));
          return newProgressMs;
        });
      }, 1000);
      return () => clearInterval(intervalId);
    }, []);
  
    if (!songData) {
      return null;
    }
    
    const progressPercent = (progressMs / songData.item.duration_ms) * 100;
  
    return (
        <div className={`song-details ${hover ? "show" : "hide"}`}>
            <img src={songData.item.album.images[2].url} alt="Album cover" />
            <div className="song-info">
                <p className="songtitle" style={{ color: '#b0b0b0' }}>{songData.item.name}</p>
                <p className="songartist" style={{ color: '#b0b0b0', fontSize: '0.8em' }}>{songData.item.artists[0].name}</p>

                
                <div className="progress-bar-container">
                    <div className="progresstime">{currentTime}</div>
                    <div className="progress-bar">
                        <div className="progress-barinside" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="progresstime">{totalTime}</div>
                </div>
            </div>
        </div>
    );
}
  
// 
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }

export default SongDetails;
