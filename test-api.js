// Simple test script to debug API issues
import axios from 'axios';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000/api/v1';

async function testEndpoints() {
  try {
    // Connect to MongoDB to manually verify user for testing
    await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/utool'
    );
    console.log('Connected to MongoDB for testing');

    // Test registration
    console.log('Testing registration...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: 'testuser3@example.com',
      password: 'testpass123',
      firstName: 'Test',
      lastName: 'User',
    });
    console.log('Registration:', registerResponse.data);

    // Manually verify user for testing purposes
    const User = mongoose.model(
      'User',
      new mongoose.Schema({}, { strict: false })
    );
    await User.updateOne(
      { email: 'testuser3@example.com' },
      { isVerified: true }
    );
    console.log('User manually verified for testing');

    // Test login
    console.log('\nTesting login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'testuser3@example.com',
      password: 'testpass123',
    });
    console.log('Login:', loginResponse.data);

    const token = loginResponse.data.token;
    console.log('Got token:', token ? 'Yes' : 'No');

    // Test projects with authentication
    console.log('\nTesting projects endpoint...');
    const projectsResponse = await axios.get(`${BASE_URL}/projects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Projects:', projectsResponse.data);

    // Test recent tasks with authentication
    console.log('\nTesting recent tasks endpoint...');
    const tasksResponse = await axios.get(`${BASE_URL}/tasks/recent?limit=10`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Recent tasks:', tasksResponse.data);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error details:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message || error.message);
    console.error('Full error:', error.response?.data);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

testEndpoints();
