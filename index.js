const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const bodyParser = require("body-parser");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.SECRET_KEY);

app.use(cors());
app.use(express.json());
// app.use(bodyParser.json())
app.use(express.static("public"));

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wrjil.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.PRIVATE_KEY, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden" });
    }
    if (decoded) {
      req.decoded = decoded;
      next();
    }
  });
};

async function run() {
  try {
    const toolsCollection = client.db("Royal_Manufacturer").collection("tools");
    const bookingCollection = client.db("Royal_Manufacturer").collection("booking");
    const userCollection = client.db("Royal_Manufacturer").collection("user");
    const reviewCollection = client.db("Royal_Manufacturer").collection("reviews");

    // get all tools
    app.get("/tools", async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // get single tools from toolsCollection
    app.get("/tools/:id", verifyJWT, async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) };
      const result = await toolsCollection.findOne(query);
      res.send(result);
    });
    // get all booking for every single user
    app.get("/booking", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decoded = req.decoded;
      if (decoded.email === email) {
        const query = { email };
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      }
    });
    app.get("/booking/:id", async (req, res) => {
      const { id } = req.params;
      const result = await bookingCollection.findOne({ _id: ObjectId(id) });
      res.send(result);
    });
    app.get("/user", verifyJWT, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      const result = user?.role === "admin";
      res.json(result);
    });
    app.get("/orders", async (req, res) => {
      const all = req.query.all
      const unpaid = req.query.unpaid
      const paid = req.query.paid
      const shift = req.query.shift
      let query;
      if(unpaid){
        query = {status: 'unpaid'}
      }else if(paid){
        query = {status: 'paid'}
      }else if(shift){
        query = {status: 'shift'}
      }else{
        query = {}
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    // get all tools
    app.get("/manageTools", async (req, res) => {
      const query = {}
      const options = {sort: {name: 1}}
      const result = await toolsCollection.find(query, options).toArray();
      res.send(result);
    });
    app.get('/reviews', async (req, res) => {
      const query = {};
      const result = await reviewCollection.find(query).toArray()
      res.send(result.reverse())
    })
    app.get("/allTools", async (req, res) => {
      const query = {};
      const page = +(req.query.page)
      const value = +(req.query.value)
      const cursor = toolsCollection.find(query);
      const count = await toolsCollection.estimatedDocumentCount()
      const result = await cursor.skip(page * value).limit(value).toArray();
      res.send({result, count});
    });

    // booking 1 order
    app.post("/booking", verifyJWT, async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });
    app.post("/create-payment-intent", async (req, res) => {
      const price = req.body.price;
      if (price) {
        const amount = price * 100;

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "eur",
          automatic_payment_methods: {
            enabled: true,
          },
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }
    });
    // add a tools
    app.post("/addProduct", verifyJWT, async (req, res) => {
      const tools = req.body;
      const result = await toolsCollection.insertOne(tools);
      res.send(result);
    });
    app.post('/addReview', verifyJWT, async (req, res) => {
      const {email} = req.query
      const data = req.body
      const user = await userCollection.findOne({email})
      data.img = user.img
      const result = await reviewCollection.insertOne(data)
      res.send(result)
    })

    app.patch("/payment/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: ObjectId(id) };
      const transactionId = req.body.transactionId;

      const updateDoc = {
        $set: {
          status: 'paid',
          transactionId,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // make admin from normal user
    app.patch("/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/makeAdminFn", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const filter = { email };
      const updateDoc = {
        $set: {
          role: null,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/profileEdit/:email", async (req, res) => {
      const { email } = req.params;
      const data = req.body;
      const filter = { email };
      const updateDoc = {
        $set: data,
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/pendingToShift/:id", verifyJWT, async (req, res) => {
      const { id } = req.params;
      const filter = { _id: ObjectId(id) };

      const updateDoc = {
        $set: {
          status: 'shift',
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // login time jwt token create & set in localStorage
    app.put("/login/:email", async (req, res) => {
      const email = req.body.email;
      const filter = { email };
      const options = { upsert: true };

      const updateDoc = {
        $set: req.body,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);

      const token = jwt.sign({ email }, process.env.PRIVATE_KEY, {
        expiresIn: "1h",
      });
      res.send({ token, result });
    });

    app.delete("/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/removeUser/:email", verifyJWT, async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/removeOrder/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/toolsDelete/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) };
      const result = await toolsCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    // await client.close()
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
