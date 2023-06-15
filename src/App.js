import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva'; // Added this line

// Pixel size
const pixelSize = 10;

// Total number of pixels in each direction
const totalPixels = 50;

// Define color array
const colors = ['blue', 'brown', 'orange', 'red', 'green', 'white', 'purple', 'lightblue', 'sandybrown', 'coral', 'lightcoral', 'lightgreen', 'white', 'plum'];

function App() {

  // State to handle zoom
  const [scale] = useState(1);
  
  // State to handle pixel colors
  const [pixelColors, setPixelColors] = useState([]);

  useEffect(() => {
    // Function to generate a random color from the predefined array
    const getRandomColor = () => {
      return colors[Math.floor(Math.random() * colors.length)];
    }

    // Generate initial colors
    const initialColors = Array(totalPixels).fill(0).map(() => Array(totalPixels).fill(0).map(() => getRandomColor()));
    
    setPixelColors(initialColors);
  }, []);

  const handleWheel = (e) => {
    e.evt.preventDefault();
  
    const scaleBy = 2.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
  
    const pointerPosition = stage.getPointerPosition();
  
    const mousePointTo = {
      x: (pointerPosition.x - stage.x()) / oldScale,
      y: (pointerPosition.y - stage.y()) / oldScale,
    };
  
    let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    // Limit the zoom level to a range between 1 and 5
    newScale = Math.max(1, Math.min(newScale, 5));

    const newPos = {
      x: pointerPosition.x - mousePointTo.x * newScale,
      y: pointerPosition.y - mousePointTo.y * newScale,
    };
  
    // Animate the zooming
    new Konva.Tween({
      node: stage,
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      duration: 0.20,
    }).play();
  };
  

  return (
    <Stage 
      width={window.innerWidth} 
      height={window.innerHeight} 
      scaleX={scale} 
      scaleY={scale} 
      draggable 
      onWheel={handleWheel}
    >
      <Layer>
        {pixelColors.map((row, i) => row.map((color, j) => (
          <Rect
            key={`${i},${j}`}
            x={i * pixelSize}
            y={j * pixelSize}
            width={pixelSize}
            height={pixelSize}
            // Assign color from state
            fill={color}  
            // TODO: Replace color with the color retrieved from database
          />
        )))}
      </Layer>
    </Stage>
  );
}

export default App;
