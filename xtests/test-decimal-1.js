
const util = require("util");
const QMathUtils = require("../src/lib/qwiz-math-utils");

const x = 1000+1/3;
const y = new QMathUtils.Decimal(x, 6, { chunkSize: 3 });
console.log(`x: ${x} => y: ${util.inspect(y, { depth: 4 })} => ${y.format({ commas: true })}`);

const z1 = y.sub(8/3);
console.log(`z1: ${util.inspect(z1, { depth: 4 })} => ${z1.format({ commas: true })}`);

const z2 = z1.mul(0.007);
console.log(`z2: ${util.inspect(z2, { depth: 4 })} => ${z2.format({ commas: true })}`);

const z3 = z2.add(10000);
console.log(`z3: ${util.inspect(z3, { depth: 4 })} => ${z3.format({ commas: true })}`);

const z4 = z3.divWithMod(2000);
console.log(`z4: ${util.inspect(z4, { depth: 4 })} => ${z4[0].format({ commas: true })}; Mod: ${z4[1].format({ commas: true })} `);

process.exit(0);
