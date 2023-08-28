const { Readable } = require("node:stream");
const promisesToStream = (promises) => {
  const readStream = new Readable({
    read() {},
    destroy() {},
  });
  promises.forEach((promise) => {
    // each promise pushes its results into the stream when it resolves
    promise.then((result) => readStream.push(result));
  });

  // when all promises have resolved, push null to signal the end of the stream
  Promise.all(promises).then(() => readStream.push(null));

  return readStream;
};

module.exports = { promisesToStream };
