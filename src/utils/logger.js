const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LEVELS.DEBUG;

function fmt(level, msg, extra) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level}] ${msg}`;
  return extra !== undefined ? `${base} ${JSON.stringify(extra)}` : base;
}

const logger = {
  debug: (msg, extra) => currentLevel <= LEVELS.DEBUG && console.log(fmt('DEBUG', msg, extra)),
  info:  (msg, extra) => currentLevel <= LEVELS.INFO  && console.log(fmt('INFO',  msg, extra)),
  warn:  (msg, extra) => currentLevel <= LEVELS.WARN  && console.warn(fmt('WARN',  msg, extra)),
  error: (msg, extra) => currentLevel <= LEVELS.ERROR && console.error(fmt('ERROR', msg, extra)),
};

module.exports = logger;
