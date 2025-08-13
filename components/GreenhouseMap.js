import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GreenhouseMap() {
  const [layoutComponents, setLayoutComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Greenhouse dimensions in metres
  const GREENHOUSE_WIDTH = 20;
  const GREENHOUSE_HEIGHT = 20;

  useEffect(() => {
    fetchLayoutData();
  }, []);

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

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prevScale => Math.max(0.1, Math.min(3, prevScale * delta)));
  };

  const resetView = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const fitToView = () => {
    // Calculate scale to fit the entire greenhouse in view
    const containerWidth = 800; // Approximate container width
    const containerHeight = 600; // Approximate container height
    const scaleX = containerWidth / GREENHOUSE_WIDTH;
    const scaleY = containerHeight / GREENHOUSE_HEIGHT;
    const newScale = Math.min(scaleX, scaleY) * 0.9; // 90% to add some padding
    
    setScale(newScale);
    setPanOffset({ x: 0, y: 0 });
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
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <button
          onClick={fitToView}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 text-sm"
        >
          🔍 Fit to View
        </button>
        <button
          onClick={resetView}
          className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 text-sm"
        >
          Reset View
        </button>
        <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-md px-3 py-2">
          <span className="text-sm text-gray-600">Zoom:</span>
          <span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* Map Container */}
      <div 
        className="w-full h-full border border-gray-300 rounded-lg overflow-hidden bg-gray-50"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
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
              {/* Component shape - Fish tanks are circles, others are rectangles */}
              {component.component_type === 'fishtank' ? (
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
                <rect
                  x={component.x_position}
                  y={component.y_position}
                  width={component.width}
                  height={component.height}
                  fill={component.color}
                  stroke={getStatusColor(component.status)}
                  strokeWidth="0.05"
                  rx="0.1"
                  ry="0.1"
                  style={{
                    transform: `rotate(${component.rotation}deg)`,
                    transformOrigin: `${component.x_position + component.width / 2} ${component.y_position + component.height / 2}`
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleComponentClick(component)}
                />
              )}
              
              {/* Component icon */}
              <text
                x={component.x_position + component.width / 2}
                y={component.y_position + component.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="0.8"
                fill="white"
                style={{
                  transform: `rotate(${component.rotation}deg)`,
                  transformOrigin: `${component.x_position + component.width / 2} ${component.y_position + component.height / 2}`
                }}
              >
                {getComponentIcon(component.component_type)}
              </text>

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

              {/* Status indicator */}
              <circle
                cx={component.x_position + component.width - 0.2}
                cy={component.y_position + 0.2}
                r="0.15"
                fill={getStatusColor(component.status)}
                stroke="white"
                strokeWidth="0.02"
              />
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

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>🖱️ Drag to pan • 🔍 Scroll to zoom • 👆 Click components for details • 📏 20m × 20m greenhouse</span>
        </div>
      </div>
    </div>
  );
}
