const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hvoghur.mongodb.net/?retryWrites=true&w=majority`;

// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Root route
app.get("/", (req, res) => {
  res.send("studyMate server is live!");
});

// Run server + DB
async function run() {
  try {
    await client.connect();

    const db = client.db("studyMate_db");
    const studentsCollection = db.collection("students");

    
    // GET: all students 
    
    app.get("/students", async (req, res) => {
      const cursor = studentsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    
    // POST: add new student
   
    app.post("/students", async (req, res) => {
      const newStudent = req.body;
      const result = await studentsCollection.insertOne(newStudent);
      res.send(result);
    });

    // MongoDB connection check
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error(err);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`studyMate server is running on port: ${port}`);
});
