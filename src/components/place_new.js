import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

const Place = () => {
  const pixiContainer = useRef(null);
  const appRef = useRef(null);

  // State to manage the selected color
  const [selectedColor, setSelectedColor] = useState(0x000000); // Default to Black
  const selectedColorRef = useRef(selectedColor); // Ref to store the selected color
  const gridSize = 25; // 25x25 grid
  const pixelSize = 20; // Size of each pixel
  const minZoom = 0.5; // Minimum zoom level
  const maxZoom = 5; // Maximum zoom level
  const minDragDistance = 5; // Minimum drag distance before it's considered a drag

  let dragging = false;
  let dragStartX, dragStartY;
  let isDragValid = false; // Track if the drag should be considered valid

  // Define the color palette globally
  const colorPalette = [
    0xff0000, // Red
    0xff7f00, // Orange
    0xffff00, // Yellow
    0x00ff00, // Green
    0x00ffff, // Cyan
    0x0000ff, // Blue
    0x8a2be2, // Violet
    0xff1493, // Pink
    0x8b4513, // Brown
    0x000000, // Black
    0xffffff  // White
  ];

  // Update the ref whenever selectedColor changes
  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  const initializePixiApp = () => {
    const containerWidth = pixiContainer.current.clientWidth;
    const containerHeight = pixiContainer.current.clientHeight;

    // Create PixiJS Application
    appRef.current = new PIXI.Application({
      width: containerWidth,
      height: containerHeight,
      backgroundColor: 0x1021022,
      resolution: window.devicePixelRatio || 1, // Support for high-DPI screens
      autoDensity: true,
    });

    // Append PixiJS canvas to container
    pixiContainer.current.appendChild(appRef.current.view);

    // Create a container for zoom/pan
    const container = new PIXI.Container();
    appRef.current.stage.addChild(container);

    // Create the initial grid with random colors
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const pixel = new PIXI.Graphics();

        // Assign a random color to each tile
        const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        pixel.beginFill(randomColor);
        pixel.drawRect(0, 0, pixelSize, pixelSize); // Draw rectangle from (0, 0)
        pixel.endFill();

        // Position the pixel
        pixel.x = x * pixelSize;
        pixel.y = y * pixelSize;

        // Make pixel interactive for drawing
        pixel.interactive = true;
        pixel.buttonMode = true;

        // Add event listeners for dragging and changing color
        pixel.on('pointerdown', (event) => onTilePointerDown(event));
        pixel.on('pointerup', () => onTilePointerUp(pixel)); // Trigger color change only on release
        pixel.on('pointerupoutside', onDragEnd);

        // Add the pixel graphic to the PixiJS stage
        container.addChild(pixel);
      }
    }

    // Center the container in the view initially
    centerCanvas(container, containerWidth, containerHeight);

    // Zoom and pan logic
    container.interactive = true;
    container.on('pointerdown', onDragStart);
    container.on('pointerup', onDragEnd);
    container.on('pointerupoutside', onDragEnd);
    container.on('pointermove', onDragMove);

    // Listen for the wheel event on the PixiJS view for zooming
    appRef.current.view.addEventListener('wheel', (event) => onZoom(event, container), { passive: false });

    return container;
  };

  // Center the canvas within the available space
  const centerCanvas = (container, containerWidth, containerHeight) => {
    const gridWidth = gridSize * pixelSize;
    const gridHeight = gridSize * pixelSize;

    // Center the grid by adjusting the container's x and y
    container.x = (containerWidth - gridWidth * container.scale.x) / 2;
    container.y = (containerHeight - gridHeight * container.scale.y) / 2;
  };

  // Handle zooming in/out based on mouse wheel scroll
  const onZoom = (event, container) => {
    event.preventDefault(); // Prevent default scroll behavior

    // Calculate zoom factor
    const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9; // Zoom in on scroll up, zoom out on scroll down
    const newScale = container.scale.x * scaleFactor;

    // Ensure the zoom level stays within the specified limits
    if (newScale >= minZoom && newScale <= maxZoom) {
      // Get the mouse position relative to the container
      const mousePos = appRef.current.renderer.plugins.interaction.mouse.global;

      // Zoom in or out centered around the mouse position
      const worldPos = {
        x: (mousePos.x - container.x) / container.scale.x,
        y: (mousePos.y - container.y) / container.scale.y,
      };

      // Update the scale
      container.scale.set(newScale, newScale);

      // Adjust the position so that the point under the mouse stays under the mouse after zoom
      container.x = mousePos.x - worldPos.x * newScale;
      container.y = mousePos.y - worldPos.y * newScale;
    }
  };

  // Handle drag and pan logic with minimum drag distance
  const onDragStart = (event) => {
    dragging = true;
    isDragValid = false;
    dragStartX = event.data.global.x;
    dragStartY = event.data.global.y;
  };

  const onDragEnd = () => {
    dragging = false;
  };

  const onDragMove = (event) => {
    if (dragging) {
      const container = appRef.current.stage.children[0];
      const newPosition = event.data.global;

      // Calculate drag distance
      const dragDistanceX = Math.abs(newPosition.x - dragStartX);
      const dragDistanceY = Math.abs(newPosition.y - dragStartY);

      // Only move the canvas if the drag distance exceeds the threshold
      if (dragDistanceX > minDragDistance || dragDistanceY > minDragDistance) {
        isDragValid = true;
      }

      if (isDragValid) {
        container.x += newPosition.x - dragStartX;
        container.y += newPosition.y - dragStartY;
        dragStartX = newPosition.x;
        dragStartY = newPosition.y;
      }
    }
  };

  // Handle pointer down on a tile
  const onTilePointerDown = (event) => {
    // Start the drag process; avoid color change until release
    onDragStart(event);
  };

  // Handle pointer up on a tile
  const onTilePointerUp = (pixel) => {
    // Only change the color if it wasn't a drag
    if (!isDragValid) {
      pixel.clear();
      pixel.beginFill(selectedColorRef.current); // Use the selected color ref
      pixel.drawRect(0, 0, pixelSize, pixelSize); // Redraw the pixel with the new color
      pixel.endFill();
    }
    // End the drag process
    onDragEnd();
  };

  // Update canvas size on window resize
  const handleResize = () => {
    if (appRef.current) {
      const containerWidth = pixiContainer.current.clientWidth;
      const containerHeight = pixiContainer.current.clientHeight;
      appRef.current.renderer.resize(containerWidth, containerHeight);

      // Update the center tile after resize
      const container = appRef.current.stage.children[0];
      centerCanvas(container, containerWidth, containerHeight);
    }
  };

  // Set up PixiJS and handle resizing
  useEffect(() => {
    // Initialize the PixiJS app
    const container = initializePixiApp();

    // Add window resize listener
    window.addEventListener('resize', handleResize);

    // Clean up on unmount
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Render the color palette for user selection
  const renderColorPalette = () => {
    return colorPalette.map((color) => (
      <button
        key={color}
        style={{
          backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
          width: '40px',
          height: '40px',
          margin: '5px',
          border: selectedColor === color ? '3px solid black' : '2px solid gray',
          cursor: 'pointer',
          boxShadow: selectedColor === color ? '0px 0px 15px rgba(0, 0, 0, 0.3)' : 'none',
          transition: 'all 0.2s ease-in-out', // Smooth transition for hover and selection
        }}
        onClick={() => setSelectedColor(color)}
      />
    ));
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <div
        ref={pixiContainer}
        style={{
          width: '100%',
          height: 'calc(100vh - 80px)', // Set height to fill the remaining space, ensuring no white bar
          overflow: 'hidden',
        }}
      />
      {/* Sleek color palette UI, centered and positioned towards the bottom */}
      <div style={{
        position: 'absolute',
        bottom: '13%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1, // Ensure it appears in the foreground
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.95)', // Subtle background to make it pop
        borderRadius: '15px',
        boxShadow: '0px 0px 20px rgba(0, 0, 0, 0.15)',
      }}>
        {renderColorPalette()}
      </div>
    </div>
  );
};

export default Place;
