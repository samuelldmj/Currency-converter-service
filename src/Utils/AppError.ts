class AppError extends Error {

    constructor(
        public message: string,
        public status: number
    ) {

        super(message);

        this.name = "AppError";

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;