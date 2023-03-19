const MAX_RETRIES = 5;
const BASE_DELAY = 1000; // 1 second

async function exponentialBackoff(
  fn,
  retries = MAX_RETRIES,
  delay = BASE_DELAY
) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    return exponentialBackoff(fn, retries - 1, delay * 2);
  }
}

module.exports = {
  exponentialBackoff,
};
