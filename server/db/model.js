// Models: one kind of record (Product, Sale...) with the ways to find,
// save and change them. They work like the Mongoose models this app used
// before (find, findById, create, save, populate...), so the routes stay
// the same. Searching uses "mingo", which understands MongoDB-style filters
// ({ quantity: { $lte: 5 } }) and reports (aggregate pipelines).
require('mingo/init/system'); // every filter and report operator
const mingo = require('mingo');
const { Schema, validationError, castError } = require('./schema');
const { newId, isValidId } = require('./ids');
const { clone } = require('./ejson');
const { getStore } = require('./connection');

const models = {}; // model name -> Model, so populate() can find "ref" models

// Applies a change like { $inc: { quantity: -2 }, status: 'sent' } to a copy of a record.
function applyUpdate(record, update) {
  const result = clone(record);
  for (const [key, value] of Object.entries(update)) {
    if (key === '$inc') {
      for (const [field, amount] of Object.entries(value)) result[field] = (Number(result[field]) || 0) + amount;
    } else if (key === '$set') {
      for (const [field, newValue] of Object.entries(value)) result[field] = clone(newValue);
    } else if (key === '$unset') {
      for (const field of Object.keys(value)) delete result[field];
    } else if (key.startsWith('$')) {
      throw new Error(`The update ${key} is not supported.`);
    } else {
      result[key] = clone(value); // a plain field means "set it"
    }
  }
  return result;
}

// The simple equality parts of a filter ({ _id: 'receipt-261027' }), used
// to start a record when findOneAndUpdate is told to "upsert".
function equalityFields(filter) {
  return Object.fromEntries(Object.entries(filter).filter(([key, value]) => !key.startsWith('$') && (typeof value !== 'object' || value === null || value instanceof Date)));
}

// Keeps only some fields of a plain record: "name barcode" or "-text".
function project(record, selection) {
  if (!selection) return record;
  const names = selection.split(/\s+/).filter(Boolean);
  if (names.every((n) => n.startsWith('-'))) {
    const out = { ...record };
    names.forEach((n) => delete out[n.slice(1)]);
    return out;
  }
  const out = { _id: record._id };
  names.forEach((n) => {
    if (n in record) out[n] = record[n];
  });
  return out;
}

