
import assert from "assert";
import QUtils from "../src/lib/qwiz-utils";

describe("qwiz-utils", function () {
    const TEST_TIMEOUT = process.env.TEST_TIMEOUT || 300000;

    it("Can be imported", (done) => {
        assert.ok(QUtils);
        assert.equal(typeof QUtils, "object");
        done();
    });

    function DummyObj(name) {
        this.name = name || this.name;
    }
    DummyObj.prototype = {
        constructor: DummyObj,
        name: "DummyObj"
    };

    describe("Object Utils", function () {
        it("Can do object shallow iteration: forEachField()", (done) => {
            assert.equal(typeof QUtils.forEachField, "function");

            const expected = 4;
            let nFlds = 0;
            const obj = new DummyObj("obj#1");
            obj.a = 1;
            obj.b = 2;
            obj.c = { ca: 31, cb: 32, cc: "33" };
            let obj2 = new DummyObj("obj#2");
            QUtils.forEachField(obj, (k, v) => {
                obj2[k] = v;
                nFlds++;
            });
            assert.equal(nFlds, expected);
            done();
        }).timeout(TEST_TIMEOUT);

        it("Can get property by path: getPropByPath() (string path case)", (done) => {
            assert.equal(typeof QUtils.forEachField, "function");

            const expected = 777;
            const obj = new DummyObj("obj#1");
            obj.x = { a: { ab: { abc: { abcd: expected } } } };
            let x = QUtils.getPropByPath(obj, "x/a/ab/abc/abcd", { delimiter: "/" });
            assert.equal(x, expected);
            done();
        }).timeout(TEST_TIMEOUT);

        it("Can get property by path: getPropByPath() (array path case)", (done) => {
            assert.equal(typeof QUtils.forEachField, "function");

            const expected = 777;
            const obj = new DummyObj("obj#1");
            obj.x = { a: { ab: { abc: { abcd: expected } } } };
            const path = ["x", "a","ab","abc","abcd"];
            let x = QUtils.getPropByPath(obj, path, { });
            assert.equal(x, expected);
            done();
        }).timeout(TEST_TIMEOUT);

        it("Can set property by path: setPropByPath() (string path case)", (done) => {
            assert.equal(typeof QUtils.setPropByPath, "function");

            const expected = 777;
            const obj = new DummyObj("obj#1");
            obj.x = { a: { ab: { abc: { } } } };
            QUtils.setPropByPath(obj, "x!a!ab!abc!abcd", expected, { delimiter: "!" });
            let x = obj.x.a.ab.abc.abcd;
            assert.equal(x, expected);
            done();
        }).timeout(TEST_TIMEOUT);
        
        it("Can set property by path: setPropByPath() (array path case)", (done) => {
            assert.equal(typeof QUtils.setPropByPath, "function");

            const expected = 777;
            const obj = new DummyObj("obj#1");
            obj.x = { a: { ab: { abc: { } } } };
            const path = ["x","a","ab","abc","abcd"];
            QUtils.setPropByPath(obj, path, expected, { });
            let x = obj.x.a.ab.abc.abcd;
            assert.equal(x, expected);
            done();
        }).timeout(TEST_TIMEOUT);

        it("Can do object deep iteration: walkObject()", (done) => {
            assert.equal(typeof QUtils.walkObject, "function");

            const expected = 11;
            let nFlds = 0;
            const obj = new DummyObj("obj#1");
            obj.a = 1;
            obj.b = 2;
            obj.c = {
                ca: 31, cb: 32, cc: "33",
                cd: [true, false],
                cx: "Should not be here"
            };
            obj.c.cd.push({ _parent: obj.c });
            const obj2 = new DummyObj("obj#2");
            const walkOpts = {
                maxDepth: 4,
                excludesList: ["name", "c.cx"],
                target: obj2
            };
            walkOpts.onBeforeAll = (ctx) => {
                console.log("Test Object structure (BEFORE): ", obj);
            };
            walkOpts.onDefault = (val1, ctx) => {
                //let fullKey = `${ctx.path.join(".")}.${ctx.key}`;
                console.log("Processing: ", `${ctx.fullKey} => `, val1, "; Context: ", ctx);
                assert.notEqual(val1, obj);
                assert.notEqual(ctx.fullKey, "c.cx");
                assert.ok(ctx.depth < walkOpts.maxDepth);
                let val2;
                if (typeof val1 === "number") {
                    val2 = val1 + 1;
                } else if (ctx.isCircularRef) {
                    //Replace with null on circular ref.
                    val2 = null;
                } else if (ctx.isLeaf) {
                    //Let QUtils.walkObject do the target object creation
                    val2 = val1;
                }
                nFlds++;

                return val2;
            };
            walkOpts.onAfterAll = (ctx) => {
                console.log("Test Object structure (AFTER): ", ctx.target);
            };
            QUtils.walkObject(obj, walkOpts);
            assert.equal(nFlds, expected);
            assert.equal(obj2.a, obj.a + 1);
            assert.equal(obj2.c.cd.length, 3);
            assert.equal(obj2.c.cd[2]._parent, null);
            assert.equal(typeof obj2.c.cx, "undefined");

            done();
        }).timeout(TEST_TIMEOUT);

        it("Can do object merge: merge() (shallow case)", (done) => {
            assert.equal(typeof QUtils.merge, "function");

            //const expected = 7;
            //let nFlds = 0;
            const obj = new DummyObj("obj#1");
            const obj2 = new DummyObj("obj#2");
            obj.a = 1;
            obj2.b = 2;
            obj.c = { ca: 31, cb: 32, cc: "33", cd: [true, false] };
            obj.c.cd.push(obj.c);
            obj2.c = { cd: [341, 342, 343] };
            console.log("Test Object structure (BEFORE): ", obj);
            let mergeOpts = {
                excludesList: ["name"]
                //deep: false
            };
            QUtils.merge(obj2, obj, mergeOpts);
            console.log("Test Object structure (AFTER): ", obj2);
            //assert.equal(nFlds, expected);
            assert.equal(obj2.c, obj.c);
            assert.equal(obj2.c.cd, obj.c.cd);

            done();
        }).timeout(TEST_TIMEOUT);

        it("Can do object merge: merge() (deep case)", (done) => {
            assert.equal(typeof QUtils.merge, "function");

            //let expected = 7;
            //let nFlds = 0;
            const obj = new DummyObj("obj#1");
            const obj2 = new DummyObj("obj#2");
            obj.a = 1;
            obj2.b = 2;
            obj.c = { ca: 31, cb: 32, cc: "33", cd: [true, false] };
            obj.c.cd.push(obj.c);
            obj2.c = { cd: ["FromObject2"] };
            console.log("Test Object structure (BEFORE): ", obj);
            let mergeOpts = {
                excludesList: ["name"],
                deep: true
            };
            QUtils.merge(obj2, obj, mergeOpts);
            console.log("Test Object structure (AFTER): ", obj2);
            //assert.equal(nFlds, expected);
            assert.equal(obj2.a, obj.a);
            assert.notEqual(obj2.c, obj.c);
            assert.notEqual(obj2.c.cd, obj.c.cd);
            assert.equal(obj2.c.cd[3], obj2.c);
            assert.equal(obj2.c.cd[0], "FromObject2");
            done();
        }).timeout(TEST_TIMEOUT);

        it("Can do object deep clone: clone()", (done) => {
            assert.equal(typeof QUtils.clone, "function");

            //let expected = 7;
            //let nFlds = 0;
            const obj = new DummyObj("obj#1");
            obj.a = 1;
            obj.b = 2;
            obj.c = { ca: 31, cb: 32, cc: "33", cd: [true, false] };
            obj.c.cd.push(obj.c);
            obj.c.cd.push(new Date());
            console.log("Test Object structure (BEFORE): ", obj);
            let mergeOpts = {
                excludesList: ["name"],
                deep: true
            };
            const obj2 = QUtils.clone(obj, mergeOpts);
            console.log("Test Object structure (AFTER): ", obj2);
            //assert.equal(nFlds, expected);
            assert.equal(obj2.a, obj.a);
            assert.notEqual(obj2.c, obj.c);
            assert.notEqual(obj2.c.cd, obj.c.cd);
            assert.equal(obj2.c.cd.length, obj.c.cd.length);
            assert.equal(obj2.c.cd[2], obj2.c);
            assert.notEqual(obj2.c.cd[3], obj.c.cd[3]);
            done();
        }).timeout(TEST_TIMEOUT);
    });
    
    describe("Class Utils", function () {
        function A(props) {
            A._super.call(this, "A");
            (props) && QUtils.merge(this, props);
        }
        function B(props) {
            B._super.call(this, props);
        }
        function C(props) {
            C._super.call(this, props);
        }
        function BX(props) {
            this.constructor._super.call(this, props);
            this.isBx = true;
        }
        BX.prototype = {
            constructor: BX,
            
            getB: function () {
                return this.b;
            }
        };


        it("Can do class extension: extendClass()", (done) => {
            assert.equal(typeof QUtils.extendClass, "function");

            const aSig = "DummyObj:A";
            const bSig = "DummyObj:A:B";
            QUtils.extendClass(DummyObj, { constructor: A, a: 1 }, { signature: aSig });
            QUtils.extendClass(A, { constructor: B, b: 2 }, { signature: bSig });
            QUtils.extendClass(B, { constructor: C, c: 3 }, { });
            assert.ok(C.prototype instanceof B);
            assert.ok(B.prototype instanceof A);
            assert.ok(A.prototype instanceof DummyObj);
            assert.equal(A.signature, aSig);
            assert.equal(B.signature, bSig);
            assert.notEqual(C.signature, bSig);
            let c = new C({ c: 333 });
            assert.equal(c.name, "A");
            assert.equal(c.c, 333);
            done();
        }).timeout(TEST_TIMEOUT);

        it("Can do class extension: attachExtension()", (done) => {
            assert.equal(typeof QUtils.attachExtension, "function");

            const bFld = 22;
            QUtils.attachExtension(B, BX);
            assert.equal(BX.prototype.constructor, BX);
            assert.notEqual(B.constructor, BX);
            const b = new B({ b: bFld });
            assert.ok(!b.isBx);
            assert.equal(b.b, bFld);
            assert.equal(typeof b.getB, "function");
            assert.equal(b.getB(), bFld);
            done();
        }).timeout(TEST_TIMEOUT);

        it("Can do class to factory mapping: makeFactory()", (done) => {
            assert.equal(typeof QUtils.makeFactory, "function");

            const bProto = B.prototype;
            const bSig = B.signature;
            const bFld = B.prototype.b;
            const bbFld = "22";
            const BFac = QUtils.makeFactory(B);
            assert.equal(B.prototype, bProto);
            assert.equal(BFac.prototype, bProto);
            assert.equal(B.signature, bSig);
            assert.equal(BFac.signature, bSig);
            const b = BFac({ bb: bbFld });
            assert.ok(b instanceof B);
            assert.equal(b.b, bFld);
            assert.equal(b.bb, bbFld);
            done();
        }).timeout(TEST_TIMEOUT);
    });
});

