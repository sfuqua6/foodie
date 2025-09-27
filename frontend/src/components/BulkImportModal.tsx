import React, { useState } from 'react';
import { Plus, Trash2, Upload, Award } from 'lucide-react';
import { lotteryAPI } from '../services/api';
import { BulkImportRestaurant, BulkImportRequest } from '../types';
import toast from 'react-hot-toast';
import Modal from './shared/Modal';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CUISINE_OPTIONS = [
  'American', 'Italian', 'Chinese', 'Mexican', 'Japanese', 'Thai',
  'Indian', 'French', 'Pizza', 'Cafe', 'Mediterranean', 'Other'
];

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [restaurants, setRestaurants] = useState<BulkImportRestaurant[]>([
    { name: '', cuisine_type: '', rating: 5, approximate_address: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const updateRestaurant = (index: number, field: keyof BulkImportRestaurant, value: string | number) => {
    const updated = [...restaurants];
    updated[index] = { ...updated[index], [field]: value };
    setRestaurants(updated);
  };

  const addRestaurant = () => {
    setRestaurants([...restaurants, { name: '', cuisine_type: '', rating: 5, approximate_address: '' }]);
  };

  const removeRestaurant = (index: number) => {
    if (restaurants.length > 1) {
      setRestaurants(restaurants.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    const validRestaurants = restaurants.filter(r => r.name.trim() && r.rating > 0);
    if (validRestaurants.length === 0) {
      toast.error('Please add at least one valid restaurant');
      return;
    }

    setSubmitting(true);
    try {
      const request: BulkImportRequest = { restaurants: validRestaurants };
      await lotteryAPI.bulkImport(request);
      toast.success(`Successfully imported ${validRestaurants.length} restaurants!`);
      onSuccess();
      onClose();
      setRestaurants([{ name: '', cuisine_type: '', rating: 5, approximate_address: '' }]);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to import restaurants');
    } finally {
      setSubmitting(false);
    }
  };

  const validRestaurants = restaurants.filter(r => r.name.trim() !== '' && r.rating > 0);
  const estimatedPoints = Math.min(validRestaurants.length * 10, 200);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Restaurants" size="lg">
      <div className="space-y-6">
        <div className="bg-gradient-primary text-white p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Quick Import Multiple Restaurants</h3>
              <p className="text-white/80">Add restaurants you've been to and earn points!</p>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="w-6 h-6" />
              <span className="font-bold">+{estimatedPoints} points</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {restaurants.map((restaurant, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Restaurant #{index + 1}</span>
                {restaurants.length > 1 && (
                  <button
                    onClick={() => removeRestaurant(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    value={restaurant.name}
                    onChange={(e) => updateRestaurant(index, 'name', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Tony's Pizza"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuisine Type
                  </label>
                  <select
                    value={restaurant.cuisine_type}
                    onChange={(e) => updateRestaurant(index, 'cuisine_type', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select cuisine</option>
                    {CUISINE_OPTIONS.map(cuisine => (
                      <option key={cuisine} value={cuisine}>{cuisine}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Rating *
                  </label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => updateRestaurant(index, 'rating', rating)}
                        className={`w-8 h-8 rounded ${
                          rating <= restaurant.rating
                            ? 'bg-yellow-400 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Approximate Address
                  </label>
                  <input
                    type="text"
                    value={restaurant.approximate_address}
                    onChange={(e) => updateRestaurant(index, 'approximate_address', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Franklin Street, Chapel Hill"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addRestaurant}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary-400 hover:text-primary-600 flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Another Restaurant</span>
        </button>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || validRestaurants.length === 0}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>{submitting ? 'Importing...' : `Import ${validRestaurants.length} Restaurant${validRestaurants.length !== 1 ? 's' : ''}`}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkImportModal;