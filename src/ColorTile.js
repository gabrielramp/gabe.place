import React, { useEffect, useState } from 'react';
import { useSpring, animated } from 'react-spring';

const pixelSize = 10;

const ColorTile = ({ selectedColor, scale }) => {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const { size, opacity } = useSpring({ 
    size: pixelSize * scale * 1.2, // Increase the size by 20%
    opacity: 1, 
    immediate: scale === 1 
  });

  useEffect(() => {
    const updateCursorPos = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    }

    window.addEventListener('mousemove', updateCursorPos);

    return () => {
      window.removeEventListener('mousemove', updateCursorPos);
    }
  }, []);

  const handleClick = (e) => {
    // Prevent event propagation
    e.stopPropagation();
    
    // Calculate the nearest pixel position
    const nearestPixel = {
      x: Math.round((e.clientX - size.value / 2) / pixelSize) * pixelSize,
      y: Math.round((e.clientY - size.value / 2) / pixelSize) * pixelSize
    }

    // Animate the tile to the nearest pixel position and reduce its size and opacity
    size.start({ to: pixelSize * scale, immediate: false });
    opacity.start({ to: 0, immediate: false });
    setCursorPos(nearestPixel);
  };

  const handleDragStart = (e) => {
    // This will prevent the drag event from propagating up to the Stage
    e.stopPropagation();
  };

  if (!selectedColor) return null;

  return (
    <animated.div 
      style={{ 
        position: 'absolute',
        backgroundColor: selectedColor,
        width: size.to(size => `${size}px`),
        height: size.to(size => `${size}px`),
        top: size.to(size => `${cursorPos.y - size / 2}px`),
        left: size.to(size => `${cursorPos.x - size / 2}px`),
        pointerEvents: 'none',
        opacity: opacity,
      }}
      onClick={handleClick}
      onDragStart={handleDragStart}
    />
  );
}

export default ColorTile;
