import React, { useState } from 'react';
import { Star, Camera, Award, Upload, ArrowRight, ArrowLeft } from 'lucide-react';
import { lotteryAPI } from '../services/api';
import { Restaurant, DetailedRatingCreate, LIKERT_QUESTIONS, RestaurantCheckin } from '../types';
import toast from 'react-hot-toast';
import Modal from './shared/Modal';

interface DetailedRatingModalProps {
  restaurant: Restaurant;
  checkin?: RestaurantCheckin;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DetailedRatingModal: React.FC<DetailedRatingModalProps> = ({
  restaurant,
  checkin,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [overallRating, setOverallRating] = useState(0);
  const [likertResponses, setLikertResponses] = useState<Record<string, number>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newPhotos: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Please select images smaller than 5MB');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        newPhotos.push(base64);
        if (newPhotos.length === files.length) {
          setPhotos(prev => [...prev, ...newPhotos]);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    const incompleteQuestions = LIKERT_QUESTIONS.filter(q => !likertResponses[q.key]);
    if (incompleteQuestions.length > 0) {
      toast.error('Please answer all rating questions');
      return;
    }

    setSubmitting(true);
    try {
      const rating: DetailedRatingCreate = {
        restaurant_id: restaurant.id,
        overall_rating: overallRating,
        checkin_id: checkin?.id,
        ...likertResponses
      };

      await lotteryAPI.submitDetailedRating(rating);
      toast.success('Rating submitted successfully! +50 points earned!');
      onSuccess();
      onClose();

      // Reset form
      setCurrentStep(1);
      setOverallRating(0);
      setLikertResponses({});
      setPhotos([]);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, onRate: (rating: number) => void, size = 'w-8 h-8') => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(star)}
          className={`${size} transition-colors ${
            star <= rating ? 'text-yellow-500' : 'text-gray-300'
          }`}
        >
          <Star fill={star <= rating ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );

  const title = `Rate ${restaurant.name}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-16 h-1 ${currentStep >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
        </div>

        {/* Step 1: Overall Rating */}
        {currentStep === 1 && (
          <div className="text-center space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">How was your overall experience?</h3>
              <p className="text-gray-600">Give your honest rating</p>
            </div>

            <div className="flex justify-center">
              {renderStars(overallRating, setOverallRating, 'w-12 h-12')}
            </div>

            {overallRating > 0 && (
              <p className="text-sm text-gray-600">
                {overallRating === 1 ? 'Poor' :
                 overallRating === 2 ? 'Fair' :
                 overallRating === 3 ? 'Good' :
                 overallRating === 4 ? 'Very Good' : 'Excellent'}
              </p>
            )}

            <button
              onClick={() => setCurrentStep(2)}
              disabled={overallRating === 0}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2 mx-auto"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Detailed Questions */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">A few more details...</h3>
              <p className="text-gray-600">Rate specific aspects of your experience</p>
            </div>

            <div className="space-y-4">
              {LIKERT_QUESTIONS.map((question) => (
                <div key={question.key} className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900 mb-3">{question.question}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Strongly Disagree</span>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onClick={() => setLikertResponses(prev => ({ ...prev, [question.key]: value }))}
                          className={`w-10 h-10 rounded-full border-2 font-medium text-sm transition-colors ${
                            likertResponses[question.key] === value
                              ? 'border-primary-500 bg-primary-500 text-white'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">Strongly Agree</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={LIKERT_QUESTIONS.some(q => !likertResponses[q.key])}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Photos & Submit */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Add some photos! (Optional)</h3>
              <p className="text-gray-600">Share your food pics and earn bonus points</p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 inline-flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload Photos</span>
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  {uploading ? 'Uploading...' : 'JPEG, PNG up to 5MB each'}
                </p>
              </div>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.slice(0, 6).map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg"
                  />
                ))}
                {photos.length > 6 && (
                  <div className="w-full h-20 bg-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-600">
                    +{photos.length - 6} more
                  </div>
                )}
              </div>
            )}

            <div className="bg-gradient-primary text-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Earn Points for This Rating!</h4>
                  <p className="text-white/80">Detailed ratings help other students</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Award className="w-6 h-6" />
                  <span className="font-bold">+50 points</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Award className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Submit Rating'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DetailedRatingModal;