const { promisesToStream } = require("./promises-to-stream");
const { createTransformStream } = require("./transform-stream");

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

const promise$ = promisesToStream(promises).on("end", () =>
  console.log(`promise stream destroyed, time elapsed: ${Date.now() - start}`)
);

const transform$ = createTransformStream(doWork, 2).on("finish", () =>
  console.log("work complete")
);

promise$.pipe(transform$).pipe(process.stdout);
