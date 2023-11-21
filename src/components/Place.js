import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import axios from 'axios';
import { a } from 'react-spring';

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
  "#FFFFFF"
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
  const isMobile = window.innerWidth <= 760;

  const styles = {
    position: 'fixed',
    bottom: visible ? isMobile ? '20px' : '20px' : '-60px', // Adjust these as needed
    left: '50%',
    opacity: visible ? 1 : 0,
    backgroundColor: '#000a1c',
    color: 'white',
    padding: isMobile ? '15px 20px' : '10px 20px',
    borderRadius: '50px',
    transition: 'bottom 0.5s, opacity 0.5s',
    cursor: 'pointer',
    transform: 'translateX(-50%)',
    };

  return <div style={styles} onClick={onClick}>Place Tile</div>;
};

// Color Palette Component
const ColorPalette = ({ colorPalette, selectedColor, handleColorSelection, showPalette }) => {
  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      width: isMobile ? '80%' : '60%', // Make full width on mobile (minus padding)
      margin: isMobile ? '0 5%' : '0 20%', // Center on larger screens
      padding: isMobile ? '25px 20px' : '10px 0', // Increase vertical padding on mobile
      backgroundColor: '#000a1c',
      borderRadius: '50px',
      display: 'flex',
      justifyContent: isMobile ? 'null' : 'center',
      alignItems: 'center',
      overflowX: isMobile ? 'scroll' : 'hidden', // Enable scrolling on x-axis for mobile
      transition: 'opacity 0.5s, transform 0.5s',
      opacity: showPalette ? 1 : 0,
      transform: `translateY(${showPalette ? '0' : '100%'})`,
      zIndex: 100,
       /* Adding CSS to hide scrollbar */
       scrollbarWidth: 'thin',
       scrollbarColor: 'transparent transparent',
       '&::-webkit-scrollbar': {
         width: '6px', 
       },
       '&::-webkit-scrollbar-thumb': {
         borderRadius: '3px',
         background: 'transparent',
       },
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: isMobile ? '0px 5px' : '0px 0px', // Add padding equal to the margin on the color circles
      }}>
        {colorPalette.map(color => (
          <div key={color} style={{
            width: isMobile ? '40px' : '40px',  // Adjust for mobile
            height: isMobile ? '40px' : '40px', // Adjust for mobile
            borderRadius: '50%',
            backgroundColor: color,
            margin: isMobile ? '2px' : '13px',  // Adjust for mobile
            padding: isMobile? `1px` : `0px`,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            transform: selectedColor === color ? 'scale(1.2)' : 'scale(1)',
          }} onClick={() => handleColorSelection(color)}></div>
        ))}
      </div>
    </div>
  );
};






// Add this PreviewPixel component
const PreviewPixel = ({ x, y, width, height, fill }) => {
  return <Rect x={x} y={y} width={width} height={height} fill={fill} />;
};

const ConfirmationButton = ({ visible, onClick, symbol, handleConfirmClick }) => {
  const isMobile = window.innerWidth <= 768;

  const styles = {
    position: 'fixed',
    bottom: visible ? '15%' : '-60px',
    left: symbol === '✖' ? isMobile ? '40%' : '45%' : isMobile ? '63.5%' : '55%',  // Adjust the positions for mobile
    transform: isMobile 
      ? symbol === '✖' 
        ? visible 
          ? 'translateX(-80%)' 
          : 'translateX(-50%)'
        : visible 
          ? 'translateX(-30%)' 
          : 'translateX(-50%)'
      : 'translateX(-50%)',
    opacity: visible ? 1 : 0,
    backgroundColor: '#000a1c',
    color: 'white',
    padding: '10px 50px',
    borderRadius: '50px',
    transition: 'bottom 0.5s, top 0.5s, opacity 0.5s, transform 0.5s',  // Include 'transform' in the transition
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
  const [pixels, setPixels] = useState([]); // initialize with empty array

  useEffect(() => {
    // Async function that fetches the initial data
    console.log(`Sending fetch for board data`);
    const fetchInitialData = () => {
      axios.get("https://place-backend.onrender.com/initboard/cells")
        .then(response => {
          console.log(`Got the response:` + JSON.stringify(response.data, null, 2));
          const databasearray = response.data;
  
          const pixelArray = databasearray.map(item => ({
            x: item.x,
            y: item.y,
            color: item.color
          }));
  
          setPixels(pixelArray); // Update state
        })
        .catch(error => {
          console.error("Error fetching initial data:", error);
        });
    };

    fetchInitialData();
  }, []);


  useEffect(() => {
    console.log('Pixels updated, triggering re-render');
    setPixels(prevPixels => {
      return prevPixels;
    })
  }, [pixels]);


  const handleConfirmClick = (symbol) => {
    if (symbol === '✖') {
      console.log('✖ button clicked');
      handleCancelSelection();
    } else if (symbol === '✔') {
      // Logic for the '✔' button
      console.log('✔ button clicked');
      // Add your specific behavior for the '✔' button here
      setPixels(prevPixels => {
        const newPixels = [...prevPixels];
        const pixelToUpdate = newPixels.find(pixel => Number(pixel.x) === centerPixel.x && Number(pixel.y) === centerPixel.y);
        if (pixelToUpdate) {
          pixelToUpdate.color = selectedColor;
        }
        return newPixels;
      });

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
  /*useEffect(() => {
    setIsPixelHighlighted(centerPixel.x >= 0 && centerPixel.x < cols && centerPixel.y >= 0 && centerPixel.y < rows);
  }, [centerPixel]);*/

  const calculateInitialPosition = (width, height, rows, cols) => {
    const x = (window.innerWidth - cols * width) / 2;
    const y = (window.innerHeight - rows * height) / 2;
  
    return { x, y };
  };  

  const initialPosition = calculateInitialPosition(width, height, rows, cols);

  const layerRef = useRef();
  useEffect(() => {
    if (layerRef.current) {
      const context = layerRef.current.getCanvas()._canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
    }
  }, []);
  return (
    <div>
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        x={initialPosition.x}
        y={initialPosition.y}
        draggable={!pixelSelected}
        onDragMove={handleDragMove}
        onWheel={handleWheel}
        ref={stageRef}
        pixelRatio={1}
      >
        <Layer ref={layerRef}>
          {pixels.map((pixel, index) => 
              <Pixel listening={true} key={index} x={pixel.x * width} y={pixel.y * height} width={width+0.4} height={height+0.4} fill={pixel.color} />
          )}
        </Layer>
        <Layer>
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
    <div style={{
      backgroundColor: '#1f1f1f'
    }}>
      <Canvas width={pixelSize} height={pixelSize} rows={rows} cols={cols} />
    </div>
  );
}

export default App;