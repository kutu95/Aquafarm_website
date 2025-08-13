import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GreenhouseMapEditor({ onSave, onCancel }) {
  const [layoutComponents, setLayoutComponents] = useState([]);
  const [existingGrowbeds, setExistingGrowbeds] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newComponent, setNewComponent] = useState({
    name: '',
    component_type: 'growbed',
    x_position: 0,
    y_position: 0,
    width: 1,
    height: 1,
    color: '#4CAF50',
    status: 'active',
    metadata: {}
  });
  const [draggedComponent, setDraggedComponent] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  // Greenhouse dimensions in metres
  const GREENHOUSE_WIDTH = 20;
  const GREENHOUSE_HEIGHT = 20;

  useEffect(() => {
    fetchLayoutData();
    fetchExistingGrowbeds();
  }, []);

  const fetchExistingGrowbeds = async () => {
    try {
      const { data, error } = await supabase
        .from('growbeds')
        .select('id, name, type, status')
        .order('name');

      if (error) throw error;
      setExistingGrowbeds(data || []);
    } catch (err) {
      console.error('Error fetching existing growbeds:', err);
    }
  };

  const fetchLayoutData = async () => {
    try {
      const { data, error } = await supabase
        .from('greenhouse_layout')
        .select('*')
        .order('layer_order', { ascending: true });

      if (error) throw error;
      setLayoutComponents(data || []);
    } catch (err) {
      console.error('Error fetching layout data:', err);
    }
  };

  const handleMouseDown = (e, component) => {
    if (e.target.tagName === 'rect' || e.target.tagName === 'circle') {
      setIsEditing(true);
      setDraggedComponent(component);
      const rect = svgRef.current.getBoundingClientRect();
      const svgPoint = svgRef.current.createSVGPoint();
      svgPoint.x = e.clientX - rect.left;
      svgPoint.y = e.clientY - rect.top;
      const transformedPoint = svgPoint.matrixTransform(svgRef.current.getScreenCTM().inverse());
      
      setDragOffset({
        x: transformedPoint.x - component.x_position,
        y: transformedPoint.y - component.y_position
      });
    } else if (e.target.tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (draggedComponent && isEditing) {
      const rect = svgRef.current.getBoundingClientRect();
      const svgPoint = svgRef.current.createSVGPoint();
      svgPoint.x = e.clientX - rect.left;
      svgPoint.y = e.clientY - rect.top;
      const transformedPoint = svgPoint.matrixTransform(svgRef.current.getScreenCTM().inverse());
      
      const newX = Math.max(0, Math.min(GREENHOUSE_WIDTH - draggedComponent.width, transformedPoint.x - dragOffset.x));
      const newY = Math.max(0, Math.min(GREENHOUSE_HEIGHT - draggedComponent.height, transformedPoint.y - dragOffset.y));
      
      setLayoutComponents(prev => 
        prev.map(comp => 
          comp.id === draggedComponent.id 
            ? { ...comp, x_position: newX, y_position: newY }
            : comp
        )
      );
    } else if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsEditing(false);
    setDraggedComponent(null);
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prevScale => Math.max(0.1, Math.min(5, prevScale * delta)));
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

  const handleComponentClick = (component) => {
    if (!isEditing && !isDragging) {
      setSelectedComponent(component);
    }
  };

  const handleEditComponent = (component) => {
    setEditingComponent({ ...component });
    setSelectedComponent(null);
  };

  const handleSaveComponent = async () => {
    try {
      const { error } = await supabase
        .from('greenhouse_layout')
        .update(editingComponent)
        .eq('id', editingComponent.id);

      if (error) throw error;
      
      setLayoutComponents(prev => 
        prev.map(comp => 
          comp.id === editingComponent.id ? editingComponent : comp
        )
      );
      setEditingComponent(null);
    } catch (err) {
      console.error('Error updating component:', err);
    }
  };

  const handleDeleteComponent = async (componentId) => {
    if (confirm('Are you sure you want to delete this component?')) {
      try {
        const { error } = await supabase
          .from('greenhouse_layout')
          .delete()
          .eq('id', componentId);

        if (error) throw error;
        
        setLayoutComponents(prev => prev.filter(comp => comp.id !== componentId));
        setSelectedComponent(null);
      } catch (err) {
        console.error('Error deleting component:', err);
      }
    }
  };

  const handleAddComponent = async () => {
    try {
      const { data, error } = await supabase
        .from('greenhouse_layout')
        .insert([newComponent])
        .select();

      if (error) throw error;
      
      setLayoutComponents(prev => [...prev, data[0]]);
      setShowAddForm(false);
      setNewComponent({
        name: '',
        component_type: 'growbed',
        x_position: 0,
        y_position: 0,
        width: 1,
        height: 1,
        color: '#4CAF50',
        status: 'active',
        metadata: {}
      });
    } catch (err) {
      console.error('Error adding component:', err);
    }
  };

  const getComponentIcon = (componentType) => {
    switch (componentType) {
      case 'growbed': return '🟢';
      case 'fishtank': return '🔵';
      case 'pump': return '🟠';
      case 'sensor': return '🟣';
      case 'pipe': return '🟤';
      case 'valve': return '⚫';
      case 'filter': return '⚪';
      default: return '⬜';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'inactive': return '#EF4444';
      case 'maintenance': return '#F59E0B';
      case 'error': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getGrowbedColor = (type) => {
    switch (type) {
      case 'DWC': return '#2196F3'; // Blue
      case 'Media bed': return '#9E9E9E'; // Grey
      case 'Wicking bed': return '#4CAF50'; // Green
      default: return '#4CAF50'; // Default green
    }
  };

  const handleGrowbedSelection = (growbedId) => {
    const selectedGrowbed = existingGrowbeds.find(g => g.id === growbedId);
    if (selectedGrowbed) {
      // Check if this growbed is already on the map
      const isAlreadyPlaced = layoutComponents.some(comp => 
        comp.metadata?.growbed_id === growbedId
      );
      
      if (isAlreadyPlaced) {
        alert('This growbed is already placed on the map!');
        return;
      }
      
      setNewComponent(prev => ({
        ...prev,
        name: selectedGrowbed.name,
        color: getGrowbedColor(selectedGrowbed.type),
        metadata: { 
          ...prev.metadata, 
          growbed_type: selectedGrowbed.type,
          growbed_id: selectedGrowbed.id
        }
      }));
    }
  };

  const componentTypes = [
    { value: 'growbed', label: 'Growbed', color: '#4CAF50' },
    { value: 'fishtank', label: 'Fish Tank', color: '#2196F3' },
    { value: 'pump', label: 'Pump', color: '#FF9800' },
    { value: 'sensor', label: 'Sensor', color: '#9C27B0' },
    { value: 'pipe', label: 'Pipe', color: '#795548' },
    { value: 'valve', label: 'Valve', color: '#000000' },
    { value: 'filter', label: 'Filter', color: '#6B7280' }
  ];

  return (
    <div className="w-full h-full relative">
      {/* Editor Controls */}
      <div className="absolute top-4 left-4 z-20 flex space-x-2">
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          ➕ Add Component
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          💾 Save Layout
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
        >
          ❌ Cancel
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-20 flex space-x-2">
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
        style={{ cursor: isDragging ? 'grabbing' : (isEditing ? 'grabbing' : 'grab') }}
      >
        <svg
          ref={svgRef}
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
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onMouseDown={(e) => handleMouseDown(e, component)}
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
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onMouseDown={(e) => handleMouseDown(e, component)}
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

              {/* Resize handles */}
              {selectedComponent?.id === component.id && (
                <>
                  <rect
                    x={component.x_position + component.width - 0.15}
                    y={component.y_position + component.height - 0.15}
                    width="0.3"
                    height="0.3"
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth="0.02"
                    className="cursor-nw-resize"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      // Handle resize logic here
                    }}
                  />
                </>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Component Details Modal */}
      {selectedComponent && (
        <div className="absolute top-4 right-4 z-20 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
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
          
          <div className="space-y-2 text-sm mb-4">
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
                ({selectedComponent.x_position.toFixed(1)}m, {selectedComponent.y_position.toFixed(1)}m)
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
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => handleEditComponent(selectedComponent)}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => handleDeleteComponent(selectedComponent.id)}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}

      {/* Edit Component Form */}
      {editingComponent && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-white border border-gray-300 rounded-lg shadow-xl p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Component</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editingComponent.name}
                onChange={(e) => setEditingComponent(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={editingComponent.component_type}
                onChange={(e) => setEditingComponent(prev => ({ 
                  ...prev, 
                  component_type: e.target.value,
                  color: componentTypes.find(t => t.value === e.target.value)?.color || '#4CAF50'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {componentTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">X Position (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingComponent.x_position}
                  onChange={(e) => setEditingComponent(prev => ({ ...prev, x_position: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Y Position (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingComponent.y_position}
                  onChange={(e) => setEditingComponent(prev => ({ ...prev, y_position: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Length (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingComponent.width}
                  onChange={(e) => setEditingComponent(prev => ({ ...prev, width: parseFloat(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingComponent.height}
                  onChange={(e) => setEditingComponent(prev => ({ ...prev, height: parseFloat(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editingComponent.status}
                onChange={(e) => setEditingComponent(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={editingComponent.color}
                onChange={(e) => setEditingComponent(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-2 mt-6">
            <button
              onClick={handleSaveComponent}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditingComponent(null)}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Component Form */}
      {showAddForm && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-white border border-gray-300 rounded-lg shadow-xl p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Component</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newComponent.name}
                onChange={(e) => setNewComponent(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter component name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={newComponent.component_type}
                onChange={(e) => setNewComponent(prev => ({ 
                  ...prev, 
                  component_type: e.target.value,
                  color: componentTypes.find(t => t.value === e.target.value)?.color || '#4CAF50',
                  growbed_id: null,
                  name: ''
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {componentTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Growbed selection - only show if growbed type is selected */}
            {newComponent.component_type === 'growbed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Existing Growbed</label>
                <select
                  value={newComponent.metadata.growbed_id || ''}
                  onChange={(e) => handleGrowbedSelection(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a growbed...</option>
                  {existingGrowbeds.map(growbed => (
                    <option key={growbed.id} value={growbed.id}>
                      {growbed.name} ({growbed.type})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  A growbed can only exist once on the map
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">X Position (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newComponent.x_position}
                  onChange={(e) => setNewComponent(prev => ({ ...prev, x_position: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Y Position (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newComponent.y_position}
                  onChange={(e) => setNewComponent(prev => ({ ...prev, y_position: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Length (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newComponent.width}
                  onChange={(e) => setNewComponent(prev => ({ ...prev, width: parseFloat(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newComponent.height}
                  onChange={(e) => setNewComponent(prev => ({ ...prev, height: parseFloat(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={newComponent.color}
                onChange={(e) => setNewComponent(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-2 mt-6">
            <button
              onClick={handleAddComponent}
              disabled={!newComponent.name}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Add Component
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>🖱️ Drag to move • 🔍 Scroll to zoom • 👆 Click components for details • 📏 20m × 20m greenhouse</span>
        </div>
      </div>
    </div>
  );
}
