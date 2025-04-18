import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LexicalEditor from '../components/Editor/LexicalEditor';
import api from '../utils/api';
import FormInput from '../components/common/FormInput';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import PageHeader from '../components/common/PageHeader';
import Alert from '../components/common/Alert';

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
      <PageHeader title="Create Knowledge Base Article" backLink="/kb" />

      {isError && (
        <Alert
          type="error"
          message={message}
          onClose={() => setIsError(false)}
        />
      )}

      <Card>
        <form onSubmit={onSubmit} className="px-2">
          <FormInput
            id="title"
            label="Title"
            placeholder="Article Title"
            name="title"
            value={formData.title}
            onChange={onChange}
            required
          />

          <div className="mb-4">
            <label
              className="block text-text text-sm font-bold mb-2"
              htmlFor="content"
            >
              Content
            </label>
            <div className="border border-dark-600 rounded-lg">
              <LexicalEditor onContentChange={handleEditorContentChange} />
            </div>
            {isError && message === 'Content is required.' && (
              <p className="text-red-500 text-xs italic mt-1">
                Content is required
              </p>
            )}
          </div>

          <FormInput
            id="tags"
            label="Tags (comma separated)"
            placeholder="tag1, tag2, tag3"
            name="tags"
            value={formData.tags}
            onChange={onChange}
            helpText="Separate multiple tags with commas"
          />

          <FormInput
            id="categories"
            label="Categories (comma separated)"
            placeholder="category1, category2"
            name="categories"
            value={formData.categories}
            onChange={onChange}
            helpText="Separate multiple categories with commas"
            className="mb-6"
          />

          <div className="flex items-center justify-center">
            <Button type="submit" variant="primary">
              Create Article
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default KbCreatePage;