function model(name, schema, collection) {
  const fields = schema.fields;
  const idType = fields._id ? fields._id.type : 'ObjectId';
  const timestamps = Boolean(schema.options.timestamps);
  const store = () => getStore();

  // Throws a CastError if "id" cannot be one of this model's ids.
  function checkId(id) {
    if (idType === 'ObjectId' && !isValidId(String(id))) throw castError('_id', 'ObjectId', id);
  }

  // The saved records matching a filter (the saved objects themselves: copy before changing).
  function matching(filter = {}) {
    if (filter._id !== undefined && (typeof filter._id !== 'object' || filter._id === null) && Object.keys(filter).length === 1) {
      const record = store().get(collection, filter._id);
      return record ? [record] : [];
    }
    return mingo.find(store().all(collection), filter).all();
  }

  // The whole record in its saved form: every field cast, defaults filled in.
  function storable(data) {
    const record = schema.cast(data);
    record._id = data._id !== undefined ? Schema.castValue({ type: idType }, data._id, '_id') : newId();
    if (timestamps) {
      record.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
      record.updatedAt = data.updatedAt ? new Date(data.updatedAt) : record.createdAt;
    }
    return record;
  }

  // Throws the same "duplicate key" error MongoDB gave (code 11000).
  function checkUnique(record) {
    const others = store().all(collection).filter((r) => String(r._id) !== String(record._id));
    for (const { name: field, sparse } of schema.uniqueFields()) {
      const value = record[field];
      if (value === undefined || value === null || (sparse && value === '')) continue;
      if (others.some((r) => r[field] === value)) {
        const error = new Error(`E11000 duplicate key error collection: ${collection} index: ${field}_1 dup key: { ${field}: "${value}" }`);
        error.code = 11000;
        error.keyValue = { [field]: value };
        throw error;
      }
    }
  }

  // Fills in "ref" fields with the referred record ({ _id, name } instead of an id).
  function populateRecords(records, path, selection) {
    const field = fields[path];
    const target = field && models[field.ref];
    if (!target) throw new Error(`Cannot populate "${path}" on ${name}.`);
    for (const record of records) {
      const id = record[path];
      if (id === undefined || id === null) continue;
      const found = getStore().get(target.collection, typeof id === 'object' ? id._id : id);
      record[path] = found ? project(clone(found), selection) : null;
    }
  }

  // A search that can be refined (.sort().limit().populate()...) and then awaited.
  class Query {
    constructor(filter, { one = false, byId } = {}) {
      this.filter = filter || {};
      this.one = one;
      this.byId = byId;
      this.options = { populate: [] };
    }

    sort(order) { this.options.sort = order; return this; }
    limit(count) { this.options.limit = count; return this; }
    skip(count) { this.options.skip = count; return this; }
    select(selection) { this.options.select = selection; return this; }
    lean() { this.options.lean = true; return this; }
    populate(path, selection) { this.options.populate.push([path, selection]); return this; }

    // Runs the search.
    async exec() {
      if (this.byId !== undefined) {
        if (this.byId === null || this.byId === undefined) return null;
        checkId(this.byId);
      }
      let cursor = mingo.find(matching(this.filter), {});
      if (this.options.sort) cursor = cursor.sort(this.options.sort);
      if (this.options.skip) cursor = cursor.skip(this.options.skip);
      if (this.one) cursor = cursor.limit(1);
      else if (this.options.limit) cursor = cursor.limit(this.options.limit);
      const records = cursor.all().map((r) => project(clone(r), this.options.select));
      this.options.populate.forEach(([path, selection]) => populateRecords(records, path, selection));
      const results = this.options.lean ? records : records.map((r) => Model.hydrate(r));
      return this.one ? results[0] || null : results;
    }

    then(onDone, onFail) { return this.exec().then(onDone, onFail); }
    catch(onFail) { return this.exec().catch(onFail); }
  }

  // One record. Its fields are plain properties: product.name, sale.items...
  class Model {
    constructor(data = {}) {
      Object.defineProperty(this, '$isNew', { value: true, writable: true, enumerable: false });
      Object.assign(this, storable(data));
    }

    // Makes a record object from a saved record (no defaults or new id).
    static hydrate(record) {
      const doc = Object.create(Model.prototype);
      Object.defineProperty(doc, '$isNew', { value: false, writable: true, enumerable: false });
      return Object.assign(doc, record);
    }

    // The id as text.
    get id() {
      return String(this._id);
    }

    // Checks and saves this record (adding it if it is new).
    async save() {
      for (const hook of schema.hooks) await hook.call(this);
      const record = storable(this);
      if (timestamps) record.updatedAt = this.$isNew && this.updatedAt ? new Date(this.updatedAt) : new Date();
      const problems = schema.check(record);
      if (problems.length) throw validationError(name, problems);
      if (this.$isNew && store().get(collection, record._id)) {
        const error = new Error(`E11000 duplicate key error collection: ${collection} index: _id_`);
        error.code = 11000;
        error.keyValue = { _id: record._id };
        throw error;
      }
      checkUnique(record);
      store().put(collection, record);
      for (const key of Object.keys(this)) if (!(key in record) && !(key in fields)) delete this[key];
      Object.assign(this, clone(record));
      for (const key of Object.keys(fields)) if (!(key in record)) delete this[key];
      this.$isNew = false;
      return this;
    }

    // Changes several fields at once: product.set({ name, sellingPrice }),
    // or one: product.set('name', 'Nivea'). Saved with save().
    set(fieldOrValues, value) {
      if (typeof fieldOrValues === 'string') this[fieldOrValues] = value;
      else Object.assign(this, fieldOrValues);
      return this;
    }

    // Fills in a "ref" field on this record, e.g. product.populate('category', 'name').
    async populate(path, selection) {
      populateRecords([this], path, selection);
      return this;
    }

    // A plain copy of the record.
    toObject() {
      return clone({ ...this });
    }

    // What the app receives (secrets removed by the model's toJSON rule).
    toJSON() {
      const plain = this.toObject();
      return schema.jsonTransform ? schema.jsonTransform(this, plain) || plain : plain;
    }

    static find(filter) {
      return new Query(filter);
    }

    static findOne(filter) {
      return new Query(filter, { one: true });
    }

    static findById(id) {
      return new Query(id === undefined || id === null ? { _id: null } : { _id: String(id) }, { one: true, byId: id });
    }

    static async countDocuments(filter = {}) {
      return matching(filter).length;
    }

    static async exists(filter) {
      return matching(filter).length > 0 ? { _id: matching(filter)[0]._id } : null;
    }

    static async create(data) {
      if (Array.isArray(data)) return Promise.all(data.map((item) => Model.create(item)));
      return new Model(data).save();
    }

    static async insertMany(list) {
      return Promise.all(list.map((item) => new Model(item).save()));
    }

    // Changes the first matching record in one step (nothing else can change
    // it in between). options.new = answer with the changed record;
    // options.upsert = add a record if none matches.
    static async findOneAndUpdate(filter, update, options = {}) {
      const [found] = matching(filter);
      let changed;
      if (found) {
        changed = storable(applyUpdate(found, update));
      } else if (options.upsert) {
        changed = storable(applyUpdate(equalityFields(filter), update));
      } else {
        return null;
      }
      if (timestamps) changed.updatedAt = new Date();
      checkUnique(changed);
      store().put(collection, changed);
      return Model.hydrate(clone(options.new || !found ? changed : found));
    }

    static async findByIdAndUpdate(id, update, options = {}) {
      checkId(id);
      return Model.findOneAndUpdate({ _id: String(id) }, update, options);
    }

    static async findByIdAndDelete(id) {
      if (id === undefined || id === null) return null;
      checkId(id);
      const found = store().get(collection, id);
      if (!found) return null;
      store().remove(collection, id);
      return Model.hydrate(clone(found));
    }

    static async updateMany(filter, update) {
      const found = matching(filter);
      for (const record of found) {
        const changed = storable(applyUpdate(record, update));
        if (timestamps) changed.updatedAt = new Date();
        store().put(collection, changed);
      }
      return { acknowledged: true, matchedCount: found.length, modifiedCount: found.length };
    }

    static async deleteMany(filter = {}) {
      const found = matching(filter);
      found.forEach((record) => store().remove(collection, record._id));
      return { acknowledged: true, deletedCount: found.length };
    }

    // Runs a report (a MongoDB-style aggregate pipeline). A first $match step
    // is done before copying, so only the matching records are copied.
    static async aggregate(pipeline) {
      const [first, ...rest] = pipeline;
      const startsWithMatch = first && first.$match;
      const records = (startsWithMatch ? matching(first.$match) : store().all(collection)).map(clone);
      return mingo.aggregate(records, startsWithMatch ? rest : pipeline);
    }
  }

  Object.assign(Model.prototype, schema.methods);
  Object.assign(Model, schema.statics);
  Model.modelName = name;
  Model.collection = collection;
  Model.schema = schema;
  models[name] = Model;
  return Model;
}

module.exports = { model, models };
