
import { PORT } from "./Config/env.js";

import app from "./app.js";

import { initializeDb } from "./Database/db.js";

initializeDb();
// START HTTP server on PORT
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// app.listen(PORT, () => log "Server running on port {PORT}")
// ON error: log error and exit process with code 1
app.on("error", (err) => {
    console.error(err);
    process.exit(1);
});
