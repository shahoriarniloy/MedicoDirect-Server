const express = require('express');
const cookieParser = require('cookie-parser');

const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cookieParser());

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

const logger = (req, res, next)=>{
  console.log('log:info',req.method, req.url);
  next();
}



const verifyToken = (req, res, next)=>
  {
    // console.log('token in the middleware',req.headers.authorization);
    if(!req.headers.authorization){
      return res.status(401).send({message:'Unauthorized Access'})
    }
    const token = req.headers.authorization.split(' ')[1];

    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
      if(err){      
        return res.status(401).send({message:'Unauthorized Access'})

      }
    req.decoded=decoded;
    next();
    })
  }

  

//   const cookieOption = {
//     httpOnly: true,
//     secure:  process.env.NODE_ENV === "production"? true: false,
//     sameSite: process.env.NODE_ENV === "production"? "none": "strict",
//   };



async function run() {
  try {
    const database = client.db("MedicoDirect");
    const categoryCollection = database.collection("categories");
    const medicinesCollection = database.collection("medicines");
    const cartCollection = database.collection("carts");
    const userCollection = database.collection("users");
    const paymentCollection = database.collection("payments");
    const sellCollection = database.collection("sells");
    const advertisementCollection = database.collection("advertisement");




    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });

      res.send({token});
      // res.cookie('token',token, cookieOption).send({ success: true });
    });

    const verifyAdmin = async (req, res,next)=>{
      const email=req.decoded.email;
      const query ={email:email};
      const user = await userCollection.findOne(query);
      const isAdmin =user?.role ==='admin';
      if(!isAdmin){
        return res.status(403).send({message:'forbidden access'});
      }
      next();
  
    }
    const verifySeller = async (req, res,next)=>{
      const email=req.decoded.email;
      const query ={email:email};
      const user = await userCollection.findOne(query);
      const isSeller =user?.role ==='seller';
      if(!isSeller){
        return res.status(403).send({message:'forbidden access'});
      }
      next();
  
    }

    app.post('/users',async (req,res)=>{
      const user =req.body;
      const query= {email:user.email}
      const existingUser= await userCollection.findOne(query);
      if(existingUser){
        return res.send({messege:'User already exists',insertedId:null})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })
    app.get('/categories',  async (req, res) => {
      try {
        const cursor = categoryCollection.find();
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.error("Error retrieving categories:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post('/categories',verifyToken, verifyAdmin, async (req, res) => {
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

    app.delete('/categories/:id',verifyToken, verifyAdmin, async (req, res) => {
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
        newMedicine.advertise = 'no';
        newMedicine.price = parseInt(newMedicine.perUnitPrice);
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
        const id = req.params.id.trim();
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

    app.get('/carts', async(req,res)=>{
      const email = req.query.email;
      const query = {email:email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/carts', async (req, res) => {
      try {
          const cartItem = req.body;
          cartItem.quantity = 1;
          cartItem.purchaseDate = new Date();
          const result1 = await cartCollection.insertOne(cartItem);
          const cartItemId = result1.insertedId;
          cartItem.cartItemId = cartItemId;
          cartItem.status = 'pending';
          const result2 = await sellCollection.insertOne(cartItem);
  
          res.send({ result1, result2 });
      } catch (error) {
          console.error("Error:", error);
          res.status(500).send("Internal Server Error");
      }
  });
  

    // app.delete('/carts/:id', async (req,res)=>{
    //   const id=req.params.id;
    //   const query = {_id:new ObjectId(id)}
    //   const result = await cartCollection.deleteOne(query);
    //   const result2 = await sellCollection.deleteOne(query);

    //   res.send(result);
    // })


    app.delete('/carts/:id', async (req, res) => {
      try {
          const id = req.params.id;
          const query = { cartItemId: id }; 
          const result1 = await cartCollection.deleteOne({ _id: new ObjectId(id) });
          const result2 = await sellCollection.deleteOne({ cartItemId: new ObjectId(id) });
          res.send({ result1, result2 });
      } catch (error) {
          console.error("Error:", error);
          res.status(500).send("Internal Server Error");
      }
  });
  

    app.get('/users', verifyToken, verifyAdmin, async(req,res)=>{
      console.log(req.headers);
      const users = userCollection.find();
      const result = await users.toArray();
      res.send(result);
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req,res)=>{
      const id = req.params.id;
      const query = {_id:new ObjectId(id)}
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req,res)=>
    {
      const id = req.params.id;
      const filter = {_id:new ObjectId(id)};
      const updatedDoc={
        $set:{
          role:'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

    app.patch('/users/seller/:id', async (req,res)=>
      {
        const id = req.params.id;
        const filter = {_id:new ObjectId(id)};
        const updatedDoc={
          $set:{
            role:'seller'
          }
        }
        const result = await userCollection.updateOne(filter, updatedDoc)
        res.send(result);
      })

      app.patch('/users/user/:id', async (req,res)=>
        {
          const id = req.params.id;
          const filter = {_id:new ObjectId(id)};
          const updatedDoc={
            $set:{
              role:'user'
            }
          }
          const result = await userCollection.updateOne(filter, updatedDoc)
          res.send(result);
        })

        app.get('/user/admin/:email',verifyToken, async(req,res)=>{
          const email = req.params.email;
          console.log(email);
          if(email !==req.decoded.email){
            return res.status(403).send({message:'forbidden access'})
          }
          const query = {email:email};
          const user = await userCollection.findOne(query);
          let admin = false;
          if(user){
            admin =user?.role === 'admin';
          }
          res.send({admin});
        })

        app.get('/user/user/:email',verifyToken, async(req,res)=>{
          const email = req.params.email;
          console.log(email);
          if(email !==req.decoded.email){
            return res.status(403).send({message:'forbidden access'})
          }
          const query = {email:email};
          const role = await userCollection.findOne(query);
          let user = false;
          if(role){
            user =role?.role === 'user';
          }
          res.send({user});
        })

        app.get('/user/seller/:email',verifyToken, async(req,res)=>{
          const email = req.params.email;
          console.log(email);
          if(email !==req.decoded.email){
            return res.status(403).send({message:'forbidden access'})
          }
          const query = {email:email};
          const user = await userCollection.findOne(query);
          let seller = false;
          if(user){
            seller =user?.role === 'seller';
          }
          res.send({seller});
        })



        app.post('/create-payment-intent', async(req,res)=>{
          const {price}= req.body;
          const amount = parseInt(price*100);

          console.log(amount);

          const paymentIntent = await stripe.paymentIntents.create({
            amount:amount,
            currency:'usd',
            payment_method_types:['card']
          })
          res.send({
            ClientSecret: paymentIntent.client_secret
          })
        })

        app.post('/payments',async(req,res)=>{
          const payment = req.body;
          const paymentResult = await paymentCollection.insertOne(payment);
          console.log('payment info', payment);
          const query={_id:{
            $in: payment.cartIds.map(id=>new ObjectId(id))
          }}
          const deleteResult = await cartCollection.deleteMany(query);
          res.send({
            paymentResult,
            deleteResult
        });
        })

        app.get('/invoice/:id', async(req, res) => {
          const transactionId = req.params.id;
          try {
              const invoice = await paymentCollection.findOne({ transactionId });
              if (invoice) {
                  res.send(invoice);
              } else {
                  res.status(404).send({ error: "Invoice not found" });
              }
          } catch (error) {
              res.status(500).send({ error: "Internal Server Error" });
          }
      });
      
      app.get('/payments',  async(req,res)=>{
        console.log(req.headers);
        const payments = paymentCollection.find();
        const result = await payments.toArray();
        res.send(result);
      })


      app.put('/payments/:paymentId', async (req, res) => {
        const paymentId = req.params.paymentId;
      
        const updatedPayment = await paymentCollection.findOneAndUpdate(
          { _id: new ObjectId(paymentId) },
          { $set: { status: 'paid' } },
          { returnOriginal: false } 
        );
        
      
        res.json(updatedPayment.value); 
      });


      

    //   app.patch('/payments/:id', async (req, res) => {
    //     const paymentId = req.params.id;
    //     const cartIds = req.body.cartIds;
        
        
    // });

    app.patch('/payments/:id', async (req, res) => {
      const cartIds = req.body; 
      console.log('cartIDS',cartIds);
  
      const query = { cartItemId: { $in: cartIds.map(id => new ObjectId(id)) } };
      try {
          const result = await sellCollection.updateMany(
              query,  
              { $set: { status: 'paid' } }
          );
          console.log(query);
  
          console.log(`${result.modifiedCount} documents updated.`);
          res.send('Sell collection updated successfully.');
      } catch (error) {
          console.error('Error updating documents:', error);
          res.status(500).send('Internal server error');
      }
  });
    



      app.get('/seller/medicines/:id', async (req, res) => {
        const sellerEmail = req.params.id;
        console.log('Seller:',sellerEmail);
    
        try {
            const medicines = await medicinesCollection.find({ sellerEmail: sellerEmail }).toArray();
            console.log(medicines);
            res.json({ medicines });
        } catch (error) {
            console.error('Error fetching medicines:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

   
    app.get('/seller/payment-history/:id',  async(req,res)=>{
      const sellerEmail = req.params.id;
      try {
        const payments = await paymentCollection.find({ sellerEmail: sellerEmail }).toArray();
        res.json({ payments });
    } catch (error) {
        console.error('Error fetching :', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    })

    app.get('/sales',  async(req,res)=>{
      console.log(req.headers);
      const sells = sellCollection.find();
      const result = await sells.toArray();
      res.send(result);
    });


    app.post('/advertisement', async (req, res) => {
        const adds=req.body;
        adds.status='pending';
        const advertise = await advertisementCollection.insertOne(adds);
        
    res.send(advertise)      
    });

    app.put('/medicine-advertise-status/:id', async (req, res) => {
      const id = req.params.id;
    
      const advertise = await medicinesCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { advertise: 'requested' } },
        { returnOriginal: false } 
      );
      
    
      res.json(advertise); 
    });



  


app.put('/medicines/:id', async (req, res) => {
  const medId = req.params.id;

  const updatedMed = await medicinesCollection.findOneAndUpdate(
    { _id: new ObjectId(medId) },
    { $set: { advertise: 'yes' } },
    { returnOriginal: false } 
  );
  

  res.json(updatedMed); 
});

app.put('/medicines-remove/:id', async (req, res) => {
  const medId = req.params.id;

  const updatedMed = await medicinesCollection.findOneAndUpdate(
    { _id: new ObjectId(medId) },
    { $set: { advertise: 'no' } },
    { returnOriginal: false } 
  );
  

  res.json(updatedMed); 
});


// app.get('/categories/:category', async (req, res) => {
//   console.log('niloy',req.params.category );
//   const medicines = await medicinesCollection.find({ 
//     category: req.params.category });
//   console.log(medicines);
//   res.send(medicines.data);
// });



app.get('/categories/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const meds = await medicinesCollection.find({ category: category }).toArray();
    res.json(meds);
  } catch (error) {
    console.error("Error retrieving meds by category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get('/invoices/:email', async (req, res) => {
  try {
    const invoices = req.params.email;
    console.log('user email:',invoices);
    const inv = await sellCollection.find({ sellerEmail: invoices }).toArray();
    res.json(inv);
  } catch (error) {
    console.error("Error retrieving meds by category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.put('/carts/:id', async (req, res) => {
  const cartId = req.params.id;
  const {id,
    updatedQuantity,
    updatedPrice } = req.body; 
  const newQuantity = parseInt(updatedQuantity);
  const newPrice=parseInt(updatedPrice);

  console.log('Id:', id);
  console.log('New Quantity:', newQuantity);
  console.log('New Price:', newPrice);

  try {
      const updatedCart = await cartCollection.findOneAndUpdate(
          { _id: new ObjectId(cartId) },
          { $set: { quantity: newQuantity, price: newPrice } },
          { returnOriginal: false }
      );

      res.json(updatedCart.value);
  } catch (error) {
      console.error("Error updating cart:", error);
      res.status(500).send("Error updating cart");
  }
});










app.get('/user-invoices/:email', async (req, res) => {
  try {
    const invoices = req.params.email;
    console.log('user email:',invoices);
    const inv = await sellCollection.find({ email: invoices }).toArray();
    res.json(inv);
  } catch (error) {
    console.error("Error retrieving inv by category:", error);
    res.status(500).json({ error: "Internal server error" });
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
