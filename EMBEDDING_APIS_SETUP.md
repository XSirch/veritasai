# 🔗 Embedding APIs Setup for VeritasAI

## Overview

VeritasAI now supports multiple embedding providers for generating high-quality vector representations of text. These embeddings are essential for the Qdrant cache system to work effectively with semantic similarity search.

## Why Embeddings Matter

- **Semantic Search**: Find similar content even if worded differently
- **Cache Efficiency**: Better cache hits with quality embeddings
- **Performance**: Faster responses for similar fact-checking queries
- **Accuracy**: More relevant cached results

## Supported Embedding Providers

### 1. 🤖 OpenAI Embeddings (Recommended)
**Model**: `text-embedding-3-small`
**Dimensions**: 384
**Quality**: Excellent
**Cost**: $0.02 per 1M tokens

#### Setup:
1. Get API key from: https://platform.openai.com/api-keys
2. Add to VeritasAI popup: `sk-...`
3. Automatic 384-dimension output

#### Benefits:
- Highest quality embeddings
- Reliable and fast
- Optimized for semantic similarity
- Excellent multilingual support

### 2. 🌐 Cohere Embeddings
**Model**: `embed-multilingual-light-v3.0`
**Dimensions**: 384 (truncated from 1024)
**Quality**: Very Good
**Cost**: Free tier 1000 requests/month

#### Setup:
1. Get API key from: https://dashboard.cohere.ai/api-keys
2. Add to VeritasAI popup: `co_...`
3. Free tier available

#### Benefits:
- Free tier available
- Good multilingual support
- Reliable performance
- Optimized for search tasks

### 3. 🤗 Hugging Face (With Authentication)
**Model**: `sentence-transformers/all-MiniLM-L6-v2`
**Dimensions**: 384
**Quality**: Good
**Cost**: Free with rate limits

#### Setup:
1. Get token from: https://huggingface.co/settings/tokens
2. Add to VeritasAI popup: `hf_...`
3. Free tier with rate limits

#### Benefits:
- Completely free
- Open source models
- Good performance
- No usage limits with token

### 4. 🔄 Alternative Hugging Face (No Auth)
**Model**: `sentence-transformers/paraphrase-MiniLM-L6-v2`
**Dimensions**: 384
**Quality**: Good
**Cost**: Free (rate limited)

#### Setup:
- No API key required
- Automatic fallback option
- May have rate limits

### 5. 🚀 Jina AI Embeddings
**Model**: `jina-embeddings-v2-small-en`
**Dimensions**: 384
**Quality**: Good
**Cost**: Free tier available

#### Setup:
1. Get API key from: https://jina.ai/
2. Free tier available
3. Optimized for search

## Configuration Priority

The system tries providers in this order:
1. **OpenAI** (if API key configured)
2. **Cohere** (if API key configured)
3. **Hugging Face with Auth** (if token configured)
4. **Alternative Hugging Face** (no auth required)
5. **Jina AI** (if available)

## Setup Instructions

### Step 1: Choose Your Provider
- **Best Quality**: OpenAI (small cost)
- **Free Option**: Cohere (1000 requests/month)
- **Unlimited Free**: Hugging Face (with token)

### Step 2: Get API Key
Visit the provider's website and create an API key.

### Step 3: Configure in VeritasAI
1. Open VeritasAI popup
2. Scroll to "APIs de Embeddings" section
3. Enter your API key(s)
4. Click "Salvar Configurações"

### Step 4: Test
1. Ensure Qdrant is running: `docker run -p 6333:6333 qdrant/qdrant`
2. Perform fact-checking on some text
3. Check console logs for successful embedding generation
4. Verify cache storage in Qdrant

## Troubleshooting

### Common Issues

#### "All embedding providers failed"
- Check API keys are correctly entered
- Verify internet connection
- Try different provider
- Check API key permissions

#### "Failed to store in Qdrant"
- Ensure Qdrant is running on localhost:6333
- Check embedding dimensions (should be 384)
- Verify Qdrant collection exists

#### Rate Limiting
- Switch to paid tier
- Use multiple providers
- Add delays between requests

### Debugging

Enable console logging to see:
```
🔄 Tentando provider de embeddings 1/5...
✅ Embeddings gerados com sucesso via provider 1: 384 dimensões
✅ Result successfully stored in Qdrant cache
```

### Performance Tips

1. **Use OpenAI** for best quality (small cost)
2. **Configure multiple providers** for redundancy
3. **Monitor usage** to avoid rate limits
4. **Check cache hit rates** in Qdrant dashboard

## API Key Security

- API keys are stored locally in browser storage
- Never shared or transmitted except to respective APIs
- Can be cleared by resetting extension settings
- Use read-only or limited-scope keys when possible

## Cost Optimization

### Free Options:
- Cohere: 1000 requests/month free
- Hugging Face: Unlimited with token
- Alternative HF: Rate limited but free

### Paid Options:
- OpenAI: ~$0.02 per 1000 fact-checks
- Very cost-effective for quality improvement

## Monitoring

### Popup Status
- Check "Cache Inteligente" section
- Should show "🟢 Conectado" when working
- Item count increases with successful storage

### Console Logs
```
✅ Embeddings gerados com sucesso via provider 1: 384 dimensões
✅ Result successfully stored in Qdrant cache
🎯 Found cached result with similarity: 87.3%
```

## Benefits of Quality Embeddings

- **Better Cache Hits**: More relevant similar content found
- **Faster Responses**: Cache hits in ~100ms vs 2-5s LLM calls
- **Cost Savings**: Reduced LLM API usage
- **Improved UX**: Instant results for similar queries

---

**Recommendation**: Start with Cohere free tier, then upgrade to OpenAI for production use.
