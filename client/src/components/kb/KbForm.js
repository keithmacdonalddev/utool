import React, { useState } from 'react';
import Button from '../common/Button';

const KbForm = ({ initialData, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    tags: initialData?.tags?.join(', ') || '',
    categories: initialData?.categories?.join(', ') || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Process arrays from comma-separated strings
    const processedData = {
      ...formData,
      tags: formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag),
      categories: formData.categories
        .split(',')
        .map((cat) => cat.trim())
        .filter((cat) => cat),
    };

    onSubmit(processedData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-800 p-6 rounded-lg shadow-md"
    >
      <div className="mb-4">
        <label htmlFor="title" className="block text-white mb-2">
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="content" className="block text-white mb-2">
          Content *
        </label>
        <textarea
          id="content"
          name="content"
          value={formData.content}
          onChange={handleChange}
          rows="8"
          className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="tags" className="block text-white mb-2">
          Tags (comma separated)
        </label>
        <input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleChange}
          placeholder="e.g. javascript, react, tutorial"
          className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="categories" className="block text-white mb-2">
          Categories (comma separated)
        </label>
        <input
          type="text"
          id="categories"
          name="categories"
          value={formData.categories}
          onChange={handleChange}
          placeholder="e.g. frontend, development, documentation"
          className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="px-6"
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};

export default KbForm;
