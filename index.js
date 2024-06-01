const express = require('express');

const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();

const port = process.env.PORT || 5000;


const corsOptions = {
  origin: [
    'http://localhost:5173',
    
],
  credentials: true
};

app.use(cors(corsOptions));



app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dxgrzuk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    const database = client.db("MedicoDirect");
    const categoryCollection = database.collection("categories");
    

      
     


     

    app.get('/categories',  async (req, res) => {
        try {
        
        const cursor = categoryCollection.find();
        const result = await cursor.toArray();
        res.json(result);
        } catch (error) {
        console.error("Error retrieving foods:", error);
        res.status(500).json({ error: "Internal server error" });
        }
  });

  




  } finally {
    
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('RestoSync Server');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
