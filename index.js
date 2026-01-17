const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
    const usersCollection = db.collection("users");
    const partnerCountCollection = db.collection("partnerCounts");

    // Create : add users
    app.post("/users", async (req, res) => {
      const newUsers = req.body;

      //check duplicate email
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        res.send({ message: "user already registered!" });
      } else {
        const result = await usersCollection.insertOne(newUsers);
        res.send(result);
      }
    });

    //GET : get all users
    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // GET: all students

    app.get("/students", async (req, res) => {
      // console.log(req.query)
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const cursor = studentsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // GET : top rated students
    app.get("/top-rated-students", async (req, res) => {
      // const email = req.query.email;
      // const query = {}
      // if(email) {
      //   query.email = email
      // }
      const projectFields = {
        name: 1,
        profileimage: 1,
        subject: 1,
        experienceLevel: 1,
        rating: 1,
      };
      const cursor = studentsCollection
        .find()
        .sort({ rating: -1 })
        .limit(4)
        .project(projectFields);
      const result = await cursor.toArray();
      res.send(result);
    });

    //FIND : specific student

    app.get("/students/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await studentsCollection.findOne(query);
      res.send(result);
    });

    // POST: add new student

    app.post("/students", async (req, res) => {
      const newStudent = req.body;
      const result = await studentsCollection.insertOne(newStudent);
      res.send(result);
    });

    // POST: add partner counts

    app.post("/partnerCounts", async (req, res) => {
      const {
        partnerId,
        partnerEmail,
        partnerName,
        partnerPhoto,
        partnerSubject,
        partnerStudyMode,
        requested_by,
      } = req.body;

      const alreadySent = await partnerCountCollection.findOne({
        partnerId,
        requested_by,
      });

      if (alreadySent) {
        return res.send({ message: "already_sent" });
      }

      const result = await partnerCountCollection.insertOne({
        partnerId,
        partnerEmail,
        partnerName,
        partnerPhoto,
        partnerSubject,
        partnerStudyMode,
        requested_by,
        createdAt: new Date(),
      });

      res.send(result);
    });

    // Get : get partner
    app.get("/partnerCounts", async (req, res) => {
      const email = req.query.email;
      const result = await partnerCountCollection.find().toArray();
      res.send(result);
    });

    // COUNT : increment partner count
    app.patch("/partnerCounts/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const update = {
        $inc: { patnerCount: 1 },
      };

      const result = await studentsCollection.updateOne(query, update);
      res.send(result);
    });

    // SEARCH: search by subject name api
    app.get("/search", async (req, res) => {
      try {
        const search_text = req.query.search;

        const result = await studentsCollection
          .find({
            subject: { $regex: search_text, $options: "i" }, // i = case-insensitive
          })
          .toArray();

        res.send(result);
        // console.log(search_text)
      } catch (error) {
        res.status(500).send({ message: "Search failed", error });
      }
    });

    // Sort : sort by experienceLevel
    app.get("/sort", async (req, res) => {
      const sortOrder = req.query.sort === "asc" ? 1 : -1; // default descending

      // Aggregate use for string level priority handle
      const result = await studentsCollection
        .aggregate([
          {
            $addFields: {
              
              expRank: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$experienceLevel", "Beginner"] },
                      then: 1,
                    },
                    {
                      case: { $eq: ["$experienceLevel", "Intermediate"] },
                      then: 2,
                    },
                    {
                      case: { $eq: ["$experienceLevel", "Expert"] },
                      then: 3,
                    },
                  ],
                  default: "$experienceLevel", // if number
                },
              },
            },
          },
          { $sort: { expRank: sortOrder } },
        ])
        .toArray();

      res.send(result);
    });

    // FILTER : 
    app.get("/filter" , async (req , res) => {
      const experienceLevel = req.query.experienceLevel;
      let query = {}
      if(experienceLevel){
        query = {experienceLevel} // empty value value & selected value
        // query = {experienceLevel : experienceLevel} //just value
      }
      const result = await studentsCollection.find(query).toArray();
      res.send(result)
    })
    
    //DELETE: delete student api
    app.delete("/students/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await studentsCollection.deleteOne(query);
      res.send(result);
    });

    // UPDATE : update student api
    app.patch("/students/:id", async (req, res) => {
      const id = req.params.id;
      const updatedStudent = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          subject: updatedStudent.subject,
          studyMode: updatedStudent.studyMode,
          availabilityTime: updatedStudent.availabilityTime,
          //some key & value goes here
        },
      };
      const result = await studentsCollection.updateOne(query, update);
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
