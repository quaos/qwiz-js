"use strict";

import assert from "assert";
import debug from "debug";
import QUtils from "../src/lib/qwiz-utils";
import QTextUtils from "../src/lib/qwiz-text-utils";

describe("qwiz-text-utils", function () {
    const DEBUG_NS = "qwiz.utils.tests";
    const TEST_TIMEOUT = process.env.TEST_TIMEOUT || 300000;

    it("Can be imported", (done) => {
        assert.ok(QTextUtils);
        assert.equal(typeof QTextUtils, "object");
        done();
    });

    it("Can check null or empty string: isNullOrEmpty()", (done) => {
        assert.equal(typeof QTextUtils.isNullOrEmpty, "function");

        const subCases = [
            { expected: true },
            { s: null, expected: true },
            { s: "", expected: true },
            { s: " ", expected: false },
            { s: 0, expected: false },
            { s: "0", expected: false },
            { s: "xyz", expected: false },
            { s: false, expected: false }
        ];
        let lastErr = null;
        subCases.forEach((subCase) => {
            if (lastErr) {
                return false;
            }
            let res = QTextUtils.isNullOrEmpty(subCase.s);
            debug(DEBUG_NS)(`${subCase.s} => ${res} <=> ${subCase.expected} (expected)`);
            try {
                assert.equal(res, subCase.expected);
            } catch (err) {
                lastErr = err;
            }
        });
        done(lastErr);
    }).timeout(TEST_TIMEOUT);

    it("Can do template rendering: renderTemplate()", (done) => {
        assert.equal(typeof QTextUtils.renderTemplate, "function");

        const tmpl = "Little ${name} has ${pet.count} ${pet.size} ${pet.type}";
        const vars = {
            name: "Mary",
            pet: {
                type: "lambs",
                size: "little",
                count: 2
            }
        };
        const expected = `Little ${vars.name} has ${vars.pet.count} ${vars.pet.size} ${vars.pet.type}`;
        let s = QTextUtils.renderTemplate(tmpl, vars);
        assert.equal(s, expected);
        done();
    }).timeout(TEST_TIMEOUT);

    it("Can do template parsing: parseTextFields()", (done) => {
        assert.equal(typeof QTextUtils.parseTextFields, "function");

        const pattern = "${address}, ${city}, ${province} ${postcode} ${country}##";
        const text = "9/99 The Rainbow St., Dummy, Bangkok 10999 TH##";
        const expected = {
            address: "9/99 The Rainbow St.",
            city: "Dummy",
            province: "Bangkok",
            postcode: "10999",
            country: "TH"
        };
        let flds = QTextUtils.parseTextFields(text, pattern, { });
        assert.ok(flds);
        assert.equal(flds.address, expected.address);
        assert.equal(flds.city, expected.city);
        assert.equal(flds.province, expected.province);
        assert.equal(flds.postcode, expected.postcode);
        assert.equal(flds.country, expected.country);
        done();
    }).timeout(TEST_TIMEOUT);

    it("Can do JSON serializing: safeSerializeJSON()", (done) => {
        assert.equal(typeof QTextUtils.safeSerializeJSON, "function");

        const obj1 = {
            a: 1,
            b: 2,
            c: {
                ca: "11",
                cb: "12",
                cc: null,
                cd: [ null ]
            }
        };
        const expected = JSON.stringify(obj1);
        //const obj2 = QUtils.clone(obj1);
        obj1.c.cc = obj1.c;
        obj1.c.cd[0] = obj1.c;
        let s = QTextUtils.safeSerializeJSON(obj1, { });
        assert.equal(s, expected);
        done();
    }).timeout(TEST_TIMEOUT);
    
    it("Can build URL: getURL()", (done) => {
        assert.equal(typeof QTextUtils.getURL, "function");

        const baseURL = "~";
        const path = ["assets", "js", "main.bundle.js"];
        const query = {
            x: 123,
            y: true,
            z: "$#@.!/="
        };
        const expected = `${baseURL}/${path.join("/")}?x=${query.x}&y=${query.y}&z=${encodeURIComponent(query.z)}`;
        let url = QTextUtils.getURL(baseURL, path, query);
        assert.equal(url, expected);
        done();
    }).timeout(TEST_TIMEOUT);

    it("Can pase query from URL: getQuery()", (done) => {
        assert.equal(typeof QTextUtils.getURL, "function");

        const expected = {
            a: 1,
            b: 2,
            c: "$#@.!/="
        };
        const qStr = `a=${expected.a}&b=${expected.b}&c=${encodeURIComponent(expected.c)}`;
        let query = QTextUtils.getQuery(qStr);
        assert.ok(query);
        assert.equal(query.a, expected.a);
        assert.equal(query.b, expected.b);
        assert.equal(query.c, expected.c);
        done();
    }).timeout(TEST_TIMEOUT);

});

