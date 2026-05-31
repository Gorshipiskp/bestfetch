import { BestFetch, HttpError } from "./bestfetch";

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

const api = new BestFetch({
    baseURL: "https://jsonplaceholder.typicode.com",
    timeout: 5000,
    retry: {
        retries: 3,
        baseDelay: 300
    }
});

api.use({
    onRequest(request) {
        console.log("Request:", request.method, request.url);
        return request;
    },
    onResponse(response) {
        console.log("Response:", response.status);
        return response;
    }
});

const usersCount = await api.get<User[]>("/users", {
    callbacks: {
        onSuccess: (users) => users.length,
        onError: (response, isLast) => {
            console.error("HTTP error:", response.status, isLast);
            return response.status !== 404;
        }
    }
});

const postID = await api.post<Post>("/posts", {
    title: "Hello World",
    body: "This is a test post",
    userId: 1
}, {
    callbacks: {
        onSuccess: (post) => post.id
    }
});

const filteredUsers = await api.get<User[]>("/users", {
    query: {
        _limit: 5
    }
});

await api.get("/users", {
    headers: {
        Authorization: "Bearer some-token"
    },
    retry: {
        retries: 1
    }
});

const textData = await api.get<string>("/posts/1", {
    convertType: "TEXT"
});

try {
    await api.get("/posts/99999");
} catch (error) {
    if (error instanceof HttpError) {
        console.error("Failed:", error.status, error.body);
    }
}

console.log({ usersCount, postID, filteredUsers, textData });
