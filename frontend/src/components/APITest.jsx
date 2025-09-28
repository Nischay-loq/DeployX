import { useState } from 'react';
import apiClient from '../services/api.js';

export default function APITest() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testHealthCheck = async () => {
    setLoading(true);
    setResult('Testing...');
    try {
      const response = await apiClient.request('/health');
      setResult(`✅ Health Check Success: ${JSON.stringify(response)}`);
    } catch (error) {
      setResult(`❌ Health Check Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing login...');
    try {
      const response = await apiClient.login({
        username: 'test',
        password: 'test'
      });
      setResult(`✅ Login Test Success: ${JSON.stringify(response)}`);
    } catch (error) {
      setResult(`❌ Login Test Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">API Connection Test</h2>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            API Base URL: {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
          </p>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={testHealthCheck}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Test Health Check
          </button>
          
          <button
            onClick={testLogin}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            Test Login (dummy)
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm whitespace-pre-wrap">{result || 'No test run yet'}</pre>
        </div>
      </div>
    </div>
  );
}