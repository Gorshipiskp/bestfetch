import {BestFetch} from ".bestfetch/bestfetch";

function onErrorDefault(response: Response): boolean {
    console.error("Error response", response.status);
    return true;
}

function onNetworkErrorDefault(response: Response): boolean {
    console.error("Network error response", response.status);
    return true;
}

const api: BestFetch = new BestFetch({
    baseUrl: "https://jsonplaceholder.typicode.com",
    defaultCallbacks: {
        onError: onErrorDefault,
        onNetworkError: onNetworkErrorDefault
    }
});

// Getting users
const usersNum = await api.get({
    endpoint: "users",
    convertType: "JSON",
    callbacks: {
        onSuccess: (users) => {
            console.log("Пользователи:", users);
            return users.length; // IDE понимает тип users
        },
    }
});
// The IDE knows that `usersNum` is number (because it is returned from onSuccess callback)


type Post = {
    title: string,
    body: string,
    userId: number,
    id: number
}

const toPost = {
    title: "Hello World",
    body: "This is a test post",
    userId: 1
}

// Creating post
const postID = await api.post({
        endpoint: "posts",
        convertType: "JSON",
        body: toPost,
        callbacks: {
            onSuccess: (post: Post): number => {
                console.log("Created post:", post, "with ID:", post.id);
                return post.id;
            },
        },
        headers: new Headers({"Content-Type": "application/json"}) // it's necessary for POST
    }
);
// The IDE knows that `PostID` is number (because it is returned from onSuccess callback)
