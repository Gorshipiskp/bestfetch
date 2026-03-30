import {BestFetch} from "./bestfetch/bestfetch";

// Default callbacks

function onErrorDefault(response: Response): boolean {
    console.error("Error response:", response.status);
    return true;
}

function onNetworkErrorDefault(error: any): boolean {
    console.error("Network error:", error);
    return true;
}

// Create API instance

const api = new BestFetch({
    baseURL: "https://jsonplaceholder.typicode.com",
    timeout: 5000,
    retry: {
        retries: 3,
        baseDelay: 300
    }
});

// Optional: global plugin for logging
api.use({
    onRequest(request) {
        console.log("Request:", request.method, request.url);
        return request;
    },
    onResponse(response) {
        console.log("Response:", response.status);
        return response;
    },
    onError(error) {
        console.error("Global error:", error);
        return error;
    }
});

// Example 1: GET users

const usersCount = await api.get<number>("/users", {
    callbacks: {
        onSuccess: (users: any[]) => {
            console.log("Users:", users);
            return users.length;
        },
        onError: onErrorDefault,
        onNetworkError: onNetworkErrorDefault
    }
});

// The IDE knows that `usersCount` is number

// Types

type Post = {
    title: string;
    body: string;
    userId: number;
    id: number;
};

const toPost = {
    title: "Hello World",
    body: "This is a test post",
    userId: 1
};

// Example 2: POST create post

const postID = await api.post<number>("/posts", toPost, {
    callbacks: {
        onSuccess: (post: Post) => {
            console.log("Created post:", post);
            return post.id;
        },
        onError: onErrorDefault,
        onNetworkError: onNetworkErrorDefault
    }
});

// The IDE knows that `postID` is number

// Example 3: Query parameters

const filteredUsers = await api.get<any[]>("/users", {
    query: {
        limit: 5,
        search: "Leanne"
    },
    callbacks: {
        onSuccess: (users) => {
            console.log("Filtered users:", users);
            return users;
        }
    }
});

// Example 4: Custom headers

await api.get("/users", {
    headers: {
        Authorization: "Bearer some-token"
    }
});

// Example 5: Timeout + Abort

const controller = new AbortController();

setTimeout(() => controller.abort(), 1000);

try {
    await api.get("/users", {
        signal: controller.signal,
        timeout: 2000
    });
} catch (e) {
    console.error("Request aborted or failed");
}

// Example 6: Text response

const textData = await api.get<string>("/posts/1", {
    callbacks: {
        onSuccess: async (_data, response) => {
            return await response.text();
        }
    }
});

console.log("Text response:", textData);

// Example 7: Simple usage (no callbacks)

const rawUsers = await api.get<any[]>("/users");

// Direct JSON result (default behavior)
console.log("Raw users:", rawUsers);