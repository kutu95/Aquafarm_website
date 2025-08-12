import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Seeding() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const [seedings, setSeedings] = useState([]);
  const [crops, setCrops] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSeeding, setEditingSeeding] = useState(null);
  const [selectedSeeding, setSelectedSeeding] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [formData, setFormData] = useState({
    seeding_date: '',
    crop_id: '',
    seeds_per_pot: '',
    pots: '',
    notes: ''
  });
  const [dateFilters, setDateFilters] = useState({
    startDate: '',
    endDate: ''
  });
  const [collapsedDates, setCollapsedDates] = useState(new Set());
  const [dateFiltersCollapsed, setDateFiltersCollapsed] = useState(true);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      router.push('/login');
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchData();
    }
  }, [user, role, dateFilters]);

  // Set initial collapsed state when seedings change
  useEffect(() => {
    if (seedings.length > 0) {
      const grouped = groupSeedingsByDate();
      if (grouped.length > 0) {
        // Try to restore collapsed state from localStorage
        const savedCollapsedState = localStorage.getItem('seedingDateCollapsedState');
        let collapsedSet;
        
        if (savedCollapsedState) {
          try {
            const savedDates = JSON.parse(savedCollapsedState);
            collapsedSet = new Set(savedDates);
            
            // Ensure all current dates are accounted for
            grouped.forEach(group => {
              if (!collapsedSet.has(group.date)) {
                // If a date isn't in saved state, default to expanded (not collapsed)
                // This handles new dates that weren't in the previous state
              }
            });
          } catch (error) {
            console.error('Error parsing saved collapsed state:', error);
            collapsedSet = new Set();
          }
        }
        
        // If no saved state or error, use default: most recent expanded, others collapsed
        if (!collapsedSet) {
          const mostRecentDate = grouped[0].date;
          collapsedSet = new Set();
          
          grouped.forEach(group => {
            if (group.date !== mostRecentDate) {
              collapsedSet.add(group.date);
            }
          });
        }
        
        setCollapsedDates(collapsedSet);
      }
    }
  }, [seedings]);

  // Initialize form with remembered seeding date
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rememberedDate = getRememberedSeedingDate();
      setFormData(prev => ({
        ...prev,
        seeding_date: rememberedDate
      }));
    }
  }, []);

  // Restore date filters panel collapsed state from localStorage
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('seedingDateFiltersCollapsed');
      if (savedState !== null) {
        setDateFiltersCollapsed(JSON.parse(savedState));
      }
    } catch (error) {
      console.error('Error parsing saved date filters collapsed state:', error);
      // Keep default state (collapsed)
    }
  }, []);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      
      // Build query with date filters
      let query = supabase
        .from('seeding')
        .select('*')
        .order('seeding_date', { ascending: false });

      // Apply date filters if they exist
      if (dateFilters.startDate) {
        query = query.gte('seeding_date', dateFilters.startDate);
      }
      if (dateFilters.endDate) {
        query = query.lte('seeding_date', dateFilters.endDate);
      }

      const { data: seedingsData, error: seedingsError } = await query;

      if (seedingsError) throw seedingsError;

      // Fetch crops for dropdown
      const { data: cropsData, error: cropsError } = await supabase
        .from('crops')
        .select('id, vegetable_name, seeds_per_pot, image_data, image_content_type, image_filename')
        .eq('status', 'active')
        .order('vegetable_name');

      if (cropsError) throw cropsError;

      setSeedings(seedingsData || []);
      setCrops(cropsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error fetching data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const seedingData = {
        ...formData,
        seeding_date: formData.seeding_date,
        crop_id: parseInt(formData.crop_id),
        seeds_per_pot: parseInt(formData.seeds_per_pot),
        pots: parseInt(formData.pots)
      };

      if (editingSeeding) {
        const { error } = await supabase
          .from('seeding')
          .update(seedingData)
          .eq('id', editingSeeding.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('seeding')
          .insert([seedingData]);

        if (error) throw error;
        
        // Remember the seeding date for next time
        if (typeof window !== 'undefined' && formData.seeding_date) {
          localStorage.setItem('lastSeedingDate', formData.seeding_date);
        }
      }

      setShowForm(false);
      setEditingSeeding(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving seeding:', error);
      alert('Error saving seeding');
    }
  };

  const handleEdit = (seeding) => {
    setEditingSeeding(seeding);
    setFormData({
      seeding_date: seeding.seeding_date,
      crop_id: seeding.crop_id ? seeding.crop_id.toString() : '',
      seeds_per_pot: seeding.seeds_per_pot ? seeding.seeds_per_pot.toString() : '',
      pots: seeding.pots ? seeding.pots.toString() : '',
      notes: seeding.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this seeding record?')) return;

    try {
      const { error } = await supabase
        .from('seeding')
        .delete()
        .eq('id', id);

              if (error) throw error;
        fetchData();
    } catch (error) {
      console.error('Error deleting seeding:', error);
      alert('Error deleting seeding');
    }
  };

  const handleView = (seeding) => {
    setSelectedSeeding(seeding);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedSeeding(null);
  };



  const getRememberedSeedingDate = () => {
    if (typeof window !== 'undefined') {
      const remembered = localStorage.getItem('lastSeedingDate');
      if (remembered) {
        return remembered;
      }
    }
    // Default to today's date if no remembered date
    return new Date().toISOString().split('T')[0];
  };

  const resetForm = () => {
    setFormData({
      seeding_date: getRememberedSeedingDate(),
      crop_id: '',
      seeds_per_pot: '',
      pots: '',
      notes: ''
    });
  };

  const handleCropChange = (cropId) => {
    if (cropId && !editingSeeding) {
      // Only pre-fill when creating a new seeding, not when editing
      const selectedCrop = crops.find(crop => crop.id === parseInt(cropId));
      if (selectedCrop && selectedCrop.seeds_per_pot) {
        setFormData(prev => ({
          ...prev,
          crop_id: cropId,
          seeds_per_pot: selectedCrop.seeds_per_pot.toString()
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          crop_id: cropId
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        crop_id: cropId
      }));
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingSeeding(null);
    resetForm();
  };

  const calculateTotalPots = () => {
    return seedings.reduce((total, seeding) => total + (seeding.pots || 0), 0);
  };

  const calculateMostRecentDatePots = () => {
    if (seedings.length === 0) return 0;
    
    const grouped = groupSeedingsByDate();
    if (grouped.length === 0) return 0;
    
    // Return total pots for the most recent date (first in the sorted array)
    return grouped[0].totalPots;
  };

  const groupSeedingsByDate = () => {
    const grouped = {};
    
    seedings.forEach(seeding => {
      const date = seeding.seeding_date;
      if (!grouped[date]) {
        grouped[date] = {
          date: date,
          seedings: [],
          totalPots: 0
        };
      }
      grouped[date].seedings.push(seeding);
      grouped[date].totalPots += (seeding.pots || 0);
    });

    // Convert to array and sort by date (descending)
    return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const handleDateFilterChange = (field, value) => {
    setDateFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearDateFilters = () => {
    setDateFilters({
      startDate: '',
      endDate: ''
    });
  };

  const toggleDateGroup = (date) => {
    setCollapsedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('seedingDateCollapsedState', JSON.stringify(Array.from(newSet)));
      } catch (error) {
        console.error('Error saving collapsed state to localStorage:', error);
      }
      
      return newSet;
    });
  };

  const isDateCollapsed = (date) => {
    return collapsedDates.has(date);
  };

  const toggleDateFiltersPanel = () => {
    setDateFiltersCollapsed(prev => {
      const newState = !prev;
      // Save to localStorage
      try {
        localStorage.setItem('seedingDateFiltersCollapsed', JSON.stringify(newState));
      } catch (error) {
        console.error('Error saving date filters collapsed state to localStorage:', error);
      }
      return newState;
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <Link href="/greenhouse" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
                ← Back to Greenhouse
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Seeding Management</h1>
              <p className="text-gray-600">Track planting dates and crop seeding activities</p>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                // Pre-fill the form with remembered values
                setFormData({
                  seeding_date: getRememberedSeedingDate(),
                  crop_id: '',
                  seeds_per_pot: '',
                  pots: '',
                  notes: ''
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 w-full sm:w-auto"
            >
              Add Seeding
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingSeeding ? 'Edit Seeding' : 'Add New Seeding'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seeding Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.seeding_date}
                      onChange={(e) => setFormData({ ...formData, seeding_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Pre-filled with last used date • You can modify this value
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Crop *
                    </label>
                    <select
                      required
                      value={formData.crop_id}
                      onChange={(e) => handleCropChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a crop</option>
                      {crops.map((crop) => (
                        <option key={crop.id} value={crop.id}>
                          {crop.vegetable_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seeds per Pot *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.seeds_per_pot}
                      onChange={(e) => setFormData({ ...formData, seeds_per_pot: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 3"
                    />
                    {formData.crop_id && (
                      <p className="mt-1 text-sm text-gray-500">
                        Pre-filled from selected crop • You can modify this value
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Pots *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.pots}
                      onChange={(e) => setFormData({ ...formData, pots: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 24"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes about this seeding..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors duration-200 w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors duration-200 w-full sm:w-auto"
                  >
                    {editingSeeding ? 'Update' : 'Create'} Seeding
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Date Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleDateFiltersPanel}
                  className="text-blue-600 hover:text-blue-800 transition-transform duration-200"
                  aria-label={dateFiltersCollapsed ? 'Expand date filters' : 'Collapse date filters'}
                >
                  <svg
                    className={`w-5 h-5 transform transition-transform duration-200 ${
                      dateFiltersCollapsed ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <h3 className="text-lg font-semibold text-gray-900">Date Filters</h3>
              </div>
              <div className="text-sm text-gray-600">
                {/* Shows pots for most recent seeding date only */}
                Most Recent Date Pots: <span className="font-semibold text-blue-600">{calculateMostRecentDatePots()}</span>
              </div>
            </div>
            
            {!dateFiltersCollapsed && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={dateFilters.startDate}
                      onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={dateFilters.endDate}
                      onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-2 lg:col-span-1">
                    <button
                      onClick={clearDateFilters}
                      className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors duration-200"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  {dateFilters.startDate || dateFilters.endDate ? (
                    <span>
                      Showing seedings from {dateFilters.startDate || 'any date'} to {dateFilters.endDate || 'any date'}
                    </span>
                  ) : (
                    <span>Showing all seedings</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Seedings List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Seeding Records</h2>
              <div className="text-sm text-gray-600">
                Most Recent Date Pots: <span className="font-semibold text-blue-600">{calculateMostRecentDatePots()}</span>
              </div>
            </div>
            {dataLoading ? (
              <div className="p-4 sm:p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading seedings...</p>
              </div>
            ) : seedings.length === 0 ? (
              <div className="p-4 sm:p-6 text-center text-gray-500">
                <p>No seeding records found. Create your first seeding record to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seeding Date
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Crop
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seeds per Pot
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pots
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupSeedingsByDate().map((dateGroup, groupIndex) => (
                      <React.Fragment key={dateGroup.date}>
                        {/* Date Group Header */}
                        <tr className="bg-blue-50 border-t-2 border-blue-200">
                          <td colSpan="4" className="px-3 sm:px-6 py-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => toggleDateGroup(dateGroup.date)}
                                  className="text-blue-600 hover:text-blue-800 transition-transform duration-200"
                                  aria-label={isDateCollapsed(dateGroup.date) ? 'Expand date group' : 'Collapse date group'}
                                >
                                  <svg
                                    className={`w-5 h-5 transform transition-transform duration-200 ${
                                      isDateCollapsed(dateGroup.date) ? 'rotate-90' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                                <span className="text-sm font-semibold text-blue-900">
                                  {new Date(dateGroup.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                                <span className="text-sm font-semibold text-blue-700">
                                  Total Pots: {dateGroup.totalPots}
                                </span>
                                <span className="text-xs text-blue-600 font-medium">
                                  {dateGroup.seedings.length} record{dateGroup.seedings.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3">
                            <span className="text-xs text-blue-600 font-medium sm:hidden">
                              {dateGroup.seedings.length} record{dateGroup.seedings.length !== 1 ? 's' : ''}
                            </span>
                          </td>
                        </tr>
                        
                        {/* Individual Seeding Records - Only show when not collapsed */}
                        {!isDateCollapsed(dateGroup.date) && (
                          <>
                            {dateGroup.seedings.map((seeding, seedingIndex) => (
                              <tr key={seeding.id} className={`hover:bg-gray-50 ${seedingIndex === dateGroup.seedings.length - 1 ? 'border-b-2 border-blue-200' : ''}`}>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap pl-4 sm:pl-8">
                                  <div className="text-sm text-gray-500">
                                    {/* Empty cell for date column - date shown in header */}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {crops.find(c => c.id === seeding.crop_id)?.vegetable_name || 'Unknown'}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {seeding.seeds_per_pot || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {seeding.pots || 'N/A'}
                                </td>
                                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-3">
                                    <button
                                      onClick={() => handleView(seeding)}
                                      className="text-green-600 hover:text-green-900 text-left"
                                    >
                                      View
                                    </button>
                                    <button
                                      onClick={() => handleEdit(seeding)}
                                      className="text-blue-600 hover:text-blue-900 text-left"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete(seeding.id)}
                                      className="text-red-600 hover:text-red-900 text-left"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Summary Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 text-sm text-gray-600">
                <span>
                  {seedings.length} seeding record{seedings.length !== 1 ? 's' : ''} found
                  {dateFilters.startDate || dateFilters.endDate ? ' in date range' : ''}
                </span>
                <span className="font-semibold">
                  Total Pots: <span className="text-blue-600">{calculateTotalPots()}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seeding Detail Popup */}
      {showPopup && selectedSeeding && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closePopup}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Seeding Details
              </h3>
              <button
                onClick={closePopup}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seeding Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedSeeding.seeding_date).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Crop
                    </label>
                    <p className="text-sm text-gray-900">
                      {crops.find(c => c.id === selectedSeeding.crop_id)?.vegetable_name || 'Unknown'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seeds per Pot
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSeeding.seeds_per_pot || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pots
                    </label>
                    <p className="text-sm text-gray-900">
                      {selectedSeeding.pots || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Created Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedSeeding.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Crop Image: {crops.find(c => c.id === selectedSeeding.crop_id)?.vegetable_name || 'Unknown'}
                    </label>
                    {(() => {
                      const crop = crops.find(c => c.id === selectedSeeding.crop_id);
                      if (crop) {
                        return (
                          <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden relative">
                            {/* Loading state */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                            
                            {/* Image */}
                            <img
                              src={`/api/greenhouse/crop-image/${crop.id}?t=${Date.now()}`}
                              alt={crop.vegetable_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.log('Image failed to load for crop:', crop.id, crop.vegetable_name);
                                e.target.style.display = 'none';
                                e.target.previousSibling.style.display = 'none';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'flex';
                                }
                              }}
                              onLoad={(e) => {
                                console.log('Image loaded successfully for crop:', crop.id, crop.vegetable_name);
                                e.target.previousSibling.style.display = 'none';
                              }}
                            />
                            
                            {/* Error state */}
                            <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                              <div className="text-center">
                                <div className="text-4xl mb-2">🌱</div>
                                <div>Image not available</div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                          <div className="text-center">
                            <div className="text-4xl mb-2">❓</div>
                            <div>Crop not found</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <div className="bg-gray-50 rounded-lg p-3 min-h-[6rem]">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {selectedSeeding.notes || 'No notes available'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
