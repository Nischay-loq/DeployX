// Test script to verify frontend API integration
// Run this in the browser console on localhost:5173

async function testAPIs() {
  console.log('Testing API endpoints...');
  
  try {
    // Test groups endpoint
    console.log('Fetching groups...');
    const groupsResponse = await fetch('http://localhost:8000/test/groups');
    const groups = await groupsResponse.json();
    console.log('Groups:', groups);
    
    // Test devices endpoint
    console.log('Fetching devices...');
    const devicesResponse = await fetch('http://localhost:8000/test/devices');
    const devices = await devicesResponse.json();
    console.log('Devices:', devices);
    
    console.log('✅ API tests completed successfully');
    return { groups, devices };
  } catch (error) {
    console.error('❌ API test failed:', error);
    return null;
  }
}

// Run the test
testAPIs();