// Check for NODE_ENV is not set on "production".
const dotenv = require("dotenv");

if (process.env.NODE_ENV !== "production") {
    const result = dotenv.config();
    if (result.error) {
        console.warn("dotenv config warning:", result.error.message);
    }
}

const express = require("express");
const mongoose = require("mongoose");
const MongoStore = require('connect-mongo');
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

// Requiring Express Router files.
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// Setting for project requirements.
const app = express();
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const databaseUrl = process.env.MONGODB_URL;

// const store = MongoStore.create({
//     mongoUrl: databaseUrl,
//     touchAfter: 24 * 60 * 60, // time period in seconds
//     crypto: {
//         secret: process.env.SECRET || "default-secret",
//     },
// });

// express-session parameters.
const sessionOptions = {
    // store: store,
    secret: process.env.SECRET || "default-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate())); // It is to use static authenticate method of model in LocalStrategy.

// use static serialize and deserialize of model for passport session support.
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash Message Middleware.
app.use((req, res, next) => {
    res.locals.success = req.flash("success") || [];
    res.locals.error = req.flash("error") || [];
    res.locals.currentUser = req.user || null; // Storing current User in locals so that can be accessed everywhere.
    next();
});

// Express Routers
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// Middlewares
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something Went Wrong!" } = err;
    res.status(statusCode).render("error.ejs", { message });
});

/* Database connectivity setup */
const defaultPort = Number(process.env.PORT || 3001);

function startServer(currentPort = defaultPort) {
    const server = app.listen(currentPort, () => {
        console.log(`Server is running on localhost:${currentPort}`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            const nextPort = currentPort + 1;
            if (nextPort > 65535) {
                console.error("No available ports left to bind the server.");
                process.exit(1);
            }
            console.warn(`Port ${currentPort} is busy. Trying ${nextPort}...`);
            server.close(() => startServer(nextPort));
        } else {
            throw err;
        }
    });
}

async function main() {
    try {
        await mongoose.connect(databaseUrl, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log("Database connected.");
        startServer();
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        if (databaseUrl.includes("mongodb+srv")) {
            console.error("Atlas connection failed. Verify the username/password in the URI and ensure your current IP is allowed in Atlas Network Access.");
        }
        console.error("Falling back to local MongoDB at mongodb://127.0.0.1:27017/explore-hut");
        try {
            await mongoose.connect("mongodb://127.0.0.1:27017/explore-hut", {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            });
            console.log("Database connected locally.");
            startServer();
        } catch (localErr) {
            console.error("Local MongoDB connection also failed:", localErr.message);
            process.exit(1);
        }
    }
}

main();

