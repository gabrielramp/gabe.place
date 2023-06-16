// Import necessary packages
import React, { useState, useEffect } from 'react'; // React core and Hooks
import { Stage, Layer, Rect } from 'react-konva'; // Canvas-related components from react-konva
import Konva from 'konva'; // Konva library for 2D drawing 
import ColorPalette from './ColorPalette'; // Import ColorPalette component
import ColorTile from './ColorTile'; // Import ColorTile component
import Cooldown from './Cooldown'; // Import Cooldown component


// Define pixel size, canvas dimensions, and colors
const pixelSize = 10;
const totalPixels = 50;
const colors = ['blue', 'brown', 'orange', 'red', 'green', 'white', 'purple', 'lightblue', 'sandybrown', 'coral', 'lightcoral', 'lightgreen', 'white', 'plum'];

// Define the main App component
function App() {
  // Use the useState hook to initialize a scale value for zoom level

  const [scale, setScale] = useState(1);
  const [tileScale, setTileScale] = useState(1);
  const [selectedColor, setSelectedColor] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({x: 0, y: 0});
  const [tilePos, setTilePos] = useState({ x: 0, y: 0 });
  const [tileSize, setTileSize] = useState(0);
  
  // Use the useState hook to initialize an empty array for the colors of each pixel
  const [pixelColors, setPixelColors] = useState([]);

  // State to handle selected color
  //const [selectedColor, setSelectedColor] = useState('');  // Add this line

  // Use the useEffect hook to run once when the component mounts
  useEffect(() => {
    // Define a function to get a random color from the colors array
    const getRandomColor = () => {
      return colors[Math.floor(Math.random() * colors.length)];
    }

    // Generate a 2D array filled with random colors
    const initialColors = Array(totalPixels).fill(0).map(() => Array(totalPixels).fill(0).map(() => getRandomColor()));
    
    // Use the setPixelColors function to update the state with the new colors
    setPixelColors(initialColors);
  }, []);

  // Define a function to handle wheel events (for zooming in and out)
  const handleWheel = (e) => {
    e.evt.preventDefault(); // Prevent the default scroll behavior
  
    const scaleBy = 2.1; // Set a constant to define the rate of scaling
    const stage = e.target.getStage(); // Get the current stage object
    const oldScale = stage.scaleX(); // Get the current scale
  
    const pointerPosition = stage.getPointerPosition(); // Get the current position of the pointer
  
    // Calculate the current position relative to the stage
    const mousePointTo = {
      x: (pointerPosition.x - stage.x()) / oldScale,
      y: (pointerPosition.y - stage.y()) / oldScale,
    };
  
    // Calculate the new scale based on the wheel direction
    let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    // Limit the zoom level to a range between 1 and 5
    newScale = Math.max(1, Math.min(newScale, 5));

    // Calculate the new position after scaling
    const newPos = {
      x: pointerPosition.x - mousePointTo.x * newScale,
      y: pointerPosition.y - mousePointTo.y * newScale,
    };

    // Send the new size to the ColorTile
    setTileScale(newScale);
  
    // Create a new Tween to animate the zooming effect
    new Konva.Tween({
      node: stage, // Apply the animation to the stage
      scaleX: newScale, // Set the new scale
      scaleY: newScale, // Keep x and y scale equal to maintain aspect ratio
      x: newPos.x, // Set the new x position
      y: newPos.y, // Set the new y position
      duration: 0.20, // Set the duration of the animation
    }).play(); // Start the animation

  };

  // Add this function to handle color selection
  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };
  
  // Render the component
  return (
    <div>
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
              width={pixelSize+1}
              height={pixelSize+1}
              // Assign color from state
              fill={color}  
              // TODO: Replace color with the color retrieved from database
            />
          )))}
        </Layer>
      </Stage>
      <ColorPalette selectedColor={selectedColor} onColorSelect={handleColorSelect} />
      <ColorTile selectedColor={selectedColor} scale={tileScale} />      
    </div>
  );
}

export default App; // Export the App component
