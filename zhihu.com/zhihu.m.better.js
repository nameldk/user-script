// ==UserScript==
// @name        知乎手机网页版改进
// @namespace   https://www.zhihu.com/
// @match       https://www.zhihu.com/
// @match       https://www.zhihu.com/?*
// @match       https://www.zhihu.com/question/*
// @match       https://www.zhihu.com/zvideo/*
// @grant       none
// @version     1.3.5
// @author      nameldk
// @description 使手机网页版可以加载更多答案
// @note        2022.07.13  v1.3.5 处理部分答案重复显示的问题。
// @note        2022.06.26  v1.3.4 隐藏推荐；修复链接打开失败的问题。
// @note        2022.06.25  v1.3.3 隐藏底部按钮
// @note        2022.03.30  v1.3.2 添加评论数量
// @note        2022.03.19  v1.3.1 处理回答加载不出来的问题，处理查看所有回答点击错误
// @note        2022.01.29  v1.3.0 处理回答加载不出来的问题
// @note        2021.06.24  v1.2.9 处理评论样式
// @note        2021.06.10  v1.2.8 处理视频被误删除问题
// @note        2020.12.30  v1.2.7 处理首页和视频页面
// @note        2020.12.22  v1.2.6 修复链接无法打开的问题，外部链接直接打开
// @note        2020.10.13  v1.2.5 修复蒙层偶尔不消失的问题
// @note        2020.09.14  v1.2.4 修复评论超出的问题
// @note        2020.08.14  v1.2.3 适配新版页面
// @note        2020.08.13  v1.2.2 修复已加载完的评论切换排序不显示的问题
// @note        2020.08.03  v1.2.1 处理评论加载不完全,评论作者标识,收起按钮颜色区分,一些样式调整
// @note        2020.08.02  v1.2 处理gif,视频,收起后的定位,发布时间,页面被清空的问题
// ==/UserScript==

const questionNumber = (location.href.match(/\/question\/(\d+)/)||[])[1];
const inDetailPage = location.href.match(/\/question\/\d+\/answer\/\d+/);
const inHomePage = location.pathname === '/';
const inZvideo = location.pathname.indexOf('/zvideo/') > -1;
const fromMobile = navigator.userAgent.match(/Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i);

var offset = 0;
var limit = 5;
var is_end = 0;
var is_loading_answer = 0;
var is_loading_comment = 0;
var load_answer_id_map = {};
var elList = null;
var elLoading = null;
var viewportElCheckList = [];
var debug = 0;
var log = debug ? console.log : function(){};


function forEachArray(arrayLike, cb) {
    if (arrayLike) {
        Array.prototype.forEach.call(arrayLike, el => cb(el));
    }
}

function forEachBySelector(s, cb) {
    Array.prototype.forEach.call(document.querySelectorAll(s), el => cb(el));
}

function removeBySelector(s) {
    forEachBySelector(s, ele => ele.remove());
}

function hideBySelector(s) {
    forEachBySelector(s, ele => ele.style.display = "none");
}

function getElementHeight(el) {
    if (el) {
        // el.offsetHeight
        return parseFloat(window.getComputedStyle(el, null).height.replace("px", ""));
    }
    return 0;
}

function isElementInViewport (el) {
    // https://stackoverflow.com/questions/123999/how-can-i-tell-if-a-dom-element-is-visible-in-the-current-viewport
    if (!el)
        return false;

    var rect = el.getBoundingClientRect();
    if (rect.top >= 0) { // ↓
        return rect.top < window.innerHeight;
    } else {
        return rect.top + rect.height > 0;
    }
}


function formatNumber(num) {
    if (num > 10000) {
        return (num / 10000).toFixed(2) + '万';
    } else {
        return num;
    }
}


function formatUrl(url, formatStr) {
    if (!formatStr)
        formatStr = 'xs';
    // s,xs,m, r
    return url.replace('{size}', formatStr);
}

function formatDate(e, t) {
    if(e.toString().length === 10) { // 秒
        e = e*1000;
    }
    e = new Date(e);
    // yyyy-MM-dd hh:mm:ss
    var n = {
        "M+": e.getMonth() + 1,
        "d+": e.getDate(),
        "h+": e.getHours(),
        "m+": e.getMinutes(),
        "s+": e.getSeconds(),
        "q+": Math.floor((e.getMonth() + 3) / 3),
        S: e.getMilliseconds()
    };
    /(y+)/.test(t) && (t = t.replace(RegExp.$1, (e.getFullYear() + "").substr(4 - RegExp.$1.length)));
    for (var r in n)
        new RegExp("(" + r + ")").test(t) && (t = t.replace(RegExp.$1, 1 === RegExp.$1.length ? n[r] : ("00" + n[r]).substr(("" + n[r]).length)));
    return t
}

function getDate(timestamp) {
    return formatDate(timestamp, 'yyyy-MM-dd');
}

function addStyle(styleStr) {
    if (styleStr) {
        document.body.insertAdjacentHTML('beforeend', styleStr);
    }
}

function stopPropagation(el) {
    if (el) {
        el.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }
}

