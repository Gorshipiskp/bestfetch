# BestFetch 🚀

Advanced fetch wrapper with automatic retries, middleware support, and full TypeScript typing.

## Features

- **Automatic retries** with configurable backoff strategies
- **Middleware system** for request manipulation
- **TypeScript support** with full type safety
- **Timeout and abort control**
- **Intelligent retry-after** header handling
- **Customizable converters** (JSON, text, blob, etc.)
- **Jitter support** to prevent thundering herd
- **Extensible architecture**

## Installation

```bash
npm install bestfetch-g
```

## Quick start

```TypeScript
import { BestFetch } from 'bestfetch-g';

const api = new BestFetch({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  numRetries: 3,
  timeout: 5000
});

// GET request
const users = await api.get({
  endpoint: 'users',
  convertType: 'JSON',
  callbacks: {
    onSuccess: (users) => {
      console.log('Users:', users);
      return users;
    },
    onError: (response) => {
      console.error('Error:', response.status);
      return response.status !== 404; // Don't retry on 404
    }
  }
});

// POST request
const newPost = await api.post({
  endpoint: 'posts',
  convertType: 'JSON',
  body: { title: 'Hello', body: 'World', userId: 1 },
  callbacks: {
    onSuccess: (post) => {
      console.log('Created post:', post);
      return post.id;
    }
  }
});
```

## Configuration Options

```typescript
const api = new BestFetch({
  baseUrl: 'https://api.example.com',
  baseConfig: {
    headers: { 'Authorization': 'Bearer token' }
  },
  numRetries: 5,
  timeout: 10000,
  retryAfterCodes: [408, 429, 500, 502, 503, 504],
  defaultCallbacks: {
    onSuccess: (data) => data,
    onError: (response) => response.status >= 500,
    onNetworkError: (error) => true
  }
});
```

## Middleware System
#### only requests for now

```typescript
// Add authentication middleware
api.use('auth', async (request, context) => {
  request.headers.set('Authorization', `Bearer ${getToken()}`);
  return { stopPropagation: false, request };
});

// Add logging middleware
api.use('logger', async (request, context) => {
  console.log(`Attempt ${context.attempt + 1}/${context.maxAttempts}:`, request.url);
  return { stopPropagation: false, request };
});

// Remove middleware
api.unuse('logger');
```

## Retry Strategies

```typescript
// Custom retry options
await api.get({
  endpoint: 'data',
  convertType: 'JSON',
  retryOptions: {
    type: 'EXPONENTIAL', // or 'LINEAR'
    minDelay: 1000,
    maxDelay: 30000,
    doJitter: true
  },
  callbacks: {
    onSuccess: (data) => data
  }
});
```

## Error Handling

```typescript
try {
  const data = await api.get({
    endpoint: 'protected',
    convertType: 'JSON',
    callbacks: {
      onError: (response, isLastAttempt) => {
        if (response.status === 401 && !isLastAttempt) {
          refreshToken();
          return true; // Retry
        }
        return false; // Don't retry
      }
    }
  });
} catch (error) {
  if (error.name === 'FetchError') {
    console.error('Server error:', error.response.status);
  } else if (error.name === 'NetworkError') {
    console.error('Network connection failed');
  }
}
```

# API Reference

## HTTP Methods
- `.get(options)`
- `.post(options)`
- `.put(options)`
- `.patch(options)`
- `.delete(options)`

## Convert Types

- `'JSON'` - Parse as JSON
- `'TEXT'` - Get as text
- `'BLOB'` - Get as Blob
- `'BYTES'` - Get as Bytes (`UInt8Array`)
- `'ARRAYBUFFER'` - Get as ArrayBuffer
- `'FORMDATA'` - Get as FormData
- `'RESPONSE'` - Get raw Response

# Advanced Usage

## Custom Retry-After Handling
```typescript
const customRetryCallback = (response: Response, retryAfter: string | null) => {
  if (response.status === 429) {
    return { shouldRetry: true, delayAuto: false, delay: 60000 }; // Wait 1 minute
  }
  return { shouldRetry: true, delayAuto: true };
};

await api.get({
  endpoint: 'rate-limited',
  convertType: 'JSON',
  retryAfterCallback: customRetryCallback,
  callbacks: { onSuccess: (data) => data }
});
```

## Abort Controller
```typescript
const controller = new AbortController();

setTimeout(() => controller.abort(), 5000);

try {
  await api.get({
    endpoint: 'slow-endpoint',
    convertType: 'JSON',
    abortController: controller,
    callbacks: { onSuccess: (data) => data }
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was aborted');
  }
}
```
