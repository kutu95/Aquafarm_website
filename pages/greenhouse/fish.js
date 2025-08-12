import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '../_app';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Fish() {
  const { user, role, loading } = useContext(AuthContext);
  const router = useRouter();
  const [fish, setFish] = useState([]);
  const [fishTypes, setFishTypes] = useState([]);
  const [fishtanks, setFishtanks] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFish, setEditingFish] = useState(null);
  const [formData, setFormData] = useState({
    fish_type_id: '',
    fishtank_id: '',
    quantity: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      router.push('/login');
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      
      // Fetch fish with related data
      const { data: fishData, error: fishError } = await supabase
        .from('fish')
        .select(`
          *,
          fish_types (
            name
          ),
          fishtanks (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (fishError) throw fishError;

      // Fetch fish types for dropdown
      const { data: fishTypesData, error: fishTypesError } = await supabase
        .from('fish_types')
        .select('*')
        .order('name');

      if (fishTypesError) throw fishTypesError;

      // Fetch fishtanks for dropdown
      const { data: fishtanksData, error: fishtanksError } = await supabase
        .from('fishtanks')
        .select('id, name')
        .order('name');

      if (fishtanksError) throw fishtanksError;

      setFish(fishData || []);
      setFishTypes(fishTypesData || []);
      setFishtanks(fishtanksData || []);
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
      const fishData = {
        ...formData,
        fish_type_id: parseInt(formData.fish_type_id),
        fishtank_id: formData.fishtank_id ? parseInt(formData.fishtank_id) : null,
        quantity: parseInt(formData.quantity)
      };

      if (editingFish) {
        const { error } = await supabase
          .from('fish')
          .update(fishData)
          .eq('id', editingFish.id);

        if (error) throw error;
        alert('Fish record updated successfully!');
      } else {
        const { error } = await supabase
          .from('fish')
          .insert([fishData]);

        if (error) throw error;
        alert('Fish record created successfully!');
      }

      setShowForm(false);
      setEditingFish(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving fish record:', error);
      alert('Error saving fish record');
    }
  };

  const handleEdit = (fishRecord) => {
    setEditingFish(fishRecord);
    setFormData({
      fish_type_id: fishRecord.fish_type_id.toString(),
      fishtank_id: fishRecord.fishtank_id ? fishRecord.fishtank_id.toString() : '',
      quantity: fishRecord.quantity.toString(),
      status: fishRecord.status,
      notes: fishRecord.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this fish record?')) return;

    try {
      const { error } = await supabase
        .from('fish')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Fish record deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error deleting fish record:', error);
      alert('Error deleting fish record');
    }
  };

  const resetForm = () => {
    setFormData({
      fish_type_id: '',
      fishtank_id: '',
      quantity: '',
      status: 'active',
      notes: ''
    });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingFish(null);
    resetForm();
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Link href="/greenhouse" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
                ← Back to Greenhouse
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Fish Management</h1>
              <p className="text-gray-600">Manage fish populations, types, and tank assignments</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Add Fish Record
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingFish ? 'Edit Fish Record' : 'Add New Fish Record'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fish Type *
                    </label>
                    <select
                      required
                      value={formData.fish_type_id}
                      onChange={(e) => setFormData({ ...formData, fish_type_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a fish type</option>
                      {fishTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fishtank
                    </label>
                    <select
                      value={formData.fishtank_id}
                      onChange={(e) => setFormData({ ...formData, fishtank_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a fishtank (optional)</option>
                      {fishtanks.map((tank) => (
                        <option key={tank.id} value={tank.id}>
                          {tank.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="sick">Sick</option>
                      <option value="deceased">Deceased</option>
                    </select>
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
                    placeholder="Additional notes about this fish record..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors duration-200"
                  >
                    {editingFish ? 'Update' : 'Create'} Fish Record
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Fish List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Fish Records</h2>
            </div>
            {dataLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading fish records...</p>
              </div>
            ) : fish.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No fish records found. Create your first fish record to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fish Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fishtank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fish.map((fishRecord) => (
                      <tr key={fishRecord.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {fishRecord.fish_types?.name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {fishRecord.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {fishRecord.fishtanks?.name || 'No tank'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            fishRecord.status === 'active' ? 'bg-green-100 text-green-800' :
                            fishRecord.status === 'sick' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {fishRecord.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-xs">
                            {fishRecord.notes || 'No notes'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(fishRecord)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(fishRecord.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
