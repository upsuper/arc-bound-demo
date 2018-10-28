import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { arcBound, convertArcParams } from './components/arc-bound';
import { cartesianProduct } from './components/utils';

const starts = [
  { x: -1, y: 0 },
];
const ends = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];
const xRadii = [ 0.5, 1, 2 ];
const rotations = [ 0, 30, -45 ];
const largeArcs = [ false, true ];
const sweeps = [ false, true ];

const combinations = cartesianProduct(starts, ends, largeArcs, sweeps, xRadii, rotations)
  .map(([start, end, largeArc, sweep, rx, rotation]) => ({
    start,
    end,
    rx,
    ry: 1,
    rotation,
    largeArc,
    sweep,
  }));

ReactDOM.render(
  <>
    {combinations.map((arc, i) => {
      const arcPath = `M ${arc.start.x} ${arc.start.y} A ${arc.rx} ${arc.ry} ${arc.rotation} ${arc.largeArc ? 1 : 0} ${arc.sweep ? 1 : 0} ${arc.end.x} ${arc.end.y}`;
      const bound = arcBound(arc);
      const ref = convertArcParams(arc);
      return <div className="entry" key={i}>
        <div className="name">
          ({arc.start.x}, {arc.start.y}) to
          ({arc.end.x}, {arc.end.y})
          rx={arc.rx} ry={arc.ry} {arc.rotation}°
        </div>
        <div className="page">
          <svg viewBox="-4 -4 8 8">
            <g id="main">
              <line className="axis" x1={-4} y1={0} x2={4} y2={0}/>
              <line className="axis" x1={0} y1={-4} x2={0} y2={4}/>
              <g className="ref" transform={`translate(${ref.cx}, ${ref.cy}) rotate(${arc.rotation})`}>
                <ellipse cx={0} cy={0} rx={ref.rx} ry={ref.ry}/>
              </g>
              <rect className="bound" x={bound.left} y={bound.top} width={bound.right - bound.left} height={bound.bottom - bound.top}/>
              <path className="arc" d={arcPath} />
            </g>
          </svg>
        </div>
      </div>;
    })}
  </>,
  document.getElementById('combinations'),
);
