const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
const bodyParser = require('body-parser')
require('dotenv').config()
const jwt = require('jsonwebtoken');

app.use(cors())
app.use(express.json())
// app.use(bodyParser.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wrjil.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const toolsCollection = client.db('Royal_Manufacturer').collection('tools')

        // get all tools
        app.get('/tools', async (req, res) => {
            const query = {}
            const cursor = toolsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })
        // get single tools from toolsCollection
        app.get('/tools/:id', async (req, res) => {
          const {id} = req.params
          const query = {_id: ObjectId(id)}
          const result = await toolsCollection.findOne(query)
          res.send(result)
        })

        app.post('/login/:email', (req, res) =>{
          const email = req.body.email
          const token = jwt.sign({ email }, process.env.PRIVATE_KEY, {expiresIn: '1h'});
          res.send({token})
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