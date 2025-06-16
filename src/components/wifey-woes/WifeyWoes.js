import React, { useState, useEffect, memo, useMemo } from 'react';
import { withRouter } from 'react-router-dom';
import './WifeyWoes.css';

// Cherry blossom particle effect component (memoized)
const BlossomFX = memo(() => {
  const isMobile = window.innerWidth <= 480;
  const petalCount = isMobile ? 10 : 30;
  const petals = useMemo(() => (
    Array.from({ length: petalCount }).map(() => ({
      left: Math.random() * 100,
      delay: Math.random() * -20,
      duration: 10 + Math.random() * 8,
      size: 20 + Math.random() * 14,
    }))
  ), []);

  return (
    <div className="blossom-container">
      {petals.map((p, i) => (
        <span
          key={i}
          className="blossom"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size}px`,
          }}
        >
          🌸
        </span>
      ))}
    </div>
  );
});

const WifeyWoes = ({ showToast }) => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '', '', '']); // 8 boxes, space implied visually
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isFading, setIsFading] = useState(false);

  // Form state
  const [date, setDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return today;
  });
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('I need a kiss on the forehead <3');

  const correctCode = 'us brulee';

  useEffect(() => {
    // Hide navbar when component mounts
    const navbar = document.querySelector('.bm-burger-button');
    if (navbar) {
      navbar.style.display = 'none';
    }

    // Cleanup function to show navbar when component unmounts
    return () => {
      if (navbar) {
        navbar.style.display = 'block';
      }
    };
  }, []);

  // Add pink background to entire page
  useEffect(() => {
    // Add wifey-page class to body for full background coverage
    document.body.classList.add('wifey-page');
    
    // Clean up function to remove class when component unmounts
    return () => {
      document.body.classList.remove('wifey-page');
    };
  }, []);

  // Redirect to home if navigating away while unlocked
  useEffect(() => {
    if (isUnlocked) {
      window.scrollTo(0, 0);
    }
  }, [isUnlocked]);

  const handleInputChange = (e, index) => {
    const char = e.target.value.toLowerCase();
    if (char === ' ') {
      // Ignore spaces entirely
      e.target.value = '';
      return;
    }
    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);

    // Auto-focus next input
    if (e.target.value && index < code.length - 1) {
      let nextIdx = index + 1;
      const nextInput = document.getElementById(`code-${nextIdx}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === ' ') {
      e.preventDefault(); // disallow space key
      return;
    }

    // Handle backspace to move to previous input
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleConfirm = () => {
    const entered = code.slice(0,2).join('') + ' ' + code.slice(2).join('');
    if (entered === correctCode) {
      setIsFading(true);
      setTimeout(() => setIsUnlocked(true), 500); // match CSS transition
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const apiBase = process.env.REACT_APP_API_BASE || (process.env.NODE_ENV === 'production' ? 'https://gabe-place.onrender.com' : 'http://localhost:10000');
    fetch(`${apiBase}/postwifeywoe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, level, description }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(() => {
        showToast('your prince has received your woe and will console you as soon as he is available <3 thank you wifey!');
        setFormSubmitted(true);
        // reset form
        setDescription('');
        setLevel('I need a kiss on the forehead <3');
      })
      .catch(() => showToast('Failed to submit grievance, please try again.'));
  };

  if (isUnlocked) {
    return (
      <>
        <BlossomFX />
        <div className="wifey-woes-container grievance-bg">
          <h1 className={formSubmitted ? 'fade-out-form' : ''}>hi baby! please submit a woe &lt;3</h1>
          <form className={`grievance-form ${formSubmitted ? 'fade-out-form' : ''}`} onSubmit={handleSubmit}>
            <label>
              when did the woe occur?
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>

            <label>
              please leave more details &lt;3
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
            </label>

            <label>
              severity level
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option>I need a kiss on the forehead &lt;3</option>
                <option>A Mango Loco would fix me 🥭</option>
                <option>I need guitar time 💞</option>
                <option>Can we brainrot in bed?</option>
                <option>i just need to eat 😶</option>
                <option>hehe</option>
              </select>
            </label>

            <button type="submit">Submit</button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <BlossomFX />
      <div className={`wifey-woes-container lock-screen ${isFading ? 'fade-out' : ''}`}>
        <h1>Enter the Secret Code</h1>
        <div className="code-inputs">
          {code.map((char, index) => (
            <input
              key={index}
              id={`code-${index}`}
              type="text"
              maxLength={1}
              value={char}
              onChange={(e) => handleInputChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`code-input ${index === 1 ? 'gap-right' : ''}`}
              autoFocus={index === 0}
            />
          ))}
        </div>
        <button
          className="confirm-btn"
          onClick={handleConfirm}
          disabled={code.some(c => c === '')}
        >
          Confirm
        </button>
      </div>
    </>
  );
};

export default withRouter(WifeyWoes);
