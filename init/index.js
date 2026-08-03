/**
 * We have created this `/init` folder to initialise database with fresh data.
 * so, we can perform project setup and data initialisation in this file.
 */

const mongoose = require("mongoose");
const initData = require("./data.js"); // Importing data from data.js file.
const Listing = require("../models/listing.js"); // Importing Listing model from models folder.

const MONGO_URL = "mongodb+srv://aniket-student:8JLjKcS59dvobY9o@listingdata.6osbsse.mongodb.net/?appName=ListingData"; // Local MongoDB connection URL. You can change it to your own MongoDB connection URL if needed.

/* Database connectivity setup */
main()
    .then(() => {
        console.log("Database connected.");
    })
    .catch((err) => console.log(err));

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({});
    let newdata = initData.data.map((listing) => ({ ...listing, owner: "6a704bc81120a802aec47ce3" })); // Replace with the actual ObjectId of the user who will be the owner of the listings.
    await Listing.insertMany(newdata);
    console.log("Data is initialized.");
}


initDB();
