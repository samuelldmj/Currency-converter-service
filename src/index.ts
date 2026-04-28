
import { PORT } from "./Config/env.js";

import app from "./app.js";

import { initializeDb } from "./Database/db.js";

initializeDb();
// START HTTP server on PORT
// FIX: attach error listener on the server instance returned by app.listen(), not on app
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.on("error", (err) => {
    console.error(err);
    process.exit(1);
});
