const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h2fzsvj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    const roomsCollection = client.db('airbnbDB').collection('rooms')

    app.get('/rooms', async (req, res) => {
      const result = await roomsCollection.find({}).toArray()
      res.send(result)
    })

    app.get('/rooms/filter', async (req, res) => {
      const placeType = req.query.placeType;
      const propertyType = req.query.propertyType.split(',')
      const priceRange = req.query.priceRange.split(',')
      const minPrice = parseFloat(priceRange[0])
      const maxPrice = parseFloat(priceRange[1])
      const beds = parseInt(req.query.beds)
      const bedrooms = parseInt(req.query.bedrooms)

      const rooms = await roomsCollection.find({}).toArray()

      let filteredRooms;

      if (placeType === "All types") {
        const averagePrice = await roomsCollection.aggregate([
          {
            $group: {
              _id: null,
              averagePrice: { $avg: '$price' }
            }
          }
        ]).toArray()

        filteredRooms = rooms?.filter(room => room.price <= averagePrice[0].averagePrice)
      }
      else {
        const averagePrice = await roomsCollection.aggregate([
          {
            $match: {
              $or: [
                { category: placeType },
                { propertyType: placeType }
              ]
            }
          },
          {
            $group: {
              _id: null,
              averagePrice: { $avg: '$price' }
            }
          }
        ]).toArray()

        filteredRooms = rooms?.filter(room => room.price <= averagePrice[0].averagePrice)
      }

      filteredRooms = filteredRooms.filter(room => room.price >= minPrice && room.price <= maxPrice)

      if (beds) {
        filteredRooms = filteredRooms?.filter(room => room.bed === beds);
      }

      if (bedrooms) {
        filteredRooms = filteredRooms?.filter(room => room.bedrooms === bedrooms);
      }

      if (!propertyType.includes('')) {
        filteredRooms = filteredRooms?.filter(room => propertyType.includes(room.propertyType))
      }

      res.send(filteredRooms)
    })

    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Airbnb server is running..')
})

app.listen(port, () => {
  console.log(`Airbnb is listening to port ${port}`)
})