/**
 * Qdrant Vector Database Service
 * Handles storage and retrieval of fact-checking results using semantic similarity
 */

class QdrantService {
  constructor() {
    this.baseUrl = 'http://localhost:6333'; // Default Qdrant URL
    this.collectionName = 'veritas_factcheck';
    this.isAvailable = false;
    this.similarityThreshold = 0.85; // Configurable similarity threshold
    this.maxResults = 5;
    
    // Initialize connection check
    this.checkConnection();
  }

  /**
   * Check if Qdrant is available and accessible
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/collections`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      this.isAvailable = response.ok;
      
      if (this.isAvailable) {
        console.log('✅ Qdrant connection established');
        await this.ensureCollection();
      } else {
        console.log('⚠️ Qdrant not available, using LLM-only mode');
      }
    } catch (error) {
      console.log('⚠️ Qdrant connection failed, using LLM-only mode:', error.message);
      this.isAvailable = false;
    }
  }

  /**
   * Ensure the fact-checking collection exists
   */
  async ensureCollection() {
    try {
      // Check if collection exists
      const checkResponse = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!checkResponse.ok) {
        // Create collection if it doesn't exist
        console.log('🔧 Creating Qdrant collection for fact-checking...');
        
        const createResponse = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            vectors: {
              size: 384, // Using all-MiniLM-L6-v2 embedding size
              distance: 'Cosine'
            },
            optimizers_config: {
              default_segment_number: 2
            },
            replication_factor: 1
          })
        });

        if (createResponse.ok) {
          console.log('✅ Qdrant collection created successfully');
        } else {
          throw new Error('Failed to create collection');
        }
      } else {
        console.log('✅ Qdrant collection already exists');
      }
    } catch (error) {
      console.error('❌ Error ensuring Qdrant collection:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Generate embeddings for text using a lightweight embedding service
   */
  async generateEmbeddings(text) {
    try {
      // Using Hugging Face's free inference API for embeddings
      const response = await fetch('https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer hf_demo' // Using demo token for now
        },
        body: JSON.stringify({
          inputs: text.substring(0, 500) // Limit text length for embedding
        })
      });

      if (response.ok) {
        const embeddings = await response.json();
        return Array.isArray(embeddings[0]) ? embeddings[0] : embeddings;
      } else {
        throw new Error('Embedding generation failed');
      }
    } catch (error) {
      console.warn('⚠️ Embedding generation failed:', error.message);
      return null;
    }
  }

  /**
   * Search for similar fact-checked content
   */
  async searchSimilar(text, threshold = null) {
    if (!this.isAvailable) {
      return null;
    }

    try {
      const embeddings = await this.generateEmbeddings(text);
      if (!embeddings) {
        return null;
      }

      const searchThreshold = threshold || this.similarityThreshold;

      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vector: embeddings,
          limit: this.maxResults,
          score_threshold: searchThreshold,
          with_payload: true,
          with_vector: false
        })
      });

      if (response.ok) {
        const results = await response.json();
        
        if (results.result && results.result.length > 0) {
          const bestMatch = results.result[0];
          
          console.log(`🎯 Found similar content with score: ${bestMatch.score.toFixed(3)}`);
          
          return {
            score: bestMatch.score,
            payload: bestMatch.payload,
            fromCache: true
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('⚠️ Qdrant search failed:', error.message);
      return null;
    }
  }

  /**
   * Store fact-checking result in Qdrant
   */
  async storeResult(text, analysis, metadata = {}) {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const embeddings = await this.generateEmbeddings(text);
      if (!embeddings) {
        return false;
      }

      const pointId = Date.now().toString(); // Simple ID generation
      
      const payload = {
        original_text: text,
        classification: analysis.classification,
        score: analysis.score || analysis.confidence,
        summary: analysis.summary,
        reasoning: analysis.reasoning,
        timestamp: new Date().toISOString(),
        model_used: metadata.model || 'unknown',
        url: metadata.url || '',
        domain: metadata.domain || '',
        text_length: text.length,
        language: metadata.language || 'pt-BR'
      };

      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          points: [{
            id: pointId,
            vector: embeddings,
            payload: payload
          }]
        })
      });

      if (response.ok) {
        console.log('✅ Fact-check result stored in Qdrant');
        return true;
      } else {
        throw new Error('Failed to store in Qdrant');
      }
    } catch (error) {
      console.warn('⚠️ Failed to store in Qdrant:', error.message);
      return false;
    }
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    if (!this.isAvailable) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          total_points: data.result.points_count,
          indexed_points: data.result.indexed_vectors_count,
          status: data.result.status
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to get Qdrant stats:', error.message);
    }

    return null;
  }

  /**
   * Configure similarity threshold
   */
  setSimilarityThreshold(threshold) {
    this.similarityThreshold = Math.max(0.1, Math.min(1.0, threshold));
    console.log(`🎯 Similarity threshold set to: ${this.similarityThreshold}`);
  }

  /**
   * Check if Qdrant service is available
   */
  isServiceAvailable() {
    return this.isAvailable;
  }
}

// Export singleton instance
const qdrantService = new QdrantService();
export default qdrantService;
