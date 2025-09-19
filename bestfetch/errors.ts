export class FetchError extends Error {
    constructor(public url: string | URL, public attempt: number, public response: Response) {
        const msg: string = `Failed fetch (URL: ${url}, attempt: ${attempt}, status: ${response.status})`;

        super(msg);
        this.name = "FetchError";

        Object.setPrototypeOf(this, FetchError.prototype);
    }
}

export class NetworkError extends Error {
    constructor(public url: string | URL, public attempt: number) {
        const msg: string = `Failed fetch (URL: ${url}, attempt: ${attempt})`;

        super(msg);
        this.name = "NetworkError";

        Object.setPrototypeOf(this, NetworkError.prototype);
    }
}

export class OnSuccessFunctionError extends Error {
    constructor(public url: string | URL, public attempt: number, public response: Response, public error: any) {
        const msg: string = `Error in user's callback (URL: ${url}, attempt: ${attempt})`;
        console.debug(response);
        console.error(error);

        super(msg);
        this.name = "OnSuccessFunctionError";

        Object.setPrototypeOf(this, OnSuccessFunctionError.prototype);
    }
}
