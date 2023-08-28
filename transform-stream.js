const { Readable, Transform } = require("node:stream");

/** apply async transform function to stream */
const createTransformStream = (transformFn, limit) => {
  const pBuffer = [];
  let initialIndex = 0;

  const startTransform = (chunk) =>
    // run the transform and push the result into the stream
    transformFn(chunk).then((result) => {
      transform$.push(result);
      return result;
    });

  const transform$ = new Transform({
    async transform(chunk, encoding, callback) {
      // if the promise buffer isn't full, start the transform immediately
      if (pBuffer.length < limit) {
        const transformPromise = startTransform(chunk);
        // resolving with the index helps us update the buffer
        pBuffer.push(transformPromise.then(() => initialIndex));
        initialIndex++;
      } else {
        // if the buffer is full, wait for a promise to resolve
        const insertIndex = await Promise.race(pBuffer);
        const transformPromise = startTransform(chunk);

        // replace the promise that just resolved
        pBuffer[insertIndex] = transformPromise.then(() => insertIndex);
      }
      callback();
    },

    async final(callback) {
      // we don't have to worry about writableLength because just having this method changes the stream's behavior
      // and keeps the stream open until the interanl buffer is empty
      await Promise.all(pBuffer); // wait for all work to complete
      callback();
    },
  });

  return transform$;
};

module.exports = { createTransformStream };
