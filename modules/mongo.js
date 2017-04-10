const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const _ = require('underscore');

class Database {
  constructor (dbInstance) {
    this.db = dbInstance;
  }

  async updateUser(condition, updates) {
    const result = await this.db.collection('Users').findOneAndUpdate(
      condition,
      { $set: updates },
      { returnOriginal: false }
    );
    return result ? result.value : result;
  }

  async getProjects(user) {
    const condition = user ? { owner: user._id } : {};
    return await this.db.collection('Projects').find(condition).toArray();
  }

  async deleteProject(id) {
    return await this.db.collection('Projects').remove({ _id: id });
  }

  async getProject(condition) {
    return await this.db.collection('Projects').findOne(condition);
  }

  async insertProject(user, project) {
    return await this.db.collection('Projects').insert(Object.assign({ owner: user._id }, project));
  }

  async updateProject(project) {
    const id = ObjectId(project._id);
    delete project._id;
    return await this.db.collection('Projects').update({ _id: id }, { $set: project });
  } 

  async createProjects(project) {
    return await this.db.collection('Projects').insert(_.pick(project, 'data'));
  }

  async getUser(condition) {
    return await this.db.collection('Users').findOne(condition);
  }

  async insertUser(data) {
    const insertion = await this.db.collection('Users').insert(data);
    return insertion.result.ok ? { ok: true, data: insertion.ops[0] } : { ok: false, data: insertion.writeError };
  }

  async applyToProject(userId, projectId, position) {
    const applied = await this.db.collection('Applications').findOne({ user: ObjectId(userId), project: ObjectId(projectId), position });
    console.log(applied);
    if (!applied) {
      const insertion = await this.db.collection('Applications').insert({ user: ObjectId(userId), project: ObjectId(projectId), position });
      return insertion.result.ok ? { ok: true, data: insertion.ops[0] } : { ok: false, data: insertion.writeError };
    } else {
      await this.db.collection('Applications').remove({ _id: ObjectId(applied._id) });
      return false;
    }
  }

  async getApplicationsPerUser(userId) {
    return await this.db.collection('Applications').find({ user: ObjectId(userId) }).toArray();
  }

  async getApplications(projectId) {
    return await this.db.collection('Applications').find({ project: ObjectId(projectId) }).toArray();
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
