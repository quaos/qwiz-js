"use strict";

const QUtils = require("./qwiz-utils");
const QTextUtils = require("./qwiz-text-utils");

module.exports = (function(_namespace) {

const QMathUtils = {
    EPSILON: 0.00000001
};

function isNearZero(x) {
    return (Math.abs(x) <= QMathUtils.EPSILON);
}

class Decimal {
    constructor(value, precision, opts) {
        this.original = value;
        if ((typeof precision === "object") && (typeof opts === "undefined")) {
            precision = undefined;
            opts = precision;
        } else {
            opts = opts || {};
        }
        this.precision = ((precision) || (precision === 0))
            ? precision
            : opts.precision;
        (!this.precision) && (this.precision !== 0) && (this.precision = Decimal.DEFAULT_PRECISION);
        this.chunkSize = ((opts.chunkSize) || (opts.chunkSize === 0))
            ? opts.chunkSize
            : Decimal.DEFAULT_CHUNK_SIZE;
        this._ = {
            pF0: Math.pow(10, this.precision),
            pF1: Math.pow(10, this.chunkSize)
        };
        this.stream = function(callback, dest) {
            let i = 0;
            this._.chunks.forEach((chunk) => {
                const y = callback.call(this, chunk, i);
                (dest) && dest.push(y);
                i++;
            });
        }
        this.streamWithAnother = function(another, callback) {
            if ((typeof another === "string") || (typeof another === "number") || (Array.isArray(another))) {
                another = new Decimal(another, this.precision, {
                    chunkSize: this.chunkSize
                });
            }
            const chunks1 = this._.chunks;
            const chunks2 = another._.chunks;
            const n1 = chunks1.length;
            const n2 = chunks2.length;
            const maxN = Math.max(n1, n2);
            for (let i = 0;i < maxN;i++) {
                for (let j = 0;j < maxN;j++) {
                    callback(i, j,
                        (i < n1) ? chunks1[i] : null,
                        (j < n2) ? chunks2[j] : null
                    );
                }
            }
        }
        QUtils.merge(this, opts, { deep: true });
        if (Array.isArray(value)) {
            this._.chunks = value;
        } else {
            this._.chunks = [];
            value = value*1;
            this.sign = (value < 0) ? -1 : 1;
            const x1 = Math.round(Math.abs(value) * this._.pF0);
            const r = x1 % this._.pF0;
            this._.chunks.push([r, -this.precision]);
            let x = (x1-r)/this._.pF0;
            let k = 0;
            while ((k <= 0) || (x > 0)) {
                const xr = x%this._.pF1;
                this._.chunks.push([xr, k*this.chunkSize]);
                x = Math.round((x-xr)/this._.pF1);
                k++;
            }
        }
        this.brushUp();
    }
    brushUp() {
        let n = this._.chunks.length;
        let borrowed = 0;
        for (let i = 0;i < n;i++) {
            const last = (i+1 >= n);
            const pF = (i <= 0) ? this._.pF0 : this._.pF1;
            const chunk = this._.chunks[i];
            const xF = Math.pow(10, chunk[1]);
            const xF2 = (last)
                ? Math.pow(10, pF)
                : Math.pow(10, this._.chunks[i+1][1] - chunk[1]);
            let x = chunk[0];
            if (borrowed > 0) {
                x -= borrowed;
            }
            if (x < 0) {
                if (last) {
                    this.sign = -this.sign;
                    x = -x;
                    borrowed = 0;
                } else {
                    const r = -x%xF2;
                    borrowed = 1 + Math.round((-x-r)/xF2);
                    x = xF2 - r;
                }
            } else {
                borrowed = 0;
            }
            if (x >= xF2) {
                const r = x%xF2;
                const q = (x-r)/xF2;
                chunk[0] = Math.round(r);
                if (last) {
                    this._chunks.push([Math.round(q), chunk[1] + pF]);
                    n++;
                } else {
                    this._.chunks[i+1][0] += q;
                }
            } else {
                chunk[0] = Math.round(x);
            }
        }
    }
    getChunk(p, autoCreate) {
        return Decimal.getChunk(this._.chunks, p, {
            autoCreate: autoCreate,
            precision: this.precision,
            chunkSize: this.chunkSize
        });
    }
    isEqualTo(another) {
        let equal = true;
        if (another instanceof Decimal) {
            const n1 = this._.chunks.length;
            const n2 = another._.chunks.length;
            if (n1 !== n2) {
                return false;
            }
            if (this.sign !== another.sign) {
                return false;
            }
            for (let i = 0;i < n1;i++) {
                if (Math.abs(this.chunks[i] - another.chunks[i]) > QMathUtils.EPSILON) {
                    equal = false;
                    break;
                }
            }
        } else {
            const thisStr = this.format();
            equal = (thisStr === `${another}`);
        }

        return equal;
    }
    negate() {
        return new Decimal(this._.chunks.slice(), this.precision, {
            sign: -this.sign, chunkSize: this.chunkSize
        });
    }
    add(another, sign2) {
        let chunks2;
        if (another instanceof Decimal) {
            chunks2 = another._.chunks;
            sign2 = sign2 || another.sign;
        } else if (Array.isArray(another)) {
            chunks2 = another;
            const leadChunk2 = ((another.length >= 1) ? another[another.length-1] : null);
            sign2 = sign2 || (((leadChunk2) && (leadChunk2[0] < 0)) ? -1 : 1);
        } else {
            another = new Decimal(another, this.precision, {
                sign: sign2, chunkSize: this.chunkSize
            });
            chunks2 = another._.chunks;
            sign2 = sign2 || another.sign;
        }

        const chunks3 = Decimal.addChunks(this._.chunks, chunks2, {
            sign1: this.sign,
            sign2: sign2
        });
        if (chunks3.length < 1) {
            Decimal.getChunk(chunks3, 0, {
                autoCreate: true,
                precision: this.precision,
                chunkSize: this.chunkSize
            });
        }

        return new Decimal(chunks3, this.precision, {
            sign: this.sign, chunkSize: this.chunkSize
        });
    }
    sub(another) {
        return this.add(another, -1);
    }
    mul(another, sign2) {
        let chunks2;
        if (another instanceof Decimal) {
            chunks2 = another._.chunks;
            sign2 = sign2 || another.sign;
        } else if (Array.isArray(another)) {
            chunks2 = another;
            const leadChunk2 = ((another.length >= 1) ? another[another.length-1] : null);
            sign2 = sign2 || (((leadChunk2) && (leadChunk2[0] < 0)) ? -1 : 1);
        } else {
            another = new Decimal(another, this.precision, {
                sign: sign2, chunkSize: this.chunkSize
            });
            chunks2 = another._.chunks;
            sign2 = sign2 || another.sign;
        }

        const chunks3 = Decimal.mulChunks(this._.chunks, chunks2, {
            precision: this.precision,
            chunkSize: this.chunkSize
        });
        if (chunks3.length < 1) {
            Decimal.getChunk(chunks3, 0, {
                autoCreate: true,
                precision: this.precision,
                chunkSize: this.chunkSize
            });
        }
        let sign3 = this.sign*sign2;
        const leadChunk = chunks3[chunks3.length - 1];
        if (leadChunk[0] < 0) {
            sign3 = -sign3;
            chunks3.forEach((chunk) => (chunk[0] = -chunk[0]));
        }

        return new Decimal(chunks3, this.precision, {
            sign: sign3, chunkSize: this.chunkSize
        });
    }
    div(another) {
        return this.divWithMod(another)[0];
    }
    mod(another) {
        return this.divWithMod(another)[1];
    }
    divWithMod(another) {
        let Q;
        let R;
        [ Q, R ] = Decimal.divWithModChunks(this._.chunks, another);

        let q2 = new Decimal(Q, this.precision, {
            chunkSize: this.chunkSize,
            sign: this.sign*another.sign
        });
        let r2 = new Decimal(R, this.precision, {
            chunkSize: this.chunkSize,
            sign: this.sign*another.sign
        });

        return [ q2, r2 ];
    }
    asFloat() {
        const n = this._.chunks.length;
        let x = 0.0;
        for (let i = n-1;i >= 0;i--) {
            const chunk = this._.chunks[i];
            const xF = Math.pow(10, chunk[1]);
            x += chunk[0]*xF;
        }
        if (this.sign < 0) {
            x = -x;
        }
        
        return x;
    }
    format(opts) {
        opts = opts || {};
        let fracPart = QTextUtils.padLeft(`${this._.chunks[0][0]}`, "0", this.precision);
        const intParts = [];
        const n = this._.chunks.length;
        if (!opts.zeroPadFraction) {
            fracPart = fracPart.replace(/0+$/, "");
        }
        ((fracPart.length > 0) || (opts.zeroPadFraction)) && (fracPart = `.${fracPart}`);
        for (let i = n-1;i >= 1;i--) {
            const chunk = this._.chunks[i];
            const last = (i+1 >= n);
            let s;
            if ((opts.zeroPadInt) || (!last)) {
                const digits = ((typeof opts.zeroPadInt === "number") && (last))
                    ? opts.zeroPadInt
                    : this.chunkSize;
                s = QTextUtils.padLeft(`${chunk[0]}`, "0", digits);
            } else {
                s = `${chunk[0]}`;
            }
            intParts.push(s);
        }
        let intPartStr = intParts.join("");
        if (opts.commas) {
            intPartStr = QTextUtils.addCommas(intPartStr);
        }
        const signPart = (this.sign < 0)
            ? "-"
            : ((opts.showPositive) ? "+" : "");

        return `${signPart}${intPartStr}${fracPart}`;
    }
}
QUtils.merge(Decimal, {
    //statics
    DEFAULT_PRECISION: 0,
    DEFAULT_CHUNK_SIZE: 10,

    parse: function (s) {
        s = s.replace(/,/g, "");
        const k = s.lastIndexOf(".");
        const precision = (k >= 0) ? s.length - k : 0;

        return new Decimal(s, precision, {
        });
    },
    getChunk: function (chunks, p, opts) {
        opts = opts || {};
        const autoCreate = opts.autoCreate || false;
        const precision = opts.precision || Decimal.DEFAULT_PRECISION;
        const chunkSize = opts.chunkSize || Decimal.DEFAULT_CHUNK_SIZE;
        //const dp = p - precision;
        const idx = ((p >= 0) && (precision > 0))
            ? Math.round((p - p%chunkSize)/chunkSize) + 1
            : 0;
        let chunk;
        if (idx < chunks.length) {
            chunk = chunks[idx];
        } else {
            if (!autoCreate) {
                return null;
            }
            while (chunks.length <= idx) {
                const px = (chunks.length < 1)
                    ? -precision
                    : (chunks.length-1)*chunkSize;
                chunks.push([ 0, px ]);
            }
            chunk = chunks[idx];
        }

        return chunk;
    },
    getLeadingNonZeroChunk: function (chunks) {
        let chunk = null;
        const n = chunks.length;
        for (let i = n-1;i >= 0;i--) {
            chunk = chunks[i];
            if (!isNearZero(chunk[0])) {
                break;
            }
        }

        return chunk;
    },
    iterateChunks: function (chunks1, chunks2, callback, opts) {
        if (typeof chunks2 === "function") {
            opts = callback;
            callback = chunks2;
            chunks2 = null;
        } else if ((typeof chunks2 === "object") && (!Array.isArray(chunks2))) {
            opts = chunks2;
            chunks2 = null;
        }
        opts = opts || {};
        const n1 = chunks1.length;
        const n2 = (chunks2) ? chunks2.length : 0;
        const maxN = (n2 > n1) ? n2 : n1;
        for (let i1 = 0;i1 < maxN;i1++) {
            for (let i2 = 0;i2 < maxN;i2++) {
                const x1 = (i1 < n1) ? chunks1[i1] : null;
                const x2 = (i2 < n2) ? chunks2[i2] : null;
                (callback) && callback(i1, i2, x1, x2, maxN);
            }
        }
    },
    addChunks: function (chunks1, a2, opts) {
        opts = opts || {};
        let chunks3;
        if (!Array.isArray(a2)) {
            chunks3 = chunks1.map((chunk) => {
                const aF = Math.round(a2*Math.pow(10, -chunk[1]));
                if (isNearZero(aF)) {
                    return chunk;
                }
                return [ chunk[0]+aF, chunk[1] ];
            });
            
            return chunks3;
        }
        const chunks2 = a2;
        chunks3 = [];
        const n1 = chunks1.length;
        const n2 = chunks2.length;
        const sign1 = opts.sign1 || 1;
        const sign2 = opts.sign2 || 1;
        Decimal.iterateChunks(chunks1, chunks2,
            (i1, i2, x1, x2, maxN) => {
                if ((i1 < n1) && (i2 < n2) && (i1 !== i2)) {
                    return false;
                }
                let p;
                let xF1;
                let xF2;
                if (x1) {
                    p = x1[1];
                    xF1 = 1;
                    xF2 = (x2) ? Math.pow(x2[1] - p) : 1;
                } else {
                    p = x2[1];
                    xF1 = 1; //Math.pow(x1[1] - p);
                    xF2 = 1;
                }
                const chunk = Decimal.getChunk(chunks3, p, {
                    autoCreate: true,
                    precision: this.precision,
                    chunkSize: this.chunkSize
                });
                chunk[0] += ((x1) ? x1[0]*sign1*xF1 : 0)
                    + ((x2) ? x2[0]*sign2*xF2 : 0);
            },
            {
            }
        );

        return chunks3;
    },
    mulChunks: function (chunks1, m2, opts) {
        opts = opts || {};
        let chunks3;
        if (!Array.isArray(m2)) {
            chunks3 = chunks1.map((chunk) => {
                const mF = Math.round(m2*Math.pow(10, -chunk[1]));
                if (isNearZero(mF)) {
                    return chunk;
                }
                return [ chunk[0]*mF, chunk[1] ];
            });

            return chunks3;
        }
        const chunks2 = m2;
        chunks3 = [];
        /*
        Polynomial: ((10^p1)x1 + (10^p2)x2 + ... + (10^pn)xn)((10^q1)y1 + (10^q2)y2 + ... + bnyn)
          => 10^(p1+q1)x1y1 + 10^(p1+q2)a1y2 + ...
        */
        Decimal.iterateChunks(chunks1, chunks2,
            (i1, i2, x1, x2, maxN) => {
                if ((!x1) || (!x2)) {
                    return false;
                }
                const x3 = Math.round(x1[0]*x2[0]);
                if (isNearZero(x3)) {
                    //&& (isNearZero(p))) {
                    return false;
                }
                let p;
                let xF;
                if (x1[1] <= x2[1]) {
                    p = x1[1];
                    xF = Math.pow(10, x2[1]);
                } else {
                    p = x2[1];
                    xF = Math.pow(10, x1[1]);
                }
                const chunk = Decimal.getChunk(chunks3, p, {
                    autoCreate: true,
                    precision: opts.precision,
                    chunkSize: opts.chunkSize
                });
                chunk[0] += x3*xF;
            },
            {
            }
        );

        return chunks3;
    },
    divWithModChunks: function (chunks1, d2, opts) {
        let R = chunks1.slice();
        let Q = chunks1.map((chunk) => [ 0, chunk[1] ]);
        let chunks2;
        if (Array.isArray(d2)) {
            chunks2 = d2;
        } else {
            chunks2 = [ [ d2, 0 ] ];
        }
        const n1 = chunks1.length;
        const n2 = chunks2.length;
        /*
        Polynomial long division
        ref: https://en.wikipedia.org/wiki/Polynomial_long_division#Pseudo-code
        */
        let leadChunk1 = Decimal.getLeadingNonZeroChunk(R);
        let leadChunk2 = Decimal.getLeadingNonZeroChunk(chunks2);
        let r = R.reduce((z = 0, x) => z + x[0]*Math.pow(10, x[1]));
        let rP = leadChunk1[1];
        let qP = leadChunk2[1];
        while ((!isNearZero(r)) && (rP >= qP) && (leadChunk1) && (leadChunk2)) {
            const dPF = Math.pow(10, rP-qP);
            const tMod = dPF*leadChunk1[0]%leadChunk2[0]
            const t = Math.round((dPF*leadChunk1[0] - tMod)/leadChunk2[0]);
            Q = Decimal.addChunks(Q, t);
            R = Decimal.addChunks(R, Decimal.mulChunks(t, Decimal.mulChunks(Q, -1)));
            r = R.reduce((z = 0, x) => z + x[0]*Math.pow(10, x[1]));
            leadChunk1 = Decimal.getLeadingNonZeroChunk(R);
            leadChunk2 = Decimal.getLeadingNonZeroChunk(chunks2);
            rP = leadChunk1[1];
            qP = leadChunk2[1];
        }

        return [ Q, R ];
    }
});

//TODO:
/*
class Vector {
    constructor(source, opts) {
        opts = opts || {};
        if (source instanceof Vector) {
            source = source.getValues();
        }
        this._ = {
            source: source,
            idx: opts.idx || 0
        };
        this.dimension = opts.dimension || source.length;
    }

    getValue(i) {
        return this._.source(this._.idx+i);
    }
    getValues() {
        return this._.source.slice(this._.idx, this.dimension);
    }
    dot(m2, opts) {
        let v2;
        if (m2 instanceof Vector) {
            v2 = m2;
        } else if (Array.isArray(m2)) {
            v2 = new Vector(m2, { });
        }
        let z = 0;
        for (let i = 0;i < this.dimension;i++) {
            let mX = (v2) ? v2.getValue(i) : m2;
            z += this._.source[this._.idx + i]*mX;
        }

        return z;
    }
    cross(v2, opts) {
        if (Array.isArray(v2)) {
            v2 = new Vector(v2, { });
        }
        
        let v3 = [];
        for (let i = 0;i < this.dimension;i++) {
            const mX = v2.getValue((i+1)%v2.dimension);
            v3.push(this._.source[this._.idx + i]*mX);
        }
        for (let i = 0;i < v2.dimension;i++) {
            const i1 = (i+1)%v2.dimension;
            const mX = v2.getValue(i);
            v3[i] -= this._.source[this._.idx + i1] * mX;
        }
        
        return new Vector(v3, { });
    }

}

class Matrix {
    constructor(source, opts) {
        opts = opts || {};
        this._ = {
            source: source,
            sourceRows: null,
            determinant: null,
            rowSums: null,
            colSums: null,
            sum: 0,
            recalcNeeded: true
        };
        QUtils.merge(this, {
            topIdx: opts.topIdx || 0,
            leftIdx: opts.leftIdx || 0
        });
        if (source instanceof Matrix) {
            this._.sourceRows = source._.source;
            this.topIdx += source._.topIdx;
            this.leftIdx += source._.leftIdx;
        } else {
            this._.sourceRows = source;
        }
        this.rows = opts.rows || this._.sourceRows.length;
        this.cols = opts.cols
            || (((this._.sourceRows.length >= 1) && (this._.sourceRows[0]))
                ? this._.sourceRows[0].length
                : 0);
    }
    getDeterminant() {
        (this._.recalcNeeded) && this.recalculate();

        return this._.determinant;
    }
    getRowSums() {
        (this._.recalcNeeded) && this.recalculate();

        return this._.rowSums;
    }
    getColSums() {
        (this._.recalcNeeded) && this.recalculate();

        return this._.colSums;
    }
    getSum() {
        (this._.recalcNeeded) && this.recalculate();

        return this._.sum;
    }
    getSubMatrix(i, j, rows, cols) {
        return new Matrix(this, {
            topIdx: i,
            leftIdx: j,
            rows: rows,
            cols: cols
        });
    }
    getRows() {
        return this._.sourceRows.slice(this._.topIdx, this.rows);
    }
    setRows(rows) {
        const n = rows.length;
        for (let i = 0;i < n;i++) {
            const row = rows[i];        
            for (let j = 0;j < row.length;j++) {
                this._.sourceRows[this.topIdx + i][this.leftIdx + j] = rows[i][j];
            }
        }
        if (this._.source instanceof Matrix) {
            //TODO: Revise this later
            this._.source._.recalcNeeded = true;
        }
        this._.recalcNeeded = true;
        this.rows = n;
    }
    iterate(callback, opts) {
        const m = this;
        opts = opts || {};
        for (let i = 0;i < this.rows;i++) {
            const row = this._.sourceRows[this.topIdx + i];        
            for (let j = 0;j < this.cols;j++) {
                callback(i, j, row[this.leftIdx + j]);
            }
        }
    }
    invert() {

    }
    transpose() {
        const rows2 = Array(this.cols);
        this.iterate((i, j, x) => {
            let row = rows2[j];
            if (!row) {
                rows2[j] = row = Array(this.rows);
            }
            row[i] = x;
        });

        return new Matrix(rows2, {
            rows: this.cols,
            cols: this.rows
        });
    }
    add(m2) {
        const m = this;
        const rows3 = Array(this.rows);
        this.iterate((i, j, x) => {
            rows3[i] = rows3[i] || Array(m.cols);
            rows3[i][j] = x + m2[i][j];
        });

        return new Matrix(rows3, {
            rows: this.rows,
            cols: this.cols
        });
    }
    mul(m2) {
        const m = this;
        const rows3 = Array(this.rows);
        this.iterate((i, j, x) => {
            rows3[i] = rows3[i] || Array(m2.cols);
            rows3[i][j] += x*m2[j][i];
        });

        return new Matrix(rows3, {
            rows: this.rows,
            cols: this.cols
        });
    }
    recalculate() {
        this._.determinant = 0;
        this._.rowSums = Array(this.rows);
        this._.colSums = Array(this.cols);
        this._.sum = 0;
        const detTerms1 = Array(this.rows);
        this.iterate((i, j, x) => {
            (i <= 0) && (this._.colSums[j] = 0);
            (j <= 0) && (this._.rowSums[i] = 0);
            this._.colSums[j] += x;
            this._.rowSums[i] += x;
            this._.sum += x;
            let k;
            if (j >= i) {
                k = j - i;
            } else {
                k = this.rows - i - j;
            }
            detTerms1[k] = detTerms1[k] || 1;
            detTerms1[k] *= x;
        });
        const detTerms2 = Array(this.rows);
        this.iterate((i, j, x) => {
            let k;
            if (i >= j) {
                k = i - j;
            } else {
                k = this.rows - j - i;
            }
            detTerms2[k] = detTerms2[k] || -1;
            detTerms2[k] *= x;
        });
        this._.determinant = detTerms1.concat(detTerms2).reduce((sum = 0, x) => sum + x);
        this._.recalcNeeded = false;
    }
}
QUtils.merge(Matrix, {
    //statics
    getIdentity: function (rows, cols) {
        const m = Array(rows).map((row, i) => {
            return Array(cols).map((cell, j) => {
                return (i === j) ? 1 : 0;
            });
        });

        return new Matrix(m, {
            rows: rows,
            cols: cols
        });
    }
});
*/

QUtils.merge(QMathUtils, {
    isNearZero: isNearZero,
    Decimal: Decimal
    //Matrix: Matrix
});

(_namespace) && QUtils.merge(_namespace, QMathUtils);

return QMathUtils;
})( /*global.chakritw.qwiz.utils.math*/ );
