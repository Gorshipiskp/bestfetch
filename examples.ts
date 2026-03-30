import { BestFetch } from "bestfetch-g";

// Default callbacks

function onErrorDefault(response: Response): boolean {
    console.error("Error response:", response.status);
    return true;
}

function onNetworkErrorDefault(error: unknown): boolean {
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

// Types

type User = {
    id: number;
    name: string;
};

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

// Example 1: GET users

const usersCount = await api.get("/users", {
    callbacks: {
        onSuccess: (users: User[]) => {
            console.log("Users:", users);
            return users.length;
        },
        onError: onErrorDefault,
        onNetworkError: onNetworkErrorDefault
    }
});

// usersCount: number


// Example 2: POST create post

const postID = await api.post("/posts", toPost, {
    callbacks: {
        onSuccess: (post: Post) => {
            console.log("Created post:", post);
            return post.id;
        },
        onError: onErrorDefault,
        onNetworkError: onNetworkErrorDefault
    }
});

// postID: number


// Example 3: Query parameters

const filteredUsers = await api.get("/users", {
    query: {
        limit: 5,
        search: "Leanne"
    },
    callbacks: {
        onSuccess: (users: User[]) => {
            console.log("Filtered users:", users);
            return users;
        }
    }
});

// filteredUsers: User[]


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
} catch {
    console.error("Request aborted or failed");
}


// Example 6: Text response by setting convertType

const textData = await api.get("/posts/1", {
    convertType: "TEXT"
});

// textData: string
console.log("Text response:", textData);


// Example 7: Text in onSuccess (alternative)

const textData2 = await api.get("/posts/1", {
    callbacks: {
        onSuccess: async (_data, response) => {
            return response.text();
        }
    }
});

// textData2: Promise<string> → after await: string


// Example 8: Simple usage (no callbacks)

const rawUsers = await api.get("/users");

// rawUsers: any (JSON mean any)
console.log("Raw users:", rawUsers);