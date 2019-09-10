
import assert from "assert";
import debug from "debug";
import QUtils from "../src/lib/qwiz-utils";
import QTextUtils from "../src/lib/qwiz-text-utils";
import WebApiClient from "../src/lib/webapi-client-fetch";

describe("qwiz-webapi-client-fetch", function () {
    const DEBUG_NS = "qwiz.utils.web.tests";
    const TEST_TIMEOUT = process.env.TEST_TIMEOUT || 300000;

    it("Can be imported", (done) => {
        assert.ok(WebApiClient);
        assert.equal(typeof WebApiClient, "function");
        done();
    });

    //TODO:
});