function observerAddNodes(targetNode, cb) {
    if (!targetNode || !cb)
        return;
    const config = { childList:true, subtree: true };
    const callback = function(mutationsList) {
        for(const mutation of mutationsList) {
            if (mutation.addedNodes.length) {
                forEachArray(mutation.addedNodes, el => cb(el));
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}

// --- zhihu ---

function zhihu() {
    // md5
    function f2(e, t, n) {
        var r;
        !function (i) {
            "use strict";

            function o(e, t) {
                var n = (65535 & e) + (65535 & t);
                return (e >> 16) + (t >> 16) + (n >> 16) << 16 | 65535 & n
            }

            function a(e, t, n, r, i, a) {
                return o((c = o(o(t, e), o(r, a))) << (u = i) | c >>> 32 - u, n);
                var c, u
            }

            function c(e, t, n, r, i, o, c) {
                return a(t & n | ~t & r, e, t, i, o, c)
            }

            function u(e, t, n, r, i, o, c) {
                return a(t & r | n & ~r, e, t, i, o, c)
            }

            function s(e, t, n, r, i, o, c) {
                return a(t ^ n ^ r, e, t, i, o, c)
            }

            function l(e, t, n, r, i, o, c) {
                return a(n ^ (t | ~r), e, t, i, o, c)
            }

            function d(e, t) {
                var n, r, i, a, d;
                e[t >> 5] |= 128 << t % 32, e[14 + (t + 64 >>> 9 << 4)] = t;
                var f = 1732584193, p = -271733879, h = -1732584194, b = 271733878;
                for (n = 0; n < e.length; n += 16) r = f, i = p, a = h, d = b, f = c(f, p, h, b, e[n], 7, -680876936), b = c(b, f, p, h, e[n + 1], 12, -389564586), h = c(h, b, f, p, e[n + 2], 17, 606105819), p = c(p, h, b, f, e[n + 3], 22, -1044525330), f = c(f, p, h, b, e[n + 4], 7, -176418897), b = c(b, f, p, h, e[n + 5], 12, 1200080426), h = c(h, b, f, p, e[n + 6], 17, -1473231341), p = c(p, h, b, f, e[n + 7], 22, -45705983), f = c(f, p, h, b, e[n + 8], 7, 1770035416), b = c(b, f, p, h, e[n + 9], 12, -1958414417), h = c(h, b, f, p, e[n + 10], 17, -42063), p = c(p, h, b, f, e[n + 11], 22, -1990404162), f = c(f, p, h, b, e[n + 12], 7, 1804603682), b = c(b, f, p, h, e[n + 13], 12, -40341101), h = c(h, b, f, p, e[n + 14], 17, -1502002290), f = u(f, p = c(p, h, b, f, e[n + 15], 22, 1236535329), h, b, e[n + 1], 5, -165796510), b = u(b, f, p, h, e[n + 6], 9, -1069501632), h = u(h, b, f, p, e[n + 11], 14, 643717713), p = u(p, h, b, f, e[n], 20, -373897302), f = u(f, p, h, b, e[n + 5], 5, -701558691), b = u(b, f, p, h, e[n + 10], 9, 38016083), h = u(h, b, f, p, e[n + 15], 14, -660478335), p = u(p, h, b, f, e[n + 4], 20, -405537848), f = u(f, p, h, b, e[n + 9], 5, 568446438), b = u(b, f, p, h, e[n + 14], 9, -1019803690), h = u(h, b, f, p, e[n + 3], 14, -187363961), p = u(p, h, b, f, e[n + 8], 20, 1163531501), f = u(f, p, h, b, e[n + 13], 5, -1444681467), b = u(b, f, p, h, e[n + 2], 9, -51403784), h = u(h, b, f, p, e[n + 7], 14, 1735328473), f = s(f, p = u(p, h, b, f, e[n + 12], 20, -1926607734), h, b, e[n + 5], 4, -378558), b = s(b, f, p, h, e[n + 8], 11, -2022574463), h = s(h, b, f, p, e[n + 11], 16, 1839030562), p = s(p, h, b, f, e[n + 14], 23, -35309556), f = s(f, p, h, b, e[n + 1], 4, -1530992060), b = s(b, f, p, h, e[n + 4], 11, 1272893353), h = s(h, b, f, p, e[n + 7], 16, -155497632), p = s(p, h, b, f, e[n + 10], 23, -1094730640), f = s(f, p, h, b, e[n + 13], 4, 681279174), b = s(b, f, p, h, e[n], 11, -358537222), h = s(h, b, f, p, e[n + 3], 16, -722521979), p = s(p, h, b, f, e[n + 6], 23, 76029189), f = s(f, p, h, b, e[n + 9], 4, -640364487), b = s(b, f, p, h, e[n + 12], 11, -421815835), h = s(h, b, f, p, e[n + 15], 16, 530742520), f = l(f, p = s(p, h, b, f, e[n + 2], 23, -995338651), h, b, e[n], 6, -198630844), b = l(b, f, p, h, e[n + 7], 10, 1126891415), h = l(h, b, f, p, e[n + 14], 15, -1416354905), p = l(p, h, b, f, e[n + 5], 21, -57434055), f = l(f, p, h, b, e[n + 12], 6, 1700485571), b = l(b, f, p, h, e[n + 3], 10, -1894986606), h = l(h, b, f, p, e[n + 10], 15, -1051523), p = l(p, h, b, f, e[n + 1], 21, -2054922799), f = l(f, p, h, b, e[n + 8], 6, 1873313359), b = l(b, f, p, h, e[n + 15], 10, -30611744), h = l(h, b, f, p, e[n + 6], 15, -1560198380), p = l(p, h, b, f, e[n + 13], 21, 1309151649), f = l(f, p, h, b, e[n + 4], 6, -145523070), b = l(b, f, p, h, e[n + 11], 10, -1120210379), h = l(h, b, f, p, e[n + 2], 15, 718787259), p = l(p, h, b, f, e[n + 9], 21, -343485551), f = o(f, r), p = o(p, i), h = o(h, a), b = o(b, d);
                return [f, p, h, b]
            }

            function f(e) {
                var t, n = "", r = 32 * e.length;
                for (t = 0; t < r; t += 8) n += String.fromCharCode(e[t >> 5] >>> t % 32 & 255);
                return n
            }

            function p(e) {
                var t, n = [];
                for (n[(e.length >> 2) - 1] = void 0, t = 0; t < n.length; t += 1) n[t] = 0;
                var r = 8 * e.length;
                for (t = 0; t < r; t += 8) n[t >> 5] |= (255 & e.charCodeAt(t / 8)) << t % 32;
                return n
            }

            function h(e) {
                var t, n, r = "";
                for (n = 0; n < e.length; n += 1) t = e.charCodeAt(n), r += "0123456789abcdef".charAt(t >>> 4 & 15) + "0123456789abcdef".charAt(15 & t);
                return r
            }

            function b(e) {
                return unescape(encodeURIComponent(e))
            }

            function v(e) {
                return function (e) {
                    return f(d(p(e), 8 * e.length))
                }(b(e))
            }

            function O(e, t) {
                return function (e, t) {
                    var n, r, i = p(e), o = [], a = [];
                    for (o[15] = a[15] = void 0, i.length > 16 && (i = d(i, 8 * e.length)), n = 0; n < 16; n += 1) o[n] = 909522486 ^ i[n], a[n] = 1549556828 ^ i[n];
                    return r = d(o.concat(p(t)), 512 + 8 * t.length), f(d(a.concat(r), 640))
                }(b(e), b(t))
            }

            function g(e, t, n) {
                return t ? n ? O(t, e) : h(O(t, e)) : n ? v(e) : h(v(e))
            }

            void 0 === (r = function () {
                return g
            }.call(t, n, t, e)) || (e.exports = r)
        }()
    }

    // enc
    function f3(module, exports, __webpack_require__) {
        "use strict";

        function t(e) {
            return (t = "function" == typeof Symbol && "symbol" == typeof Symbol.A ? function (e) {
                return typeof e
            } : function (e) {
                return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e
            })(e)
        }

        Object.defineProperty(exports, "__esModule", {value: !0});
        var A = "2.0", __g = {};

        function s() {
        }

        function i(e) {
            this.t = (2048 & e) >> 11, this.s = (1536 & e) >> 9, this.i = 511 & e, this.h = 511 & e
        }

        function h(e) {
            this.s = (3072 & e) >> 10, this.h = 1023 & e
        }

        function a(e) {
            this.a = (3072 & e) >> 10, this.c = (768 & e) >> 8, this.n = (192 & e) >> 6, this.t = 63 & e
        }

        function c(e) {
            this.s = e >> 10 & 3, this.i = 1023 & e
        }

        function n() {
        }

        function e(e) {
            this.a = (3072 & e) >> 10, this.c = (768 & e) >> 8, this.n = (192 & e) >> 6, this.t = 63 & e
        }

        function o(e) {
            this.h = (4095 & e) >> 2, this.t = 3 & e
        }

        function r(e) {
            this.s = e >> 10 & 3, this.i = e >> 2 & 255, this.t = 3 & e
        }

        s.prototype.e = function (e) {
            e.o = !1
        }, i.prototype.e = function (e) {
            switch (this.t) {
                case 0:
                    e.r[this.s] = this.i;
                    break;
                case 1:
                    e.r[this.s] = e.k[this.h]
            }
        }, h.prototype.e = function (e) {
            e.k[this.h] = e.r[this.s]
        }, a.prototype.e = function (e) {
            switch (this.t) {
                case 0:
                    e.r[this.a] = e.r[this.c] + e.r[this.n];
                    break;
                case 1:
                    e.r[this.a] = e.r[this.c] - e.r[this.n];
                    break;
                case 2:
                    e.r[this.a] = e.r[this.c] * e.r[this.n];
                    break;
                case 3:
                    e.r[this.a] = e.r[this.c] / e.r[this.n];
                    break;
                case 4:
                    e.r[this.a] = e.r[this.c] % e.r[this.n];
                    break;
                case 5:
                    e.r[this.a] = e.r[this.c] == e.r[this.n];
                    break;
                case 6:
                    e.r[this.a] = e.r[this.c] >= e.r[this.n];
                    break;
                case 7:
                    e.r[this.a] = e.r[this.c] || e.r[this.n];
                    break;
                case 8:
                    e.r[this.a] = e.r[this.c] && e.r[this.n];
                    break;
                case 9:
                    e.r[this.a] = e.r[this.c] !== e.r[this.n];
                    break;
                case 10:
                    e.r[this.a] = t(e.r[this.c]);
                    break;
                case 11:
                    e.r[this.a] = e.r[this.c] in e.r[this.n];
                    break;
                case 12:
                    e.r[this.a] = e.r[this.c] > e.r[this.n];
                    break;
                case 13:
                    e.r[this.a] = -e.r[this.c];
                    break;
                case 14:
                    e.r[this.a] = e.r[this.c] < e.r[this.n];
                    break;
                case 15:
                    e.r[this.a] = e.r[this.c] & e.r[this.n];
                    break;
                case 16:
                    e.r[this.a] = e.r[this.c] ^ e.r[this.n];
                    break;
                case 17:
                    e.r[this.a] = e.r[this.c] << e.r[this.n];
                    break;
                case 18:
                    e.r[this.a] = e.r[this.c] >>> e.r[this.n];
                    break;
                case 19:
                    e.r[this.a] = e.r[this.c] | e.r[this.n];
                    break;
                case 20:
                    e.r[this.a] = !e.r[this.c]
            }
        }, c.prototype.e = function (e) {
            e.Q.push(e.C), e.B.push(e.k), e.C = e.r[this.s], e.k = [];
            for (var t = 0; t < this.i; t++) e.k.unshift(e.f.pop());
            e.g.push(e.f), e.f = []
        }, n.prototype.e = function (e) {
            e.C = e.Q.pop(), e.k = e.B.pop(), e.f = e.g.pop()
        }, e.prototype.e = function (e) {
            switch (this.t) {
                case 0:
                    e.u = e.r[this.a] >= e.r[this.c];
                    break;
                case 1:
                    e.u = e.r[this.a] <= e.r[this.c];
                    break;
                case 2:
                    e.u = e.r[this.a] > e.r[this.c];
                    break;
                case 3:
                    e.u = e.r[this.a] < e.r[this.c];
                    break;
                case 4:
                    e.u = e.r[this.a] == e.r[this.c];
                    break;
                case 5:
                    e.u = e.r[this.a] != e.r[this.c];
                    break;
                case 6:
                    e.u = e.r[this.a];
                    break;
                case 7:
                    e.u = !e.r[this.a]
            }
        }, o.prototype.e = function (e) {
            switch (this.t) {
                case 0:
                    e.C = this.h;
                    break;
                case 1:
                    e.u && (e.C = this.h);
                    break;
                case 2:
                    e.u || (e.C = this.h);
                    break;
                case 3:
                    e.C = this.h, e.w = null
            }
            e.u = !1
        }, r.prototype.e = function (e) {
            switch (this.t) {
                case 0:
                    for (var t = [], n = 0; n < this.i; n++) t.unshift(e.f.pop());
                    e.r[3] = e.r[this.s](t[0], t[1]);
                    break;
                case 1:
                    for (var r = e.f.pop(), i = [], o = 0; o < this.i; o++) i.unshift(e.f.pop());
                    e.r[3] = e.r[this.s][r](i[0], i[1]);
                    break;
                case 2:
                    for (var a = [], c = 0; c < this.i; c++) a.unshift(e.f.pop());
                    e.r[3] = new e.r[this.s](a[0], a[1])
            }
        };
        var k = function (e) {
            for (var t = 66, n = [], r = 0; r < e.length; r++) {
                var i = 24 ^ e.charCodeAt(r) ^ t;
                n.push(String.fromCharCode(i)), t = i
            }
            return n.join("")
        };

        function Q(e) {
            this.t = (4095 & e) >> 10, this.s = (1023 & e) >> 8, this.i = 1023 & e, this.h = 63 & e
        }

        function C(e) {
            this.t = (4095 & e) >> 10, this.a = (1023 & e) >> 8, this.c = (255 & e) >> 6
        }

        function B(e) {
            this.s = (3072 & e) >> 10, this.h = 1023 & e
        }

        function f(e) {
            this.h = 4095 & e
        }

        function g(e) {
            this.s = (3072 & e) >> 10
        }

        function u(e) {
            this.h = 4095 & e
        }

        function w(e) {
            this.t = (3840 & e) >> 8, this.s = (192 & e) >> 6, this.i = 63 & e
        }

        function G() {
            this.r = [0, 0, 0, 0], this.C = 0, this.Q = [], this.k = [], this.B = [], this.f = [], this.g = [], this.u = !1, this.G = [], this.b = [], this.o = !1, this.w = null, this.U = null, this.F = [], this.R = 0, this.J = {
                0: s,
                1: i,
                2: h,
                3: a,
                4: c,
                5: n,
                6: e,
                7: o,
                8: r,
                9: Q,
                10: C,
                11: B,
                12: f,
                13: g,
                14: u,
                15: w
            }
        }

        Q.prototype.e = function (e) {
            switch (this.t) {
                case 0:
                    e.f.push(e.r[this.s]);
                    break;
                case 1:
                    e.f.push(this.i);
                    break;
                case 2:
                    e.f.push(e.k[this.h]);
                    break;
                case 3:
                    e.f.push(k(e.b[this.h]))
            }
        }, C.prototype.e = function (A) {
            switch (this.t) {
                case 0:
                    var t = A.f.pop();
                    A.r[this.a] = A.r[this.c][t];
                    break;
                case 1:
                    var s = A.f.pop(), i = A.f.pop();
                    A.r[this.c][s] = i;
                    break;
                case 2:
                    var h = A.f.pop();
                    A.r[this.a] = eval(h)
            }
        }, B.prototype.e = function (e) {
            e.r[this.s] = k(e.b[this.h])
        }, f.prototype.e = function (e) {
            e.w = this.h
        }, g.prototype.e = function (e) {
            throw e.r[this.s]
        }, u.prototype.e = function (e) {
            var t = this, n = [0];
            e.k.forEach((function (e) {
                n.push(e)
            }));
            var r = function (r) {
                var i = new G;
                return i.k = n, i.k[0] = r, i.v(e.G, t.h, e.b, e.F), i.r[3]
            };
            r.toString = function () {
                return "() { [native code] }"
            }, e.r[3] = r
        }, w.prototype.e = function (e) {
            switch (this.t) {
                case 0:
                    for (var t = {}, n = 0; n < this.i; n++) {
                        var r = e.f.pop();
                        t[e.f.pop()] = r
                    }
                    e.r[this.s] = t;
                    break;
                case 1:
                    for (var i = [], o = 0; o < this.i; o++) i.unshift(e.f.pop());
                    e.r[this.s] = i
            }
        }, G.prototype.D = function (e) {
            for (var t = atob(e), n = t.charCodeAt(0) << 8 | t.charCodeAt(1), r = [], i = 2; i < n + 2; i += 2) r.push(t.charCodeAt(i) << 8 | t.charCodeAt(i + 1));
            this.G = r;
            for (var o = [], a = n + 2; a < t.length;) {
                var c = t.charCodeAt(a) << 8 | t.charCodeAt(a + 1), u = t.slice(a + 2, a + 2 + c);
                o.push(u), a += c + 2
            }
            this.b = o
        }, G.prototype.v = function (e, t, n) {
            for (t = t || 0, n = n || [], this.C = t, "string" == typeof e ? this.D(e) : (this.G = e, this.b = n), this.o = !0, this.R = Date.now(); this.o;) {
                var r = this.G[this.C++];
                if ("number" != typeof r) break;
                var i = Date.now();
                // i = 1643456543786;
                if (500 < i - this.R) return;
                this.R = i;
                try {
                    this.e(r)
                } catch (e) {
                    this.U = e, this.w && (this.C = this.w)
                }
            }
        }, G.prototype.e = function (e) {
            var t = (61440 & e) >> 12;
            new this.J[t](e).e(this)
        }, "undefined" != typeof window && (new G).v("AxjgB5MAnACoAJwBpAAAABAAIAKcAqgAMAq0AzRJZAZwUpwCqACQACACGAKcBKAAIAOcBagAIAQYAjAUGgKcBqFAuAc5hTSHZAZwqrAIGgA0QJEAJAAYAzAUGgOcCaFANRQ0R2QGcOKwChoANECRACQAsAuQABgDnAmgAJwMgAGcDYwFEAAzBmAGcSqwDhoANECRACQAGAKcD6AAGgKcEKFANEcYApwRoAAxB2AGcXKwEhoANECRACQAGAKcE6AAGgKcFKFANEdkBnGqsBUaADRAkQAkABgCnBagAGAGcdKwFxoANECRACQAGAKcGKAAYAZx+rAZGgA0QJEAJAAYA5waoABgBnIisBsaADRAkQAkABgCnBygABoCnB2hQDRHZAZyWrAeGgA0QJEAJAAYBJwfoAAwFGAGcoawIBoANECRACQAGAOQALAJkAAYBJwfgAlsBnK+sCEaADRAkQAkABgDkACwGpAAGAScH4AJbAZy9rAiGgA0QJEAJACwI5AAGAScH6AAkACcJKgAnCWgAJwmoACcJ4AFnA2MBRAAMw5gBnNasCgaADRAkQAkABgBEio0R5EAJAGwKSAFGACcKqAAEgM0RCQGGAYSATRFZAZzshgAtCs0QCQAGAYSAjRFZAZz1hgAtCw0QCQAEAAgB7AtIAgYAJwqoAASATRBJAkYCRIANEZkBnYqEAgaBxQBOYAoBxQEOYQ0giQKGAmQABgAnC6ABRgBGgo0UhD/MQ8zECALEAgaBxQBOYAoBxQEOYQ0gpEAJAoYARoKNFIQ/zEPkAAgChgLGgkUATmBkgAaAJwuhAUaCjdQFAg5kTSTJAsQCBoHFAE5gCgHFAQ5hDSCkQAkChgBGgo0UhD/MQ+QACAKGAsaCRQCOYGSABoAnC6EBRoKN1AUEDmRNJMkCxgFGgsUPzmPkgAaCJwvhAU0wCQFGAUaCxQGOZISPzZPkQAaCJwvhAU0wCQFGAUaCxQMOZISPzZPkQAaCJwvhAU0wCQFGAUaCxQSOZISPzZPkQAaCJwvhAU0wCQFGAkSAzRBJAlz/B4FUAAAAwUYIAAIBSITFQkTERwABi0GHxITAAAJLwMSGRsXHxMZAAk0Fw8HFh4NAwUABhU1EBceDwAENBcUEAAGNBkTGRcBAAFKAAkvHg4PKz4aEwIAAUsACDIVHB0QEQ4YAAsuAzs7AAoPKToKDgAHMx8SGQUvMQABSAALORoVGCQgERcCAxoACAU3ABEXAgMaAAsFGDcAERcCAxoUCgABSQAGOA8LGBsPAAYYLwsYGw8AAU4ABD8QHAUAAU8ABSkbCQ4BAAFMAAktCh8eDgMHCw8AAU0ADT4TGjQsGQMaFA0FHhkAFz4TGjQsGQMaFA0FHhk1NBkCHgUbGBEPAAFCABg9GgkjIAEmOgUHDQ8eFSU5DggJAwEcAwUAAUMAAUAAAUEADQEtFw0FBwtdWxQTGSAACBwrAxUPBR4ZAAkqGgUDAwMVEQ0ACC4DJD8eAx8RAAQ5GhUYAAFGAAAABjYRExELBAACWhgAAVoAQAg/PTw0NxcQPCQ5C3JZEBs9fkcnDRcUAXZia0Q4EhQgXHojMBY3MWVCNT0uDhMXcGQ7AUFPHigkQUwQFkhaAkEACjkTEQspNBMZPC0ABjkTEQsrLQ==");
        var b = function (e) {
            return __g._encrypt(encodeURIComponent(e))
        };
        exports.ENCRYPT_VERSION = A, exports.default = b
    }


    function f1(c) {
        var C = new RegExp("d_c0=([^;]+)");
        var t = (C.exec(document.cookie) || [])[1];

        var r = '101_3_2.0', i = t, o = null;
        var s = [r, c, i, false, o].filter(Boolean).join("+");
        return s;
    }

    // call
    let e2 = {}, e3 = {};
    f2(e2);
    f3({}, e3);

    return {
        "md5": e2.exports,
        "enc": e3.default,
        "buildStr": f1,
    };
}

// ---biz---


// --- common biz ---

function processContinue() {
    document.body.classList.remove('ModalWrap-body');
    document.body.style.overflow = "auto";
    // question
    removeBySelector('div.Card.AnswersNavWrapper div.ModalWrap');
    // zvideo
    removeBySelector('#root > div > main > article > div.ModalWrap');
}

function addCommonStyle() {
    let style = `<style>
.CommentsForOia, #div-gpt-ad-bannerAd,div.Card.AnswersNavWrapper div.ModalWrap, .MobileModal-backdrop,
        .MobileModal--plain.ConfirmModal,.AdBelowMoreAnswers,div.Card.HotQuestions, button.OpenInAppButton.OpenInApp,
        .DownloadGuide-inner, .DownloadGuide, div.OpenInAppButton, div.Card.RelatedReadings {
        display: none;
    }
.CommentItemV2 {
    position: relative;
    -ms-flex-negative: 0;
    flex-shrink: 0;
    padding: 10px 5px;
    font-size: 15px
}
.CommentItemV2-time {
    float: right;
    font-size: 14px;
    color: #8590a6;
}
.CommentItemV2-avatar {
    margin-right: 8px;
}
.CommentItemV2-metaSibling {
    padding-left: 33px;
}
.CommentItemV2-content {
    margin-bottom: 6px;
    line-height: 25px;
}
.CommentItemV2-reply, .CommentItemV2-roleInfo, html[data-theme=dark] .CommentItemV2-reply, html[data-theme=dark] .CommentItemV2-roleInfo {
    color: #8590a6;
}
.NestComment .NestComment--child {
    position: relative;
    padding-left: 33px;
}
</style>`;
    addStyle(style);
}

function removeCommonBlock() {
    removeBySelector('button.OpenInAppButton');
    removeBySelector('.CommentsForOia');
}

function skipOpenApp() {
    log('run:skipOpenApp');
    // .ContentItem.AnswerItem
    // .RichContent.is-collapsed.RichContent--unescapable
    Array.prototype.forEach.call(document.querySelectorAll('.ContentItem.AnswerItem'), function (ele) {
        let elRichContentInner = ele.querySelector('.RichContent-inner');
        let button = ele.querySelector('button');

        if (button) {
            button.style.display = 'none';
        }
        if (elRichContentInner) {
            let elMTimeMeta = ele.querySelector('meta[itemprop="dateModified"]');
            let elCTimeMeta = ele.querySelector('meta[itemprop="dateCreated"]');

            if (elMTimeMeta && elCTimeMeta) {
                let mTime = elMTimeMeta.getAttribute('content').toString().split('T')[0];
                let cTime = elCTimeMeta.getAttribute('content').toString().split('T')[0];
                let elATime = elRichContentInner.parentElement.querySelector('.ContentItem-time');
                let url = elCTimeMeta.previousElementSibling.getAttribute('content');
                let mHtml = '';

                if (mTime !== cTime) {
                    mHtml = `<span class="my-updated-time">编辑于 ${mTime}</span>`;
                }
                let tmpHtml = `<div>
            <div class="ContentItem-time">
                <a target="_blank" href="${url}">
                    <span>发布于 ${cTime}</span>${mHtml}
                </a>
            </div>
            </div>`;
                if (elATime) {
                    elATime.remove();
                }
                elRichContentInner.insertAdjacentHTML('afterend', tmpHtml);
            }

            if (elRichContentInner.parentElement.classList.contains('is-collapsed')) {
                ele.classList.add('my-fold');
                setTimeout(function () {
                    elRichContentInner.insertAdjacentHTML('afterend', `<span class="my-more-btn">↓展开↓</span><span class="my-less-btn">↑收起↑</span>`);
                    elRichContentInner.parentElement.classList.remove('is-collapsed');
                    elRichContentInner.setAttribute("style", "");
                    processFold(elRichContentInner.parentElement);
                }, 1000);
            }

            forEachArray(elRichContentInner.querySelectorAll('.GifPlayer'), el => {
                el.addEventListener('click', () => {
                    let elImg = el.querySelector('img'),
                        elIcon = el.querySelector('svg'),
                        url = elImg.getAttribute('src').toString().replace('.jpg', '.webp');
                    if (elIcon) {
                        elImg.setAttribute('src', url);
                        elIcon.remove();
                    }
                });
            });

        }


        ele.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (elRichContentInner) {
                elRichContentInner.setAttribute("style", "");
            }
        });

        bindClickComment(ele.parentElement);
    });


}

function removeAds() {
    log('run:removeAds');
    Array.prototype.forEach.call(document.querySelectorAll('.MBannerAd'), function (ele) {
        ele.parentNode.removeChild(ele)
    });
}

function removeBlock() {
    log('run:removeBlock');
    removeBySelector('.MobileModal-backdrop');
    removeBySelector('.MobileModal--plain.ConfirmModal');
    removeBySelector('.AdBelowMoreAnswers');
    removeBySelector('div.Card.HotQuestions');
    hideBySelector('div.ModalWrap');

    let counter = 3;
    let interval = null;
    interval = setInterval(function () {
        forEachBySelector('iframe', ele => {
            if (!ele.getAttribute('src').toString().match(/^https?:\/\/[a-zA-Z0-9]+?\.?zhihu.com\//)) {
                ele.remove();
            }
        });
        counter--;
        if (counter < 0) {
            clearInterval(interval);
        }
    }, 1000);
}


function processContent(content) {
    if (!content)
        return '';
    var r = /<img src="data:image.+?"(.+?)data-actualsrc="(.+?)"\/>/g;
    return content.replace(r, '<img src="$2"$1/>');
}

function loadContent(offset, limit) {
    var path = `/api/v4/questions/${questionNumber}/answers?include=data%5B%2A%5D.is_normal%2Cadmin_closed_comment%2Creward_info%2Cis_collapsed%2Cannotation_action%2Cannotation_detail%2Ccollapse_reason%2Cis_sticky%2Ccollapsed_by%2Csuggest_edit%2Ccomment_count%2Ccan_comment%2Ccontent%2Ceditable_content%2Cattachment%2Cvoteup_count%2Creshipment_settings%2Ccomment_permission%2Ccreated_time%2Cupdated_time%2Creview_info%2Crelevant_info%2Cquestion%2Cexcerpt%2Cis_labeled%2Cpaid_info%2Cpaid_info_content%2Crelationship.is_authorized%2Cis_author%2Cvoting%2Cis_thanked%2Cis_nothelp%2Cis_recognized%3Bdata%5B%2A%5D.mark_infos%5B%2A%5D.url%3Bdata%5B%2A%5D.author.follower_count%2Cvip_info%2Cbadge%5B%2A%5D.topics%3Bdata%5B%2A%5D.settings.table_of_content.enabled&limit=${limit}&offset=${offset}&platform=desktop&sort_by=default`;

    var url = 'https://www.zhihu.com' + path;

    let myHeaders = new Headers();
    let s = zhihu().buildStr(path),
        md5 = zhihu().md5(s),
        s1 = zhihu().enc(md5);

    myHeaders.append('x-zse-93', '101_3_2.0');
    myHeaders.append('x-zse-96', "2.0_" + s1);

    const myInit = {
        method: 'GET',
        headers: myHeaders,
    };

    return fetch(url, myInit).then(response => response.json());
}

function genAnswerItemHtml(data) {
    var content = processContent(data.content);
    let upTimeHtml = '';
    if (getDate(data.created_time) !== getDate(data.updated_time)) {
        upTimeHtml = `<span class="my-updated-time">编辑于 ${formatDate(data.updated_time, 'yyyy-MM-dd')}</span>`;
    }

    var html = `<div class="List-item" tabindex="0" id="answer-${data.id}">
    <div class="ContentItem AnswerItem my-fold" data-za-index="0">
        <div class="ContentItem-meta">
            <div class="AuthorInfo AnswerItem-authorInfo AnswerItem-authorInfo--related" itemprop="author" itemscope=""
                 itemtype="http://schema.org/Person">
                <span class="UserLink AuthorInfo-avatarWrapper">
                    <a class="UserLink-link"
                       target="_blank"
                       href="//www.zhihu.com/people/${data.author.url_token}">
                        <img class="Avatar AuthorInfo-avatar" width="38" height="38"
                             src="${data.author.avatar_url_template}"
                             alt="">
                    </a>
                </span>
                <div class="AuthorInfo-content">
                    <div class="AuthorInfo-head">
                        <span class="UserLink AuthorInfo-name">
                        <a class="UserLink-link"
                           target="_blank"
                           href="//www.zhihu.com/people/${data.author.url_token}">${data.author.name}</a>
                        </span>
                    </div>
                    <div class="AuthorInfo-detail">
                        <div class="AuthorInfo-badge">
                            <div class="ztext AuthorInfo-badgeText">${data.author.headline}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <meta itemprop="image">
        <meta itemprop="upvoteCount" content="${data.voteup_count}">
        <meta itemprop="url" content="https://www.zhihu.com/question/${questionNumber}/answer/${data.id}">
        <meta itemprop="dateCreated" content="${formatDate(data.created_time, 'yyyy-MM-ddThh:mm:ss')}.000Z">
        <meta itemprop="dateModified" content="${formatDate(data.updated_time, 'yyyy-MM-ddThh:mm:ss')}.000Z">
        <meta itemprop="commentCount" content="${data.comment_count}">
        <div class="RichContent RichContent--unescapable">
            <div class="RichContent-inner RichContent-inner--collapsed">
                <span class="RichText ztext CopyrightRichText-richText" itemprop="text">
                ${content}
                </span>
            </div>
            <div>
            <div class="ContentItem-time">
                <a target="_blank" href="//www.zhihu.com/question/${questionNumber}/answer/${data.id}">
                    <span>发布于 ${formatDate(data.created_time, 'yyyy-MM-dd')}</span>${upTimeHtml}
                </a>
            </div>
            </div>

            <span class="my-more-btn">↓展开↓</span>
            <span class="my-less-btn">↑收起↑</span>

            <div class="ContentItem-actions">
                <span>
                    <button aria-label="赞同 ${formatNumber(data.voteup_count)}" type="button" class="Button VoteButton VoteButton--up">
                        <span style="display: inline-flex; align-items: center;">&#8203;
                            <svg class="Zi Zi--TriangleUp VoteButton-TriangleUp" fill="currentColor" viewBox="0 0 24 24"
                                 width="10" height="10">
                            <path d="M2 18.242c0-.326.088-.532.237-.896l7.98-13.203C10.572 3.57 11.086 3 12 3c.915 0 1.429.571 1.784 1.143l7.98 13.203c.15.364.236.57.236.896 0 1.386-.875 1.9-1.955 1.9H3.955c-1.08 0-1.955-.517-1.955-1.9z"
                                  fill-rule="evenodd"></path></svg>
                        </span>赞同 ${formatNumber(data.voteup_count)}
                    </button>
                    <button aria-label="反对" type="button"
                            class="Button VoteButton VoteButton--down VoteButton--mobileDown">
                        <span style="display: inline-flex; align-items: center;">&#8203;
                        <svg class="Zi Zi--TriangleDown" fill="currentColor" viewBox="0 0 24 24" width="10" height="10"><path
                                d="M20.044 3H3.956C2.876 3 2 3.517 2 4.9c0 .326.087.533.236.896L10.216 19c.355.571.87 1.143 1.784 1.143s1.429-.572 1.784-1.143l7.98-13.204c.149-.363.236-.57.236-.896 0-1.386-.876-1.9-1.956-1.9z"
                                fill-rule="evenodd"></path></svg>
                    </span>
                    </button>
                </span>
                <button type="button"
                        class="Button ContentItem-action Button--plain Button--withIcon Button--withLabel"><span
                        style="display: inline-flex; align-items: center;">&#8203;<svg class="Zi Zi--Comment Button-zi"
                                                                                       fill="currentColor"
                                                                                       viewBox="0 0 24 24" width="1.2em"
                                                                                       height="1.2em"><path
                        d="M10.241 19.313a.97.97 0 0 0-.77.2 7.908 7.908 0 0 1-3.772 1.482.409.409 0 0 1-.38-.637 5.825 5.825 0 0 0 1.11-2.237.605.605 0 0 0-.227-.59A7.935 7.935 0 0 1 3 11.25C3 6.7 7.03 3 12 3s9 3.7 9 8.25-4.373 9.108-10.759 8.063z"
                        fill-rule="evenodd"></path></svg></span>评论 ${formatNumber(data.comment_count)}
                </button>
                <button type="button" class="Button ContentItem-action Button--plain Button--withIcon Button--iconOnly">
                    <span style="display: inline-flex; align-items: center;">&#8203;<svg class="Zi Zi--Star Button-zi"
                                                                                         fill="currentColor"
                                                                                         viewBox="0 0 24 24"
                                                                                         width="1.2em" height="1.2em"><path
                            d="M5.515 19.64l.918-5.355-3.89-3.792c-.926-.902-.639-1.784.64-1.97L8.56 7.74l2.404-4.871c.572-1.16 1.5-1.16 2.072 0L15.44 7.74l5.377.782c1.28.186 1.566 1.068.64 1.97l-3.89 3.793.918 5.354c.219 1.274-.532 1.82-1.676 1.218L12 18.33l-4.808 2.528c-1.145.602-1.896.056-1.677-1.218z"
                            fill-rule="evenodd"></path></svg></span></button>
            </div>
        </div>
    </div>
</div>`;
    return html;
}


function genVideoHtml(videoId) {
    if (!videoId)
        return '';

    var html = `<div class="RichText-video" data-za-detail-view-path-module="VideoItem" data-za-extra-module="{&quot;card&quot;:{&quot;content&quot;:{&quot;type&quot;:&quot;Video&quot;,&quot;sub_type&quot;:&quot;SelfHosted&quot;,&quot;video_id&quot;:&quot;${videoId}&quot;,&quot;is_playable&quot;:true}}}">
    <div class="VideoCard VideoCard--interactive VideoCard--mobile">
        <div class="VideoCard-layout">
            <div class="VideoCard-video">
                <div class="VideoCard-video-content">
                    <div class="VideoCard-player"><iframe frameborder="0" allowfullscreen="" src="https://www.zhihu.com/video/${videoId}?autoplay=false&amp;useMSE="></iframe></div>
                </div>
            </div>
        </div>
        <div class="VideoCard-mask"></div>
    </div>
</div>
`;
    return html;
}

function processVideo(elAncestor) {
    if (elAncestor) {
        forEachArray(elAncestor.querySelectorAll('a.video-box'), el => {
            let videoId = el.dataset.lensId;
            if (videoId) {
                let html = genVideoHtml(videoId);
                let div = document.createElement('div');
                div.innerHTML = html;
                el.insertAdjacentElement('afterend', div);
                el.parentElement.removeChild(el);
            }
        });
    }
}

function getListWrap() {
    if (!elList) {
        elList = document.querySelectorAll('.Question-main .List');
        if (elList)
            elList = elList[elList.length - 1];
    }
    return elList;
}

function loadAnswer() {
    if (is_end || is_loading_answer) {
        return;
    }
    if (elLoading) {
        elLoading.classList.remove('hide');
    }
    is_loading_answer = 1;
    log('to load', offset, limit);
    loadContent(offset, limit).then(function (data) {
        if (elLoading) {
            elLoading.classList.add('hide');
        }
        log('get data:', offset, limit);
        if (data.paging.is_end) {
            is_end = 1;
        }
        offset += data.data.length;
        let elListWrap = getListWrap();
        if (elListWrap) {
            data.data.forEach(function (item) {
                if (!load_answer_id_map[item.id]) {
                    load_answer_id_map[item.id] = 1;
                    let elListItemWrap = document.createElement('div');
                    elListItemWrap.innerHTML = genAnswerItemHtml(item);
                    elListWrap.insertAdjacentElement("beforeend", elListItemWrap);
                    processFold(elListItemWrap.querySelector('.RichContent'));
                    bindClickComment(elListItemWrap);
                    processAHref(elListItemWrap);
                    processVideo(elListItemWrap);
                } else {
                    log('duplicate answer', item.id)
                }
            });
            if (is_end) {
                let html = '<div style="text-align: center; padding: 10px;">全部回答已加载完成...</div>'
                elListWrap.insertAdjacentHTML("beforeend", html);
            }
        } else {
            console.warn('elListWrap empty');
        }
    }).catch(function (err) {
        console.error('load failed', err)
    }).then(function () {
        is_loading_answer = 0;
        log('loading finish')
    })
}


function addViewportCheckList(elListItem) {
    if (elListItem) {
        viewportElCheckList.push(elListItem);
    }
}

function removeViewportCheckList(elListItem) {
    viewportElCheckList.forEach(function (v, i) {
        if (v === elListItem) {
            viewportElCheckList.splice(i, 1);
        }
    })
}

function processFold(elRichContent) {
    var elMoreBtn = elRichContent.querySelector('.my-more-btn');
    var elLessBtn = elRichContent.querySelector('.my-less-btn');
    var elContentItem = elLessBtn.closest('.ContentItem');
    if (elMoreBtn && elLessBtn && elContentItem) {
        let height = getElementHeight(elRichContent);
        if (height > 0 && height < 400 && elRichContent.querySelectorAll('img').length < 2) {
            elContentItem.classList.remove('my-fold');
            elMoreBtn.remove();
            elLessBtn.remove();
        } else {
            elMoreBtn.addEventListener('click', function (e) {
                elContentItem.classList.add('my-unfold');
                elContentItem.classList.remove('my-fold');
                addViewportCheckList(elContentItem);
            });
            elLessBtn.addEventListener('click', function (e) {
                elContentItem.classList.add('my-fold');
                elContentItem.classList.remove('my-unfold');

                removeViewportCheckList(elContentItem);
                window.scrollTo(0, elContentItem.closest('.List-item').offsetTop);
            });
        }
    }
}

function bindLoadData() {
    log('run:bindLoadData');
    var el;
    if (inDetailPage) {
        el = document.querySelector('.Card.ViewAll');
        if (!el) {
            console.warn('bindLoadData failed');
            return;
        }
        el.style.textAlign = "center";
        el.innerHTML = '<a class="QuestionMainAction ViewAll-QuestionMainAction" style="padding: 10px;" href="'+location.href.replace(/\/answer.+/,'')+'">查看所有回答<a>';
        return;
    }
    document.querySelectorAll('.Card').forEach(function (elCard) {
        if (!el && elCard.classList && elCard.classList.length === 1) {
            el = elCard;
        }
    });
    if (!el) {
        console.warn('bindLoadData failed');
        return;
    }
    el.insertAdjacentHTML('afterend', `<div id="my-loading" class="hide"><div class="loadingio-spinner-dual-ring-41hxycfuw5t"><div class="ldio-4crll70kj">
<div></div><div><div></div></div>
</div></div></div>`);

    elLoading = document.getElementById('my-loading');
    window.onscroll = function() {
        if (is_end) {
            return;
        }
        if ((window.innerHeight + window.scrollY + 100) >= document.body.offsetHeight) {
            log('reach bottom');
            loadAnswer();
        }
    };
}

function bindProcessViewport() {
    log('run:bindProcessViewport');
    var interval;
    document.addEventListener('scroll', function () {
        if (interval) {
            clearTimeout(interval);
        }
        interval = setTimeout(function () {
            // log('scroll-view:', viewportElCheckList.length);
            if (viewportElCheckList.length) {
                viewportElCheckList.forEach(function (elListItem) {
                    var elLessBtn = elListItem.querySelector('.my-less-btn');
                    if (isElementInViewport(elListItem)) {
                        elLessBtn.classList.remove('hide');
                    } else {
                        elLessBtn.classList.add('hide');
                    }
                });
            }
        }, 100);
    }, false);
}

function loadCommentData(answerId, offset, isReverse) {
    if (!answerId) {
        return;
    }
    let url = `https://www.zhihu.com/api/v4/answers/${answerId}/root_comments?limit=10&offset=${offset}&order=normal&status=open`;
    if (isReverse)
        url = `https://www.zhihu.com/api/v4/answers/${answerId}/comments?limit=10&offset=${offset}&order=reverse&status=open`;
    return fetch(url).then(response => response.json());
}

function bindClickComment(elListItem) {
    if (!elListItem)
        return;
    let elButton = elListItem.querySelector('button.ContentItem-action.Button--withLabel');
    let elComment = elListItem.querySelector('.Comments-container');

    if (!elButton) {
        let elContentItemActions = elListItem.querySelector('.ContentItem-actions');
        if (!elContentItemActions) {
            console.warn('bindClickComment failed');
            return;
        }
        let metaComment = elContentItemActions.parentElement.previousElementSibling.parentElement.querySelector('meta[itemprop="commentCount"]');
        let commentCount = metaComment && metaComment.getAttribute('content') || '';
        elButton = document.createElement('span');
        elButton.innerHTML = `<button type="button" class="Button ContentItem-action Button--plain Button--withIcon Button--withLabel"><span style="display: inline-flex; align-items: center;">&ZeroWidthSpace;<svg class="Zi Zi--Comment Button-zi" fill="currentColor" viewBox="0 0 24 24" width="1.2em" height="1.2em"><path d="M10.241 19.313a.97.97 0 0 0-.77.2 7.908 7.908 0 0 1-3.772 1.482.409.409 0 0 1-.38-.637 5.825 5.825 0 0 0 1.11-2.237.605.605 0 0 0-.227-.59A7.935 7.935 0 0 1 3 11.25C3 6.7 7.03 3 12 3s9 3.7 9 8.25-4.373 9.108-10.759 8.063z" fill-rule="evenodd"></path></svg></span> 评论 ${commentCount}</button>`;
        elContentItemActions.appendChild(elButton);
    }

    elButton.addEventListener('click', function () {
        if (elComment) {
            elComment.classList.toggle('hide');
        } else {
            let answerId = (elListItem.querySelector('.ContentItem-meta ~ meta[itemprop="url"]').getAttribute('content').match(/\/answer\/(\d+)/) || [])[1];
            elComment = addCommentWrap(elListItem, answerId);

            let elCommentWrap = elComment.querySelector('.CommentListV2');
            let elSwitchBtn = elComment.querySelector('div.Topbar-options > button');
            let elCommentFold = elComment.querySelector('a.comment-fold');

            elComment.dataset.answerId = answerId;
            elComment.dataset.offset = "0";

            processComment(elComment, elCommentWrap);

            elCommentWrap.addEventListener('scroll', function(){
                if (elCommentWrap.scrollTop + elCommentWrap.offsetHeight + 100 > elCommentWrap.scrollHeight) {
                    processComment(elComment, elCommentWrap);
                }
            }, false);

            elSwitchBtn.addEventListener('click', function(){
                if (elSwitchBtn.innerText === '切换为时间排序') {
                    elSwitchBtn.innerText = '切换为默认排序';
                    elComment.dataset.isReverse = "0";
                } else {
                    elSwitchBtn.innerText = '切换为时间排序';
                    elComment.dataset.isReverse = "1";
                }
                elComment.dataset.offset = "0";
                elComment.dataset.isEnd = "0";
                elCommentWrap.innerHTML = '';
                processComment(elComment, elCommentWrap);
            });

            elCommentFold.addEventListener('click', function(){
                elComment.classList.add('hide');
            });

        }
    });
}

function addCommentWrap(elListItem, answerId) {
    if (!elListItem)
        return;
    var commentCount = elListItem.querySelector('meta[itemprop="commentCount"]').getAttribute('content');
    let html = `<div class="Comments-container" id="comment-block-${answerId}">
    <div class="CommentsV2 CommentsV2--withEditor">
        <div class="Topbar CommentTopbar">
            <div class="Topbar-title"><h2 class="CommentTopbar-title">${commentCount} 条评论</h2></div>
            <div class="Topbar-options">
                <button type="button" class="Button Button--plain Button--withIcon Button--withLabel">
                    <span style="display: inline-flex; align-items: center;">&#8203;
                        <svg class="Zi Zi--Switch Button-zi" fill="currentColor" viewBox="0 0 24 24" width="1.2em" height="1.2em">
                            <path d="M13.004 7V4.232c0-.405.35-.733.781-.733.183 0 .36.06.501.17l6.437 5.033c.331.26.376.722.1 1.033a.803.803 0 0 1-.601.264H2.75a.75.75 0 0 1-.75-.75V7.75A.75.75 0 0 1 2.75 7h10.254zm-1.997 9.999v2.768c0 .405-.35.733-.782.733a.814.814 0 0 1-.5-.17l-6.437-5.034a.702.702 0 0 1-.1-1.032.803.803 0 0 1 .6-.264H21.25a.75.75 0 0 1 .75.75v1.499a.75.75 0 0 1-.75.75H11.007z" fill-rule="evenodd"></path></svg>
                    </span>切换为时间排序
                </button>
            </div>
        </div>
        <a class="comment-fold">收起</a>
        <div class="CommentListV2">
        </div>
    </div>
</div>`;
    elListItem.insertAdjacentHTML("beforeend", html);
    return elListItem.querySelector('.Comments-container');
}

function genCommentHtml(dataList) {
    if (!dataList || !dataList.length)
        return '';
    let html = '';
    dataList.forEach(function(data) {
        let liClass = data.child_comment_count ? 'rootComment' : 'rootCommentNoChild';
        let tmp = genCommentItemHtml(data, liClass);
        if (data.child_comment_count) {
            data.child_comments.forEach(function (v) {
                tmp += genCommentItemHtml(v, 'child');
            });
        }
        html += `<ul class="NestComment">${tmp}</ul>`;
    });
    return html;
}


function genCommentItemHtml(item, liClass) {
    var replyHtml = '';
    if (item.reply_to_author) {
        if (item.author && item.author.role === 'author') {
            replyHtml += `<span class="CommentItemV2-roleInfo"> (作者) </span>`;
        }
        replyHtml += `
<span class="CommentItemV2-reply">回复</span>
<span class="UserLink">
    <a class="UserLink-link" data-za-detail-view-element_name="User" target="_blank"
    href="//www.zhihu.com/people/${item.reply_to_author.member.url_token}">${item.reply_to_author.member.name}</a>
</span>`;
    }
    var html = `<li class="NestComment--${liClass}">
        <div class="CommentItemV2">
            <div>
                <div class="CommentItemV2-meta">
                    <span class="UserLink CommentItemV2-avatar">
                        <a class="UserLink-link" data-za-detail-view-element_name="User" target="_blank"
                           href="//www.zhihu.com/people/${item.author.member.url_token}">
                            <img class="Avatar UserLink-avatar"
                                 width="24" height="24"
                                 src="${formatUrl(item.author.member.avatar_url_template, 's')}"
                                 srcset="${formatUrl(item.author.member.avatar_url_template, 'xs')} 2x"
                                 alt="${item.author.member.name}">
                        </a>
                    </span>
                    <span class="UserLink">
                        <a class="UserLink-link" data-za-detail-view-element_name="User"
                           target="_blank" href="//www.zhihu.com/people/${item.author.member.url_token}">${item.author.member.name}
                        </a>
                    </span>${replyHtml}
                    <span class="CommentItemV2-time">${getDate(item.created_time)}</span>
                </div>
                <div class="CommentItemV2-metaSibling">
                    <div class="CommentRichText CommentItemV2-content">
                        <div class="RichText ztext">${item.content}</div>
                    </div>
                    <div class="CommentItemV2-footer">
                        <button type="button" class="Button CommentItemV2-likeBtn Button--plain"><span
                                style="display: inline-flex; align-items: center;">&#8203;<svg
                                class="Zi Zi--Like" fill="currentColor" viewBox="0 0 24 24" width="16"
                                height="16" style="margin-right: 5px;"><path
                                d="M14.445 9h5.387s2.997.154 1.95 3.669c-.168.51-2.346 6.911-2.346 6.911s-.763 1.416-2.86 1.416H8.989c-1.498 0-2.005-.896-1.989-2v-7.998c0-.987.336-2.032 1.114-2.639 4.45-3.773 3.436-4.597 4.45-5.83.985-1.13 3.2-.5 3.037 2.362C15.201 7.397 14.445 9 14.445 9zM3 9h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z"
                                fill-rule="evenodd"></path></svg></span>${item.vote_count}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </li>`;
    return html;
}

function genCommentLoding() {
    var html = `<div>
    <div class="PlaceHolder CommentItemV2">
        <div class="PlaceHolder-inner">
            <div class="PlaceHolder-bg"></div>
            <svg width="656" height="44" viewBox="0 0 656 44" class="PlaceHolder-mask">
                <path d="M0 0h656v44H0V0zm0 0h480v12H0V0zm0 32h238v12H0V32z" fill="currentColor"
                      fill-rule="evenodd"></path>
            </svg>
        </div>
    </div>
</div>`;
    var el = document.createElement('div');
    el.innerHTML = html;
    return el;
}

function processComment(elComment, elCommentWrap) {
    if (!elComment || !elCommentWrap || is_loading_comment) {
        return;
    }
    let offset = +elComment.dataset.offset,
        answerId = elComment.dataset.answerId,
        isReverse = +elComment.dataset.isReverse,
        isEnd = +elComment.dataset.isEnd
    ;
    if (!answerId || isEnd) {
        return;
    }

    log('beginLoadComment', offset);
    is_loading_comment = 1;
    let elLoading = genCommentLoding();
    elCommentWrap.appendChild(elLoading);
    loadCommentData(answerId, offset, isReverse).then(function (json) {
        log('getCommentData', offset);
        elComment.dataset.offset = offset + 10;
        elCommentWrap.removeChild(elLoading);
        elLoading = null;
        let html = genCommentHtml(json.data);
        if (json.paging.is_end) {
            elComment.dataset.isEnd = "1";
            html += '<div style="text-align: center; padding: 10px;">全部评论已加载完成...</div>'
        }
        elCommentWrap.insertAdjacentHTML('beforeend', html);
        processAHref(elCommentWrap);
    }).catch(function (err) {
        console.warn('load comment failed', err);
    }).then(function () {
        is_loading_comment = 0;
        elLoading = null;
    });
}

function processAHref(elAncestor) {
    log('run:processAHref');
    if (elAncestor) {
        forEachArray(
            elAncestor.querySelectorAll('a[href^="https://link.zhihu.com/"]'),
            ele => {
                ele.setAttribute('href', decodeURIComponent(ele.getAttribute('href').replace('https://link.zhihu.com/?target=', '')));
                ele.setAttribute('target', '_blank');
                stopPropagation(ele);
            }
        );
        forEachArray(
            elAncestor.querySelectorAll('a[href^="https://"],a[href^="http://"]'),
            ele => stopPropagation(ele)
        )
    }
}

function processAllLink() {
    // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    processAHref(document);
    observerAddNodes(document, el => processAHref(el));
}

function addCss() {
    log('run:addCss');
    var style = `
<style type="text/css">
    .my-fold .RichContent-inner {
        max-height: 400px;
    }
    .my-fold .my-more-btn {
        display: block;
    }
    .my-fold .my-less-btn {
        display:none;
    }
    .my-unfold .RichContent-inner {
        max-height: none;
    }
    .my-unfold .my-more-btn {
        display: none;
    }
    .my-unfold .my-less-btn {
        display: block;
    }

    .my-more-btn {
        float: right;
        padding: 0 10px 10px 10px;
    }
    .my-less-btn {
        position: fixed;
        top: 80px;
        right: 10px;
        padding: 0 10px 10px 10px;
        z-index: 2;
        color: black;
        text-shadow: 1px 1px 1px white;
    }
    #my-loading {
        text-align: center;
        padding-bottom: 10px;
    }
    .hide, .my-less-btn.hide {
        display: none;
    }
    .CommentListV2 {
        max-height: 500px;
        overflow-y: scroll;
    }
    a.comment-fold {
        position: fixed;
        right: 10px;
        bottom: 30%;
        padding: 10px;
        z-index: 2;
    }
    .my-updated-time {
        margin-left: 10px;
    }
    
</style>
<style type="text/css">
@keyframes ldio-4crll70kj {
  0% { transform: rotate(0) }
  100% { transform: rotate(360deg) }
}
.ldio-4crll70kj div { box-sizing: border-box!important }
.ldio-4crll70kj > div {
  position: absolute;
  width: 76px;
  height: 76px;
  top: 12px;
  left: 12px;
  border-radius: 50%;
  border: 8px solid #000;
  border-color: #fe718d transparent #fe718d transparent;
  animation: ldio-4crll70kj 1.4925373134328357s linear infinite;
}
.ldio-4crll70kj > div:nth-child(2) { border-color: transparent }
.ldio-4crll70kj > div:nth-child(2) div {
  position: absolute;
  width: 100%;
  height: 100%;
  transform: rotate(45deg);
}
.ldio-4crll70kj > div:nth-child(2) div:before, .ldio-4crll70kj > div:nth-child(2) div:after {
  content: "";
  display: block;
  position: absolute;
  width: 8px;
  height: 8px;
  top: -8px;
  left: 26px;
  background: #fe718d;
  border-radius: 50%;
  box-shadow: 0 68px 0 0 #fe718d;
}
.ldio-4crll70kj > div:nth-child(2) div:after {
  left: -8px;
  top: 26px;
  box-shadow: 68px 0 0 0 #fe718d;
}
.loadingio-spinner-dual-ring-41hxycfuw5t {
  width: 54px;
  height: 54px;
  display: inline-block;
  overflow: hidden;
  background: none;
}
.ldio-4crll70kj {
  width: 100%;
  height: 100%;
  position: relative;
  transform: translateZ(0) scale(0.54);
  backface-visibility: hidden;
  transform-origin: 0 0; /* see note above */
}
.ldio-4crll70kj div { box-sizing: content-box; }
/* generated by https://loading.io/ */
</style>
    `;
    addStyle(style);
}

function processHomePage() {
    function processBtn(objBtn) {
        if (!objBtn || objBtn.innerText.indexOf('内查看') === -1)
            return;
        let elParent = objBtn.parentNode;

        let elContentItem = objBtn.closest('.ContentItem');
        let elUrl = elContentItem && elContentItem.querySelector('meta[itemprop="url"]');
        let url = '';
        if (elUrl && elUrl.getAttribute("content")) {
            url = elUrl.getAttribute("content");
            let elNew = document.createElement('a');
            elNew.className = "Button ContentItem-more Button--plain";
            elNew.href = url;
            elNew.target="_blank";
            elNew.innerText = "打开详情";
            elParent.replaceChild(elNew, objBtn);
            stopPropagation(elNew);
        }
    }

    function processBtnAll(targetNode) {
        if (targetNode) {
            forEachArray(
                targetNode.querySelectorAll('button.ContentItem-more'),
                el => processBtn(el)
            );
        }
    }
    processBtnAll(document);
    observerAddNodes(document.querySelector('.TopstoryMain'), el => processBtnAll(el))
}

function processDetail() {
    setTimeout(function () {
        addCss();
        skipOpenApp();
        bindProcessViewport();
    }, 200);
    setTimeout(function () {
        removeAds();
        removeBlock();
        processAHref(document);
        let list_item = document.querySelectorAll('.List-item');
        offset += list_item.length;
        forEachArray(list_item, function (ele) {
            let zop = ele.dataset && ele.dataset.zop;
            if (zop) {
                try {
                    let t = JSON.parse(zop);
                    if (t.itemId) {
                        load_answer_id_map[t.itemId] = 1;
                    }
                } catch (e) {
                    console.error(e)
                }
            }
        });
        bindLoadData();
    }, 1000);
}

function processZvideo() {
    setTimeout(function () {
        observerAddNodes(document.querySelector('.ZVideoRecommendationList'), el => processAHref(el));
    }, 500);
}

// init
if (fromMobile) {
    if (questionNumber || inDetailPage) {
        processDetail();
    } else if (inHomePage) {
        processHomePage();
    } else if (inZvideo) {
        processZvideo();
    }

    setTimeout(function () {
        addCommonStyle();
        processContinue();
    }, 500);

    setTimeout(function () {
        removeCommonBlock();
        processAHref(document);
    }, 1000);
} else {
    setTimeout(processAllLink, 500);
}
