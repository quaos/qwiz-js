
import assert from "assert";
import debug from "debug";
import QUtils from "../src/lib/qwiz-utils";
import QTextUtils from "../src/lib/qwiz-text-utils";
import QWebLibs from "../src/lib/webview-libs";

describe("qwiz-webview-libs", function () {
    const DEBUG_NS = "qwiz.utils.web.tests";
    const TEST_TIMEOUT = process.env.TEST_TIMEOUT || 300000;

    it("Can be imported", (done) => {
        assert.ok(QWebLibs);
        assert.equal(typeof QWebLibs, "object");
        done();
    });

    //TODO:
});

