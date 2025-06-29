'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/pages/_app';
import Layout from '@/components/Layout';

export default function VolunteerApplicationTest() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [galleryImages, setGalleryImages] = useState([]);
  const [cvFile, setCvFile] = useState(null);

  const [formData, setFormData] = useState({
    // 1. Personal Information
    fullName: '',
    email: '',
    phoneCountryCode: '+61',
    phoneNumber: '',
    currentCity: '',
    currentCountry: '',
    dateOfBirth: '',

    // 2. Availability & Stay Preferences
    preferredStartDate: '',
    stayDetails: '',

    // 3. Skills & Experience
    relevantSkills: '',
    experienceLevel: '',
    languagesSpoken: '',

    // 4. Motivation & Expectations
    whyApplying: '',
    previousExperience: '',

    // 5. Work Preferences
    preferredWorkAreas: '',
    physicalLimitations: '',
    comfortableWithSharedChores: '',

    // 6. Practical Details
    transportOwnership: '',
    visaStatus: '',

    // 7. Community & Cultural Fit
    culturalExchangeMeaning: '',
    comfortableSharedHousehold: '',
    handleChallenges: '',

    // 8. References & Agreement
    references: '',
  });

  // Common country codes
  const countryCodes = [
    '+61', '+1', '+44', '+33', '+49', '+39', '+34', '+31', '+32', '+46',
    '+47', '+45', '+358', '+47', '+46', '+45', '+358', '+47', '+46', '+45'
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      for (let i = 0; i < files.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate upload delay
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      // Create mock uploaded images
      const uploadedImages = files.map((file, index) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        path: `mock-path-${Date.now()}-${index}`
      }));

      setGalleryImages(prev => [...prev, ...uploadedImages]);
      event.target.value = '';
    } catch (error) {
      console.error('Gallery upload error:', error);
      alert('Error uploading images. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleCvUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsSubmitting(true);
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setCvFile({
        name: file.name,
        url: URL.createObjectURL(file),
        path: `mock-cv-path-${Date.now()}`
      });

      event.target.value = '';
    } catch (error) {
      console.error('CV upload error:', error);
      alert('Error uploading CV. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeGalleryImage = (index) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeCvFile = () => {
    setCvFile(null);
  };

  const validateForm = () => {
    const requiredFields = [
      'fullName', 'email', 'phoneNumber', 'currentCity', 'currentCountry',
      'dateOfBirth', 'preferredStartDate', 'stayDetails', 'relevantSkills',
      'experienceLevel', 'languagesSpoken', 'whyApplying', 'preferredWorkAreas',
      'physicalLimitations', 'comfortableWithSharedChores', 'transportOwnership',
      'visaStatus', 'culturalExchangeMeaning', 'comfortableSharedHousehold',
      'handleChallenges', 'references'
    ];

    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        alert(`Please fill in all required fields. Missing: ${field}`);
        return false;
      }
    }

    // Check age requirement
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (age < 18 || (age === 18 && monthDiff < 0)) {
      alert('You must be 18 years or older to apply.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Simulate submission delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Form data that would be submitted:', {
        user_id: user.id,
        full_name: formData.fullName,
        email: formData.email,
        phone_country_code: formData.phoneCountryCode,
        phone_number: formData.phoneNumber,
        current_city: formData.currentCity,
        current_country: formData.currentCountry,
        date_of_birth: formData.dateOfBirth,
        preferred_start_date: formData.preferredStartDate,
        stay_details: formData.stayDetails,
        relevant_skills: formData.relevantSkills,
        experience_level: formData.experienceLevel,
        languages_spoken: formData.languagesSpoken,
        why_applying: formData.whyApplying,
        previous_experience: formData.previousExperience,
        preferred_work_areas: formData.preferredWorkAreas,
        physical_limitations: formData.physicalLimitations,
        comfortable_shared_chores: formData.comfortableWithSharedChores,
        transport_ownership: formData.transportOwnership,
        visa_status: formData.visaStatus,
        cultural_exchange_meaning: formData.culturalExchangeMeaning,
        comfortable_shared_household: formData.comfortableSharedHousehold,
        handle_challenges: formData.handleChallenges,
        references: formData.references,
        gallery_images: galleryImages.map(img => img.path),
        cv_file: cvFile?.path || null,
        status: 'pending'
      });

      alert('TEST MODE: Application would be submitted successfully! This is a test version.');
      router.push('/dashboard');
    } catch (error) {
      console.error('Submission error:', error);
      alert('Error submitting application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
              <strong>TEST MODE:</strong> This is a test version of the volunteer application form. No data will be saved to the database.
            </div>
            
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
              🌱 Volunteer Application Form (Test)
            </h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 1. Personal Information */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  1. Personal Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-24">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Code
                      </label>
                      <select
                        value={formData.phoneCountryCode}
                        onChange={(e) => handleInputChange('phoneCountryCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {countryCodes.map(code => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current City *
                    </label>
                    <input
                      type="text"
                      value={formData.currentCity}
                      onChange={(e) => handleInputChange('currentCity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Country *
                    </label>
                    <input
                      type="text"
                      value={formData.currentCountry}
                      onChange={(e) => handleInputChange('currentCountry', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth (must be 18+) *
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2. Availability & Stay Preferences */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  2. Availability & Stay Preferences
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.preferredStartDate}
                      onChange={(e) => handleInputChange('preferredStartDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Stay Details (Minimum & Maximum stay, Earliest Arrival / Latest Departure) *
                    </label>
                    <textarea
                      value={formData.stayDetails}
                      onChange={(e) => handleInputChange('stayDetails', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., I can stay for 2 weeks to 3 months, earliest arrival June 1st, latest departure September 30th"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 3. Skills & Experience */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  3. Skills & Experience
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Relevant Skills (gardening, animal care, building, cooking, etc.) *
                    </label>
                    <textarea
                      value={formData.relevantSkills}
                      onChange={(e) => handleInputChange('relevantSkills', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Level of Experience *
                    </label>
                    <select
                      value={formData.experienceLevel}
                      onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select level</option>
                      <option value="none">None</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Languages Spoken Fluently *
                    </label>
                    <input
                      type="text"
                      value={formData.languagesSpoken}
                      onChange={(e) => handleInputChange('languagesSpoken', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., English, Spanish, French"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 4. Motivation & Expectations */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  4. Motivation & Expectations
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Why are you applying to volunteer on our farm? *
                    </label>
                    <textarea
                      value={formData.whyApplying}
                      onChange={(e) => handleInputChange('whyApplying', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Have you had similar experiences before? If yes, please describe.
                    </label>
                    <textarea
                      value={formData.previousExperience}
                      onChange={(e) => handleInputChange('previousExperience', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Work Preferences */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  5. Work Preferences
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Work Areas (e.g., vegetable garden, animal care, maintenance, teaching) *
                    </label>
                    <textarea
                      value={formData.preferredWorkAreas}
                      onChange={(e) => handleInputChange('preferredWorkAreas', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Physical Limitations or Dietary Requirements? *
                    </label>
                    <textarea
                      value={formData.physicalLimitations}
                      onChange={(e) => handleInputChange('physicalLimitations', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., None, or specify any limitations"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Are you comfortable with shared chores (kitchen, cleanup)? *
                    </label>
                    <textarea
                      value={formData.comfortableWithSharedChores}
                      onChange={(e) => handleInputChange('comfortableWithSharedChores', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 6. Practical Details */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  6. Practical Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Do you have your own transport or need pickup assistance? *
                    </label>
                    <textarea
                      value={formData.transportOwnership}
                      onChange={(e) => handleInputChange('transportOwnership', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Visa Status (citizen, working holiday visa, other—please specify) *
                    </label>
                    <textarea
                      value={formData.visaStatus}
                      onChange={(e) => handleInputChange('visaStatus', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 7. Community & Cultural Fit */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  7. Community & Cultural Fit
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      What does a positive cultural exchange mean to you? *
                    </label>
                    <textarea
                      value={formData.culturalExchangeMeaning}
                      onChange={(e) => handleInputChange('culturalExchangeMeaning', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Are you comfortable living in a shared household environment? *
                    </label>
                    <textarea
                      value={formData.comfortableSharedHousehold}
                      onChange={(e) => handleInputChange('comfortableSharedHousehold', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      How do you handle conflicts, homesickness, or unexpected challenges? *
                    </label>
                    <textarea
                      value={formData.handleChallenges}
                      onChange={(e) => handleInputChange('handleChallenges', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 8. References & Agreement */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  8. References & Agreement
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      References (name, email/phone for at least one host/employer or educator) *
                    </label>
                    <textarea
                      value={formData.references}
                      onChange={(e) => handleInputChange('references', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Name: John Doe, Email: john@example.com, Phone: +1234567890, Relationship: Previous host"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 9. Image Gallery Upload */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Image Gallery (Optional)
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Upload Photos to Support Your Application
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={isSubmitting}
                    />
                    {uploadProgress > 0 && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Uploading: {Math.round(uploadProgress)}%</p>
                      </div>
                    )}
                  </div>
                  
                  {galleryImages.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Uploaded Images:</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {galleryImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image.url}
                              alt={image.name}
                              className="w-full h-24 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 10. CV Upload */}
              <div className="border-b border-gray-200 dark:border-gray-600 pb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  CV/Resume (Optional)
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Upload CV or Resume
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCvUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  {cvFile && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{cvFile.name}</span>
                      <button
                        type="button"
                        onClick={removeCvFile}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application (Test)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
} 