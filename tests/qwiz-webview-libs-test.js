
import assert from "assert";
import debug from "debug";
import events from "events";
import { JSDOM } from "jsdom";
import QUtils from "../src/lib/qwiz-utils";
import QTextUtils from "../src/lib/qwiz-text-utils";
import QWebLibs from "../src/lib/webview-libs";

describe("qwiz-webview-libs", function () {
    const DEBUG_NS = "qwiz.utils.web.tests";
    const TEST_TIMEOUT = process.env.TEST_TIMEOUT || 30000;

    it("Can be imported", (done) => {
        assert.ok(QWebLibs);
        assert.equal(typeof QWebLibs, "object");
        done();
    });


    describe("qwiz.web.WebView", function () {
        const testDOM = new JSDOM('<html><head></head><body><section class="main-container"></section></body></html>');
        const win = testDOM.window;
        const doc = win.document;
        //TODO: Revise this later
        global.Window = win.constructor;
        global.Document = doc.constructor;
        global.Node = doc.constructor.prototype.__proto__.constructor;
        global.DocumentFragment = doc.createDocumentFragment().constructor;
        global.Element = doc.createElement("div").constructor;
        global.TextNode = doc.createTextNode("&nbsp;").constructor;
        //global.CDATASection = doc.createCDATASection("&nbsp;").constructor;
        global.NodeList = doc.querySelectorAll("section").constructor;
        global.HTMLCollection = doc.children.constructor;

        let view;
        
        it("Can be intialized in DOM", () => {
            assert.equal(typeof QWebLibs.WebView, "function");
            view = new QWebLibs.WebView({
                document: doc,
                window: win
            });
            const domEvt = /*doc.create*/ new win.Event("DOMContentLoaded", {
                source: doc,
                target: doc,
                currentTarget: doc
            });
            const prom = view.init(domEvt); //.initOnReady();
            /*doc.dispatchEvent();*/

            return prom
                .then((results) => {
                    assert.ok(view.window);
                    assert.ok(view.document);
                    assert.ok(view.comps.mainContainer);
                    return Promise.resolve(results);
                });
        }).timeout(TEST_TIMEOUT);
    });

    //TODO:
});

