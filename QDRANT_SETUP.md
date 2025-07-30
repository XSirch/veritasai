# 🧠 Qdrant Vector Database Setup for VeritasAI

## Overview

VeritasAI now includes **optional** Qdrant vector database integration for intelligent caching. This feature provides:

- **Faster responses** for similar content already fact-checked
- **Reduced API costs** by avoiding duplicate LLM calls
- **Collaborative knowledge base** across all users
- **Semantic similarity search** for better cache hits

> **Note**: Qdrant is completely optional. VeritasAI works perfectly without it, using only the LLM.

## Quick Setup (Docker - Recommended)

### 1. Install Docker
Download and install Docker from: https://www.docker.com/get-started

### 2. Run Qdrant Container
```bash
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage:z \
    qdrant/qdrant
```

### 3. Verify Installation
Open http://localhost:6333/dashboard in your browser to see the Qdrant dashboard.

## Alternative Setup (Local Installation)

### Option 1: Using Cargo (Rust)
```bash
cargo install qdrant
qdrant
```

### Option 2: Download Binary
1. Go to https://github.com/qdrant/qdrant/releases
2. Download the appropriate binary for your OS
3. Run the binary

## Configuration

### Default Settings
- **URL**: `http://localhost:6333`
- **Collection**: `veritas_factcheck`
- **Similarity Threshold**: `0.85` (85% similarity)
- **Vector Size**: `384` (all-MiniLM-L6-v2 embeddings)

### Customization
The similarity threshold can be adjusted in the Qdrant service configuration. Higher values (0.9+) require more exact matches, while lower values (0.7-0.8) allow more flexible matching.

## How It Works

### 1. First Fact-Check
```
User selects text → No cache found → LLM analysis → Store in Qdrant → Return result
```

### 2. Subsequent Similar Content
```
User selects text → Similar content found in cache → Return cached result (faster)
```

### 3. Embedding Generation
- Uses Hugging Face's `all-MiniLM-L6-v2` model
- Generates 384-dimensional vectors
- Lightweight and fast processing

## Benefits

### Performance
- **Cache hits**: ~100ms response time
- **LLM calls**: ~2-5 second response time
- **API cost reduction**: Up to 70% fewer LLM calls

### User Experience
- Instant results for previously checked content
- Consistent fact-checking across similar topics
- Building knowledge base over time

## Privacy Considerations

### Data Stored
- Original text (for similarity matching)
- Fact-check results (classification, score, summary)
- Metadata (timestamp, model used, URL domain)

### Privacy Options
- **Local only**: Qdrant runs locally, no data sent to external servers
- **No personal data**: Only fact-checked content is stored
- **Optional**: Can be disabled completely

## Troubleshooting

### Qdrant Not Starting
1. Check if port 6333 is available: `netstat -an | grep 6333`
2. Try different port: `docker run -p 6334:6333 qdrant/qdrant`
3. Check Docker logs: `docker logs <container_id>`

### Extension Not Connecting
1. Verify Qdrant is running: http://localhost:6333/dashboard
2. Check browser console for connection errors
3. Extension works without Qdrant (will show "Cache Offline")

### Performance Issues
1. Check available disk space for vector storage
2. Monitor memory usage (Qdrant needs ~100MB RAM)
3. Consider adjusting similarity threshold

## Monitoring

### Popup Status
The extension popup shows:
- ✅ **Cache Active (X items)**: Qdrant working with X stored fact-checks
- ⚠️ **Cache Offline (Optional)**: Qdrant not available, using LLM only
- ❌ **Cache Indisponível**: Connection error

### Console Logs
Enable debug mode to see:
```
🔍 Searching Qdrant for similar content...
🎯 Found cached result with similarity: 87.3%
💾 Storing result in Qdrant for future cache...
```

## Advanced Configuration

### Custom Qdrant URL
Modify `src/services/qdrant-service.js`:
```javascript
this.baseUrl = 'http://your-qdrant-server:6333';
```

### Similarity Threshold
```javascript
qdrantService.setSimilarityThreshold(0.9); // More strict matching
```

### Collection Settings
The extension automatically creates the collection with optimal settings for fact-checking use cases.

## Support

### Common Issues
- **Port conflicts**: Use different port mapping
- **Memory issues**: Ensure sufficient RAM available
- **Network issues**: Check firewall settings

### Getting Help
1. Check browser console for error messages
2. Verify Qdrant dashboard accessibility
3. Test with simple Docker setup first

---

**Remember**: Qdrant integration is optional and enhances performance, but VeritasAI works perfectly without it using only the LLM for fact-checking.
