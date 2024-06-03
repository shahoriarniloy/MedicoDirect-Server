const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();

const port = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174'
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
    const medicinesCollection = database.collection("medicines");

    app.get('/categories', async (req, res) => {
      try {
        const cursor = categoryCollection.find();
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.error("Error retrieving categories:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post('/categories', async (req, res) => {
      try {
        const { name, imageUrl } = req.body; 
        const newCategory = { name, imageUrl };
        const result = await categoryCollection.insertOne(newCategory);
        res.status(201).json(result);
      } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.delete('/categories/:id', async (req, res) => {
        try {
          const id = req.params.id;
          const result = await categoryCollection.deleteOne({ _id: new ObjectId(id) });
          if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Category not found' });
          }
          res.json({ message: 'Category deleted successfully' });
        } catch (error) {
          console.error('Error deleting category:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
      });
      

    app.post('/medicines', async (req, res) => {
      try {
        const newMedicine = req.body;
        const result = await medicinesCollection.insertOne(newMedicine);
        res.status(201).json(result);
      } catch (error) {
        console.error('Error adding medicine:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/medicines', async (req, res) => {
      try {
        const cursor = medicinesCollection.find();
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.error('Error retrieving medicines:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/medicines/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const medicine = await medicinesCollection.findOne({ _id: new ObjectId(id) });
        if (!medicine) {
          return res.status(404).json({ error: 'Medicine not found' });
        }
        res.json(medicine);
      } catch (error) {
        console.error('Error retrieving medicine:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  } finally {
    
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('MedicoDirect Server');
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
