const { Readable, Transform } = require("node:stream");

const makeRequest = (msg, wait) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(msg);
    }, wait);
  });

const start = Date.now();
const doWork = (msg) =>
  makeRequest("", 1000).then(
    () => `msg: ${msg}, wait: ${Date.now() - start}\n`
  );

const promises = [
  makeRequest("1st promise", 1000),
  makeRequest("2nd promise", 1500),
  makeRequest("3rd promise", 2000),
];

const promisesToStream = (promises) => {
  const readStream = new Readable({
    read() {},
    destroy() {
      console.log(
        `promise stream destroyed, time elapsed: ${Date.now() - start}`
      );
    },
  });
  promises.forEach((promise) => {
    // each promise pushes its results into the stream when it resolves
    promise.then((result) => readStream.push(result));
  });

  // when all promises have resolved, push null to signal the end of the stream
  Promise.all(promises).then(() => readStream.push(null));

  return readStream;
};

const createTransformStream = (transformFn, limit) => {
  let pBuffer = [];

  const startTransform = (chunk) =>
    transformFn(chunk).then((result) => {
      transform$.push(result);
      return result;
    });

  const transform$ = new Transform({
    async transform(chunk) {
      if (pBuffer.length < limit) {
        const workPromise = startTransform(chunk);
        pBuffer.push(workPromise);
      } else {
        await Promise.race(pBuffer);
        const workPromise = startTransform(chunk);

        let inserted = false;
        pBuffer = pBuffer.map((p) =>
          p.then(() => {
            if (!inserted) {
              inserted = true;
              return workPromise;
            }
            return null;
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

const doWork$ = createTransformStream(doWork, 2);

const promises$ = promisesToStream(promises);

promises$
  .pipe(doWork$)
  .on("finish", () => console.log("work complete"))
  .pipe(process.stdout);
