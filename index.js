const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
const bodyParser = require('body-parser')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.SECRET_KEY)

app.use(cors())
app.use(express.json())
// app.use(bodyParser.json())
app.use(express.static("public"));

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wrjil.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization
  if(!authHeader){
    return res.status(401).send({message: "Unauthorized"})
  }
  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.PRIVATE_KEY, function(err, decoded){
    if(err){
      return res.status(403).send({message: "Forbidden"})
    }
    if(decoded){
      req.decoded = decoded
      next()
    }
  })
}

async function run(){
    try{
        const toolsCollection = client.db('Royal_Manufacturer').collection('tools')
        const bookingCollection = client.db('Royal_Manufacturer').collection('booking')

        // get all tools
        app.get('/tools', async (req, res) => {
            const query = {}
            const cursor = toolsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })
        // get single tools from toolsCollection
        app.get('/tools/:id', verifyJWT, async (req, res) => {
          const {id} = req.params
          const query = {_id: ObjectId(id)}
          const result = await toolsCollection.findOne(query)
          res.send(result)
        })
        // get all booking for every single user
        app.get('/booking', verifyJWT,  async (req, res) => {
          const email = req.query.email
          const decoded = req.decoded
          if(decoded.email === email){
            const query = {email}
            const result = await bookingCollection.find(query).toArray()
            res.send(result)
          }
        })
        app.get('/booking/:id', async (req, res) => {
          const {id} = req.params
          const result = await bookingCollection.findOne({_id: ObjectId(id)})
          res.send(result)
        })

        // booking 1 order
        app.post("/booking", verifyJWT, async (req, res) => {
          const booking = req.body
          const result = await bookingCollection.insertOne(booking)
          res.send(result)
        })
        // login time jwt token create & set in localStorage
        app.post('/login/:email', (req, res) =>{
          const email = req.body.email
          const token = jwt.sign({ email }, process.env.PRIVATE_KEY, { expiresIn: '1h' });
          res.send({token})
        })
        app.post("/create-payment-intent", async (req, res) => {
          const currency = req.body.price
          const price = currency * 100
        
          // Create a PaymentIntent with the order amount and currency
          const paymentIntent = await stripe.paymentIntents.create({
            amount: price,
            currency: "eur",
            automatic_payment_methods: {
              enabled: true,
            },
          });
        
          res.send({
            clientSecret: paymentIntent.client_secret,
          });
        });

        app.patch('/payment/:id', async (req, res) => {
          const {id} = req.params
          const filter = {_id: ObjectId(id)}
          const transactionId = req.body.transactionId

          const updateDoc = {
            $set: {
              paid: true,
              transactionId
            }
          }
          const result = await bookingCollection.updateOne(filter,updateDoc)
          res.send(result)
        })
        
        app.delete('/delete/:id', async (req, res) => {
          const id = req.params.id
          const query = {_id: ObjectId(id)}
          const result = await bookingCollection.deleteOne(query)
          res.send(result)
        })
    }finally{
        // await client.close()
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})