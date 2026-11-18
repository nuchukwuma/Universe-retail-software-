// Just enough of Express for the server's routes to run in a web page.
// A router keeps a list of layers; dispatch() runs the first match like
// Express does (middleware from router.use runs first, in order).

function compile(pattern) {
  const keys = [];
  const source = pattern
    .replace(/\/$/, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
  return { regex: new RegExp(`^${source}/?$`), keys };
}

function prefixMatch(prefix, path) {
  if (prefix === '/' || prefix === '') return '';
  return path === prefix || path.startsWith(`${prefix}/`) ? prefix : null;
}

// Runs handlers in turn while each calls next(). Answers true if the last
// one called next() (so the router should keep looking).
async function runHandlers(handlers, req, res, path) {
  for (const handler of handlers) {
    if (res.finished) return false;
    if (handler && typeof handler.dispatch === 'function') {
      const answered = await handler.dispatch(req, res, path);
      if (answered) return false;
      continue;
    }
    let calledNext = false;
    let nextError = null;
    await handler(req, res, (error) => {
      calledNext = true;
      nextError = error || null;
    });
    if (nextError) throw nextError;
    if (!calledNext) return false;
  }
  return true;
}

function Router() {
  const stack = [];
  const router = {
    stack,
    use(...args) {
      const prefix = typeof args[0] === 'string' ? args.shift() : '/';
      stack.push({ kind: 'use', prefix, handlers: args });
      return router;
    },
  };
  ['get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
    router[method] = (path, ...handlers) => {
      stack.push({ kind: 'route', method: method.toUpperCase(), matcher: compile(path), handlers });
      return router;
    };
  });

  // Runs the request through this router. Answers true if something answered.
  router.dispatch = async (req, res, path) => {
    for (const layer of stack) {
      if (res.finished) return true;
      if (layer.kind === 'use') {
        const matched = prefixMatch(layer.prefix, path);
        if (matched === null) continue;
        const rest = path.slice(matched.length) || '/';
        const goOn = await runHandlers(layer.handlers, req, res, rest);
        if (!goOn) return true;
      } else {
        if (layer.method !== req.method) continue;
        const match = layer.matcher.regex.exec(path);
        if (!match) continue;
        req.params = {};
        layer.matcher.keys.forEach((key, i) => {
          req.params[key] = decodeURIComponent(match[i + 1]);
        });
        await runHandlers(layer.handlers, req, res, path);
        return true;
      }
    }
    return res.finished;
  };
  return router;
}

function express() {
  throw new Error('The demo builds its own app; express() is not available.');
}
express.Router = Router;
express.json = () => (req, res, next) => next();

module.exports = express;
module.exports.Router = Router;
