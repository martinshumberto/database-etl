const coalesce = (...args) => {
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== null && args[i] !== undefined) {
      return args[i];
    }
  }
  return null;
};

const isNull = (val, defaultValue) => {
  return val === null || val === undefined ? defaultValue : val;
};

function getDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const millisecond = now.getMilliseconds();
  return `${year}-${month}-${day} ${hour}:${minute}:${second}.${millisecond}`;
}

module.exports = {
  coalesce,
  isNull,
  getDate,
};
