const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

class Database {
  constructor (dbInstance) {
    this.db = dbInstance;
  }

  async getProjects(user) {
    const condition = user ? { owner: user._id } : {};
    return await this.db.collection('Projects').find(condition).toArray();
  }

  async updateUser(condition, updates) {
    const result = await this.db.collection('Users').findOneAndUpdate(
      condition,
      { $set: updates },
      { returnOriginal: false }
    );
    return result ? result.value : result;
  }

  async getProject(condition) {
    return await this.db.collection('Projects').findOne(condition);
  }

  async getUser(condition) {
    return await this.db.collection('Users').findOne(condition);
  }

  async insertUser(data) {
    const insertion = await this.db.collection('Users').insert(data);
    return insertion.result.ok ? { ok: true, data: insertion.ops[0] } : { ok: false, data: insertion.writeError };
  }
};

async function connect() {
  try {
   const mongo = await MongoClient.connect(process.env.MONGODB_URL);
   console.log('Successfully connected to mongodb');
   const db = new Database(mongo);
   module.exports.db = db;
   module.exports.client = mongo;
   return mongo;
  } catch(e) {
    console.error(e);
  }
};

module.exports = {
  connect,
  ObjectId
};
