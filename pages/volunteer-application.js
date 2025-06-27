import { useEffect, useState, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from './_app';
import { useRouter } from 'next/router';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { trackEvent } from '@/components/GoogleAnalytics';

export default function VolunteerApplication() {
  const { user, role } = useContext(AuthContext);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [passportFile, setPassportFile] = useState(null);
  const [existingApplication, setExistingApplication] = useState(null);
  const [showAllNationalities, setShowAllNationalities] = useState(false);

  const [form, setForm] = useState({
    nationality: '',
    dateOfBirth: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    phoneCountryCode: '+1',
    whatsapp: false,
    email: '',
    healthInsuranceCompany: '',
    healthInsurancePolicyName: '',
    healthInsurancePolicyNumber: '',
    healthInsuranceExpiryDate: '',
    nextOfKinName: '',
    nextOfKinRelation: '',
    nextOfKinPhone: '',
    nextOfKinCountryCode: '+1',
    nextOfKinEmail: '',
    otherInformation: '',
    privacyPolicyAgreed: false,
    codeOfConductAgreed: false
  });

  // Shortlist of common nationalities in alphabetical order
  const nationalityShortlist = [
    'American', 'Argentinean', 'Australian', 'Belgian', 'British', 'Canadian', 'Chilean', 'Chinese', 'French', 
    'German', 'Italian', 'Japanese', 'New Zealander', 'Norwegian', 'Spanish', 'Taiwanese'
  ];

  const allNationalities = [
    'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Antiguans', 'Argentinean', 'Armenian', 'Australian',
    'Austrian', 'Azerbaijani', 'Bahamian', 'Bahraini', 'Bangladeshi', 'Barbadian', 'Barbudans', 'Batswana', 'Belarusian', 'Belgian',
    'Belizean', 'Beninese', 'Bhutanese', 'Bolivian', 'Bosnian', 'Brazilian', 'British', 'Bruneian', 'Bulgarian', 'Burkinabe',
    'Burmese', 'Burundian', 'Cambodian', 'Cameroonian', 'Canadian', 'Cape Verdean', 'Central African', 'Chadian', 'Chilean', 'Chinese',
    'Colombian', 'Comoran', 'Congolese', 'Costa Rican', 'Croatian', 'Cuban', 'Cypriot', 'Czech', 'Danish', 'Djibouti',
    'Dominican', 'Dutch', 'East Timorese', 'Ecuadorean', 'Egyptian', 'Emirian', 'Equatorial Guinean', 'Eritrean', 'Estonian', 'Ethiopian',
    'Fijian', 'Filipino', 'Finnish', 'French', 'Gabonese', 'Gambian', 'Georgian', 'German', 'Ghanaian', 'Greek',
    'Grenadian', 'Guatemalan', 'Guinea-Bissauan', 'Guinean', 'Guyanese', 'Haitian', 'Herzegovinian', 'Honduran', 'Hungarian', 'I-Kiribati',
    'Icelander', 'Indian', 'Indonesian', 'Iranian', 'Iraqi', 'Irish', 'Israeli', 'Italian', 'Ivorian', 'Jamaican',
    'Japanese', 'Jordanian', 'Kazakhstani', 'Kenyan', 'Kittian and Nevisian', 'Kuwaiti', 'Kyrgyz', 'Laotian', 'Latvian', 'Lebanese',
    'Liberian', 'Libyan', 'Liechtensteiner', 'Lithuanian', 'Luxembourger', 'Macedonian', 'Malagasy', 'Malawian', 'Malaysian', 'Maldivan',
    'Malian', 'Maltese', 'Marshallese', 'Mauritanian', 'Mauritian', 'Mexican', 'Micronesian', 'Moldovan', 'Monacan', 'Mongolian',
    'Moroccan', 'Mosotho', 'Motswana', 'Mozambican', 'Namibian', 'Nauruan', 'Nepalese', 'New Zealander', 'Ni-Vanuatu', 'Nicaraguan',
    'Nigerian', 'Nigerien', 'North Korean', 'Northern Irish', 'Norwegian', 'Omani', 'Pakistani', 'Palauan', 'Panamanian', 'Papua New Guinean',
    'Paraguayan', 'Peruvian', 'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Saint Lucian', 'Salvadoran',
    'Samoan', 'San Marinese', 'Sao Tomean', 'Saudi', 'Scottish', 'Senegalese', 'Serbian', 'Seychellois', 'Sierra Leonean', 'Singaporean',
    'Slovakian', 'Slovenian', 'Solomon Islander', 'Somali', 'South African', 'South Korean', 'Spanish', 'Sri Lankan', 'Sudanese', 'Surinamer',
    'Swazi', 'Swedish', 'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian', 'Thai', 'Togolese', 'Tongan',
    'Trinidadian or Tobagonian', 'Tunisian', 'Turkish', 'Tuvaluan', 'Ugandan', 'Ukrainian', 'Uruguayan', 'Uzbekistani', 'Venezuelan', 'Vietnamese',
    'Welsh', 'Yemenite', 'Zambian', 'Zimbabwean'
  ];

  // Get the list of nationalities to show based on current state
  const getNationalitiesToShow = () => {
    if (showAllNationalities) {
      return allNationalities;
    }
    return [...nationalityShortlist, 'Other'];
  };

  // Handle nationality selection
  const handleNationalityChange = (e) => {
    const value = e.target.value;
    if (value === 'Other') {
      setShowAllNationalities(true);
      setForm({ ...form, nationality: '' });
    } else {
      setForm({ ...form, nationality: value });
    }
  };

  const countryCodes = [
    '+1', '+44', '+33', '+49', '+39', '+34', '+31', '+46', '+47', '+45',
    '+358', '+43', '+41', '+32', '+30', '+351', '+48', '+420', '+36', '+380',
    '+7', '+86', '+81', '+82', '+91', '+61', '+64', '+27', '+55', '+52',
    '+54', '+56', '+57', '+58', '+593', '+595', '+598', '+591', '+593', '+507',
    '+502', '+504', '+505', '+506', '+503', '+501', '+502', '+503', '+504', '+505',
    '+506', '+507', '+508', '+509', '+590', '+591', '+592', '+593', '+594', '+595',
    '+596', '+597', '+598', '+599', '+670', '+672', '+673', '+674', '+675', '+676',
    '+677', '+678', '+679', '+680', '+681', '+682', '+683', '+685', '+686', '+687',
    '+688', '+689', '+690', '+691', '+692', '+850', '+852', '+853', '+855', '+856',
    '+880', '+886', '+960', '+961', '+962', '+963', '+964', '+965', '+966', '+967',
    '+968', '+970', '+971', '+972', '+973', '+974', '+975', '+976', '+977', '+98',
    '+992', '+993', '+994', '+995', '+996', '+998', '+1242', '+1246', '+1264', '+1268',
    '+1284', '+1340', '+1345', '+1441', '+1473', '+1649', '+1664', '+1671', '+1684', '+1758',
    '+1767', '+1784', '+1787', '+1809', '+1868', '+1869', '+1876', '+1939'
  ];

  useEffect(() => {
    if (user === null) {
      router.push('/login');
    } else if (user && role !== 'admin' && role !== 'user') {
      router.push('/');
    } else if (user) {
      loadExistingApplication();
    }
  }, [user, role]);

  const loadExistingApplication = async () => {
    try {
      // First, get the user's profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Then check for existing volunteer application
      const { data, error } = await supabase
        .from('volunteer_applications')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        // User has an existing application - load it
        setExistingApplication(data);
        setForm({
          nationality: data.nationality || '',
          dateOfBirth: data.date_of_birth || '',
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          phoneNumber: data.phone_number || '',
          phoneCountryCode: data.phone_country_code || '+1',
          whatsapp: data.whatsapp || false,
          email: data.email || '',
          healthInsuranceCompany: data.health_insurance_company || '',
          healthInsurancePolicyName: data.health_insurance_policy_name || '',
          healthInsurancePolicyNumber: data.health_insurance_policy_number || '',
          healthInsuranceExpiryDate: data.health_insurance_expiry_date || '',
          nextOfKinName: data.next_of_kin_name || '',
          nextOfKinRelation: data.next_of_kin_relation || '',
          nextOfKinPhone: data.next_of_kin_phone || '',
          nextOfKinCountryCode: data.next_of_kin_country_code || '+1',
          nextOfKinEmail: data.next_of_kin_email || '',
          otherInformation: data.other_information || '',
          privacyPolicyAgreed: data.privacy_policy_agreed || false,
          codeOfConductAgreed: data.code_of_conduct_agreed || false
        });
      } else {
        // No existing application - pre-populate with user profile data
        console.log('Profile data:', profileData);
        
        // Use profile data for names, fallback to email if no profile
        let firstName = '';
        let lastName = '';
        
        if (profileData) {
          firstName = profileData.first_name || '';
          lastName = profileData.last_name || '';
        }
        
        // If still no name from profile, try to extract from email
        if (!firstName && user.email) {
          const emailName = user.email.split('@')[0];
          const nameParts = emailName.split(/[._-]/);
          if (nameParts.length >= 2) {
            firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
            lastName = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1);
          }
        }
        
        setExistingApplication(null);
        setForm({
          nationality: '',
          dateOfBirth: '',
          firstName: firstName,
          lastName: lastName,
          phoneNumber: '',
          phoneCountryCode: '+1',
          whatsapp: false,
          email: user.email || '',
          healthInsuranceCompany: '',
          healthInsurancePolicyName: '',
          healthInsurancePolicyNumber: '',
          healthInsuranceExpiryDate: '',
          nextOfKinName: '',
          nextOfKinRelation: '',
          nextOfKinPhone: '',
          nextOfKinCountryCode: '+1',
          nextOfKinEmail: '',
          otherInformation: '',
          privacyPolicyAgreed: false,
          codeOfConductAgreed: false
        });
      }
    } catch (error) {
      console.error('Error loading application:', error);
      // If there's an error, still pre-populate with user data
      setExistingApplication(null);
      
      // Try to extract name from various possible sources
      let firstName = '';
      let lastName = '';
      
      if (user.user_metadata) {
        firstName = user.user_metadata.first_name || 
                   user.user_metadata.name?.split(' ')[0] || 
                   user.user_metadata.full_name?.split(' ')[0] || '';
        
        lastName = user.user_metadata.last_name || 
                  user.user_metadata.name?.split(' ').slice(1).join(' ') || 
                  user.user_metadata.full_name?.split(' ').slice(1).join(' ') || '';
      }
      
      // If still no name, try to extract from email
      if (!firstName && user.email) {
        const emailName = user.email.split('@')[0];
        const nameParts = emailName.split(/[._-]/);
        if (nameParts.length >= 2) {
          firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
          lastName = nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1);
        }
      }
      
      setForm({
        nationality: '',
        dateOfBirth: '',
        firstName: firstName,
        lastName: lastName,
        phoneNumber: '',
        phoneCountryCode: '+1',
        whatsapp: false,
        email: user.email || '',
        healthInsuranceCompany: '',
        healthInsurancePolicyName: '',
        healthInsurancePolicyNumber: '',
        healthInsuranceExpiryDate: '',
        nextOfKinName: '',
        nextOfKinRelation: '',
        nextOfKinPhone: '',
        nextOfKinCountryCode: '+1',
        nextOfKinEmail: '',
        otherInformation: '',
        privacyPolicyAgreed: false,
        codeOfConductAgreed: false
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (!form.privacyPolicyAgreed) {
      setMessage('Please agree to the Privacy Policy before submitting.');
      return;
    }

    if (!form.codeOfConductAgreed) {
      setMessage('Please agree to the Code of Conduct before submitting.');
      return;
    }

    try {
      let passportPath = existingApplication?.passport_image_path || null;

      // Upload passport if provided
      if (passportFile) {
        const fileExt = passportFile.name.split('.').pop();
        const fileName = `${user.id}/passport-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase
          .storage
          .from('volunteer-documents')
          .upload(fileName, passportFile, {
            contentType: passportFile.type,
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Passport upload failed: ${uploadError.message}`);
        }

        passportPath = fileName;
        
        // Track successful file upload
        trackEvent('file_uploaded', 'volunteer_application', 'passport_upload', 1);
      }

      const applicationData = {
        user_id: user.id,
        nationality: form.nationality,
        date_of_birth: form.dateOfBirth,
        first_name: form.firstName,
        last_name: form.lastName,
        phone_number: form.phoneNumber,
        phone_country_code: form.phoneCountryCode,
        whatsapp: form.whatsapp,
        email: form.email,
        health_insurance_company: form.healthInsuranceCompany,
        health_insurance_policy_name: form.healthInsurancePolicyName,
        health_insurance_policy_number: form.healthInsurancePolicyNumber,
        health_insurance_expiry_date: form.healthInsuranceExpiryDate,
        next_of_kin_name: form.nextOfKinName,
        next_of_kin_relation: form.nextOfKinRelation,
        next_of_kin_phone: form.nextOfKinPhone,
        next_of_kin_country_code: form.nextOfKinCountryCode,
        next_of_kin_email: form.nextOfKinEmail,
        other_information: form.otherInformation,
        passport_image_path: passportPath,
        privacy_policy_agreed: form.privacyPolicyAgreed,
        code_of_conduct_agreed: form.codeOfConductAgreed,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existingApplication) {
        ({ error } = await supabase
          .from('volunteer_applications')
          .update(applicationData)
          .eq('id', existingApplication.id));
          
        // Track application update
        trackEvent('application_updated', 'volunteer_application', 'form_submission', 1);
      } else {
        applicationData.created_at = new Date().toISOString();
        ({ error } = await supabase
          .from('volunteer_applications')
          .insert([applicationData]));
          
        // Track new application submission
        trackEvent('application_submitted', 'volunteer_application', 'form_submission', 1);
      }

      if (error) {
        throw new Error(error.message);
      }

      setMessage('Application saved successfully!');
      setPassportFile(null);
      loadExistingApplication();
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      
      // Track failed submission
      trackEvent('application_failed', 'volunteer_application', 'form_submission', 0);
    } finally {
      setIsLoading(false);
    }
  };

  if (user === null || role === null) {
    return <div className="p-6">Checking auth...</div>;
  }

  if (!user || (role !== 'admin' && role !== 'user')) {
    return null;
  }

  // Check if user has an existing application and is not an admin
  const isViewOnly = existingApplication && role !== 'admin';

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Volunteer Application
            </h1>

            {isViewOnly && (
              <div className="mb-6 p-4 bg-blue-100 text-blue-700 rounded-md">
                <p className="font-medium">View Only Mode</p>
                <p className="text-sm">You have already submitted an application. Only administrators can make changes to submitted applications.</p>
              </div>
            )}

            {message && (
              <div className={`mb-6 p-4 rounded-md ${
                message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Passport Upload */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Passport Information</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Image *
                  </label>
                  {isViewOnly ? (
                    <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                      {existingApplication.passport_image_path ? (
                        <p className="text-gray-700">✓ Passport uploaded</p>
                      ) : (
                        <p className="text-gray-500">No passport uploaded</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPassportFile(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required={!existingApplication?.passport_image_path}
                      />
                      {existingApplication?.passport_image_path && (
                        <p className="mt-2 text-sm text-gray-600">
                          ✓ Passport already uploaded. Upload a new file to replace it.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nationality *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.nationality || 'Not specified'}</p>
                      </div>
                    ) : (
                      <select
                        value={form.nationality}
                        onChange={handleNationalityChange}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select Nationality</option>
                        {getNationalitiesToShow().map((nationality) => (
                          <option key={nationality} value={nationality}>
                            {nationality}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.dateOfBirth || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.firstName || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.lastName || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.email || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">
                          {form.phoneCountryCode} {form.phoneNumber || 'Not specified'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex">
                        <select
                          value={form.phoneCountryCode}
                          onChange={(e) => setForm({ ...form, phoneCountryCode: e.target.value })}
                          className="p-3 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          {countryCodes.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={form.phoneNumber}
                          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                          className="flex-1 p-3 border border-l-0 border-gray-300 rounded-r-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Phone number"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center">
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">
                          {form.whatsapp ? '✓ Available on WhatsApp' : '✗ Not available on WhatsApp'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <input
                          type="checkbox"
                          id="whatsapp"
                          checked={form.whatsapp}
                          onChange={(e) => setForm({ ...form, whatsapp: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="whatsapp" className="ml-2 block text-sm text-gray-900">
                          Available on WhatsApp
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Health Insurance */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Insurance Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insurance Company *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.healthInsuranceCompany || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={form.healthInsuranceCompany}
                        onChange={(e) => setForm({ ...form, healthInsuranceCompany: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Policy Name *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.healthInsurancePolicyName || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={form.healthInsurancePolicyName}
                        onChange={(e) => setForm({ ...form, healthInsurancePolicyName: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Policy Number *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.healthInsurancePolicyNumber || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={form.healthInsurancePolicyNumber}
                        onChange={(e) => setForm({ ...form, healthInsurancePolicyNumber: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Policy Expiry Date *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.healthInsuranceExpiryDate || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={form.healthInsuranceExpiryDate}
                        onChange={(e) => setForm({ ...form, healthInsuranceExpiryDate: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Next of Kin */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Next of Kin</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.nextOfKinName || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={form.nextOfKinName}
                        onChange={(e) => setForm({ ...form, nextOfKinName: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relation to Applicant *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.nextOfKinRelation || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={form.nextOfKinRelation}
                        onChange={(e) => setForm({ ...form, nextOfKinRelation: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Spouse, Parent, Sibling"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">
                          {form.nextOfKinCountryCode} {form.nextOfKinPhone || 'Not specified'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex">
                        <select
                          value={form.nextOfKinCountryCode}
                          onChange={(e) => setForm({ ...form, nextOfKinCountryCode: e.target.value })}
                          className="p-3 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          {countryCodes.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={form.nextOfKinPhone}
                          onChange={(e) => setForm({ ...form, nextOfKinPhone: e.target.value })}
                          className="flex-1 p-3 border border-l-0 border-gray-300 rounded-r-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Phone number"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    {isViewOnly ? (
                      <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-700">{form.nextOfKinEmail || 'Not specified'}</p>
                      </div>
                    ) : (
                      <input
                        type="email"
                        value={form.nextOfKinEmail}
                        onChange={(e) => setForm({ ...form, nextOfKinEmail: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Other Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Other Information</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Information & Additional Notes
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Please disclose any medical conditions, allergies, or health information we should be aware of, such as:
                  </p>
                  <ul className="text-sm text-gray-600 mb-3 list-disc list-inside space-y-1">
                    <li>Allergies (food, environmental, medication)</li>
                    <li>Anaphylaxis or severe allergic reactions</li>
                    <li>Diabetes, epilepsy, or other chronic conditions</li>
                    <li>Medications you regularly take</li>
                    <li>Any mobility or accessibility requirements</li>
                    <li>Other relevant health information</li>
                  </ul>
                  {isViewOnly ? (
                    <div className="p-3 border border-gray-300 rounded-md bg-gray-50 min-h-[100px]">
                      <p className="text-gray-700 whitespace-pre-wrap">{form.otherInformation || 'No additional notes provided'}</p>
                    </div>
                  ) : (
                    <textarea
                      value={form.otherInformation}
                      onChange={(e) => setForm({ ...form, otherInformation: e.target.value })}
                      rows={6}
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Please provide any medical information, allergies, or additional details that may be relevant to your volunteer application..."
                    />
                  )}
                </div>
              </div>

              {/* Privacy Policy Agreement */}
              <div className="border-t border-gray-200 pt-6">
                {isViewOnly ? (
                  <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                    <p className="text-gray-700">
                      {form.privacyPolicyAgreed ? '✓ Privacy Policy agreed to' : '✗ Privacy Policy not agreed to'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="privacy-policy"
                        type="checkbox"
                        checked={form.privacyPolicyAgreed}
                        onChange={(e) => setForm({ ...form, privacyPolicyAgreed: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        required
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="privacy-policy" className="font-medium text-gray-700">
                        I agree to the{' '}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-500 underline"
                        >
                          Privacy Policy
                        </a>
                        {' '}and consent to the processing of my personal data for volunteer application purposes.
                      </label>
                      <p className="text-gray-500 mt-1">
                        You must agree to the privacy policy before submitting your application.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Code of Conduct Agreement */}
              <div className="border-t border-gray-200 pt-6">
                {isViewOnly ? (
                  <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                    <p className="text-gray-700">
                      {form.codeOfConductAgreed ? '✓ Code of Conduct agreed to' : '✗ Code of Conduct not agreed to'}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="code-of-conduct"
                        type="checkbox"
                        checked={form.codeOfConductAgreed}
                        onChange={(e) => setForm({ ...form, codeOfConductAgreed: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        required
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="code-of-conduct" className="font-medium text-gray-700">
                        I agree to the{' '}
                        <a
                          href="/code-of-conduct"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-500 underline"
                        >
                          Code of Conduct
                        </a>
                        {' '}and will abide by the organization's standards of behavior and ethics.
                      </label>
                      <p className="text-gray-500 mt-1">
                        You must agree to the code of conduct before submitting your application.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-6">
                {isViewOnly ? (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">This application is in view-only mode</p>
                    <p className="text-sm text-gray-500">Only administrators can make changes to submitted applications</p>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading || !form.privacyPolicyAgreed || !form.codeOfConductAgreed}
                    className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Saving...' : (existingApplication ? 'Update Application' : 'Submit Application')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
} 