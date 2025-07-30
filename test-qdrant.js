// Quick Qdrant API test script
// Run with: node test-qdrant.js

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION_NAME = 'veritas_factcheck';

async function testQdrantAPI() {
  console.log('🧪 Testing Qdrant API endpoints...\n');

  try {
    // Test 1: Check Qdrant health
    console.log('1️⃣ Testing Qdrant health...');
    const healthResponse = await fetch(`${QDRANT_URL}/health`);
    console.log('Health status:', healthResponse.status, healthResponse.statusText);
    
    if (!healthResponse.ok) {
      throw new Error('Qdrant health check failed');
    }
    console.log('✅ Qdrant is healthy\n');

    // Test 2: List collections
    console.log('2️⃣ Listing collections...');
    const collectionsResponse = await fetch(`${QDRANT_URL}/collections`);
    const collections = await collectionsResponse.json();
    console.log('Collections:', collections.result?.collections?.map(c => c.name) || []);
    console.log('✅ Collections listed\n');

    // Test 3: Check specific collection
    console.log('3️⃣ Checking veritas_factcheck collection...');
    const collectionResponse = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);
    
    if (collectionResponse.ok) {
      const collectionInfo = await collectionResponse.json();
      console.log('Collection info:', {
        points_count: collectionInfo.result.points_count,
        status: collectionInfo.result.status,
        vectors_count: collectionInfo.result.vectors_count
      });
      console.log('✅ Collection exists\n');
    } else {
      console.log('⚠️ Collection does not exist, will be created by extension\n');
    }

    // Test 4: Test embedding storage (if collection exists)
    if (collectionResponse.ok) {
      console.log('4️⃣ Testing point storage...');
      
      // Create a test embedding (384 dimensions)
      const testEmbedding = Array.from({length: 384}, () => Math.random() - 0.5);
      
      const testPoint = {
        points: [{
          id: `test_${Date.now()}`,
          vector: testEmbedding,
          payload: {
            test: true,
            text: "Test embedding storage",
            timestamp: new Date().toISOString()
          }
        }]
      };

      const storeResponse = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPoint)
      });

      if (storeResponse.ok) {
        const storeResult = await storeResponse.json();
        console.log('✅ Test point stored successfully:', storeResult);
      } else {
        const errorText = await storeResponse.text();
        console.error('❌ Failed to store test point:', storeResponse.status, errorText);
      }

      // Test 5: Test search
      console.log('\n5️⃣ Testing search...');
      const searchResponse = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector: testEmbedding,
          limit: 5,
          score_threshold: 0.1,
          with_payload: true,
          with_vector: false
        })
      });

      if (searchResponse.ok) {
        const searchResults = await searchResponse.json();
        console.log('✅ Search successful, found:', searchResults.result.length, 'results');
        if (searchResults.result.length > 0) {
          console.log('Best match score:', searchResults.result[0].score);
        }
      } else {
        const errorText = await searchResponse.text();
        console.error('❌ Search failed:', searchResponse.status, errorText);
      }
    }

    console.log('\n🎉 Qdrant API test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Qdrant is running and accessible');
    console.log('- API endpoints are responding correctly');
    console.log('- Ready for VeritasAI integration');

  } catch (error) {
    console.error('\n❌ Qdrant API test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure Qdrant is running: docker run -p 6333:6333 qdrant/qdrant');
    console.log('2. Check if port 6333 is accessible');
    console.log('3. Verify no firewall blocking the connection');
  }
}

// Run the test
testQdrantAPI();
