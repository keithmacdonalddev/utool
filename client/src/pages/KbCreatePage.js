import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import KbForm from '../components/kb/KbForm';
import Button from '../components/common/Button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';

const KbCreatePage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user from Redux store
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    // Check if user is admin, if not redirect to KB list page
    if (user && user.role !== 'Admin') {
      navigate('/kb');
      toast.error('You do not have permission to create KB articles');
    }
  }, [user, navigate]);

  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      const response = await api.post('/kb', formData);
      navigate(`/kb/${response.data.data._id}`);
      toast.success('Article created successfully');
    } catch (error) {
      console.error('Error creating article:', error);
      toast.error(error.response?.data?.message || 'Failed to create article');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* Header Row: Back Button and Title */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/kb')}
          className="mr-4"
        >
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-2xl font-bold text-white">Create New Article</h1>
      </div>

      <KbForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
};

export default KbCreatePage;
