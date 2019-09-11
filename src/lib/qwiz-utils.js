"use strict";

const debug = require("debug");

//Global namespaces
var window = window || (function _DummyWindow() {
    function _DummyNode(tagName) {
        this.tagName = tagName;
    }
    _DummyNode.prototype = { constructor: _DummyNode }
    function _DummyDocument() {
    }
    _DummyDocument.prototype = {
        constructor: _DummyDocument,
        createElement: function (tagName) {
            return new _DummyNode(tagName);
        }
    };

    return {
        Node: _DummyNode,
        HTMLDocument: _DummyDocument,
        Window: _DummyWindow
    };
})();
var global = global || window;

module.exports = (function(_namespace) {
    const QUtils = {};
    const DEBUG_NS = "qwiz.utils";

    //Base util functions
    /**
     * forEachField: Simple iteration over object fields
     * @param {Object} obj
     * @param {Function<String, *>} callback
     * @param {Object} opts 
     */
    function forEachField (obj, callback, opts) {
        opts = opts || {};
        const protoLimit = opts.prototypeLimit || Object.prototype;
        const inclSet = new Set(opts.includesList);
        let exclList = [ "constructor", "__prototype__", "_class", "_super" ];
        (opts.excludesList) && (exclList = exclList.concat(opts.excludesList));
        const exclSet = new Set(exclList);

        function _next(k, v) {
            return callback(k, v);
        }
        if (Array.isArray(obj)) {
            let n = obj.length;
            for (let i = 0;i < n;i++) {
                let proceed = _next(i, obj[i]);
                if ((typeof proceed !== "undefined") && (!proceed)) {
                    break;
                }
            }
        } else {
            for (let key in obj) {
                if (exclSet.has(key)) {
                    continue;
                }
                if ((!Object.prototype.hasOwnProperty.call(obj, key)) && (!inclSet.has(key))) {
                    let foundInLimit = false;
                    let objProto = obj.__prototype__ || obj.constructor.prototype;
                    while ((objProto) && (typeof objProto === "object")) {
                        if (objProto === protoLimit) {
                            break;
                        }
                        if (Object.prototype.hasOwnProperty.call(objProto, key)) {
                            foundInLimit = true;
                            break;
                        }
                        objProto = objProto.__prototype__ || objProto.constructor.prototype;
                    }
                    if (!foundInLimit) {
                        continue;
                    }
                }
                let proceed = _next(key, obj[key]);
                if ((typeof proceed !== "undefined") && (!proceed)) {
                    break;
                }
            }
        }

        return this;
    }

    /**
     * Get object property by path
     * @param {Object} obj
     * @param {String|Array} path
     */
    function getPropByPath(obj, path, opts) {
        opts = opts || {};
        const delim = opts.delimiter || getPropByPath.DEFAULT_DELIMITER;
        if (!Array.isArray(path)) {
            path = `${path}`.split(delim);
        }
        let prop = obj;
        let n = path.length;
        for (let i = 0;i < n;i++) {
            let key = path[i];
            let valid = (key) || (key === 0);
            valid = valid && (typeof prop !== "undefined") && (prop !== null);
            if (!valid) {
                if (i + 1 < n) {
                    prop = undefined;
                }
                break;
            }
            prop = prop[key];
        }

        return prop;
    }
    getPropByPath.DEFAULT_DELIMITER = ".";

    /**
     * Set object property by path
     * @param {Object} obj
     * @param {String|Array} path
     */
    function setPropByPath(obj, path, val, opts) {
        opts = opts || {};
        const delim = opts.delimiter || setPropByPath.DEFAULT_DELIMITER;
        if (!Array.isArray(path)) {
            path = `${path}`.split(delim);
        }
        let prop = obj;
        let n = path.length;
        for (let i = 0;i < n;i++) {
            let key = path[i];
            let last = (i + 1 >= n);
            let valid = (key) || (key === 0);
            valid = valid && (typeof prop !== "undefined") && (prop !== null);
            if (!valid) {
                if (!last) {
                    prop = undefined;
                }
                break;
            }
            if (last) {
                if ((Array.isArray(prop)) && (!isNaN(key))) {
                    while (prop.length <= key) {
                        prop.push(null);
                    }
                    prop.push(val);
                } else {
                    prop[key] = val;
                }
            } else {
                prop = prop[key];
            }
        }

        return prop;
    }
    setPropByPath.DEFAULT_DELIMITER = ".";

    /**
     * Creates object/array empty copy
     * @param {Object} src 
     */
    function createEmptyCopy(src) {
        if (!src) {
            return {};
        }
        let target;
        if (Array.isArray(src)) {
            target = []; //new Array(src.length);
        } else {
            const srcProto = src.__prototype__ || src.constructor.prototype;
            target = (srcProto) ? Object.create(srcProto) : {};
        }

        return target;
    }

    class ObjectIterationContext {
        /**
         * @param {Object} props
         */
        constructor(props) {
            const ctx = this;
            (props) && forEachField(props, (k, v) => {
                (typeof v !== "undefined") && (ctx[k] = v);
            });
            this.path = this.path || [];
            this.depth = this.depth || 0;
            this.isLeaf = this.isLeaf || false;
            this.isCircularRef = this.isCircularRef || false;
            this.stopped = this.stopped || false;
            this.seenObjs = (this.seenObjs instanceof Set)
                ? this.seenObjs
                : new Set(this.seenObjs);
            this.objectToTargetMappings = this.objectToTargetMappings || [];
        }
        
        setTargetValue(key, val) {
            if (Array.isArray(this.target)) {
                if (Array.isArray(val)) {
                    this.target = this.target.concat(val);
                } else {
                    //TODO: Revise this later
                    for (let i = 0;i < key - this.target.length;i++) {
                        this.target.push(null);
                    }
                    this.target.push(val);
                }
            } else {
                this.target[key] = val;
            }
    
            return this.target;
        }
        checkCreateTarget() {
            if (!this.target) {
                this.target = createEmptyCopy(this.currentObject);
                this.addTargetMapping(this.currentObject, this.target);
            }
    
            return this.target;
        }
        getMappedTarget(src) {
            if ((!src) || (typeof src !== "object")) {
                return null;
            }
            let target = null;
            this.objectToTargetMappings.forEach((entry) => {
                if (entry.src === src) {
                    target = entry.target;
                    //break
                    return false;
                }
            });
    
            return target;
        }
        addTargetMapping(src, target) {
            this.objectToTargetMappings.push({ src: src, target: target });
        }
    }
    /*
    function ObjectIterationContext(props) {
        const ctx = this;
        (props) && forEachField(props, (k, v) => {
            (typeof v !== "undefined") && (ctx[k] = v);
        });
        this.depth = this.depth || 0;
        this.stopped = this.stopped || false;
        this.path = this.path || [];
        this.seenObjs = (this.seenObjs instanceof Set)
            ? new Set(this.seenObjs)
            : this.seenObjs;
        this.objectToTargetMappings = this.objectToTargetMappings || [];
    }
    ObjectIterationContext.prototype = {
        constructor: ObjectIterationContext,
        rootObject: null,
        currentObject: null,
        path: null,
        key: null,
        fullKey: null,
        arrayIdx: null,
        depth: 0,
        stopped: false,
        seenObjs: null,
        target: null,
        objectToTargetMappings: null,
        isLeaf: false,
        isCircularRef: false,
        lastError: null,

        setTargetValue: function (key, val) {
            if (Array.isArray(this.target)) {
                if (Array.isArray(val)) {
                    this.target = this.target.concat(val);
                } else {
                    //TODO: Revise this later
                    for (let i = 0;i < key - this.target.length;i++) {
                        this.target.push(null);
                    }
                    this.target.push(val);
                }
            } else {
                this.target[key] = val;
            }
    
            return this.target;
        },
        checkCreateTarget: function() {
            if (!this.target) {
                this.target = createEmptyCopy(this.currentObject);
                this.addTargetMapping(this.currentObject, this.target);
            }
    
            return this.target;
        },
        getMappedTarget: function (src) {
            if ((!src) || (typeof src !== "object")) {
                return null;
            }
            let target = null;
            this.objectToTargetMappings.forEach((entry) => {
                if (entry.src === src) {
                    target = entry.target;
                    //break
                    return false;
                }
            });
    
            return target;
        },
        addTargetMapping: function (src, target) {
            this.objectToTargetMappings.push({ src: src, target: target });
        }
    };
    */
    
    /**
     * walkObject: Iteration through nested object tree to do expressions processing
     * @param {Object} obj 
     * @param {Object} opts 
     */
    function walkObject(obj, opts) {
        opts = opts || {};
        const beforeAllFn = (typeof opts.onBeforeAll === "function") ? opts.onBeforeAll : null;
        //const defaultCallback = (typeof opts.defaultCallback === "function") ? opts.defaultCallback : null;
        const afterAllFn = (typeof opts.onAfterAll === "function") ? opts.onAfterAll : null;
        const exprsMap = opts.expressionsMap || {};
        const defaultExpr = opts.onDefault;
        //const inclSet = new Set(opts.includesList);
        let exclList = [ "constructor", "__prototype__", "_class", "_super" ];
        (opts.excludesList) && (exclList = exclList.concat(opts.excludesList));
        const exclSet = new Set(exclList);
        const targetObj = opts.target; //|| obj;
        //const targetRefsMap = {};
        
        function _walkObjectInternal(_obj, ctx) {
            ctx = ctx || new ObjectIterationContext({
                rootObject: _obj,
                target: targetObj
            });
            try {
                //const _target = ctx.target;
                ctx.seenObjs.add(_obj);
                ctx.currentObject = _obj;
                //ctx.target = _checkCreateTarget(_obj, ctx.target);
                (ctx.depth <= 0) && (beforeAllFn) && beforeAllFn.call(_obj, ctx);

                const upperPathPrefix = (ctx.path.length >= 1) ? `${ctx.path.join(".")}.` : null;
                const subInclList = [];
                (opts.includesList) && opts.includesList.forEach((inclPath) => {
                    if (!upperPathPrefix) {
                        subInclList.push(inclPath);
                        return;
                    }
                    if (inclPath.startsWith(upperPathPrefix)) {
                        subInclList.push(inclPath.substring(upperPathPrefix.length));
                    }
                });
                forEachField(_obj,
                    (k, v) => {
                        ctx.isCircularRef = false;
                        if (Array.isArray(_obj)) {
                            ctx.arrayIdx = k;
                        } else {
                            ctx.key = k;
                        }
                        //ctx.target = (_target) ? _target[k] : null;
                        let fullPath = ((ctx.key) || (ctx.key === 0))
                            ? ctx.path.concat([ctx.key])
                            : ctx.path;
                        let fullPathStr = fullPath.join(".") || "";
                        ctx.fullKey = fullPathStr;
                        if (exclSet.has(fullPathStr)) {
                            return true;
                        }
                        if ((typeof v === "object") && (v)) {
                            ctx.isLeaf = false;
                            if (ctx.seenObjs.has(v)) {
                                ctx.isCircularRef = true;
                            } else if ((typeof opts.maxDepth !== "number") || (ctx.depth < opts.maxDepth))
                            {
                                //Go deep down
                                ctx.seenObjs.add(v);
                                const subCtx = new ObjectIterationContext({
                                    rootObject: ctx.rootObject,
                                    path: fullPath,
                                    key: (Array.isArray(_obj)) ? k : null,
                                    depth: ctx.depth + 1,
                                    seenObjs: ctx.seenObjs,
                                    target: ((ctx.target) && (!Array.isArray(ctx.target)))
                                        ? ctx.target[k]
                                        : null,
                                    objectToTargetMappings: ctx.objectToTargetMappings,
                                    includesList: subInclList
                                });
                                let proceed = (opts.onBeforeWalkDown)
                                    ? opts.onBeforeWalkDown.call(v, subCtx)
                                    : true;
                                if ((typeof proceed === "undefined") || (proceed)) {
                                    _walkObjectInternal(v, subCtx);
                                    if (subCtx.stopped) {
                                        return false;
                                    }
                                    if (typeof subCtx.target !== "undefined") {
                                        ctx.checkCreateTarget();
                                        if (Array.isArray(ctx.target)) {
                                            ctx.target.push(subCtx.target);
                                        } else {
                                            ctx.target[k] = subCtx.target;
                                        }
                                    }
                                }
                            }
                        } else {
                            ctx.isLeaf = true;
                        }

                        let expr = exprsMap[fullPathStr] || defaultExpr;
                        let result;
                        if (typeof expr === "function") {
                            result = expr.call(_obj, v, ctx);
                        } else {
                            result = expr;
                        }
                        //ctx.target = _target;
                        if (ctx.stopped) {
                            return false;
                        }
                        //TODO: Revise this
                        if (typeof result !== "undefined") {
                            ctx.checkCreateTarget();
                            if (Array.isArray(ctx.target)) {
                                ctx.target.push(result);
                            } else {
                                ctx.target[k] = result;
                            }
                        }
                        if (ctx.target) {
                            ctx.addTargetMapping(ctx.currentObject, ctx.target);
                        }
                        
                        return true;
                    },
                    {
                        prototypeLimit: opts.prototypeLimit,
                        includesList: subInclList
                    }
                );
            } catch (err) {
                (typeof opts.onError === "function") && opts.onError(err);
                ctx.lastError = err;
            }
            
            (ctx.depth <= 0) && (afterAllFn) && afterAllFn.call(_obj, ctx);
            if (ctx.lastError) {
                throw ctx.lastError;
            }

            return ctx.target;
        }
        return _walkObjectInternal(obj);
    }
    //TODO: Revise this later
    walkObject.Context = ObjectIterationContext;

    /**
     * merge: merge src object into dest object
     * @param {Object} dest 
     * @param {Object} src 
     * @param {Object} opts 
     * @param {ObjectIterationContext} ctx 
     */
    function merge (dest, src, opts /*, ctx*/) {
        opts = opts || {};
        const maxDepth = (opts.deep) ? opts.deep : 0;
        
        walkObject(src, {
            target: dest,
            maxDepth: maxDepth,
            includesList: opts.includesList,
            excludesList: opts.excludesList,
            prototypeLimit: opts.prototypeLimit,
            onBeforeWalkDown: function (ctx) {
                //Check src type
                const val1 = this;
                if ((val1 instanceof Date)
                    || (val1 instanceof global.Node)
                    || (val1 instanceof global.Window))
                {
                    ctx.isLeaf = true;
                    return false;
                }
                return true;
            },
            onDefault: function (val1, ctx) {
                //let obj1 = ctx.currentObject;
                //ctx.checkCreateTarget();
                let val2;
                if (ctx.target) {
                    val2 = (Array.isArray(ctx.target))
                        ? null
                        : (((ctx.key) || (ctx.key === 0)) ? ctx.target[ctx.key] : null);
                }

                //Check src and dest val
                let isLeaf = ctx.isLeaf;
                if (ctx.isCircularRef) {
                    isLeaf = true;
                    val2 = ctx.getMappedTarget(val1);
                    debug(DEBUG_NS)(`Replacing Circular Ref: (${ctx.fullKey},`, val1, ") => ", val2);
                } else if (((typeof opts.deep === "number") && (ctx.depth >= maxDepth)) || (!opts.deep)) {
                    isLeaf = true;
                    debug(DEBUG_NS)(`Replacing Out-Of-Depth: (${ctx.fullKey},`, ctx.fullKey, ",", val1, ") => ", val2);
                    val2 = val1;
                } else if ((val1 instanceof Date) && (opts.deep)) {
                    isLeaf = true;
                    val2 = new Date(val1.getTime());
                } else if ((isLeaf) && (Array.isArray(val1)) && (val1)
                    && (Array.isArray(val2)) && (val2))
                {
                    debug(DEBUG_NS)(`Merging Array: (${ctx.fullKey},`, val1, " + ", val2 ,") into => ", ctx.target);
                    val2 = val2.concat(val1);
                } else {
                    val2 = val1;
                }
                
                if (!isLeaf) {
                    return;
                }

                //Check target container
                ctx.checkCreateTarget();
                debug(DEBUG_NS)(`Merging: (${ctx.fullKey},`, val2, ") into => ", ctx.target);
                /*
                if (Array.isArray(ctx.target)) {
                    console.log(`Merging: (${ctx.fullKey},`, val2, ") into array => ", ctx.target);
                    ctx.target.push(val2);
                    val2 = undefined;
                } else {
                    console.log(`Merging: (${ctx.fullKey},`, val1, ") into => ", ctx.target);
                }
                */

                return val2;
            }
        });
    
        return this;
    }
    /**
     * clone: Creates a clone of src object
     * @param {Object} src 
     */
    function clone(src, opts) {
        opts = opts || {};
        let srcCls = src.constructor;
        let dest =  (srcCls) ? Object.create(srcCls) : {};
        (typeof opts === "undefined") && (opts.deep = true);
        QUtils.merge(dest, src, opts);

        return dest;
    }

    function extendClass(parent, childProto, childStatic) {
        let childProto2 = Object.create(parent.prototype);
        let childCls = ((childProto) ? childProto.constructor : null) || function QWiz_auto_constructor () {
        };
        (childCls.prototype) && merge(childProto2, childCls.prototype, { deep: true });
        (childProto) && merge(childProto2, childProto, { deep: true });
        (childStatic) && merge(childCls, childStatic, { deep: true });
        childProto2.constructor = childCls;
        childCls.prototype = childProto2;
        childProto2._super=parent;
        childProto2.constructor._super = parent;

        return childProto2;
    }
    function attachExtension(cls, extCls) {
        if (!cls.prototype) {
            cls.prototype = { constructor: cls };
        }
        merge(cls.prototype, extCls.prototype);
        merge(cls, extCls, { deep: true });

        return cls.prototype;
    }
        
    function makeFactory(cls, fac) {
        if (!fac) {
            fac = function QWiz_auto_factory() {
                let instance = Object.create(cls.prototype);
                let _constructor = cls.prototype.constructor || cls;
                _constructor.apply(instance, arguments);
                return instance;
            };
        }
        merge(fac, cls);
        fac.prototype = cls.prototype;
        
        return fac;
    }

    merge(QUtils, {
        forEachField: forEachField,
        getPropByPath: getPropByPath,
        setPropByPath: setPropByPath,
        createEmptyCopy: createEmptyCopy,
        walkObject: walkObject,
        merge: merge,
        clone: clone,
        extendClass: extendClass,
        attachExtension: attachExtension,
        makeFactory: makeFactory
    });
    (_namespace) && merge(_namespace, QUtils);

    return QUtils;
})( /*global.chakritw.qwiz.utils*/ );
