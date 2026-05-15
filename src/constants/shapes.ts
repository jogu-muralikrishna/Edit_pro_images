export interface ShapeDefinition {
  name: string;
  type: string;
  path?: string;
}

export const CATEGORIZED_SHAPES = {
  Basic: [
    { name: 'Square', type: 'rect' },
    { name: 'Circle', type: 'circle' },
    { name: 'Triangle', type: 'triangle' },
    { name: 'Ellipse', type: 'ellipse' },
    { name: 'Line', type: 'line' },
    { name: 'Polygon', type: 'polygon' }
  ],
  Geometric: [
    { name: 'Hexagon', type: 'path', path: 'M 50 0 L 93.3 25 L 93.3 75 L 50 100 L 6.7 75 L 6.7 25 Z' },
    { name: 'Pentagon', type: 'path', path: 'M 50 0 L 100 38 L 81 100 L 19 100 L 0 38 Z' },
    { name: 'Octagon', type: 'path', path: 'M 30 0 L 70 0 L 100 30 L 100 70 L 70 100 L 30 100 L 0 70 L 0 30 Z' },
    { name: 'Diamond', type: 'path', path: 'M 50 0 L 100 50 L 50 100 L 0 50 Z' },
    { name: 'Star 5', type: 'path', path: 'M 50 0 L 61 35 L 98 35 L 68 57 L 79 91 L 50 70 L 21 91 L 32 57 L 2 35 L 39 35 Z' },
    { name: 'Rhombus', type: 'path', path: 'M 50 0 L 100 50 L 50 100 L 0 50 Z' }
  ],
  Abstract: [
    { name: 'Blob 1', type: 'path', path: 'M 25 10 C 40 10 90 20 90 50 C 90 80 40 90 25 90 C 10 90 10 10 25 10' },
    { name: 'Blob 2', type: 'path', path: 'M 50 10 C 80 10 90 40 90 60 C 90 90 60 90 50 90 C 10 90 10 10 50 10' },
    { name: 'Blob 3', type: 'path', path: 'M 10 50 C 10 20 40 10 60 10 C 90 10 90 80 60 90 C 40 90 10 80 10 50' },
    { name: 'Splash', type: 'path', path: 'M 50 0 C 70 0 80 20 80 40 C 100 40 100 60 80 60 C 80 80 70 100 50 100 C 30 100 20 80 20 60 C 0 60 0 40 20 40 C 20 20 30 0 50 0' },
    { name: 'Liquid', type: 'path', path: 'M 20 20 Q 50 0, 80 20 T 80 80 Q 50 100, 20 80 T 20 20' }
  ],
  UI: [
    { name: 'Heart', type: 'path', path: 'M 50 90 C 20 70 0 45 0 25 C 0 10 10 0 25 0 C 35 0 45 5 50 15 C 55 5 65 0 75 0 C 90 0 100 10 100 25 C 100 45 80 70 50 90' },
    { name: 'Arrow Right', type: 'path', path: 'M 0 40 L 60 40 L 60 20 L 100 50 L 60 80 L 60 60 L 0 60 Z' },
    { name: 'Cloud', type: 'path', path: 'M 25 100 A 25 25 0 0 1 25 50 A 35 35 0 1 1 80 50 A 20 20 0 1 1 80 100 Z' },
    { name: 'Search', type: 'path', path: 'M 40 0 A 40 40 0 1 0 40 80 A 40 40 0 1 0 40 0 M 70 70 L 100 100' },
    { name: 'Home', type: 'path', path: 'M 0 50 L 50 0 L 100 50 V 100 H 70 V 70 H 30 V 100 H 0 Z' },
    { name: 'Notification', type: 'path', path: 'M 50 0 C 30 0 20 20 20 40 V 70 L 10 80 V 90 H 90 V 80 L 80 70 V 40 C 80 20 70 0 50 0 M 50 100 C 55 100 60 95 60 90 H 40 C 40 95 45 100 50 100' }
  ],
  Arrows: [
    { name: 'Straight', type: 'path', path: 'M 0 50 L 100 50 M 70 20 L 100 50 L 70 80' },
    { name: 'Curved', type: 'path', path: 'M 10 80 Q 50 10, 90 80 M 60 60 L 90 80 L 70 95' },
    { name: 'Wide', type: 'path', path: 'M 0 50 L 70 50 L 70 20 L 100 50 L 70 80 L 70 50' },
    { name: 'Double', type: 'path', path: 'M 30 50 L 70 50 M 0 50 L 30 20 L 30 80 L 0 50 M 100 50 L 70 20 L 70 80 L 100 50' }
  ]
};

export const ALL_SHAPES: ShapeDefinition[] = Object.values(CATEGORIZED_SHAPES).flat();
