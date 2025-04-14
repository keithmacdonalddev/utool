import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LexicalEditor from '../components/Editor/LexicalEditor';
import api from '../utils/api';

const KbCreatePage = () => {
  const [formData, setFormData] = useState({
    title: '',
    tags: '',
    categories: '',
  });
  const [editorContent, setEditorContent] = useState('');

  const navigate = useNavigate();
  const [isError, setIsError] = useState(false);
  const [message, setMessage] = useState('');

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  // This function will receive serialized editor content
  const handleEditorContentChange = (content) => {
    setEditorContent(content);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // Check if the editor content is empty or invalid
    if (
      !editorContent ||
      editorContent.trim() === '' ||
      editorContent === '{}'
    ) {
      setIsError(true);
      setMessage('Content is required.');
      return;
    }

    const { title, tags, categories } = formData;

    const newArticle = {
      title,
      content: editorContent, // This is now a serialized JSON string
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ''),
      categories: categories
        .split(',')
        .map((cat) => cat.trim())
        .filter((cat) => cat !== ''),
    };

    try {
      await api.post('/kb', newArticle);
      navigate('/kb'); // Redirect to KB list after creation
    } catch (error) {
      setIsError(true);
      setMessage(
        error.response?.data?.message ||
          'Failed to create knowledge base article.'
      );
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create Knowledge Base Article</h1>
      {isError && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error!</strong> {message}
        </div>
      )}
      <form
        onSubmit={onSubmit}
        className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
      >
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="title"
          >
            Title
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="title"
            type="text"
            placeholder="Article Title"
            name="title"
            value={formData.title}
            onChange={onChange}
            required
          />
        </div>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="content"
          >
            Content
          </label>
          <div className="border rounded min-h-60 relative">
            <LexicalEditor onContentChange={handleEditorContentChange} />
          </div>
        </div>
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="tags"
          >
            Tags (comma separated)
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="tags"
            type="text"
            placeholder="tag1, tag2, tag3"
            name="tags"
            value={formData.tags}
            onChange={onChange}
          />
        </div>
        <div className="mb-6">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="categories"
          >
            Categories (comma separated)
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="categories"
            type="text"
            placeholder="category1, category2"
            name="categories"
            value={formData.categories}
            onChange={onChange}
          />
        </div>
        <div className="flex items-center justify-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
};

export default KbCreatePage;
