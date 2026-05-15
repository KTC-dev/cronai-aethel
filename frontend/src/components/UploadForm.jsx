import React, { useState } from 'react';

const UploadForm = () => {
  const [facePhotos, setFacePhotos] = useState([]);
  const [voiceSample, setVoiceSample] = useState(null);
  const [script, setScript] = useState('');
  const [logo, setLogo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');

  const handleFacePhotosChange = (e) => {
    const files = Array.from(e.target.files);
    setFacePhotos(files);
  };

  const handleVoiceSampleChange = (e) => {
    const file = e.target.files[0];
    setVoiceSample(file);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    setLogo(file);
  };

  const handleScriptChange = (e) => {
    setScript(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadStatus('');
    setUploadError('');

    try {
      // Validate inputs
      if (facePhotos.length < 10) {
        throw new Error('Please upload at least 10 face photos');
      }
      if (!voiceSample) {
        throw new Error('Please upload a voice sample');
      }
      if (!script.trim()) {
        throw new Error('Please enter a script');
      }

      // Upload face photos
      const facePhotosData = new FormData();
      facePhotos.forEach((file) => {
        facePhotosData.append('face_photos', file);
      });

      const facePhotosResponse = await fetch('/api/upload/face-photos', {
        method: 'POST',
        body: facePhotosData,
        // Assuming we have authentication handled elsewhere, e.g., via cookies or token in header
        headers: {
          // Authorization: `Bearer ${token}` // If using token
        }
      });

      if (!facePhotosResponse.ok) {
        throw new Error('Failed to upload face photos');
      }

      const facePhotosResult = await facePhotosResponse.json();

      // Upload voice sample
      const voiceSampleData = new FormData();
      voiceSampleData.append('voice_sample', voiceSample);

      const voiceSampleResponse = await fetch('/api/upload/voice-sample', {
        method: 'POST',
        body: voiceSampleData,
        headers: {
          // Authorization: `Bearer ${token}`
        }
      });

      if (!voiceSampleResponse.ok) {
        throw new Error('Failed to upload voice sample');
      }

      const voiceSampleResult = await voiceSampleResponse.json();

      // Upload logo if provided
      let logoResult = null;
      if (logo) {
        const logoData = new FormData();
        logoData.append('logo', logo);

        const logoResponse = await fetch('/api/upload/logo', {
          method: 'POST',
          body: logoData,
          headers: {
            // Authorization: `Bearer ${token}`
          }
        });

        if (!logoResponse.ok) {
          throw new Error('Failed to upload logo');
        }

        logoResult = await logoResponse.json();
      }

      // Submit script (text)
      const scriptResponse = await fetch('/api/upload/script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ script })
      });

      if (!scriptResponse.ok) {
        throw new Error('Failed to submit script');
      }

      const scriptResult = await scriptResponse.json();

      // If all uploads successful, we can now trigger the video generation
      // For now, we'll just show success message
      setUploadStatus('All files uploaded successfully! Ready to generate video.');
      console.log('Upload results:', {
        facePhotos: facePhotosResult,
        voiceSample: voiceSampleResult,
        logo: logoResult,
        script: scriptResult
      });

      // Reset form
      setFacePhotos([]);
      setVoiceSample(null);
      setScript('');
      setLogo(null);
    } catch (error) {
      setUploadError(error.message);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">CronAi Aethel - Video Generation</h1>
      <p className="mb-6">Upload your face photos, voice sample, script, and logo to generate a personalized video.</p>

      {uploadError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {uploadError}
        </div>
      )}

      {uploadStatus && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {uploadStatus}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-700 font-bold mb-2">Face Photos (10-15 images)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFacePhotosChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600"
            disabled={uploading}
          />
          <p className="mt-1 text-sm text-gray-500">
            {facePhotos.length} face photo{facePhotos.length !== 1 ? 's' : ''} selected
          </p>
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">Voice Sample (MP3, WAV, M4A, WebM)</label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleVoiceSampleChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600"
            disabled={uploading}
          />
          {voiceSample && (
            <p className="mt-1 text-sm text-gray-500">
              {voiceSample.name} selected
            </p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">Script (Text to Speak)</label>
          <textarea
            value={script}
            onChange={handleScriptChange}
            rows="4"
            className="block w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
            disabled={uploading}
            placeholder="Enter the script you want to speak in the video..."
          />
          <p className="mt-1 text-sm text-gray-500">
            {script.length} characters
          </p>
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">Logo (Optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600"
            disabled={uploading}
          />
          {logo && (
            <p className="mt-1 text-sm text-gray-500">
              {logo.name} selected
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
      </form>
    </div>
  );
};

export default UploadForm;