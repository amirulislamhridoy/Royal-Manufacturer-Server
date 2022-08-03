const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
const bodyParser = require('body-parser')
require('dotenv').config()

app.use(cors())
app.use(express.json())
// app.use(bodyParser.json())

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://Royal_Manufacturer:32202910@cluster0.wrjil.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const toolsCollection = client.db('Royal_Manufacturer').collection('tools')

        app.get('/tools', async (req, res) => {
            const query = {}
            const cursor = toolsCollection.find(query)
            const result = await cursor.toArray()
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