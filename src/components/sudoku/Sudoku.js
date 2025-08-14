import React, { useEffect, useMemo, useState } from 'react';
import './Sudoku.css';

// Utility: deep clone grid
const cloneGrid = (g) => g.map((row) => row.slice());

// Generate a solved 9x9 Sudoku using a base pattern and random shuffles
function generateSolvedGrid() {
  const base = 3; // size of subgrid
  const side = base * base; // 9

  const pattern = (r, c) => (base * (r % base) + Math.floor(r / base) + c) % side;

  // Shuffle helper
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // row and column index patterns
  const rBase = [...Array(base).keys()]; // [0,1,2]
  const rows = []
    .concat(...shuffle(rBase).map((g) => shuffle(rBase).map((r) => g * base + r)));
  const cols = []
    .concat(...shuffle(rBase).map((g) => shuffle(rBase).map((c) => g * base + c)));
  const nums = shuffle([...Array(side).keys()].map((n) => n + 1));

  const board = Array.from({ length: side }, () => Array(side).fill(0));
  for (let r = 0; r < side; r++) {
    for (let c = 0; c < side; c++) {
      board[r][c] = nums[pattern(rows[r], cols[c])];
    }
  }
  return board;
}

// Create a puzzle by removing cells from a solved grid
function makePuzzle(solved, empties) {
  const puzzle = cloneGrid(solved);
  const side = 9;
  let removed = 0;

  const positions = [];
  for (let r = 0; r < side; r++) {
    for (let c = 0; c < side; c++) {
      positions.push([r, c]);
    }
  }
  // shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  for (const [r, c] of positions) {
    if (removed >= empties) break;
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed++;
    }
  }
  return puzzle;
}

const DIFFICULTY_MAP = {
  1: { label: 'Easy', empties: 32 },
  2: { label: 'Medium', empties: 44 },
  3: { label: 'Hard', empties: 54 },
};

// Slider snapping threshold (in percent of range 0..100)
const SNAP = 6;

const PRAISES = [
  'Nice job baby! <3',
  'Great work honey girl! <3',
  'You\'re the greatest on god',
  'god\'s gracious correct answer',
  'You\'re so smart wow',
  'Great work baby!',
  'That\'s my wife!',
  'Are you cheating?',
  'Sudoku more like SudoYOU',
  'RAHHHHHHHHHHHHH',
  'LET\'S GOOOOOOOO',
  'wow, smoochies?',
  'THAT\'S MY WIFE!!!!',
  'KISS KISS KISS!!!',
  'MWUAH!',
  'I love you baby! <3'
];

const HEART_EMOJIS = ['❤️', '💞', '💗'];

