import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/pages/_app';
import Layout from '@/components/Layout';

export default function WaterChemistryRecords() {
  const { user, loading } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterParameter, setFilterParameter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  const fetchRecords = async () => {
    try {
      setLoadingRecords(true);
      const response = await fetch('/api/water-chemistry/records', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
      } else {
        console.error('Failed to fetch records');
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
  };

  const handleUpdate = async (updatedData) => {
    try {
      const response = await fetch('/api/water-chemistry/save-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Record updated successfully');
        setEditingRecord(null);
        fetchRecords(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to update record');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert(`Error updating record: ${error.message}`);
    }
  };

  const handleDelete = async (recordId) => {
    try {
      const response = await fetch(`/api/water-chemistry/delete-record/${recordId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Record deleted successfully');
        setShowDeleteConfirm(null);
        fetchRecords(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert(`Error deleting record: ${error.message}`);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesDate = !filterDate || record.record_date === filterDate;
    const matchesParameter = !filterParameter || 
      (record.ph && record.ph.toString().includes(filterParameter)) ||
      (record.ammonia && record.ammonia.toString().includes(filterParameter)) ||
      (record.nitrite && record.nitrite.toString().includes(filterParameter)) ||
      (record.nitrate && record.nitrate.toString().includes(filterParameter));
    const matchesSearch = !searchTerm || 
      record.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.record_date.includes(searchTerm);
    
    return matchesDate && matchesParameter && matchesSearch;
  });

  const getStatusColor = (value, parameter) => {
    if (!value) return 'text-gray-500';
    
    switch (parameter) {
      case 'ph':
        if (value >= 6.0 && value <= 7.5) return 'text-green-600';
        if (value >= 5.5 && value <= 8.0) return 'text-yellow-600';
        return 'text-red-600';
      case 'ammonia':
        if (value <= 0.25) return 'text-green-600';
        if (value <= 1.0) return 'text-yellow-600';
        return 'text-red-600';
      case 'nitrite':
        if (value === 0) return 'text-green-600';
        return 'text-red-600';
      case 'nitrate':
        if (value >= 10 && value <= 40) return 'text-green-600';
        if (value >= 5 && value <= 80) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-700';
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-lg">Loading...</div>
    </div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-lg">Please log in to view water chemistry records.</div>
    </div>;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Water Chemistry Records</h1>
          <p className="mt-2 text-gray-600">Manage and track your water quality testing history</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Parameter Value</label>
              <input
                type="text"
                placeholder="e.g., 6.4, 0.25"
                value={filterParameter}
                onChange={(e) => setFilterParameter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Notes</label>
              <input
                type="text"
                placeholder="Search in notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterDate('');
                  setFilterParameter('');
                  setSearchTerm('');
                }}
                className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loadingRecords ? (
            <div className="p-8 text-center">
              <div className="text-lg text-gray-500">Loading records...</div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-lg text-gray-500">No water chemistry records found.</div>
              <p className="text-gray-400 mt-2">Start by analyzing some water samples!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">pH</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ammonia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nitrite</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nitrate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DO</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(record.record_date).toLocaleDateString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(record.ph, 'ph')}`}>
                        {record.ph || 'N/A'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(record.ammonia, 'ammonia')}`}>
                        {record.ammonia !== null && record.ammonia !== undefined ? `${record.ammonia} ppm` : 'N/A'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(record.nitrite, 'nitrite')}`}>
                        {record.nitrite !== null && record.nitrite !== undefined ? `${record.nitrite} ppm` : 'N/A'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(record.nitrate, 'nitrate')}`}>
                        {record.nitrate !== null && record.nitrate !== undefined ? `${record.nitrate} ppm` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.dissolved_oxygen ? `${record.dissolved_oxygen} mg/L` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.water_temperature ? `${record.water_temperature}°C` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {record.confidence ? `${Math.round(record.confidence * 100)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(record.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingRecord && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Record</h3>
                <EditRecordForm
                  record={editingRecord}
                  onSave={handleUpdate}
                  onCancel={() => setEditingRecord(null)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
                <p className="text-gray-600 mb-6">Are you sure you want to delete this record? This action cannot be undone.</p>
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Edit Record Form Component
function EditRecordForm({ record, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    record_date: record.record_date,
    ph: record.ph || '',
    ammonia: record.ammonia || '',
    nitrite: record.nitrite || '',
    nitrate: record.nitrate || '',
    dissolved_oxygen: record.dissolved_oxygen || '',
    water_temperature: record.water_temperature || '',
    confidence: record.confidence || '',
    notes: record.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: record.id
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={formData.record_date}
            onChange={(e) => setFormData(prev => ({ ...prev, record_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">pH</label>
          <input
            type="number"
            step="0.1"
            value={formData.ph}
            onChange={(e) => setFormData(prev => ({ ...prev, ph: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ammonia (ppm)</label>
          <input
            type="number"
            step="0.01"
            value={formData.ammonia}
            onChange={(e) => setFormData(prev => ({ ...prev, ammonia: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nitrite (ppm)</label>
          <input
            type="number"
            step="0.01"
            value={formData.nitrite}
            onChange={(e) => setFormData(prev => ({ ...prev, nitrite: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nitrate (ppm)</label>
          <input
            type="number"
            step="0.1"
            value={formData.nitrate}
            onChange={(e) => setFormData(prev => ({ ...prev, nitrate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DO (mg/L)</label>
          <input
            type="number"
            step="0.01"
            value={formData.dissolved_oxygen}
            onChange={(e) => setFormData(prev => ({ ...prev, dissolved_oxygen: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
          <input
            type="number"
            step="0.1"
            value={formData.water_temperature}
            onChange={(e) => setFormData(prev => ({ ...prev, water_temperature: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={formData.confidence}
            onChange={(e) => setFormData(prev => ({ ...prev, confidence: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          rows="3"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
