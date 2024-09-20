import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import io from 'socket.io-client';

const socket = io('https://gabe-place.onrender.com'); // Adjust URL based on actual server location

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
    0xFFFFFF, // White
    0xC6C6C6, // Grey
    0x7E7E7E, // Darker Grey
    0x000000, // Black
    0xFF0000, // Red
    0xFFA500, // Orange
    0xFFFF00, // Yellow
    0x008000, // Green
    0x00FF00, // Lime
    0x00FFFF, // Cyan
    0x0000FF, // Blue
    0x000080, // Navy
    0x800080, // Purple
    0xFF00FF, // Magenta
    0xA52A2A, // Brown
    0xFFC0CB  // Pink
  ];

  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  const initializePixiApp = () => {
    const containerWidth = pixiContainer.current.clientWidth;
    const containerHeight = pixiContainer.current.clientHeight;

    appRef.current = new PIXI.Application({
      width: containerWidth,
      height: containerHeight,
      backgroundColor: 0x101530,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    pixiContainer.current.appendChild(appRef.current.view);

    const container = new PIXI.Container();
    appRef.current.stage.addChild(container);

    socket.emit('request_tiles');
    socket.on('tiles', (tiles) => {
      tiles.forEach(tile => {
        const pixel = createPixel(tile.x, tile.y, parseInt(tile.color.replace('#', ''), 16));
        container.addChild(pixel);
      });
    });

    socket.on('tile_updated', (tile) => {
      const pixel = createPixel(tile.x, tile.y, parseInt(tile.color.replace('#', ''), 16));
      container.addChild(pixel);
    });

    centerCanvas(container, containerWidth, containerHeight);
    setupInteractions(container);

    return container;
  };

  const createPixel = (x, y, color) => {
    const pixel = new PIXI.Graphics();
    pixel.beginFill(color);
    pixel.drawRect(0, 0, pixelSize, pixelSize);
    pixel.endFill();
    pixel.x = x * pixelSize;
    pixel.y = y * pixelSize;
    pixel.interactive = true;
    pixel.buttonMode = true;
    pixel.on('pointerdown', (event) => onTilePointerDown(event));
    pixel.on('pointerup', () => onTilePointerUp(pixel));
    pixel.on('pointerupoutside', onDragEnd);
    return pixel;
  };

  const setupInteractions = (container) => {
    container.interactive = true;
    container.on('pointerdown', onDragStart);
    container.on('pointerup', onDragEnd);
    container.on('pointerupoutside', onDragEnd);
    container.on('pointermove', onDragMove);
    appRef.current.view.addEventListener('wheel', (event) => onZoom(event, container), { passive: false });
  };

  const centerCanvas = (container, containerWidth, containerHeight) => {
    const gridWidth = gridSize * pixelSize;
    const gridHeight = gridSize * pixelSize;
    container.x = (containerWidth - gridWidth * container.scale.x) / 2;
    container.y = (containerHeight - gridHeight * container.scale.y) / 2;
  };

  const onZoom = (event, container) => {
    event.preventDefault();
    const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const newScale = container.scale.x * scaleFactor;
    if (newScale >= minZoom && newScale <= maxZoom) {
      const mousePos = appRef.current.renderer.plugins.interaction.mouse.global;
      const worldPos = {
        x: (mousePos.x - container.x) / container.scale.x,
        y: (mousePos.y - container.y) / container.scale.y,
      };
      container.scale.set(newScale, newScale);
      container.x = mousePos.x - worldPos.x * newScale;
      container.y = mousePos.y - worldPos.y * newScale;
    }
  };

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
      const dragDistanceX = Math.abs(newPosition.x - dragStartX);
      const dragDistanceY = Math.abs(newPosition.y - dragStartY);
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

  const onTilePointerDown = (event) => {
    onDragStart(event);
  };

  const onTilePointerUp = (pixel) => {
    if (!isDragValid) {
      pixel.clear();
      pixel.beginFill(selectedColorRef.current);
      pixel.drawRect(0, 0, pixelSize, pixelSize);
      pixel.endFill();
      // Send update to server
      socket.emit('update_tile', { x: pixel.x / pixelSize, y: pixel.y / pixelSize, color: `#${selectedColorRef.current.toString(16).padStart(6, '0')}` });
    }
    onDragEnd();
  };

  const handleResize = () => {
    if (appRef.current) {
      const containerWidth = pixiContainer.current.clientWidth;
      const containerHeight = pixiContainer.current.clientHeight;
      appRef.current.renderer.resize(containerWidth, containerHeight);
      const container = appRef.current.stage.children[0];
      centerCanvas(container, containerWidth, containerHeight);
    }
  };

  useEffect(() => {
    const container = initializePixiApp();
    window.addEventListener('resize', handleResize);
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
          transition: 'all 0.2s ease-in-out',
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
          height: 'calc(100vh - 80px)',
          overflow: 'hidden',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '13%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1,
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '15px',
        boxShadow: '0px 0px 20px rgba(0, 0, 0, 0.15)',
      }}>
        {renderColorPalette()}
      </div>
    </div>
  );
};

export default Place;
