"use strict";

import assert from "assert";
import debug from "debug";
import qwiz from "../src/index";
const qwiz_node = require("../src/index.node");

describe("qwiz-pkg", function () {
    const DEBUG_NS = "qwiz";
    const TEST_TIMEOUT = process.env.TEST_TIMEOUT || 300000;

    it("Can be imported", (done) => {
        for (let pkg of [ qwiz, qwiz_node]) {
            assert.ok(pkg);
            assert.ok(pkg.utils);
            assert.ok(pkg.utils.text);
            assert.ok(pkg.utils.datetime);
            assert.ok(pkg.web);
        }
        done();
    });
});

