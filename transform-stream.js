const { Readable, Transform } = require("node:stream");

const createTransformStream = (transformFn, limit) => {
  let pBuffer = [];

  const startTransform = (chunk) =>
    // run the transform and push the result into the stream
    transformFn(chunk).then((result) => {
      transform$.push(result);
      return result;
    });

  const transform$ = new Transform({
    async transform(chunk) {
      // if the promise buffer isn't full, start the transform immediately
      if (pBuffer.length < limit) {
        const workPromise = startTransform(chunk);
        pBuffer.push(workPromise);
      } else {
        // if the buffer is full, wait for a promise to resolve
        await Promise.race(pBuffer);
        const workPromise = startTransform(chunk);

        // there's no way for us to tell which promise just resolved, so we'll map over all of them
        let inserted = false;
        pBuffer = pBuffer.map((p) =>
          // for at least one of them this will resolve immediately
          p.then((r) => {
            if (!inserted) {
              inserted = true;
              return workPromise;
            }
            return r;
          })
        );
      }
    },

    async final() {
      // we don't have to worry about writableLength because just having this method changes the stream's behavior
      // and keeps the stream open until the interanl buffer is empty
      await Promise.all(pBuffer); // wait for all work to complete
    },
  });

  return transform$;
};

module.exports = { createTransformStream };
