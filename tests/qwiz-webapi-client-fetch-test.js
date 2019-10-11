
import assert from "assert";
import debug from "debug";
import QUtils from "../src/lib/qwiz-utils";
import QTextUtils from "../src/lib/qwiz-text-utils";
import WebApiClient from "../src/lib/webapi-client";
import WebApiClientImpl_Fetch from "../src/lib/webapi-client-fetch";

describe("qwiz-webapi-client-fetch", function () {
    const DEBUG_NS = "qwiz.utils.web.tests";
    const TEST_TIMEOUT = process.env.TEST_TIMEOUT || 300000;

    it("Can be imported", (done) => {
        assert.ok(WebApiClient);
        assert.ok(WebApiClientImpl_Fetch);
        assert.equal(typeof WebApiClient, "function");
        assert.equal(typeof WebApiClientImpl_Fetch, "function");
        done();
    }).timeout(TEST_TIMEOUT);

    const clientOpts = {
        baseURL: "http://localhost:8080/api/"
    };
    let clientImpl;
    it("Can be created by interface getInstance()", (done) => {
        clientImpl = WebApiClient.getInstance(clientOpts);
        assert.ok(clientImpl);
        assert.ok(clientImpl instanceof WebApiClientImpl_Fetch);
        assert.equal(typeof clientImpl.callAPI, "function");
        done();
    }).timeout(TEST_TIMEOUT);

    /*
    it("Can use login()", () => {
        const credentials = {
            username: "test",
            password: "1111"
        };
        assert.equal(typeof clientImpl.login, "function");

        return clientImpl.login(credentials);
    }).timeout(TEST_TIMEOUT);
    
    it("Can use callAPI()", () => {
        assert.equal(typeof clientImpl.callAPI, "function");
        return clientImpl.callAPI(WebApiClient.GET, "", {});
    }).timeout(TEST_TIMEOUT);

    
    it("Can logout", () => {
        assert.equal(typeof clientImpl.logout, "function");
        return clientImpl.logout();
    }).timeout(TEST_TIMEOUT);
    */
});

