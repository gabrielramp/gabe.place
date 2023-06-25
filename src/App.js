import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';

// Possible colors

const colorPalette = [
  "#FF4500", // Orange Red
  "#FF8C00", // Dark Orange
  "#FFD700", // Gold
  "#32CD32", // Lime Green
  "#008000", // Green
  "#4169E1", // Royal Blue
  "#0000FF", // Blue
  "#8A2BE2", // Blue Violet
  "#FF1493", // Deep Pink
  "#C71585", // Medium Violet Red
  "#FF69B4", // Hot Pink
  "#FFC0CB", // Pink
  "#800000", // Maroon
  "#A52A2A", // Brown
  "#808080", // Gray
  "#FFFFFF", // White
  "#000000" // Black
];


// Canvas Pixels
const Pixel = ({ x, y, width, height, fill }) => {
  return <Rect x={x} y={y} width={width} height={height} fill={fill} />;
};

// The highlight for a 'centered' pixel
const Highlight = ({ x, y, width, height }) => {
  return <Rect x={x} y={y} width={width} height={height} stroke='black' strokeWidth={2} />;
};


// PlaceTileButton component
const PlaceTileButton = ({ visible, onClick }) => {
  const styles = {
    position: 'fixed',
    bottom: visible ? '20px' : '-60px', // Adjust these as needed
    left: '50%',
    opacity: visible ? 1 : 0,
    backgroundColor: 'gray',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '50px',
    transition: 'bottom 0.5s, opacity 0.5s',
    cursor: 'pointer',
  };

  return <div style={styles} onClick={onClick}>Place Tile</div>;
};

// Color Palette Component
const ColorPalette = ({ colorPalette, selectedColor, handleColorSelection, showPalette }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      width: '80%',
      margin: '0 10%',
      padding: '10px 0',
      backgroundColor: '#808080',
      borderRadius: '50px',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      alignItems: 'center',
      transition: 'opacity 0.5s, transform 0.5s',
      opacity: showPalette ? 1 : 0,
      transform: `translateY(${showPalette ? '0' : '100%'})`,
      zIndex: 100
    }}>
      {colorPalette.map(color => (
        <div key={color} style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: color,
          margin: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: selectedColor === color ? 'scale(1.2)' : 'scale(1)',
        }} onClick={() => handleColorSelection(color)}></div>
      ))}
    </div>
  );
};

// Add this PreviewPixel component
const PreviewPixel = ({ x, y, width, height, fill }) => {
  return <Rect x={x} y={y} width={width} height={height} fill={fill} />;
};

const ConfirmationButton = ({ visible, onClick, symbol, handleConfirmClick }) => {

  const styles = {
    position: 'fixed',
    bottom: visible ? '120px' : '-60px',
    left: symbol === '✖' ? '45%' : '55%',
    transform: 'translateX(-50%)',
    opacity: visible ? 1 : 0,
    backgroundColor: 'gray',
    color: 'white',
    padding: '10px 50px',
    borderRadius: '50px',
    transition: 'bottom 0.5s, opacity 0.5s',
    cursor: 'pointer',
  };

  const handleClick = () => {
    handleConfirmClick(symbol);
  };

  return <div style={styles} onClick={handleClick}>{symbol}</div>;
};

