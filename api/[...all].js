import serverless from "serverless-http";
import createApp from "../server/createApp.js";

// Create the Express app without background schedulers for serverless
const { app } = createApp({ enableSchedulers: false });

// Export a serverless-compatible handler
export default serverless(app);
