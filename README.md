# BestFetch

A lightweight, extensible HTTP client built on top of the native `fetch` API.  
Provides retry logic, timeouts, abort handling, and a plugin system — while keeping a simple and predictable interface.

---

## Features

- Native `fetch` wrapper (no heavy dependencies)
- Built-in retry mechanism with exponential backoff
- Timeout support via `AbortController`
- AbortSignal merging
- Plugin system (request / response / error hooks)
- Typed responses via generics
- Simple and flexible API
- Query parameter support

---

## Installation

```bash
npm install bestfetch
````

---

## Basic Usage

```ts
import { BestFetch } from "bestfetch";

const api = new BestFetch("https://api.example.com");

const data = await api.get<{ users: string[] }>("/users");

console.log(data.users);
```

---

## Typing Responses

You can strongly type the response using generics:

```ts
type User = {
    id: number;
    name: string;
};

const users = await api.get<User[]>("/users");

// `users` is auto typed as `User[]`
```

For more control:

```ts
const result = await api.get<{ data: User[] }>("/users", {
    callbacks: {
        onSuccess: (data) => data.data
    }
});
```

---

## HTTP Methods

### GET

```ts
await api.get("/users");
```

### POST

```ts
await api.post("/users", {
    name: "John"
});
```

### PUT

```ts
await api.put("/users/1", {
    name: "Updated"
});
```

### PATCH

```ts
await api.patch("/users/1", {
    name: "Patched"
});
```

### DELETE

```ts
await api.delete("/users/1");
```

---

## Query Parameters

```ts
await api.get("/users", {
    query: {
        limit: 10,
        offset: 20,
        search: "john doe"
    }
});
```

Generated URL:

```
/users?limit=10&offset=20&search=john%20doe
```

---

## Headers

```ts
await api.get("/users", {
    headers: {
        Authorization: "Bearer token"
    }
});
```

---

## Request Body

JSON is automatically serialized:

```ts
await api.post("/users", {
    name: "John",
    age: 25
});
```

---

## Timeout

```ts
await api.get("/users", {
    timeout: 2000 // ms
});
```

---

## Abort Requests

```ts
const controller = new AbortController();

setTimeout(() => controller.abort(), 1000);

await api.get("/users", {
    signal: controller.signal
});
```

Supports merging multiple signals internally.

---

## Retry Configuration

```ts
const api = new BestFetch("https://api.example.com", {
    retry: {
        retries: 5,
        baseDelay: 500
    }
});
```

Per-request override:

```ts
await api.get("/users", {
    retry: {
        retries: 2
    }
});
```

---

## Callbacks

### onSuccess

```ts
await api.get("/users", {
    callbacks: {
        onSuccess: (data) => data.users
    }
});
```

### onError (HTTP errors)

```ts
await api.get("/users", {
    callbacks: {
        onError: (response) => {
            if (response.status === 404) return false;
            return true;
        }
    }
});
```

### onNetworkError

```ts
await api.get("/users", {
    callbacks: {
        onNetworkError: (error) => {
            console.error(error);
            return true;
        }
    }
});
```

---

## Plugins (Middleware)

Plugins allow you to hook into request/response lifecycle.

### Example: Auth Token

```ts
api.use({
    onRequest(request) {
        const token = localStorage.getItem("jwt");

        if (!token) return request;

        const headers = new Headers(request.headers);
        headers.set("Authorization", `Bearer ${token}`);

        return new Request(request, { headers });
    }
});
```

---

### Example: Logging

```ts
api.use({
    onRequest(request) {
        console.log("Request:", request.url);
        return request;
    },
    onResponse(response) {
        console.log("Response:", response.status);
        return response;
    }
});
```

---

### Example: Global Error Handling

```ts
api.use({
    onError(error) {
        console.error("Global fetch error:", error);
        return error;
    }
});
```

---

## Advanced: Custom Response Handling

By default, responses are parsed as JSON.

If the response is not JSON, you can override behavior:

```ts
await api.get<string>("/text-endpoint", {
    callbacks: {
        onSuccess: async (_, response) => {
            return await response.text();
        }
    }
});
```

---

## License

MIT
