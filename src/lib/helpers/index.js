/**
 *
 * @name exponentialBackoff
 * @param {string} fn - The function to be executed
 * @param {number} retries - The number of times to retry
 * @param {number} delay - The delay in milliseconds
 * @returns {Promise}
 * @description - This function will retry a function a number of times with an
 * exponential backoff
 *
 */

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

/**
 *
 * @name htmlToPlainText
 * @param {string} html - The html string to be converted
 * @returns {string}
 *
 */

const htmlToPlainText = (html) => {
  return html
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<p\s*\/?>/g, "\n\n")
    .replace(/<[^>]+>/g, "");
};

/**
 *
 * @name extractValidJsonFromString
 * @param {string} str - The string to be parsed
 * @returns {object}
 * @description
 * - Find the first opening ({ or [) and last closing (} or ]) brace in your string.
 * - Try to parse that block of text (including the braces) using JSON.parse(). If
 * it succeeded, finish and return the parsed result.
 * - Take the previous closing brace and try parsing that string. If it succeeds, you
 * are done again.
 * - Repeat this until you got no brace or one that comes before the current opening brace.
 * - Find the first opening brace after the one from step 1. If you did not find any, the
 * string did not contain a JSON object/array and you can stop.
 * - Go to step 2.
 *
 */

const extractValidJsonFromString = (str) => {
  let firstOpen, firstClose, candidate;
  firstOpen = str.indexOf("{", firstOpen + 1);
  do {
    firstClose = str.lastIndexOf("}");
    if (firstClose <= firstOpen) {
      return null;
    }
    do {
      candidate = str.substring(firstOpen, firstClose + 1);
      try {
        const res = JSON.parse(candidate);
        // console.log('...found');
        return res;
      } catch (e) {
        // console.log('...failed');
      }
      firstClose = str.substr(0, firstClose).lastIndexOf("}");
    } while (firstClose > firstOpen);
    firstOpen = str.indexOf("{", firstOpen + 1);
  } while (firstOpen !== -1);
};

/**
 *
 * @name isHTML
 * @param {string} str - The string to be checked
 * @returns {boolean}
 * @description - This function will check if a string contains HTML code
 *
 */

const isHTML = (str) => {
  const htmlRegex = /<[a-z][\s\S]*>/i;
  return htmlRegex.test(str);
};

module.exports = {
  htmlToPlainText,
  exponentialBackoff,
  extractValidJsonFromString,
  isHTML,
};