// Renderign the canvas
const Canvas = ({ width, height, rows, cols }) => {
  const [isPixelHighlighted, setIsPixelHighlighted] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [centerPixel, setCenterPixel] = useState({x: Math.floor(cols/2), y: Math.floor(rows/2)});
  const [highlightVisible, setHighlightVisible] = useState(true);
  const [pixelSelected, setPixelSelected] = useState(false);
  const [showPlaceTileButton, setShowPlaceTileButton] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [previewColor, setPreviewColor] = useState(null);
  const [showConfirmationButtons, setShowConfirmationButtons] = useState(false);

  const stageRef = useRef();

  // Generate stage pixels
  const [pixels, setPixels] = useState(() => {
    const pixels = [];
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const color = `${colorPalette[(Math.floor(Math.random() * colorPalette.length))]}`;
        pixels.push({
          x: j,
          y: i,
          color
        });
      }
    }
    return pixels;
  });

  const handleConfirmClick = (symbol) => {
    if (symbol === '✖') {
      console.log('✖ button clicked');
      handleCancelSelection();
    } else if (symbol === '✔') {
      // Logic for the '✔' button
      console.log('✔ button clicked');
      // Add your specific behavior for the '✔' button here
      setPixels(prevPixels => prevPixels.map(pixel => 
        pixel.x === centerPixel.x && pixel.y === centerPixel.y ? { ...pixel, color: selectedColor } : pixel
      ));

      // TODO: Update database here with the new color for the pixel at `centerPixel.x` and `centerPixel.y`

      handleCancelSelection(); // Reset the selection
    }
  };

  // Handling the change of the center pixel, handleDragMove will constantly ask for updateCenterPixel
  const handleDragMove = e => {
    if (pixelSelected) return;
    const stage = e.target.getStage();
    updateCenterPixel(stage);
  };

  // New function for color selection
  const handleColorSelection = color => {
    setSelectedColor(color);
    setPreviewColor(color);
    setShowConfirmationButtons(true);
  };

  // Updating the highlighted pixel in the center of the screen
  const updateCenterPixel = (stage) => {
    const scale = stage.scaleX();
    const newPos = {x: -stage.x() / scale, y: -stage.y() / scale};
    const center = {x: newPos.x + stage.width() / 2 / scale, y: newPos.y + stage.height() / 2 / scale};
    const centerPixel = {x: Math.floor(center.x / width), y: Math.floor(center.y / height)};
    setCenterPixel(centerPixel);

    if (centerPixel.x >= 0 && centerPixel.x < cols && centerPixel.y >= 0 && centerPixel.y < rows) {
      setShowPlaceTileButton(true);
      setHighlightVisible(true);
    }
    else {
      setShowPlaceTileButton(false);
      setHighlightVisible(false);
    }
  };

  // Modify handlePlaceTile to set pixelSelected to true and start the zoom tween
  const handleSelectTile = () => {
    setPixelSelected(true);
  
    const stage = stageRef.current;
    const scale = 5;
    const x = centerPixel.x * width * scale - stage.width() / 2 + width / 2 * scale; // Added width adjustment
    const y = centerPixel.y * height * scale - stage.height() / 2 + height / 2 * scale; // Added height adjustment
  
    if (stage.tween) {
      stage.tween.destroy();
    }
  
    stage.tween = new Konva.Tween({
      node: stage,
      duration: 2,
      scaleX: scale,
      scaleY: scale,
      x: -x,
      y: -y,
      easing: Konva.Easings.EaseInOut,
      onFinish: () => {
        stage.tween = null;
      }
    });
    stage.tween.play();
  
    setShowPlaceTileButton(false);
    setShowColorPalette(true);
  };

  // Handle canceling when having had selected a pixel to change
  const handleCancelSelection = () => {

    // Remove the preview tile
    setPreviewColor(null);

    // Find the new bounds for the canvas, zooming out a little bit at scale 4
    const stage = stageRef.current;
    const scale = 4;
    const x = centerPixel.x * width * scale - stage.width() / 2 + width / 2 * scale; // Added width adjustment
    const y = centerPixel.y * height * scale - stage.height() / 2 + height / 2 * scale; // Added height adjustment
    
    if (stage.tween) {
      stage.tween.destroy();
    }

    // Create animation for zooming out after canceling
    stage.tween = new Konva.Tween({
      node: stage,
      duration: 0.75,
      scaleX: scale,
      scaleY: scale,
      x: -x,
      y: -y,
      easing: Konva.Easings.EaseInOut,
      onFinish: () => {
        setPixelSelected(false); 
        stage.tween = null;
      }
    });
    stage.tween.play();
  
    // Remove palette and confirmation buttons, and bring back place tile button
    setShowPlaceTileButton(true);
    setShowColorPalette(false);
    setShowConfirmationButtons(false);
  }


  // Handle zooming from mousewheel on desktop
  const handleWheel = e => {
    if (pixelSelected) return;
    e.evt.preventDefault();

    const scaleBy = 1.75;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();

    const pointerPosition = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointerPosition.x - stage.x()) / oldScale,
      y: (pointerPosition.y - stage.y()) / oldScale,
    }; 

    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit the scale
    if (newScale > 4.5) newScale = 5; // Max scale
    if (newScale < 2) newScale = 1.5; // Min scale

    const newPos = {
      x: pointerPosition.x - mousePointTo.x * newScale,
      y: pointerPosition.y - mousePointTo.y * newScale,
    };

    // Create a new tween if none exists, else update existing one
    if (stage.tween) {
      stage.tween.destroy();
    }

    stage.tween = new Konva.Tween({
      node: stage,
      duration: 0.2,
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      onFinish: () => {
        stage.tween = null;
      }
    });
    stage.tween.play();

    updateCenterPixel(stage);
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (stage) {
      updateCenterPixel(stage);
    }
  }, []);

  // Update isPixelHighlighted when centerPixel changes
  useEffect(() => {
    setIsPixelHighlighted(centerPixel.x >= 0 && centerPixel.x < cols && centerPixel.y >= 0 && centerPixel.y < rows);
  }, [centerPixel]);

  return (
    <div>
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        draggable={!pixelSelected}
        onDragMove={handleDragMove}
        onWheel={handleWheel}
        ref={stageRef}
      >
         <Layer>
          {pixels.map((pixel, index) => 
            <Pixel key={index} x={pixel.x * width} y={pixel.y * height} width={width+0.5} height={height+0.5} fill={pixel.color} />
          )}
          {previewColor && <PreviewPixel x={centerPixel.x * width} y={centerPixel.y * height} width={width} height={height} fill={previewColor} />}
          {highlightVisible && <Highlight x={centerPixel.x * width} y={centerPixel.y * height} width={width} height={height} />}
        </Layer>
      </Stage>
      <PlaceTileButton visible={showPlaceTileButton} onClick={handleSelectTile} />
      <ColorPalette colorPalette={colorPalette} handleColorSelection={handleColorSelection} showPalette={showColorPalette}/>  
      <ConfirmationButton visible={showConfirmationButtons} handleConfirmClick={handleConfirmClick} symbol="✖" />
      <ConfirmationButton visible={showConfirmationButtons} handleConfirmClick={handleConfirmClick} symbol="✔" />
    </div>
  );
};
const App = () => {
  const pixelSize = 11;
  const rows = 50;
  const cols = 50;

  return (
    <div>
      <Canvas width={pixelSize} height={pixelSize} rows={rows} cols={cols} />
    </div>
  );
}

export default App;