// Cookies helpers for per-difficulty level persistence
const DIFF_NAME = { 1: 'easy', 2: 'medium', 3: 'hard' };
const levelKey = (idx) => `sudoku_level_${DIFF_NAME[idx] || 'easy'}`;
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}
function setCookie(name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/`;
}

export default function Sudoku() {
  // Difficulty is derived from a continuous slider (0..100)
  const [sliderVal, setSliderVal] = useState(50);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'playing' | 'won' | 'lost'
  const [solution, setSolution] = useState(null); // 9x9 numbers 1..9
  const [puzzle, setPuzzle] = useState(null); // 9x9 numbers, 0 means empty
  const [grid, setGrid] = useState(null); // current player entries
  const [givenMask, setGivenMask] = useState(null); // boolean 9x9
  const [notesMode, setNotesMode] = useState(false);
  const [notes, setNotes] = useState(null); // 9x9 of Set<number>
  const [selected, setSelected] = useState({ r: null, c: null });
  const [hearts, setHearts] = useState(3);
  const [lastMistake, setLastMistake] = useState(null); // {r,c,time}
  const [infiniteLivesChoice, setInfiniteLivesChoice] = useState(false);
  const [infiniteLives, setInfiniteLives] = useState(false);
  const [lockedMask, setLockedMask] = useState(null); // boolean 9x9 for user-locked cells
  const [praises, setPraises] = useState([]); // {id,r,c,text}
  const [heartBursts, setHeartBursts] = useState([]); // {id,r,c,emoji,dx,dy,dur,scale}
  const [levels, setLevels] = useState({ 1: 0, 2: 0, 3: 0 });
  const [activeDiff, setActiveDiff] = useState(null); // fixed difficulty index for current run
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [isStarting, setIsStarting] = useState(false); // start animation flag
  const [isBoardIntro, setIsBoardIntro] = useState(false); // playing intro animation flag

  // Add a route-specific body class for styling if needed
  useEffect(() => {
    document.body.classList.add('sudoku-page');
    return () => document.body.classList.remove('sudoku-page');
  }, []);

  // Load theme from cookie
  useEffect(() => {
    const saved = getCookie('sudoku_theme');
    if (saved === 'dark' || saved === 'light') setTheme(saved);
  }, []);

  // Persist theme
  useEffect(() => {
    setCookie('sudoku_theme', theme, 365);
  }, [theme]);

  // Apply background + theme classes to body based on phase and theme
  useEffect(() => {
    const b = document.body;
    const cls = ['theme-dark','theme-light','sudoku-idle','sudoku-playing','bg-boards','bg-stars'];
    cls.forEach((c) => b.classList.remove(c));
    b.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
    b.classList.add(phase === 'idle' ? 'sudoku-idle' : 'sudoku-playing');
    // Use the floating boards background in all phases and themes
    b.classList.add('bg-boards');
    return () => {
      cls.forEach((c) => b.classList.remove(c));
    };
  }, [phase, theme]);

  // Load per-difficulty levels from cookies on mount
  useEffect(() => {
    const init = { 1: 0, 2: 0, 3: 0 };
    [1, 2, 3].forEach((idx) => {
      const raw = getCookie(levelKey(idx));
      const v = parseInt(raw || '0', 10);
      init[idx] = Number.isFinite(v) ? v : 0;
    });
    setLevels(init);
  }, []);

  // Map slider value to nearest difficulty (1..3)
  const difficultyIndex = useMemo(() => {
    if (sliderVal < 25) return 1; // Easy
    if (sliderVal > 75) return 3; // Hard
    return 2; // Medium
  }, [sliderVal]);
  const difficultyLabel = DIFFICULTY_MAP[difficultyIndex].label;

  const handleSliderChange = (e) => {
    const raw = parseInt(e.target.value, 10);
    // Soft snapping when close
    const targets = [0, 50, 100];
    let snapped = raw;
    for (const t of targets) {
      if (Math.abs(raw - t) <= SNAP) {
        snapped = t;
        break;
      }
    }
    setSliderVal(snapped);
  };

  const snapToNearest = () => {
    const targets = [0, 50, 100];
    const nearest = targets.reduce((a, b) => (Math.abs(b - sliderVal) < Math.abs(a - sliderVal) ? b : a));
    setSliderVal(nearest);
  };

  const startGame = (opts = {}) => {
    const idx = opts.forceDiffIndex ?? difficultyIndex;
    const solved = generateSolvedGrid();
    const empties = DIFFICULTY_MAP[idx].empties;
    const puzzleGrid = makePuzzle(solved, empties);
    const given = puzzleGrid.map((row) => row.map((v) => v !== 0));

    setSolution(solved);
    setPuzzle(puzzleGrid);
    setGrid(cloneGrid(puzzleGrid));
    setGivenMask(given);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())));
    setHearts(3);
    setInfiniteLives(opts.keepOptions ? infiniteLives : infiniteLivesChoice);
    setLockedMask(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false)));
    setPraises([]);
    setHeartBursts([]);
    setSelected({ r: null, c: null });
    setLastMistake(null);
    setActiveDiff(idx);
    setPhase('playing');
    // trigger board intro animation
    setIsBoardIntro(true);
    // keep intro flag long enough for the last staggered number to complete
    window.setTimeout(() => setIsBoardIntro(false), 2000);
  };

  // Handle start with a short pre-flight animation for delightful UX
  const handleStartClick = () => {
    if (isStarting) return;
    setIsStarting(true);
    // gentle haptic feedback on supported devices
    if (navigator.vibrate) {
      try { navigator.vibrate([12, 40, 12]); } catch (e) {}
    }
    // allow CSS animation to play before switching views
    window.setTimeout(() => {
      startGame();
      setIsStarting(false);
    }, 560);
  };

  const handleNextLevel = () => {
    const idx = activeDiff ?? difficultyIndex;
    setLevels((prev) => {
      const nextCount = (prev[idx] || 0) + 1;
      const next = { ...prev, [idx]: nextCount };
      setCookie(levelKey(idx), nextCount, 365);
      return next;
    });
    startGame({ keepOptions: true, forceDiffIndex: idx });
  };

  const onSelectCell = (r, c) => {
    if (phase !== 'playing') return;
    setSelected({ r, c });
  };

  const applyNumber = (n) => {
    if (phase !== 'playing') return;
    const { r, c } = selected;
    if (r == null || c == null) return;
    if (!grid || !solution || !givenMask) return;
    if (givenMask[r][c]) return; // cannot change given cells
    if (lockedMask?.[r]?.[c]) return; // already locked by a correct placement

    if (notesMode) {
      // toggle note
      setNotes((prev) => {
        const next = prev.map((row) => row.map((s) => new Set(s)));
        if (next[r][c].has(n)) next[r][c].delete(n);
        else next[r][c].add(n);
        return next;
      });
      return;
    }

    if (solution[r][c] === n) {
      // correct placement
      setGrid((prev) => {
        const next = cloneGrid(prev);
        next[r][c] = n;
        return next;
      });
      // clear notes in that cell
      setNotes((prev) => {
        const next = prev.map((row) => row.map((s) => new Set(s)));
        next[r][c].clear();
        return next;
      });
      // lock the cell
      setLockedMask((prev) => {
        const next = prev.map((row) => row.slice());
        next[r][c] = true;
        return next;
      });
      // add floating praise with random direction (50°..140°) and rotation
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const text = PRAISES[Math.floor(Math.random() * PRAISES.length)];
      const angle = 50 + Math.random() * 90; // degrees
      const rad = (angle * Math.PI) / 180;
      const distance = 64; // px travel from cell center
      const dx = Math.cos(rad) * distance;
      const dy = -Math.sin(rad) * distance; // negative to move upward on screen
      // tilt so that element's 'down' points back toward the cell center
      const tilt = 90 - angle; // see derivation: tilt = angle_to_center - 90 = (-angle + 180) - 90
      setPraises((prev) => [...prev, { id, r, c, text, dx, dy, tilt }]);
      setTimeout(() => {
        setPraises((prev) => prev.filter((p) => p.id !== id));
      }, 1500);

      // spawn cute heart explosion particles (8..15 hearts)
      const count = 8 + Math.floor(Math.random() * 8); // 8..15
      for (let i = 0; i < count; i++) {
        const hid = `${id}-h${i}`;
        const emoji = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
        const a = Math.random() * 360; // degrees
        const rr = (a * Math.PI) / 180;
        const dist = 40 + Math.random() * 80; // 40..120 px
        const hx = Math.cos(rr) * dist;
        const hy = -Math.sin(rr) * dist; // all directions
        const dur = 0.8 + Math.random() * 0.4; // 0.8s..1.2s
        const scale = 0.85 + Math.random() * 0.5; // 0.85..1.35
        const rot = `${(Math.random() * 40 - 20).toFixed(1)}deg`;
        setHeartBursts((prev) => [...prev, { id: hid, r, c, emoji, dx: hx, dy: hy, dur, scale, rot }]);
        setTimeout(() => {
          setHeartBursts((prev) => prev.filter((h) => h.id !== hid));
        }, Math.round(dur * 1000));
      }
    } else {
      // wrong placement
      if (navigator.vibrate) {
        try { navigator.vibrate(100); } catch (e) {}
      }
      setLastMistake({ r, c, time: Date.now() });
      if (!infiniteLives) setHearts((h) => Math.max(0, h - 1));
    }
  };

  const eraseCell = () => {
    const { r, c } = selected;
    if (r == null || c == null) return;
    if (!grid || !solution || !givenMask) return;
    if (givenMask[r][c]) return;
    if (lockedMask?.[r]?.[c]) return;
    setGrid((prev) => {
      const next = cloneGrid(prev);
      next[r][c] = 0;
      return next;
    });
    setNotes((prev) => {
      const next = prev.map((row) => row.map((s) => new Set(s)));
      next[r][c].clear();
      return next;
    });
  };

  // Check win/loss
  useEffect(() => {
    if (phase !== 'playing') return;
    if (!grid || !solution) return;

    if (!infiniteLives && hearts <= 0) {
      setPhase('lost');
      return;
    }

    // win if all non-zero and equals solution
    let allFilled = true;
    let matches = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) allFilled = false;
        if (grid[r][c] !== 0 && grid[r][c] !== solution[r][c]) matches = false;
      }
    }
    if (allFilled && matches) setPhase('won');
  }, [grid, solution, hearts, phase]);

  const sameNumber = useMemo(() => {
    const { r, c } = selected;
    if (r == null || c == null) return null;
    const val = grid?.[r]?.[c] ?? 0;
    return val || null;
  }, [selected, grid]);

  const renderCell = (r, c) => {
    const val = grid?.[r]?.[c] ?? 0;
    const given = givenMask?.[r]?.[c];
    const locked = lockedMask?.[r]?.[c];
    const isSelected = selected.r === r && selected.c === c;

    let isMistake = false;
    if (lastMistake && lastMistake.r === r && lastMistake.c === c) {
      if (Date.now() - lastMistake.time < 700) isMistake = true;
    }

    const cellNotes = notes?.[r]?.[c] ?? new Set();

    const classes = ['cell'];
    if (given) classes.push('given');
    if (locked) classes.push('locked');
    if (isSelected) classes.push('selected');
    if (isMistake) classes.push('mistake');
    if (sameNumber && val === sameNumber && !isSelected) classes.push('same');
    // section borders
    if (c % 3 === 0) classes.push('b-left');
    if (r % 3 === 0) classes.push('b-top');
    if (c === 8) classes.push('b-right');
    if (r === 8) classes.push('b-bottom');

    return (
      <div
        key={`${r}-${c}`}
        className={classes.join(' ')}
        onClick={() => onSelectCell(r, c)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectCell(r, c);
          }
        }}
      >
        {val ? (
          <span
            className={isBoardIntro && given ? 'val drop-in' : 'val'}
            style={isBoardIntro && given ? { '--enter-delay': `${60 + (r * 9 + c) * 12}ms` } : undefined}
          >
            {val}
          </span>
        ) : cellNotes.size ? (
          <div className="notes">
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <span key={n} className={cellNotes.has(n) ? 'note active' : 'note'}>{n}</span>
            ))}
          </div>
        ) : null}
        {/* Floating praises */}
        {praises.filter((p) => p.r === r && p.c === c).map((p) => (
          <span
            key={p.id}
            className="praise"
            style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--tilt': `${p.tilt ?? 0}deg` }}
          >
            {p.text}
          </span>
        ))}
        {/* Heart explosion particles */}
        {heartBursts.filter((h) => h.r === r && h.c === c).map((h) => (
          <span
            key={h.id}
            className="heart-particle"
            style={{ '--hx': `${h.dx}px`, '--hy': `${h.dy}px`, '--dur': `${h.dur}s`, '--scale': `${h.scale}`, '--rot': h.rot }}
            aria-hidden="true"
          >
            {h.emoji}
          </span>
        ))}
      </div>
    );
  };

  const Key = ({ label, onClick, active }) => (
    <button
      type="button"
      className={active ? 'key active' : 'key'}
      onClick={onClick}
      {...(typeof active === 'boolean' ? { 'aria-pressed': active } : {})}
      onPointerDown={() => {
        if (navigator.vibrate) {
          try { navigator.vibrate(8); } catch (e) {}
        }
      }}
    >
      {label}
    </button>
  );

  const heartsDisplay = infiniteLives ? '∞' : '♥'.repeat(hearts) + '♡'.repeat(3 - hearts);
  const inRun = phase === 'playing' || phase === 'won' || phase === 'lost';
  const runDiff = activeDiff ?? difficultyIndex;
  const displayLevel = (inRun ? (levels[runDiff] ?? 0) : (levels[difficultyIndex] ?? 0));
  const completedLevel = (inRun ? (levels[runDiff] ?? 0) + 1 : (levels[difficultyIndex] ?? 0) + 1);

  if (phase === 'idle') {
    return (
      <div className="sudoku-container">
        <div className={isStarting ? 'sudoku-card starting' : 'sudoku-card'}>
          <h1 className="title">Wifey Sudoku!</h1>
          <div className="difficulty">
            <div className="difficulty-row">
              <span>Difficulty:</span>
              <strong
                className={`diff-pill idx-${difficultyIndex} ${theme === 'dark' ? 'dark' : 'light'}`}
                aria-label={`Difficulty: ${difficultyLabel}`}
              >
                {difficultyLabel}
              </strong>
            </div>
            <div className="slider-wrap">
              <input
                className="range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={sliderVal}
                onChange={handleSliderChange}
                onMouseUp={snapToNearest}
                onTouchEnd={snapToNearest}
                onKeyUp={snapToNearest}
                onBlur={snapToNearest}
                aria-valuetext={difficultyLabel}
                aria-describedby="difficulty-legend"
                style={{ '--pos': `${sliderVal}%` }}
              />
              <div className={`slider-bubble idx-${difficultyIndex}`} style={{ left: `${sliderVal}%` }} aria-hidden="true">{difficultyLabel}</div>
              <div className="ticks" aria-hidden="true">
                <span style={{ left: '0%' }}></span>
                <span style={{ left: '50%' }}></span>
                <span style={{ left: '100%' }}></span>
              </div>
            </div>
            <div className="difficulty-labels three" id="difficulty-legend">
              <span className={difficultyIndex === 1 ? 'active' : ''}>Easy</span>
              <span className={difficultyIndex === 2 ? 'active' : ''}>Medium</span>
              <span className={difficultyIndex === 3 ? 'active' : ''}>Hard</span>
            </div>
          </div>
          <div className="control-bar" role="group" aria-label="Preferences">
            <div className={`level-pill idx-${difficultyIndex}`} aria-label={`Level ${displayLevel}`}>
              <svg className="lp-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 21h8M12 17a5 5 0 0 0 5-5V6H7v6a5 5 0 0 0 5 5zm0 0v4M7 6H5a3 3 0 0 0 3 3M17 6h2a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="lp-text">Level {displayLevel}</span>
            </div>
            <div
              className="theme-toggle"
              role="tablist"
              aria-label="Theme"
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') { e.preventDefault(); setTheme('dark'); }
                if (e.key === 'ArrowRight') { e.preventDefault(); setTheme('light'); }
              }}
            >
              <span className="tt-indicator" style={{ transform: theme === 'light' ? 'translateX(40px)' : 'translateX(0)' }} aria-hidden="true"></span>
              <button
                type="button"
                className={theme === 'dark' ? 'tt-btn active' : 'tt-btn'}
                role="tab"
                aria-selected={theme === 'dark'}
                onClick={() => setTheme('dark')}
              >
                <svg className="tt-svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <span className="sr-only">Dark</span>
              </button>
              <button
                type="button"
                className={theme === 'light' ? 'tt-btn active' : 'tt-btn'}
                role="tab"
                aria-selected={theme === 'light'}
                onClick={() => setTheme('light')}
              >
                <svg className="tt-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"></circle>
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"></path>
                </svg>
                <span className="sr-only">Light</span>
              </button>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={infiniteLivesChoice}
                onChange={(e) => setInfiniteLivesChoice(e.target.checked)}
                aria-label="Toggle Infinite Lives"
              />
              <span className="slider" aria-hidden="true"></span>
              <span className="switch-text">Infinite Lives</span>
            </label>
          </div>
          <button
            className={isStarting ? 'start-btn starting' : 'start-btn'}
            onClick={handleStartClick}
            aria-busy={isStarting}
            disabled={isStarting}
          >
            {isStarting ? 'Starting…' : 'Start'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sudoku-container">
      <div className={isBoardIntro ? 'hud entering' : 'hud'}>
        <div className="hud-left">
          <div className="hearts" aria-label={`Lives: ${hearts}`}>{heartsDisplay}</div>
          <div className="level" aria-label={`Level ${displayLevel}`}>Level {displayLevel}</div>
        </div>
        <button type="button" className="restart" onClick={() => setPhase('idle')} aria-label="Start a new game">New Game</button>
      </div>

      <div className={isBoardIntro ? 'sudoku-board intro' : 'sudoku-board'}>
        {Array.from({ length: 9 }).map((_, r) => (
          <React.Fragment key={r}>
            {Array.from({ length: 9 }).map((__, c) => renderCell(r, c))}
          </React.Fragment>
        ))}
      </div>

      <div className={isBoardIntro ? 'number-pad entering' : 'number-pad'} role="group" aria-label="Number pad">
        <div className="digits">
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <Key key={n} label={n} onClick={() => applyNumber(n)} />
          ))}
        </div>
        <div className="actions">
          <Key label="Erase" onClick={eraseCell} />
          <Key label={notesMode ? 'Notes On' : 'Notes Off'} onClick={() => setNotesMode((m) => !m)} active={notesMode} />
        </div>
      </div>

      {phase === 'won' && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>🎉 Level {completedLevel} Complete!</h2>
            <button type="button" className="next-level-btn" onClick={handleNextLevel} autoFocus>Next Level</button>
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={() => setPhase('idle')}>New Game</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'lost' && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>💔 Game Over</h2>
            <button type="button" onClick={() => setPhase('idle')} autoFocus>Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
}
