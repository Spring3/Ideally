const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
let mongo;

async function connect() {
  try {
   mongo = await MongoClient.connect(process.env.MONGODB_URL);
   console.log('Successfully connected to mongodb');
   module.exports.db = mongo;
   return mongo;
  } catch(e) {
    console.error(e);
  }
}


module.exports = {
  connect,
  ObjectId
};
