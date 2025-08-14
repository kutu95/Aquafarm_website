import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GreenhouseMapEditor({ onSave, onCancel }) {
  const [layoutComponents, setLayoutComponents] = useState([]);
  const [existingGrowbeds, setExistingGrowbeds] = useState([]);
  const [existingFishtanks, setExistingFishtanks] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [layoutLoading, setLayoutLoading] = useState(true);

  // Filter out growbeds that are already placed on the map
  const availableGrowbeds = existingGrowbeds.filter(growbed => 
    !layoutComponents.some(comp => 
      comp.metadata?.growbed_id === growbed.id
    )
  );

  // Filter out fishtanks that are already placed on the map
  const availableFishtanks = existingFishtanks.filter(fishtank => 
    !layoutComponents.some(comp => 
      comp.metadata?.fishtank_id === fishtank.id
    )
  );
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
    layer_order: 2, // Default for growbed
    metadata: {}
  });
  const [draggedComponent, setDraggedComponent] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1); // Force to 100% (1.0)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, componentX: undefined, componentY: undefined });
  const [justFinishedDragging, setJustFinishedDragging] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(600); // Default viewport width
  const [viewportHeight, setViewportHeight] = useState(600); // Default viewport height
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null); // 'se', 'sw', 'ne', 'nw'
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Greenhouse dimensions in metres
  const GREENHOUSE_WIDTH = 20;
  const GREENHOUSE_HEIGHT = 20;

  useEffect(() => {
    fetchLayoutData();
    fetchExistingGrowbeds();
    fetchExistingFishtanks();
  }, []);

  // Force scale to 100% when component mounts (edit mode)
  useEffect(() => {
    setScale(1); // Force to 100%
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Handle window resize to maintain 100% scale
  useEffect(() => {
    const handleResize = () => {
      // Keep scale at 100% on resize
      setScale(1);
      setPanOffset({ x: 0, y: 0 });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global mouse move listener for resize operations
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isResizing) {
        handleResizeMove(e);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        setResizeHandle(null);
        setResizeStart({ x: 0, y: 0, width: 0, height: 0 });
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isResizing, resizeStart, resizeHandle]);

  const fetchExistingGrowbeds = async () => {
    try {
      const { data, error } = await supabase
        .from('growbeds')
        .select('id, name, type, status, width, length')
        .order('name');

      if (error) throw error;
      setExistingGrowbeds(data || []);
    } catch (err) {
      console.error('Error fetching existing growbeds:', err);
    }
  };

  const fetchExistingFishtanks = async () => {
    try {
      // First, let's check what columns actually exist in the fishtanks table
      const { data, error } = await supabase
        .from('fishtanks')
        .select('*')
        .limit(1);

      if (error) {
        console.log('Error checking fishtanks table structure:', error);
        // If table doesn't exist or has different structure, set empty array
        setExistingFishtanks([]);
        return;
      }

      // If we have data, check what columns exist and fetch accordingly
      if (data && data.length > 0) {
        const sampleRecord = data[0];
        console.log('Fishtanks table structure:', Object.keys(sampleRecord));
        
        // Fetch with available columns
        const { data: fishtanks, error: fetchError } = await supabase
          .from('fishtanks')
          .select('id, name, status')
          .order('name');

        if (fetchError) throw fetchError;
        setExistingFishtanks(fishtanks || []);
      } else {
        setExistingFishtanks([]);
      }
    } catch (err) {
      console.error('Error fetching existing fishtanks:', err);
      setExistingFishtanks([]);
    }
  };

  const fetchLayoutData = async () => {
    try {
      const { data, error } = await supabase
        .from('greenhouse_layout')
        .select('*')
        .order('layer_order', { ascending: true });

      if (error) throw error;
      
      // Debug logging
      console.log('Fetched layout components:', {
        count: data?.length || 0,
        components: data || [],
        error: error
      });
      
      // Debug: Show raw component data
      if (data && data.length > 0) {
        console.log('Raw component data sample:', data[0]);
        console.log('All component positions:', data.map(c => ({
          id: c.id,
          name: c.name,
          x: c.x_position,
          y: c.y_position,
          width: c.width,
          height: c.height,
          type: c.component_type
        })));
      }
      
      // Validate and fix component data if needed
      const validatedComponents = (data || []).map(component => {
        // Ensure component has valid positions and dimensions
        let fixedComponent = { ...component };
        
        // Fix invalid positions
        if (typeof fixedComponent.x_position !== 'number' || isNaN(fixedComponent.x_position)) {
          fixedComponent.x_position = 1;
        }
        if (typeof fixedComponent.y_position !== 'number' || isNaN(fixedComponent.y_position)) {
          fixedComponent.y_position = 1;
        }
        
        // Fix invalid dimensions
        if (typeof fixedComponent.width !== 'number' || isNaN(fixedComponent.width) || fixedComponent.width <= 0) {
          fixedComponent.width = 1;
        }
        if (typeof fixedComponent.height !== 'number' || isNaN(fixedComponent.height) || fixedComponent.height <= 0) {
          fixedComponent.height = 1;
        }
        
        // Fix invalid layer_order based on component type
        const correctLayerOrder = getLayerOrder(fixedComponent.component_type);
                    if (fixedComponent.layer_order !== correctLayerOrder) {
              fixedComponent.layer_order = correctLayerOrder;
          
          // Update the database with the corrected layer_order
          supabase
            .from('greenhouse_layout')
            .update({ layer_order: correctLayerOrder })
            .eq('id', fixedComponent.id)
            .then(({ error }) => {
              if (error) {
                console.error('Error updating layer_order:', error);
              }
            });
        }
        
        // Ensure component is within viewBox bounds
        if (fixedComponent.x_position < 0) fixedComponent.x_position = 0;
        if (fixedComponent.y_position < 0) fixedComponent.y_position = 0;
        if (fixedComponent.x_position + fixedComponent.width > GREENHOUSE_WIDTH) {
          fixedComponent.x_position = Math.max(0, GREENHOUSE_WIDTH - fixedComponent.width);
        }
        if (fixedComponent.y_position + fixedComponent.height > GREENHOUSE_HEIGHT) {
          fixedComponent.y_position = Math.max(0, GREENHOUSE_HEIGHT - fixedComponent.height);
        }
        
        return fixedComponent;
      });
      
      console.log('Validated components:', validatedComponents);
      setLayoutComponents(validatedComponents);
    } catch (err) {
      console.error('Error fetching layout data:', err);
      setLayoutComponents([]);
    } finally {
      setLayoutLoading(false);
    }
  };

  const handleMouseDown = (e, component) => {
    // If component is provided, we're dragging a component
    if (component && (e.target.tagName === 'rect' || e.target.tagName === 'circle')) {
      setIsEditing(true);
      setDraggedComponent(component);
      setIsDragging(true); // Set dragging flag for component drag
      
      console.log('=== SETTING DRAGGED COMPONENT ===');
      console.log('Component:', component);
      console.log('isDragging set to true');
      console.log('draggedComponent set to:', component);
      console.log('================================');
      
      // Get the SVG element and its bounding rect
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      
      // Store the initial mouse position and component position
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        componentX: component.x_position,
        componentY: component.y_position
      });
      
      console.log('=== DRAG START ===');
      console.log('Component:', component.name);
      console.log('Component SVG pos:', { x: component.x_position, y: component.y_position });
      console.log('Mouse screen pos:', { x: e.clientX, y: e.clientY });
      console.log('Scale:', scale);
      console.log('Pan offset:', panOffset);
      console.log('==================');
    } 
    // If no component and clicking on background elements, we're panning
    else if (!component && (
      e.target.tagName === 'svg' || 
      e.target.classList.contains('bg-gray-50') ||
      e.target.getAttribute('fill') === 'url(#grid)' ||
      e.target.getAttribute('stroke') === '#9CA3AF'
    )) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y, componentX: undefined, componentY: undefined });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && draggedComponent && dragStart.componentX !== undefined) {
      // Calculate how far the mouse has moved since drag start
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      // Calculate the actual pixel-to-SVG-unit ratio
      // The SVG viewBox is 20x20 units, but the container size determines the pixel mapping
      const containerRect = containerRef.current?.getBoundingClientRect();
      const pixelToSvgRatio = containerRect ? GREENHOUSE_WIDTH / containerRect.width : 1;
      
      // Convert screen delta to SVG delta using the actual ratio
      const svgDeltaX = deltaX * pixelToSvgRatio / scale;
      const svgDeltaY = deltaY * pixelToSvgRatio / scale;
      
      // Calculate new position by adding delta to original component position
      const newX = dragStart.componentX + svgDeltaX;
      const newY = dragStart.componentY + svgDeltaY;
      
      // Constrain to greenhouse bounds
      const constrainedX = Math.max(0, Math.min(GREENHOUSE_WIDTH - draggedComponent.width, newX));
      const constrainedY = Math.max(0, Math.min(GREENHOUSE_HEIGHT - draggedComponent.height, newY));
      
      setDraggedComponent(prev => ({
        ...prev,
        x_position: constrainedX,
        y_position: constrainedY
      }));
      
      console.log('=== DRAG MOVE ===');
      console.log('Mouse screen pos:', { x: e.clientX, y: e.clientY });
      console.log('Delta screen:', { x: deltaX, y: deltaY });
      console.log('Container size:', { width: containerRect?.width, height: containerRect?.height });
      console.log('Pixel to SVG ratio:', pixelToSvgRatio);
      console.log('Delta SVG:', { x: svgDeltaX, y: svgDeltaY });
      console.log('New SVG pos:', { x: newX, y: newY });
      console.log('Constrained pos:', { x: constrainedX, y: constrainedY });
      console.log('Scale:', scale);
      console.log('==================');
    } else if (isDragging && dragStart.componentX === undefined) {
      // Panning the viewport (only when not dragging a component)
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    
    if (isResizing) {
      handleResizeMove(e);
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging && draggedComponent) {
      console.log('=== MOUSE UP ===');
      console.log('Dragged component final position:', { 
        x: draggedComponent.x_position, 
        y: draggedComponent.y_position 
      });
      
      // Update the component position in the layout
      setLayoutComponents(prev => {
        const updated = prev.map(comp => 
          comp.id === draggedComponent.id 
            ? { ...comp, x_position: draggedComponent.x_position, y_position: draggedComponent.y_position }
            : comp
        );
        
        console.log('Updated layout components:', updated);
        return updated;
      });
      
      setDraggedComponent(null);
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      
      // Set flag to prevent info box from appearing
      setJustFinishedDragging(true);
      setTimeout(() => {
        setJustFinishedDragging(false);
      }, 100);
    }
    
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStart({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  const handleResizeStart = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: viewportWidth,
      height: viewportHeight
    });
  };

  const handleResizeMove = (e) => {
    if (!isResizing || !resizeHandle) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    
    // Calculate new dimensions based on which handle is being dragged
    switch (resizeHandle) {
      case 'se': // Southeast - bottom right
        newWidth = Math.max(200, resizeStart.width + deltaX);
        newHeight = newWidth; // Maintain 1:1 aspect ratio
        break;
      case 'sw': // Southwest - bottom left
        newWidth = Math.max(200, resizeStart.width - deltaX);
        newHeight = newWidth; // Maintain 1:1 aspect ratio
        break;
      case 'ne': // Northeast - top right
        newWidth = Math.max(200, resizeStart.width + deltaX);
        newHeight = newWidth; // Maintain 1:1 aspect ratio
        break;
      case 'nw': // Northwest - top left
        newWidth = Math.max(200, resizeStart.width - deltaX);
        newHeight = newWidth; // Maintain 1:1 aspect ratio
        break;
    }
    
    // Ensure minimum size
    const minSize = 200;
    newWidth = Math.max(minSize, newWidth);
    newHeight = Math.max(minSize, newHeight);
    
    // Ensure maximum size (80% of window)
    const maxSize = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
    newWidth = Math.min(maxSize, newWidth);
    newHeight = Math.min(maxSize, newHeight);
    
    setViewportWidth(newWidth);
    setViewportHeight(newWidth); // Always keep height equal to width for 1:1
  };

  const handleWheel = (e) => {
    e.preventDefault();
    // Disable zooming
  };

  const resetView = () => {
    setScale(1); // Force to 100%
    setPanOffset({ x: 0, y: 0 });
  };

  const handleComponentClick = (component) => {
    if (!isEditing && !isDragging && !justFinishedDragging) {
      setSelectedComponent(component);
    }
  };

  const handleEditComponent = async (component) => {
    // If this is a growbed component, fetch the latest dimensions from the growbed record
    if (component.component_type === 'growbed' && component.metadata?.growbed_id) {
      try {
        const { data, error } = await supabase
          .from('growbeds')
          .select('width, length')
          .eq('id', component.metadata.growbed_id)
          .single();

        if (!error && data) {
          // Update the component with the latest dimensions from the growbed record
          component.width = data.length || component.width; // length becomes width on map
          component.height = data.width || component.height; // width becomes height on map
        }
      } catch (err) {
        console.error('Error fetching growbed dimensions:', err);
      }
    }

    setEditingComponent({ ...component });
    setSelectedComponent(null);
  };

  const handleSaveComponent = async () => {
    try {
      // Automatically update layer_order based on component type
      const componentWithUpdatedLayerOrder = {
        ...editingComponent,
        layer_order: getLayerOrder(editingComponent.component_type)
      };

      const { error } = await supabase
        .from('greenhouse_layout')
        .update(componentWithUpdatedLayerOrder)
        .eq('id', editingComponent.id);

      if (error) throw error;
      
      setLayoutComponents(prev => 
        prev.map(comp => 
          comp.id === editingComponent.id ? componentWithUpdatedLayerOrder : comp
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
      // Automatically assign layer_order based on component type
      const componentWithLayerOrder = {
        ...newComponent,
        layer_order: getLayerOrder(newComponent.component_type)
      };

      const { data, error } = await supabase
        .from('greenhouse_layout')
        .insert([componentWithLayerOrder])
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
        layer_order: 2, // Default for growbed
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

  // Function to automatically assign layer_order based on component type
  const getLayerOrder = (componentType) => {
    switch (componentType) {
      case 'greenhouse': return 0;      // Background/outline
      case 'pipe': return 1;            // Infrastructure
      case 'growbed': return 2;         // Main components
      case 'fishtank': return 2;        // Main components
      case 'pump': return 3;            // Equipment
      case 'valve': return 3;           // Equipment
      case 'filter': return 3;          // Equipment
      case 'sensor': return 4;          // Monitoring
      case 'other': return 5;           // Furniture/accessories (tables, benches, fridges, etc.)
      default: return 6;                // Any other components
    }
  };

  const getLayerOrderDescription = (layerOrder) => {
    switch (layerOrder) {
      case 0: return 'Background/Outline';
      case 1: return 'Infrastructure';
      case 2: return 'Main Components';
      case 3: return 'Equipment';
      case 4: return 'Monitoring';
      case 5: return 'Furniture/Accessories';
      default: return 'Other';
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
        // Set width and length from the actual growbed record
        width: selectedGrowbed.length || 1, // length becomes width on map
        height: selectedGrowbed.width || 1, // width becomes height on map
        metadata: { 
          ...prev.metadata, 
          growbed_type: selectedGrowbed.type,
          growbed_id: selectedGrowbed.id
        }
      }));
    }
  };

  const handleFishtankSelection = (fishtankId) => {
    const selectedFishtank = existingFishtanks.find(f => f.id === fishtankId);
    if (selectedFishtank) {
      // Check if this fishtank is already on the map
      const isAlreadyPlaced = layoutComponents.some(comp => 
        comp.metadata?.fishtank_id === fishtankId
      );
      
      if (isAlreadyPlaced) {
        alert('This fishtank is already placed on the map!');
        return;
      }
      
      setNewComponent(prev => ({
        ...prev,
        name: selectedFishtank.name,
        color: '#2196F3', // Blue for fishtanks
        metadata: { 
          ...prev.metadata, 
          fishtank_type: selectedFishtank.type || 'standard', // Default if no type
          fishtank_id: selectedFishtank.id
        }
      }));
    }
  };

  const handleSaveLayout = async () => {
    try {
      setIsSaving(true);

      // Save each component that has been modified
      const savePromises = layoutComponents.map(async (component) => {
        const { error } = await supabase
          .from('greenhouse_layout')
          .upsert({
            id: component.id,
            name: component.name,
            component_type: component.component_type,
            parent_id: component.parent_id,
            x_position: component.x_position,
            y_position: component.y_position,
            width: component.width,
            height: component.height,
            rotation: component.rotation,
            layer_order: component.layer_order,
            color: component.color,
            status: component.status,
            metadata: component.metadata,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error(`Error saving component ${component.name}:`, error);
          throw error;
        }
      });

      await Promise.all(savePromises);
      
      // Refresh the layout data to ensure we have the latest from database
      await fetchLayoutData();
      
    } catch (err) {
      console.error('Error saving layout:', err);
      alert('Error saving layout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const componentTypes = [
    { value: 'growbed', label: 'Growbed', color: '#4CAF50' },
    { value: 'fishtank', label: 'Fish Tank', color: '#2196F3' },
    { value: 'pump', label: 'Pump', color: '#FF9800' },
    { value: 'sensor', label: 'Sensor', color: '#9C27B0' },
    { value: 'pipe', label: 'Pipe', color: '#795548' },
    { value: 'valve', label: 'Valve', color: '#000000' },
    { value: 'filter', label: 'Filter', color: '#6B7280' },
    { value: 'other', label: 'Other', color: '#9E9E9E' }
  ];

  const refreshComponentDimensions = async (componentType, metadata) => {
    if (componentType === 'growbed' && metadata?.growbed_id) {
      try {
        const { data, error } = await supabase
          .from('growbeds')
          .select('width, length')
          .eq('id', metadata.growbed_id)
          .single();

        if (!error && data) {
          setEditingComponent(prev => ({
            ...prev,
            width: data.length || prev.width, // length becomes width on map
            height: data.width || prev.height  // width becomes height on map
          }));
        }
      } catch (err) {
        console.error('Error fetching growbed dimensions:', err);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Top Controls Bar */}
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
        {/* Left Side - Editor Controls */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            ➕ Add Component
          </button>
          <button
            onClick={handleSaveLayout}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-sm"
          >
            {isSaving ? '💾 Saving...' : '💾 Save Layout'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            ❌ Cancel
          </button>
        </div>
        
        {/* Right Side - Zoom Controls */}
        <div className="flex space-x-2">
          <button
            onClick={resetView}
            className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 text-sm"
          >
            🔍 Reset to 100%
          </button>
          
          <div className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm">
            <span className="text-sm text-gray-600">Zoom:</span>
            <input
              type="number"
              value={Math.round(scale * 100)}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                  setScale(value / 100);
                }
              }}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              min="1"
              max="1000"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>

          {/* Viewport Size Display and Reset */}
          <div className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm">
            <span className="text-sm text-gray-600">Viewport:</span>
            <span className="text-sm font-mono">{viewportWidth}×{viewportHeight}</span>
            <button
              onClick={() => {
                setViewportWidth(600);
                setViewportHeight(600);
              }}
              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
              title="Reset viewport to default size"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Component Count Display */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
        <span className="font-medium">Components:</span> {layoutComponents.length} total
        {layoutComponents.length > 0 && (
          <span className="ml-4">
            Active: {layoutComponents.filter(c => c.status === 'active').length} | 
            Inactive: {layoutComponents.filter(c => c.status === 'inactive').length} | 
            Maintenance: {layoutComponents.filter(c => c.status === 'maintenance').length} | 
            Error: {layoutComponents.filter(c => c.status === 'error').length}
          </span>
        )}
        {layoutComponents.length === 0 && (
          <span className="ml-4 text-red-600">⚠️ No components found - check database connection</span>
        )}
        
        {/* Legend for DWC hole pattern */}
        <div className="mt-2 text-xs text-gray-500">
          <span className="font-medium">Legend:</span> 
          <span className="ml-2">🔵 DWC growbeds show hole pattern (20cm spacing)</span>
        </div>
      </div>

      {/* Map Container - Dynamic resizable viewport */}
      <div className="relative flex-1 min-h-0 flex justify-center items-center">
        <div 
          className="relative border border-gray-300 rounded-lg overflow-hidden bg-gray-50"
          style={{ 
            width: `${viewportWidth}px`, 
            height: `${viewportHeight}px`,
            cursor: isDragging ? 'grabbing' : (isEditing ? 'grabbing' : 'grab')
          }}
          onMouseDown={(e) => {
            // Only handle panning if we're not clicking on a component
            if (!e.target.closest('g[data-component]')) {
              handleMouseDown(e, null);
            }
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          ref={containerRef}
        >
          {/* Resize handles */}
          <div 
            className="absolute top-0 left-0 w-4 h-4 bg-blue-500 border-2 border-white cursor-nw-resize rounded-full opacity-70 hover:opacity-100 shadow-md"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            style={{ zIndex: 1000 }}
            title="Drag to resize viewport (NW)"
          />
          <div 
            className="absolute top-0 right-0 w-4 h-4 bg-blue-500 border-2 border-white cursor-ne-resize rounded-full opacity-70 hover:opacity-100 shadow-md"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            style={{ zIndex: 1000 }}
            title="Drag to resize viewport (NE)"
          />
          <div 
            className="absolute bottom-0 left-0 w-4 h-4 bg-blue-500 border-2 border-white cursor-sw-resize rounded-full opacity-70 hover:opacity-100 shadow-md"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            style={{ zIndex: 1000 }}
            title="Drag to resize viewport (SW)"
          />
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 border-2 border-white cursor-se-resize rounded-full opacity-70 hover:opacity-100 shadow-md"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            style={{ zIndex: 1000 }}
            title="Drag to resize viewport (SE)"
          />
          
          {/* Viewport Size Indicator */}
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs font-mono pointer-events-none">
            {viewportWidth}×{viewportHeight}
          </div>
          
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${GREENHOUSE_WIDTH} ${GREENHOUSE_HEIGHT}`}
            style={{
              transform: `scale(${scale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: '0 0',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          >
          {/* Background grid (1m x 1m) */}
          <defs>
            <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#E5E7EB" strokeWidth="0.05"/>
            </pattern>
            
            {/* DWC growbed hole pattern - 20cm spacing starting 10cm from all edges */}
            <pattern id="dwc-holes" width="0.2" height="0.2" patternUnits="userSpaceOnUse">
              {/* Each dot represents a hole in the surface raft */}
              {/* Pattern repeats every 20cm (0.2m) to show hole spacing */}
              {/* Starting 10cm from all edges means first hole at (0.1, 0.1) */}
              <circle cx="0.1" cy="0.1" r="0.025" fill="#000000" opacity="1"/>
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
          {layoutLoading ? (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="1.5" fill="#6B7280">Loading...</text>
          ) : layoutComponents.length === 0 ? (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="1.5" fill="#6B7280">No components found. Add some!</text>
          ) : (
            layoutComponents.map((component) => {
            // Ensure component has a valid status and is always visible
            const componentStatus = component.status || 'active';
            
            // Ensure component is always visible - only apply opacity for explicitly inactive status
            const isInactive = componentStatus === 'inactive';
            const opacity = isInactive ? 0.5 : 1;
            
            // Ensure component has a visible color
            const componentColor = component.color || '#4CAF50';
            
            // Check if component is within viewBox bounds
            const isWithinBounds = 
              component.x_position >= 0 && 
              component.y_position >= 0 && 
              component.x_position + component.width <= GREENHOUSE_WIDTH && 
              component.y_position + component.height <= GREENHOUSE_HEIGHT;
            
            if (!isWithinBounds) {
              console.warn('Component outside viewBox bounds:', {
                name: component.name,
                position: { x: component.x_position, y: component.y_position },
                dimensions: { width: component.width, height: component.height },
                viewBox: { width: GREENHOUSE_WIDTH, height: GREENHOUSE_HEIGHT }
              });
            }
            

            
            return (
            <g key={component.id} data-component="true">

              {/* Component shape - Fish tanks are circles, others are rectangles */}
              {component.component_type === 'fishtank' ? (
                <circle
                  cx={component.x_position + component.width / 2}
                  cy={component.y_position + component.height / 2}
                  r={Math.min(component.width, component.height) / 2}
                  fill={componentColor}
                  stroke={getStatusColor(componentStatus)}
                  strokeWidth="0.05"
                  className="cursor-pointer"
                  style={{
                    opacity: opacity,
                    transition: 'opacity 0.2s ease-in-out, stroke-width 0.2s ease-in-out',
                    pointerEvents: 'auto',
                    visibility: 'visible'
                  }}
                  onMouseEnter={(e) => {
                    if (!isInactive) {
                      e.target.style.strokeWidth = '0.08';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.strokeWidth = '0.05';
                  }}
                  onMouseDown={(e) => handleMouseDown(e, component)}
                  onClick={() => handleComponentClick(component)}
                  onDoubleClick={() => handleEditComponent(component)}
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
                    fill={component.component_type === 'growbed' ? 'transparent' : componentColor}
                    stroke={(() => {
                      if (component.component_type === 'growbed') {
                        if (component.metadata?.growbed_type === 'DWC' || component.name?.includes('DWC')) {
                          return '#DC2626'; // Red border for DWC
                        } else if (component.metadata?.growbed_type === 'Wicking' || component.name?.includes('Wicking')) {
                          return '#166534'; // Dark green border for Wicking
                        } else if (component.metadata?.growbed_type === 'Media' || component.name?.includes('Media')) {
                          return '#374151'; // Dark grey border for Media
                        } else {
                          return getStatusColor(componentStatus); // Default status color
                        }
                      } else {
                        return getStatusColor(componentStatus);
                      }
                    })()}
                    strokeWidth={component.component_type === 'growbed' ? '0.08' : '0.05'}
                    rx="0.1"
                    ry="0.1"
                    className="cursor-pointer"
                    style={{
                      opacity: opacity,
                      transition: 'opacity 0.2s ease-in-out, stroke-width 0.2s ease-in-out',
                      pointerEvents: 'auto',
                      visibility: 'visible'
                    }}
                    onMouseEnter={(e) => {
                      if (!isInactive) {
                        e.target.style.strokeWidth = '0.08';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.strokeWidth = component.component_type === 'growbed' && 
                                                  (component.metadata?.growbed_type === 'DWC' || component.name?.includes('DWC')) 
                        ? '0.08' : '0.05';
                    }}
                    onMouseDown={(e) => handleMouseDown(e, component)}
                    onClick={() => handleComponentClick(component)}
                    onDoubleClick={() => handleEditComponent(component)}
                  />
                  
                  {/* DWC hole pattern - only for DWC growbeds */}
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
                  opacity: opacity,
                  transition: 'opacity 0.2s ease-in-out',
                  pointerEvents: 'auto',
                  visibility: 'visible'
                }}
                onDoubleClick={() => handleEditComponent(component)}
              >
                {component.name}
              </text>

              {/* Status indicator */}
              <circle
                cx={component.x_position + component.width - 0.2}
                cy={component.y_position + 0.2}
                r="0.15"
                fill={getStatusColor(componentStatus)}
                stroke="white"
                strokeWidth="0.02"
                style={{
                  opacity: opacity,
                  transition: 'opacity 0.2s ease-in-out',
                  pointerEvents: 'auto',
                  visibility: 'visible'
                }}
                onDoubleClick={() => handleEditComponent(component)}
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
          )})
          )}
          
          {/* Render dragged component separately so it's visible during drag */}
          {(() => {
            console.log('=== RENDERING CHECK ===');
            console.log('draggedComponent:', draggedComponent);
            console.log('isDragging:', isDragging);
            console.log('Condition result:', draggedComponent && isDragging);
            console.log('====================');
            return draggedComponent && isDragging;
          })() && (
            <g key={`dragged-${draggedComponent.id}`}>
              {/* Component shape - Fish tanks are circles, others are rectangles */}
              {draggedComponent.component_type === 'fishtank' ? (
                <circle
                  cx={draggedComponent.x_position + draggedComponent.width / 2}
                  cy={draggedComponent.y_position + draggedComponent.height / 2}
                  r={Math.min(draggedComponent.width, draggedComponent.height) / 2}
                  fill={draggedComponent.color || '#4CAF50'}
                  stroke={getStatusColor(draggedComponent.status || 'active')}
                  strokeWidth="0.08"
                  className="cursor-grabbing"
                  style={{
                    opacity: 0.8,
                    pointerEvents: 'none'
                  }}
                />
              ) : (
                <>
                  {/* Background fill for different growbed types */}
                  {draggedComponent.component_type === 'growbed' && (
                    <rect
                      x={draggedComponent.x_position}
                      y={draggedComponent.y_position}
                      width={draggedComponent.width}
                      height={draggedComponent.height}
                      fill={(() => {
                        if (draggedComponent.metadata?.growbed_type === 'DWC' || draggedComponent.name?.includes('DWC')) {
                          return '#87CEEB'; // Light blue for DWC
                        } else if (draggedComponent.metadata?.growbed_type === 'Wicking' || draggedComponent.name?.includes('Wicking')) {
                          return '#4CAF50'; // Green for Wicking
                        } else if (draggedComponent.metadata?.growbed_type === 'Media' || draggedComponent.name?.includes('Media')) {
                          return '#9CA3AF'; // Grey for Media
                        } else {
                          return draggedComponent.color || '#4CAF50'; // Default to green
                        }
                      })()}
                      rx="0.1"
                      ry="0.1"
                      opacity="0.8"
                    />
                  )}
                  
                  {/* Main component rectangle */}
                  <rect
                    x={draggedComponent.x_position}
                    y={draggedComponent.y_position}
                    width={draggedComponent.width}
                    height={draggedComponent.height}
                    fill={draggedComponent.component_type === 'growbed' ? 'transparent' : (draggedComponent.color || '#4CAF50')}
                    stroke={getStatusColor(draggedComponent.status || 'active')}
                    strokeWidth="0.08"
                    rx="0.1"
                    ry="0.1"
                    className="cursor-grabbing"
                    style={{
                      opacity: 0.8,
                      pointerEvents: 'none'
                    }}
                  />
                </>
              )}
              
              {/* Component name */}
              <text
                x={draggedComponent.x_position + draggedComponent.width / 2}
                y={draggedComponent.y_position + draggedComponent.height + 0.5}
                textAnchor="middle"
                fontSize="0.4"
                fill="#374151"
                fontWeight="500"
                style={{
                  opacity: 0.8,
                  pointerEvents: 'none'
                }}
              >
                {draggedComponent.name}
              </text>
            </g>
          )}
        </svg>
        </div>
      </div>

      {/* Component Details Modal */}
      {selectedComponent && (
        <div className="absolute top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-sm">
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
            
            <div className="flex justify-between">
              <span className="text-gray-600">Layer Order:</span>
              <span className="font-medium">
                {selectedComponent.layer_order || 0} 
                <span className="text-xs text-gray-500 ml-1">
                  ({getLayerOrderDescription(selectedComponent.layer_order || 0)})
                </span>
              </span>
            </div>
            
            {/* Special indicator for DWC growbeds */}
            {selectedComponent.component_type === 'growbed' && selectedComponent.metadata?.growbed_type === 'DWC' && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Surface Texture:</span>
                <span className="font-medium text-blue-600">
                  🔵 DWC Hole Pattern
                </span>
              </div>
            )}
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-6 max-w-md w-full">
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
                onChange={(e) => {
                  const newType = e.target.value;
                  setEditingComponent(prev => ({ 
                    ...prev, 
                    component_type: newType,
                    color: componentTypes.find(t => t.value === newType)?.color || '#4CAF50'
                  }));
                  refreshComponentDimensions(newType, editingComponent.metadata);
                }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length (m) {editingComponent.component_type === 'growbed' && editingComponent.metadata?.growbed_id && '📏'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editingComponent.width}
                  onChange={(e) => setEditingComponent(prev => ({ ...prev, width: parseFloat(e.target.value) || 1 }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    editingComponent.component_type === 'growbed' && editingComponent.metadata?.growbed_id 
                      ? 'bg-gray-50 text-gray-600 cursor-not-allowed' 
                      : ''
                  }`}
                  readOnly={editingComponent.component_type === 'growbed' && editingComponent.metadata?.growbed_id}
                  placeholder={editingComponent.component_type === 'growbed' && editingComponent.metadata?.growbed_id ? 'Auto-filled from growbed' : 'e.g., 2.0'}
                />
                {editingComponent.component_type === 'growbed' && editingComponent.metadata?.growbed_id && (
                  <p className="text-xs text-blue-600 mt-1">✓ Retrieved from growbed record</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (m) {editingComponent.component_type === 'growbed' && editingComponent.metadata?.growbed_id && '📏'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editingComponent.height}
                  onChange={(e) => setEditingComponent(prev => ({ ...prev, height: parseFloat(e.target.value) || 1 }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    editingComponent.component_type === 'growbed' && editingComponent.metadata?.growbed_id 
                      ? 'bg-gray-50 text-gray-600 cursor-not-allowed' 
                      : ''
                  }`}
                  readOnly={editingComponent.component_type === 'growbed' && editingComponent.metadata?.growbed_id}
                  placeholder={editingComponent.component_type === 'growbed' && editingComponent.metadata?.growbed_id ? 'Auto-filled from growbed' : 'e.g., 1.0'}
                />
                {editingComponent.component_type === 'growbed' && editingComponent.metadata?.growbed_id && (
                  <p className="text-xs text-blue-600 mt-1">✓ Retrieved from growbed record</p>
                )}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Layer Order 
                <span className="text-xs text-gray-500 ml-1">
                  (Auto: {getLayerOrder(editingComponent.component_type)})
                </span>
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={editingComponent.layer_order || 0}
                onChange={(e) => setEditingComponent(prev => ({ ...prev, layer_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0-10"
              />
              <p className="text-xs text-gray-500 mt-1">
                0=Background, 1=Infrastructure, 2=Main Components, 3=Equipment, 4=Monitoring
              </p>
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-6 max-w-md w-full">
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
                onChange={(e) => {
                  const newType = e.target.value;
                  setNewComponent(prev => ({ 
                    ...prev, 
                    component_type: newType,
                    color: componentTypes.find(t => t.value === newType)?.color || '#4CAF50',
                    layer_order: getLayerOrder(newType), // Update layer_order based on new type
                    name: '',
                    metadata: { 
                      ...prev.metadata, 
                      growbed_id: null, 
                      growbed_type: null,
                      fishtank_id: null,
                      fishtank_type: null
                    }
                  }));
                  // Reset dimensions when type changes
                  if (newType !== 'growbed') {
                    setNewComponent(prev => ({ ...prev, width: 1, height: 1 }));
                  }
                }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Existing Growbed *</label>
                {availableGrowbeds.length > 0 ? (
                  <>
                    <select
                      value={newComponent.metadata.growbed_id || ''}
                      onChange={(e) => handleGrowbedSelection(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Choose a growbed...</option>
                      {availableGrowbeds.map(growbed => (
                        <option key={growbed.id} value={growbed.id}>
                          {growbed.name} ({growbed.type})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      A growbed can only exist once on the map
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      📏 Dimensions will be automatically retrieved from the growbed record
                    </p>
                  </>
                ) : (
                  <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                    All growbeds are already placed on the map
                  </div>
                )}
              </div>
            )}

            {/* Fishtank selection - only show if fishtank type is selected */}
            {newComponent.component_type === 'fishtank' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Existing Fishtank *</label>
                {availableFishtanks.length > 0 ? (
                  <>
                    <select
                      value={newComponent.metadata.fishtank_id || ''}
                      onChange={(e) => handleFishtankSelection(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Choose a fishtank...</option>
                      {availableFishtanks.map(fishtank => (
                        <option key={fishtank.id} value={fishtank.id}>
                          {fishtank.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      A fishtank can only exist once on the map
                        </p>
                  </>
                ) : (
                  <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                    All fishtanks are already placed on the map
                  </div>
                )}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length (m) {newComponent.component_type === 'growbed' && newComponent.metadata?.growbed_id && '📏'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newComponent.width}
                  onChange={(e) => setNewComponent(prev => ({ ...prev, width: parseFloat(e.target.value) || 1 }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    newComponent.component_type === 'growbed' && newComponent.metadata?.growbed_id 
                      ? 'bg-gray-50 text-gray-600 cursor-not-allowed' 
                      : ''
                  }`}
                  readOnly={newComponent.component_type === 'growbed' && newComponent.metadata?.growbed_id}
                  placeholder={newComponent.component_type === 'growbed' && newComponent.metadata?.growbed_id ? 'Auto-filled from growbed' : 'e.g., 2.0'}
                />
                {newComponent.component_type === 'growbed' && newComponent.metadata?.growbed_id && (
                  <p className="text-xs text-blue-600 mt-1">✓ Retrieved from growbed record</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (m) {newComponent.component_type === 'growbed' && newComponent.metadata?.growbed_id && '📏'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newComponent.height}
                  onChange={(e) => setNewComponent(prev => ({ ...prev, height: parseFloat(e.target.value) || 1 }))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    newComponent.component_type === 'growbed' && newComponent.metadata?.growbed_id 
                      ? 'bg-gray-50 text-gray-600 cursor-not-allowed' 
                      : ''
                  }`}
                  readOnly={newComponent.component_type === 'growbed' && newComponent.metadata?.growbed_id}
                  placeholder={newComponent.component_type === 'growbed' && newComponent.metadata?.growbed_id ? 'Auto-filled from growbed' : 'e.g., 1.0'}
                />
                {newComponent.component_type === 'growbed' && newComponent.metadata?.growbed_id && (
                  <p className="text-xs text-blue-600 mt-1">✓ Retrieved from growbed record</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Layer Order 
                  <span className="text-xs text-gray-500 ml-1">
                    (Auto: {newComponent.layer_order || 0})
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={newComponent.layer_order || 0}
                  onChange={(e) => setNewComponent(prev => ({ ...prev, layer_order: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0-10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  0=Background, 1=Infrastructure, 2=Main Components, 3=Equipment
                </p>
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
              disabled={!newComponent.name || 
                (newComponent.component_type === 'growbed' && !newComponent.metadata.growbed_id) ||
                (newComponent.component_type === 'fishtank' && !newComponent.metadata.fishtank_id)
              }
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
    </div>
  );
}
