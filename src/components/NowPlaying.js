// NowPlaying.js
import React, { useState, useEffect, useRef } from 'react';
import { useSpring, animated, config } from 'react-spring';
import './NowPlaying.css';
import SpotifyLogo from './icons/spotify.svg';
import SongDetails from './SongDetails'; 

const fetchToken = async () => {
  const response = await fetch('https://gabrielramp.pythonanywhere.com/token');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  } else {
    const data = await response.json();
    //console.log(data);
    return data.access_token;
  }
}

const fetchCurrentSong = async (accessToken) => {
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  } else {
    const songData = await response.json();
    return songData;
  }



}

function NowPlaying() {
  const [songData, setSongData] = useState(null);
  const [hover, setHover] = useState(false);
  const [songWidth, setSongWidth] = useState(0);
  const [progressMs, setProgressMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    fetchToken()
      .then(accessToken => {
        fetchCurrentSong(accessToken)
          .then(data => {
            setSongData(data);
            setProgressMs(data.progress_ms);
            setDurationMs(data.item.duration_ms);
          })
          .catch(error => console.log(error));
      })
      .catch(error => console.log(error));
  }, []);

  // This useEffect sets up an interval that checks if the song has finished every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (songData) {
        setProgressMs(prevProgressMs => prevProgressMs + 1000);

        if (progressMs >= durationMs) {
          // If the song has finished, re-fetch the songData
          fetchToken()
            .then(accessToken => {
              fetchCurrentSong(accessToken)
                .then(data => {
                  setSongData(data);
                  setProgressMs(data.progress_ms);
                  setDurationMs(data.item.duration_ms);
                })
                .catch(error => console.log(error));
            })
            .catch(error => console.log(error));
        }
      }
    }, 1000);

    // Clean up the interval on unmount
    return () => clearInterval(intervalId);
  }, [songData, progressMs, durationMs]);

  useEffect(() => {
    //console.log(`NEWSONGWIDTH:   ${songWidth}`)
    setAnimationProps({
      from: { transform: 'translateX(0%)' },
      to: async (next) => {
        await delay(1000);
        if (songWidth > 100) {
          await next({ transform: `translateX(-${songWidth}px)` });
        }
        else {
          //console.log(`too short 1`)
          await next({ transform: `translateX(0%)` });
        }
      },
      config: { duration: 5000 },
      delay: 2000,
      reset: true,
      loop: true,
      onRest: () => {
        //console.log(`onResting from the second getter`)
        if (songWidth > 100) {
          setAnimationProps({
            from: { transform: 'translateX(0%)' }, to: async (next) => {
              await delay(2000);
              await next({ transform: `translateX(-${songWidth}px)` });
            }
          });
        }
        else {
          //console.log(`too short 2`)
        }
      }
    });
  }, [songWidth]);

  const [animationProps, setAnimationProps, stop] = useSpring(() => ({
    from: { transform: 'translateX(0%)' },
    to: { transform: 'translateX(0%)' },
    config: { duration: 5000 },
    reset: true,
    loop: true,
    onRest: () => {
      //console.log(`onResting from the first setter`)
      if (songWidth > 100) {
        setAnimationProps({
          from: { transform: 'translateX(0%)' }, to: async (next) => {
            await delay(2000);
            await next({ transform: `translateX(-${songWidth}px)` });
          }
        });
      }
      else {
        //console.log(`too short 3`)
      }
    }
  }), [songWidth]);

  // Makes sure that the song text is as big as the window or more -- if it isn't, then we don't want the duplicate 'marquee' text to show up, so we don't include it and we don't animate it.
  function checkWidth() {
    if (songWidth > 100) {
      //console.log(`songWidth > 100 in songText`)
      return `${songData.item.name} - ${songData.item.artists[0].name}⠀⠀⠀⠀⠀⠀${songData.item.name} - ${songData.item.artists[0].name}`
    }
    else {
      //console.log(`songWidth < 100 in songText`)
      return `${songData.item.name} - ${songData.item.artists[0].name}`
    }
  }

  // Get the song details that will be displayed in the 'NowPlaying'.
  let songText = songData
    ? checkWidth()
    : 'Nothing Right Now';

  useEffect(() => {
    if (songData) {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext("2d");
      ctx.font = "8px Roboto-Medium";
      setSongWidth(ctx.measureText(`${songData.item.name} - ${songData.item.artists[0].name}⠀⠀⠀⠀⠀⠀`).width);
    }
  }, [songText]);

  // In your render method...
// Calculate the progress as a percentage
const progressPercent = (progressMs / durationMs) * 100;

  return (
    <div
      className={`now-playing ${hover ? 'hovered' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <img src={SpotifyLogo} alt="Spotify Logo" className="spotify-logo" />
      <div>
        <p>Now Playing</p>
        <div className="songname" style={{ fontFamily: 'Roboto-Medium', fontSize: 16, overflow: 'hidden', width: '200px' }}>
          <animated.div style={animationProps}>
            {songText}
          </animated.div>
        </div>
        <div style={{ width: `${progressPercent}%`, height: '5px', background: 'green' }} />
      </div>
    </div>
  );
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default NowPlaying;
