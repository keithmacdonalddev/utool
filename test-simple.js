// Simple test script to debug API issues
import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';

async function testExistingUser() {
  try {
    console.log('Testing with whatever credentials work...');

    // Try different common test credentials
    const credentials = [
      { email: 'test@example.com', password: 'test123' },
      { email: 'test@example.com', password: 'testpass123' },
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'user@example.com', password: 'password' },
    ];

    let token = null;

    for (const cred of credentials) {
      try {
        console.log(`\nTrying login with: ${cred.email}`);
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, cred);

        if (loginResponse.data.success) {
          console.log('Login successful!');
          console.log('Response:', loginResponse.data);
          token = loginResponse.data.token;
          break;
        }
      } catch (err) {
        console.log(
          `Login failed for ${cred.email}: ${
            err.response?.data?.message || err.message
          }`
        );
      }
    }

    if (!token) {
      console.log('No working credentials found. Creating new user...');

      // Try registration with different email
      const newUserEmail = `test${Date.now()}@example.com`;
      try {
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
          email: newUserEmail,
          password: 'testpass123',
          firstName: 'Test',
          lastName: 'User',
        });
        console.log('Registration:', registerResponse.data);
        console.log('Note: User needs email verification to login');
        return;
      } catch (regErr) {
        console.log(
          'Registration failed:',
          regErr.response?.data || regErr.message
        );
      }
    }

    if (token) {
      console.log('\n=== Testing authenticated endpoints ===');

      // Test projects with authentication
      console.log('\nTesting projects endpoint...');
      try {
        const projectsResponse = await axios.get(`${BASE_URL}/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('✅ Projects SUCCESS:', projectsResponse.data);
      } catch (err) {
        console.log(
          '❌ Projects ERROR:',
          err.response?.status,
          err.response?.data || err.message
        );
      }

      // Test recent tasks with authentication
      console.log('\nTesting recent tasks endpoint...');
      try {
        const tasksResponse = await axios.get(
          `${BASE_URL}/tasks/recent?limit=10`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log('✅ Tasks SUCCESS:', tasksResponse.data);
      } catch (err) {
        console.log(
          '❌ Tasks ERROR:',
          err.response?.status,
          err.response?.data || err.message
        );
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

testExistingUser();
