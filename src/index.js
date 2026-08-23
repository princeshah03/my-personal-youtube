import "dotenv/config";
import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("ERROR", error)
            throw error
        })

        app.listen(process.env.PORT || 4000, () => {
            console.log(`app is listening on port: ${process.env.PORT || 4000}`)
        })
    })

    .catch((error) => {
        console.log("MONGODB connection failed!!", error);
    });
