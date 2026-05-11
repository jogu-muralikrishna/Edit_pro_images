import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

interface EditorCanvasProps {
  onCanvasReady: (canvas: fabric.Canvas) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ onCanvasReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#1a1a1a',
    });

    // Add a grid
    const grid = 20;
    const width = 2000;
    const height = 2000;
    
    // Add default text
    const text = new fabric.IText('Edit Pro', {
      left: 100,
      top: 100,
      fill: '#ffffff',
      fontFamily: 'Inter',
    });
    canvas.add(text);

    onCanvasReady(canvas);

    const handleResize = () => {
      if (containerRef.current) {
        canvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      canvas.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative canvas-grid bg-dark-bg">
      <canvas ref={canvasRef} />
    </div>
  );
};
