import React from 'react';
import './ColorPalette.css'; // We'll create this for styling

const ColorPalette = ({selectedColor, onColorSelect}) => {

  const colors = ['blue', 'brown', 'orange', 'red', 'green', 'white', 'purple', 'lightblue', 'sandybrown', 'coral', 'lightcoral', 'lightgreen', 'white', 'plum'];

  return (
    <div className="palette-container">
      {colors.map((color, index) => (
        <div 
          key={index}
          className={`color-circle ${selectedColor === color ? 'selected' : ''}`}
          style={{backgroundColor: color}}
          onClick={() => onColorSelect(color)}
        />
      ))}
    </div>
  );
};

export default ColorPalette;
