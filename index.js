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

    // creating index for roomsCollection
    const indexKeys = { location: 1 };
    const indexOptions = { name: "locationIndex" };
    const result = await roomsCollection.createIndex(indexKeys, indexOptions);
    // console.log(result)

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
        filteredRooms = filteredRooms?.filter(room => room.beds === beds);
      }

      if (bedrooms) {
        filteredRooms = filteredRooms?.filter(room => room.bedrooms === bedrooms);
      }

      if (!propertyType.includes('')) {
        filteredRooms = filteredRooms?.filter(room => propertyType.includes(room.propertyType))
      }

      res.send(filteredRooms)
    })

    // get rooms by the search queries
    app.get("/rooms/search", async (req, res) => {
      const location = req.query.location;
      const dateRange = req.query.dateRange;
      const checkIn = dateRange.split(' - ')[0];
      const checkOut = dateRange.split(' - ')[1];
      const guests = req.query.guests;
      const infants = req.query.infants;
      const pets = req.query.pets;

      let searchedRooms;
      const query = {};
      searchedRooms = await roomsCollection.find({}).toArray()

      // Add conditions to the query only if the values are not "0"
      if (guests !== '0') {
        query['holdingCapacity.guests'] = guests;
      }
      if (infants !== '0') {
        query['holdingCapacity.infants'] = infants;
      }
      if (pets !== '0') {
        query['holdingCapacity.pets'] = pets;
      }

      if (Object.entries(query).length > 0) {
        searchedRooms = await roomsCollection.find(query).toArray();
      }
      
      if (location) {
        searchedRooms = await roomsCollection.find({ location: { $regex: location, $options: "i" } }).toArray();
      }

      if(checkIn !== checkOut){
        searchedRooms = await roomsCollection.find({dateRange: dateRange}).toArray();
      }
      
      res.send(searchedRooms)
    });


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