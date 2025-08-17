import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const GreenhouseMap = forwardRef(({ onScaleChange }, ref) => {
  const [layoutComponents, setLayoutComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  // Greenhouse dimensions in metres
  const GREENHOUSE_WIDTH = 20;
  const GREENHOUSE_HEIGHT = 20;

  // Update scale ref when scale changes
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Notify parent of scale changes
  useEffect(() => {
    if (onScaleChange) {
      onScaleChange(scale);
    }
  }, [scale, onScaleChange]);

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    fitToView: () => {
      // Calculate scale to fit the entire greenhouse in view
      const containerWidth = 800; // Approximate container width
      const containerHeight = 600; // Approximate container height
      const scaleX = containerWidth / GREENHOUSE_WIDTH;
      const scaleY = containerHeight / GREENHOUSE_HEIGHT;
      const newScale = Math.min(scaleX, scaleY) * 0.9; // 90% to add some padding
      
      setScale(newScale);
      setPanOffset({ x: 0, y: 0 });
    },
    resetView: () => {
      setScale(1);
      setPanOffset({ x: 0, y: 0 });
    },
    zoomIn: () => setScale(prevScale => Math.min(3, prevScale * 1.2)),
    zoomOut: () => setScale(prevScale => Math.max(0.1, prevScale / 1.2)),
    getScale: () => scaleRef.current
  }), []);

  useEffect(() => {
    fetchLayoutData();
  }, []);

  // Update zoom level display in parent component
  useEffect(() => {
    const zoomLevelElement = document.getElementById('zoom-level');
    if (zoomLevelElement) {
      zoomLevelElement.textContent = `${Math.round(scale * 100)}%`;
    }
  }, [scale]);

  const fetchLayoutData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('greenhouse_layout')
        .select('*')
        .order('layer_order', { ascending: true });

      if (error) throw error;
      setLayoutComponents(data || []);
    } catch (err) {
      console.error('Error fetching layout data:', err);
      setError('Failed to load greenhouse layout');
    } finally {
      setLoading(false);
    }
  };

  const handleComponentClick = (component) => {
    setSelectedComponent(component);
  };

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getComponentIcon = (componentType) => {
    switch (componentType) {
      case 'growbed':
        return '🟢';
      case 'fishtank':
        return '🔵';
      case 'pump':
        return '🟠';
      case 'sensor':
        return '🟣';
      case 'pipe':
        return '🟤';
      case 'valve':
        return '⚫';
      case 'filter':
        return '⚪';
      case 'other':
        return '⬜';
      default:
        return '⬜';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'inactive':
        return '#EF4444';
      case 'maintenance':
        return '#F59E0B';
      case 'error':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading greenhouse map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Map Container */}
      <div 
        className="w-full h-full border border-gray-300 rounded-lg overflow-hidden bg-gray-50"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${GREENHOUSE_WIDTH} ${GREENHOUSE_HEIGHT}`}
          style={{
            transform: `scale(${scale}) translate(${panOffset.x / scale}px, ${panOffset.y / scale}px)`,
            transformOrigin: '0 0'
          }}
        >
          {/* Background grid (1m x 1m) */}
          <defs>
            <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#E5E7EB" strokeWidth="0.05"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Greenhouse outline */}
          <rect
            x="0"
            y="0"
            width={GREENHOUSE_WIDTH}
            height={GREENHOUSE_HEIGHT}
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="0.1"
            strokeDasharray="0.2,0.2"
          />

          {/* Render components */}
          {layoutComponents.map((component) => (
            <g key={component.id}>
              {/* Component shape - Fish tanks and Tanks are circles, others are rectangles */}
              {(component.component_type === 'fishtank' || component.component_type === 'tank') ? (
                <circle
                  cx={component.x_position + component.width / 2}
                  cy={component.y_position + component.height / 2}
                  r={Math.min(component.width, component.height) / 2}
                  fill={component.color}
                  stroke={getStatusColor(component.status)}
                  strokeWidth="0.05"
                  style={{
                    transform: `rotate(${component.rotation}deg)`,
                    transformOrigin: `${component.x_position + component.width / 2} ${component.y_position + component.height / 2}`
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleComponentClick(component)}
                />
              ) : (
                <>
                  {/* Background fill for different growbed types */}
                  {component.component_type === 'growbed' && (
                    <rect
                      x={component.x_position}
                      y={component.y_position}
                      width={component.width}
                      height={component.height}
                      fill={(() => {
                        if (component.metadata?.growbed_type === 'DWC' || component.name?.includes('DWC')) {
                          return '#87CEEB'; // Light blue for DWC
                        } else if (component.metadata?.growbed_type === 'Wicking' || component.name?.includes('Wicking')) {
                          return '#4CAF50'; // Green for Wicking
                        } else if (component.metadata?.growbed_type === 'Media' || component.name?.includes('Media')) {
                          return '#9CA3AF'; // Grey for Media
                        } else {
                          return component.color || '#4CAF50'; // Default to green
                        }
                      })()}
                      rx="0.1"
                      ry="0.1"
                    />
                  )}
                  
                  {/* Main component rectangle */}
                  <rect
                    x={component.x_position}
                    y={component.y_position}
                    width={component.width}
                    height={component.height}
                    fill={component.component_type === 'growbed' ? 'transparent' : component.color}
                    stroke={(() => {
                      if (component.component_type === 'growbed') {
                        if (component.metadata?.growbed_type === 'DWC' || component.name?.includes('DWC')) {
                          return '#DC2626'; // Red border for DWC
                        } else if (component.metadata?.growbed_type === 'Wicking' || component.name?.includes('Wicking')) {
                          return '#166534'; // Dark green border for Wicking
                        } else if (component.metadata?.growbed_type === 'Media' || component.name?.includes('Media')) {
                          return '#374151'; // Dark grey border for Media
                        } else {
                          return getStatusColor(component.status); // Default status color
                        }
                      } else {
                        return getStatusColor(component.status);
                      }
                    })()}
                    strokeWidth={component.component_type === 'growbed' ? '0.08' : '0.05'}
                    rx="0.1"
                    ry="0.1"
                    style={{
                      transform: `rotate(${component.rotation}deg)`,
                      transformOrigin: `${component.x_position + component.width / 2} ${component.y_position + component.height / 2}`
                    }}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleComponentClick(component)}
                  />
                  
                  {/* DWC hole pattern for growbeds */}
                  {(component.component_type === 'growbed' && 
                    (component.metadata?.growbed_type === 'DWC' || component.name?.includes('DWC'))) && (
                    <>
                      {/* Manual hole rendering */}
                      {(() => {
                        const holes = [];
                        const spacing = 0.2; // 20cm spacing
                        const startOffset = 0.1; // 10cm from edge
                        
                        // Calculate number of holes in each direction
                        const holesX = Math.floor((component.width - 0.2) / spacing) + 1;
                        const holesY = Math.floor((component.height - 0.2) / spacing) + 1;
                        
                        // Generate holes
                        for (let x = 0; x < holesX; x++) {
                          for (let y = 0; y < holesY; y++) {
                            const holeX = component.x_position + startOffset + (x * spacing);
                            const holeY = component.y_position + startOffset + (y * spacing);
                            
                            holes.push(
                              <circle
                                key={`hole-${component.id}-${x}-${y}`}
                                cx={holeX}
                                cy={holeY}
                                r="0.025"
                                fill="#000000"
                                opacity="1"
                                style={{ 
                                  pointerEvents: 'none',
                                  visibility: 'visible',
                                  display: 'block'
                                }}
                              />
                            );
                          }
                        }
                        
                        return holes;
                      })()}
                    </>
                  )}
                </>
              )}
              


              {/* Component name */}
              <text
                x={component.x_position + component.width / 2}
                y={component.y_position + component.height + 0.5}
                textAnchor="middle"
                fontSize="0.4"
                fill="#374151"
                fontWeight="500"
                style={{
                  transform: `rotate(${component.rotation}deg)`,
                  transformOrigin: `${component.x_position + component.width / 2} ${component.y_position + component.height / 2}`
                }}
              >
                {component.name}
              </text>


            </g>
          ))}
        </svg>
      </div>

      {/* Component Details Modal */}
      {selectedComponent && (
        <div className="absolute top-4 left-4 z-20 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedComponent.name}
            </h3>
            <button
              onClick={() => setSelectedComponent(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium capitalize">{selectedComponent.component_type}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span 
                className="font-medium capitalize px-2 py-1 rounded text-xs"
                style={{ 
                  backgroundColor: getStatusColor(selectedComponent.status) + '20',
                  color: getStatusColor(selectedComponent.status)
                }}
              >
                {selectedComponent.status}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Position:</span>
              <span className="font-medium">
                ({selectedComponent.x_position}, {selectedComponent.y_position})
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium">
                {selectedComponent.component_type === 'fishtank' 
                  ? `${(selectedComponent.width).toFixed(1)}m diameter`
                  : `${(selectedComponent.width).toFixed(1)}m × ${(selectedComponent.height).toFixed(1)}m`
                }
              </span>
            </div>
            
            {selectedComponent.metadata && Object.keys(selectedComponent.metadata).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Details:</h4>
                <div className="space-y-1">
                  {Object.entries(selectedComponent.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions - Removed to eliminate overlap with parent component's instructions panel */}
    </div>
  );
});

export default GreenhouseMap;
