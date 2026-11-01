// Describes the fields of one kind of record (a product, a sale...): their
// types, defaults and rules. Written like Mongoose schemas, which this app
// used before, so the model files read the same.
//
//   new Schema({ name: { type: String, required: true, trim: true } }, { timestamps: true })
//
// Field options used in this app: type, required, default, enum, min, max,
// trim, lowercase, unique, sparse, ref.
const { isValidId } = require('./ids');
const { clone } = require('./ejson');

const Types = { ObjectId: 'ObjectId', Mixed: 'Mixed' };
const TYPE_NAMES = new Map([[String, 'String'], [Number, 'Number'], [Boolean, 'Boolean'], [Date, 'Date'], [Types.ObjectId, 'ObjectId'], [Types.Mixed, 'Mixed'], [Object, 'Mixed']]);

// An error about one field ("Product name is required.").
function fieldProblem(path, message, kind) {
  return { path, message, kind };
}

// A "CastError": a value that cannot be turned into the field's type.
function castError(path, type, value) {
  const error = new Error(`Cast to ${type} failed for value "${value}" at path "${path}"`);
  error.name = 'CastError';
  error.path = path;
  error.kind = type;
  return error;
}

// Reads the message from a rule written as [value, 'message'] or value.
function rule(option) {
  return Array.isArray(option) ? { value: option[0], message: option[1] } : { value: option, message: null };
}

class Schema {
  constructor(definition, options = {}) {
    this.fields = {};
    for (const [name, spec] of Object.entries(definition)) this.fields[name] = Schema.field(spec);
    this.options = options;
    this.methods = {};
    this.statics = {};
    this.hooks = [];
    this.jsonTransform = null;
  }

  // Turns one field description into { type, ...options }.
  static field(spec) {
    if (spec instanceof Schema) return { type: 'Object', schema: spec };
    if (Array.isArray(spec)) {
      const inner = spec[0];
      return { type: 'Array', of: inner instanceof Schema ? { type: 'Object', schema: inner } : Schema.field(inner === undefined ? Types.Mixed : inner) };
    }
    if (TYPE_NAMES.has(spec)) return { type: TYPE_NAMES.get(spec) };
    if (spec && typeof spec === 'object' && 'type' in spec) {
      const field = Schema.field(spec.type);
      return { ...spec, ...field, type: field.type };
    }
    return { type: 'Mixed' };
  }

  // Runs "fn" (with "this" = the record) before a record is checked and saved.
  pre(event, fn) {
    if (event === 'validate' || event === 'save') this.hooks.push(fn);
  }

  // set('toJSON', { transform }) changes what a record looks like when sent to the app.
  set(option, value) {
    if (option === 'toJSON') this.jsonTransform = value.transform;
  }

  // Indexes were a MongoDB speed-up; records are searched in memory now.
  index() {}

  // Turns a value into the field's type. Throws a CastError if it cannot.
  static castValue(field, value, path) {
    if (value === undefined || value === null) return value;
    switch (field.type) {
      case 'String': {
        if (typeof value === 'object' && !(value instanceof Date)) throw castError(path, 'String', value);
        let text = String(value);
        if (field.trim) text = text.trim();
        if (field.lowercase) text = text.toLowerCase();
        return text;
      }
      case 'Number': {
        if (value === '') return null;
        const number = typeof value === 'number' ? value : Number(value);
        if (Number.isNaN(number) || typeof value === 'boolean' || (typeof value === 'object' && value !== null)) throw castError(path, 'Number', value);
        return number;
      }
      case 'Boolean':
        if (value === true || value === 'true' || value === 1 || value === '1') return true;
        if (value === false || value === 'false' || value === 0 || value === '0') return false;
        throw castError(path, 'Boolean', value);
      case 'Date': {
        const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
        if (Number.isNaN(date.getTime())) throw castError(path, 'Date', value);
        return date;
      }
      case 'ObjectId': {
        const id = typeof value === 'object' && value._id !== undefined ? value._id : value; // a filled-in (populated) record
        if (!isValidId(String(id))) throw castError(path, 'ObjectId', id);
        return String(id);
      }
      case 'Array': {
        if (!Array.isArray(value)) throw castError(path, 'Array', value);
        return value.map((item, index) => Schema.castValue(field.of, item, `${path}.${index}`));
      }
      case 'Object':
        if (typeof value !== 'object') throw castError(path, 'Object', value);
        return field.schema.cast(value, path);
      default:
        return clone(value); // Mixed: kept exactly as given
    }
  }

  // The default value for a field (undefined if it has none).
  static defaultFor(field) {
    if (field.type === 'Array' && !('default' in field)) return [];
    if (!('default' in field)) return undefined;
    return typeof field.default === 'function' ? field.default() : clone(field.default);
  }

  // Builds a record from "data": every known field cast to its type, with
  // defaults filled in. Unknown fields are left out (like Mongoose).
  cast(data, prefix = '') {
    const record = {};
    for (const [name, field] of Object.entries(this.fields)) {
      let value = data[name];
      if (value === undefined) value = Schema.defaultFor(field);
      const cast = Schema.castValue(field, value, prefix ? `${prefix}.${name}` : name);
      if (cast !== undefined) record[name] = cast;
    }
    return record;
  }

  // Checks the rules (required, enum, min, max). Returns a list of problems.
  check(record, prefix = '') {
    const problems = [];
    for (const [name, field] of Object.entries(this.fields)) {
      const path = prefix ? `${prefix}.${name}` : name;
      const value = record[name];
      if (field.required) {
        const { value: needed, message } = rule(field.required);
        const missing = value === undefined || value === null || (field.type === 'String' && value === '');
        if (needed && missing) {
          problems.push(fieldProblem(path, message || `Path \`${path}\` is required.`, 'required'));
          continue;
        }
      }
      if (value === undefined || value === null) continue;
      if (field.enum && !field.enum.includes(value)) {
        problems.push(fieldProblem(path, `\`${value}\` is not a valid enum value for path \`${path}\`.`, 'enum'));
      }
      if (field.min !== undefined && typeof value === 'number') {
        const { value: min, message } = rule(field.min);
        if (value < min) problems.push(fieldProblem(path, message || `Path \`${path}\` (${value}) is less than minimum allowed value (${min}).`, 'min'));
      }
      if (field.max !== undefined && typeof value === 'number') {
        const { value: max, message } = rule(field.max);
        if (value > max) problems.push(fieldProblem(path, message || `Path \`${path}\` (${value}) is more than maximum allowed value (${max}).`, 'max'));
      }
      if (field.type === 'Object') problems.push(...field.schema.check(value, path));
      if (field.type === 'Array' && field.of.type === 'Object') {
        value.forEach((item, index) => problems.push(...field.of.schema.check(item, `${path}.${index}`)));
      }
    }
    return problems;
  }

  // The fields that must be unique: [{ name, sparse }].
  uniqueFields() {
    return Object.entries(this.fields)
      .filter(([, field]) => field.unique)
      .map(([name, field]) => ({ name, sparse: Boolean(field.sparse) }));
  }
}

Schema.Types = Types;

// The error thrown when a record breaks a rule; the app shows the first message.
function validationError(modelName, problems) {
  const error = new Error(`${modelName} validation failed: ${problems.map((p) => `${p.path}: ${p.message}`).join(', ')}`);
  error.name = 'ValidationError';
  error.errors = Object.fromEntries(problems.map((p) => [p.path, p]));
  return error;
}

module.exports = { Schema, validationError, castError };
