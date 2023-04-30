// ==UserScript==
// @name        知乎手机网页版改进
// @namespace   https://www.zhihu.com/
// @match       https://www.zhihu.com/
// @match       https://www.zhihu.com/?*
// @match       https://www.zhihu.com/question/*
// @match       https://www.zhihu.com/zvideo/*
// @match       https://zhuanlan.zhihu.com/p/*
// @grant       none
// @version     1.4.3
// @author      nameldk
// @description 使手机网页版可以加载更多答案
// @note        2023.04.30  v1.4.3 修复加载状态条不显示的问题。
// @note        2023.03.31  v1.4.2 修改展开、收起图标。隐藏专栏悬浮按钮。
// @note        2022.10.30  v1.4.1 避免页面切换时直接替换页面内容时绑定的事件消息，所以点击标题链接时重新加载页面(简单粗暴)。
// @note        2022.09.29  v1.4.0 获取回答使用新接口。
// @note        2022.09.20  v1.3.8 隐藏VIP推荐。
// @note        2022.08.05  v1.3.7 处理页面回答折叠未显示的问题。
// @note        2022.07.17  v1.3.6 处理LinkCard点击无效的问题。添加IP信息。显示评论表情。
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
const inZhuanlan = location.href.match(/zhuanlan\.zhihu\.com\/p\/\d+/)
const fromMobile = navigator.userAgent.match(/Android|iPhone|iPod|Opera Mini|IEMobile/i);

var is_end = 0;
var is_loading_answer = 0;
var is_loading_comment = 0;
var load_answer_id_map = {};
var EMOJI_URL_MAP = null;
var elList = null;
var elLoading = null;
var viewportElCheckList = [];
var debug = 0;
var init_done = 0;
var answer_next_url = null;
var _log_counter = 0;
var log = debug ? function () {
    return console.log.apply(console, ['mylog', ++_log_counter, new Date().toLocaleTimeString().substring(0,8)
    ].concat([].slice.call(arguments)));
} : function(){};


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

function hideByAddCss(s) {
    addStyle(`<style>${s}{display:none;}</style>`)
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
                log('got_addNode', mutation.addedNodes.length, mutation.addedNodes);
                forEachArray(mutation.addedNodes, el => cb(el));
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}

function getEmojiImg(e) {
    if (!EMOJI_URL_MAP) {
        makeEmojiMap();
    }
    var t = EMOJI_URL_MAP[e];
    return t ? '<img data-zhihu-emoticon="'.concat(e, '" src="').concat(t, '" alt="').concat(e, '" />') : e;
}

function makeEmojiMap() {
    const EMOTICON_EMOJI = [{"static_image_url":"https://pic2.zhimg.com/v2-6fe2283baa639ae1d7c024487f1d68c7.png","title":"谢邀","placeholder":"[谢邀]"},{"static_image_url":"https://pic2.zhimg.com/v2-419a1a3ed02b7cfadc20af558aabc897.png","title":"赞同","placeholder":"[赞同]"},{"static_image_url":"https://pic4.zhimg.com/v2-66e5de3da039ac969d3b9d4dc5ef3536.png","title":"蹲","placeholder":"[蹲]"},{"static_image_url":"https://pic1.zhimg.com/v2-0942128ebfe78f000e84339fbb745611.png","title":"爱","placeholder":"[爱]"},{"static_image_url":"https://pic4.zhimg.com/v2-52f8c87376792e927b6cf0896b726f06.png","title":"害羞","placeholder":"[害羞]"},{"static_image_url":"https://pic2.zhimg.com/v2-72b9696632f66e05faaca12f1f1e614b.png","title":"好奇","placeholder":"[好奇]"},{"static_image_url":"https://pic4.zhimg.com/v2-bffb2bf11422c5ef7d8949788114c2ab.png","title":"思考","placeholder":"[思考]"},{"static_image_url":"https://pic4.zhimg.com/v2-c96dd18b15beb196b2daba95d26d9b1c.png","title":"酷","placeholder":"[酷]"},{"static_image_url":"https://pic1.zhimg.com/v2-3ac403672728e5e91f5b2d3c095e415a.png","title":"大笑","placeholder":"[大笑]"},{"static_image_url":"https://pic1.zhimg.com/v2-3700cc07f14a49c6db94a82e989d4548.png","title":"微笑","placeholder":"[微笑]"},{"static_image_url":"https://pic1.zhimg.com/v2-b62e608e405aeb33cd52830218f561ea.png","title":"捂脸","placeholder":"[捂脸]"},{"static_image_url":"https://pic4.zhimg.com/v2-0e26b4bbbd86a0b74543d7898fab9f6a.png","title":"捂嘴","placeholder":"[捂嘴]"},{"static_image_url":"https://pic4.zhimg.com/v2-3bb879be3497db9051c1953cdf98def6.png","title":"飙泪笑","placeholder":"[飙泪笑]"},{"static_image_url":"https://pic2.zhimg.com/v2-f3b3b8756af8b42bd3cb534cbfdbe741.png","title":"耶","placeholder":"[耶]"},{"static_image_url":"https://pic1.zhimg.com/v2-aa15ce4a2bfe1ca54c8bb6cc3ea6627b.png","title":"可怜","placeholder":"[可怜]"},{"static_image_url":"https://pic2.zhimg.com/v2-3846906ea3ded1fabbf1a98c891527fb.png","title":"惊喜","placeholder":"[惊喜]"},{"static_image_url":"https://pic4.zhimg.com/v2-dd613c7c81599bcc3085fc855c752950.png","title":"流泪","placeholder":"[流泪]"},{"static_image_url":"https://pic1.zhimg.com/v2-41f74f3795489083630fa29fde6c1c4d.png","title":"大哭","placeholder":"[大哭]"},{"static_image_url":"https://pic4.zhimg.com/v2-6a976b21fd50b9535ab3e5b17c17adc7.png","title":"生气","placeholder":"[生气]"},{"static_image_url":"https://pic4.zhimg.com/v2-0d9811a7961c96d84ee6946692a37469.png","title":"惊讶","placeholder":"[惊讶]"},{"static_image_url":"https://pic1.zhimg.com/v2-76c864a7fd5ddc110965657078812811.png","title":"调皮","placeholder":"[调皮]"},{"static_image_url":"https://pic1.zhimg.com/v2-d6d4d1689c2ce59e710aa40ab81c8f10.png","title":"衰","placeholder":"[衰]"},{"static_image_url":"https://pic2.zhimg.com/v2-7f09d05d34f03eab99e820014c393070.png","title":"发呆","placeholder":"[发呆]"},{"static_image_url":"https://pic1.zhimg.com/v2-4e025a75f219cf79f6d1fda7726e297f.png","title":"机智","placeholder":"[机智]"},{"static_image_url":"https://pic4.zhimg.com/v2-f80e1dc872d68d4f0b9ac76e8525d402.png","title":"嘘","placeholder":"[嘘]"},{"static_image_url":"https://pic3.zhimg.com/v2-b779f7eb3eac05cce39cc33e12774890.png","title":"尴尬","placeholder":"[尴尬]"},{"static_image_url":"https://pic1.zhimg.com/v2-c65aaaa25730c59f5097aca04e606d88.png","title":"小情绪","placeholder":"[小情绪]"},{"static_image_url":"https://pic1.zhimg.com/v2-132ab52908934f6c3cd9166e51b99f47.png","title":"为难","placeholder":"[为难]"},{"static_image_url":"https://pic4.zhimg.com/v2-74ecc4b114fce67b6b42b7f602c3b1d6.png","title":"吃瓜","placeholder":"[吃瓜]"},{"static_image_url":"https://pic2.zhimg.com/v2-58e3ec448b58054fde642914ebb850f9.png","title":"语塞","placeholder":"[语塞]"},{"static_image_url":"https://pic3.zhimg.com/v2-4e4870fc6e57bb76e7e5924375cb20b6.png","title":"看看你","placeholder":"[看看你]"},{"static_image_url":"https://pic2.zhimg.com/v2-1043b00a7b5776e2e6e1b0af2ab7445d.png","title":"撇嘴","placeholder":"[撇嘴]"},{"static_image_url":"https://pic2.zhimg.com/v2-e6270881e74c90fc01994e8cd072bd3a.png","title":"魔性笑","placeholder":"[魔性笑]"},{"static_image_url":"https://pic1.zhimg.com/v2-99bb6a605b136b95e442f5b69efa2ccc.png","title":"潜水","placeholder":"[潜水]"},{"static_image_url":"https://pic4.zhimg.com/v2-6551348276afd1eaf836551b93a94636.png","title":"口罩","placeholder":"[口罩]"},{"static_image_url":"https://pic2.zhimg.com/v2-c99cdc3629ff004f83ff44a952e5b716.png","title":"开心","placeholder":"[开心]"},{"static_image_url":"https://pic4.zhimg.com/v2-8a8f1403a93ddd0a458bed730bebe19b.png","title":"滑稽","placeholder":"[滑稽]","id":"1114211774655778817"},{"static_image_url":"https://pic4.zhimg.com/v2-ca0015e8ed8462cfce839fba518df585.png","title":"笑哭","placeholder":"[笑哭]"},{"static_image_url":"https://pic2.zhimg.com/v2-d4f78d92922632516769d3f2ce055324.png","title":"白眼","placeholder":"[白眼]"},{"static_image_url":"https://pic2.zhimg.com/v2-9ab384e3947547851cb45765e6fc1ea8.png","title":"红心","placeholder":"[红心]"},{"static_image_url":"https://pic4.zhimg.com/v2-a8f46a21217d58d2b4cdabc4568fde15.png","title":"柠檬","placeholder":"[柠檬]"},{"static_image_url":"https://pic2.zhimg.com/v2-3e36d546a9454c8964fbc218f0db1ff8.png","title":"拜托","placeholder":"[拜托]"},{"static_image_url":"https://pic2.zhimg.com/v2-f5aa165e86b5c9ed3b7bee821da59365.png","title":"握手","placeholder":"[握手]"},{"static_image_url":"https://pic1.zhimg.com/v2-c71427010ca7866f9b08c37ec20672e0.png","title":"赞","placeholder":"[赞]"},{"static_image_url":"https://pic1.zhimg.com/v2-d5c0ed511a09bf5ceb633387178e0d30.png","title":"发火","placeholder":"[发火]"},{"static_image_url":"https://pic4.zhimg.com/v2-395d272d5635143119b1dbc0b51e05e4.png","title":"不抬杠","placeholder":"[不抬杠]"},{"static_image_url":"https://pic2.zhimg.com/v2-cb191a92f1296e33308b2aa16f61bfb9.png","title":"种草","placeholder":"[种草]"},{"static_image_url":"https://pic2.zhimg.com/v2-b2e3fa9e0b6f431bd18d4a9d5d3c6596.png","title":"抱抱","placeholder":"[抱抱]"},{"static_image_url":"https://pic4.zhimg.com/v2-501ff2e1fb7cf3f9326ec5348dc8d84f.png","title":"doge","placeholder":"[doge]"},{"static_image_url":"https://pic3.zhimg.com/v2-35808905e85664eda2125a334fc7dff8.png","title":"666","placeholder":"[666]"},{"static_image_url":"https://pic1.zhimg.com/v2-1b6c8a81fe19f2ceda77241733aadf8b.png","title":"闭嘴","placeholder":"[闭嘴]"},{"static_image_url":"https://pic1.zhimg.com/v2-36ee7432e619319d858b202015a80d3f.png","title":"吃瓜中","placeholder":"[吃瓜中]"},{"static_image_url":"https://pic4.zhimg.com/v2-bb0c68fefe47605ebc91c55b7f0a167d.png","title":"打脸","placeholder":"[打脸]"},{"static_image_url":"https://pic1.zhimg.com/v2-4779ff07dfe6b722cacfcf3c5185357d.png","title":"蹲","placeholder":"[蹲]"},{"static_image_url":"https://pic1.zhimg.com/v2-e39d5eebfef8b0ac6065ad156cb05e66.png","title":"感谢","placeholder":"[感谢]"},{"static_image_url":"https://pic1.zhimg.com/v2-ffb16dd9ff04470d4efc37130ec82542.png","title":"哈士奇","placeholder":"[哈士奇]"},{"static_image_url":"https://pic1.zhimg.com/v2-13d3fcb823a2d323704cd74e48260627.png","title":"加油","placeholder":"[加油]"},{"static_image_url":"https://pic1.zhimg.com/v2-57502a494dceb07009c68de3f98f7c73.png","title":"纠结","placeholder":"[纠结]"},{"static_image_url":"https://pic2.zhimg.com/v2-5507bf46889ec156eb781f60859ae415.png","title":"哭","placeholder":"[哭]"},{"static_image_url":"https://pic2.zhimg.com/v2-43496a438dbde374d53c3e09dafde6c8.png","title":"流口水","placeholder":"[流口水]"},{"static_image_url":"https://pic2.zhimg.com/v2-43496a438dbde374d53c3e09dafde6c8.png","title":"社会人","placeholder":"[社会人]"},{"static_image_url":"https://pic2.zhimg.com/v2-76230e3ed1edcc8d3cb7047a5b78ba0e.png","title":"生气了","placeholder":"[生气了]"},{"static_image_url":"https://pic1.zhimg.com/v2-9de57d1821502441814913e963f502c7.png","title":"思考中","placeholder":"[思考中]"},{"static_image_url":"https://pic1.zhimg.com/v2-d53a13cbc6dac54eb406b47652fc66b8.png","title":"酸了","placeholder":"[酸了]"},{"static_image_url":"https://pic1.zhimg.com/v2-a31cd513ddc2b487587805d17629d570.png","title":"偷看","placeholder":"[偷看]"},{"static_image_url":"https://pic2.zhimg.com/v2-0e52bbdc84106d8a64edd043b53e8775.png","title":"头秃","placeholder":"[头秃]"},{"static_image_url":"https://pic1.zhimg.com/v2-e9df774ecb65c03f359eadff6872ce02.png","title":"吐血","placeholder":"[吐血]"},{"static_image_url":"https://pic1.zhimg.com/v2-70c38b608df613d862ee0140dcb26465.png","title":"哇","placeholder":"[哇]"},{"static_image_url":"https://pic4.zhimg.com/v2-56873671e39c80904f745a895d93d0b8.png","title":"旺柴","placeholder":"[旺柴]"},{"static_image_url":"https://pic4.zhimg.com/v2-0b0cabfad4695a46347ea494034b2c9c.png","title":"学到了","placeholder":"[学到了]"},{"static_image_url":"https://pic4.zhimg.com/v2-57d961f9da6b0601c0f48686cbc848aa.png","title":"疑问","placeholder":"[疑问]"},{"static_image_url":"https://pic4.zhimg.com/v2-34af8e9abc783c171bb47496a7773e89.png","title":"晕","placeholder":"[晕]"},{"static_image_url":"https://pic1.zhimg.com/v2-5533319c4f5740bd45897429c1ad3553.png","title":"裂开","placeholder":"[裂开]"}];

    EMOJI_URL_MAP = {};
    EMOTICON_EMOJI.forEach(e => {
        EMOJI_URL_MAP[e.placeholder] = e.static_image_url;
    });
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
.CommentRichText img[data-zhihu-emoticon] {
    height: 1.4em;
    width: 1.4em;
    vertical-align: bottom;
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
        let elRichContent = ele.querySelector('.RichContent');
        let button = ele.querySelector('button');

        if (button) {
            button.style.display = 'none';
        }
        if (elRichContentInner && elRichContent) {
            let elMTimeMeta = ele.querySelector('meta[itemprop="dateModified"]');
            let elCTimeMeta = ele.querySelector('meta[itemprop="dateCreated"]');

            if (elMTimeMeta && elCTimeMeta) {
                let mTime = elMTimeMeta.getAttribute('content').toString().split('T')[0];
                let cTime = elCTimeMeta.getAttribute('content').toString().split('T')[0];
                let elATime = ele.querySelector('.ContentItem-time');
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

            setTimeout(function () {
                if (!elRichContent.classList.contains('is-collapsed')) {
                    return;
                }
                log('process:is-collapsed');
                ele.classList.add('my-fold');
                elRichContentInner.insertAdjacentHTML('afterend', `<span class="my-more-btn down-img"></span><span class="my-less-btn up-img"></span>`);
                elRichContent.classList.remove('is-collapsed');
                elRichContentInner.setAttribute("style", "");
                processFold(elRichContent);
            }, 1000);

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

            let eleVoteButton = ele.querySelector('.VoteButton--up');
            if (eleVoteButton) {
                eleVoteButton.style = null;
            }

        } else {
            log('RichContent not found')
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
    removeBySelector('div.KfeCollection-VipRecommendCard');
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

function loadContent(url) {
    let myHeaders = new Headers();
    // let s = zhihu().buildStr(path),
    //     md5 = zhihu().md5(s),
    //     s1 = zhihu().enc(md5);

    // myHeaders.append('x-zse-93', '101_3_2.0');
    // myHeaders.append('x-zse-96', "2.0_" + s1);

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
    let headline = data.author.headline ||
        data.author.badge_v2 && data.author.badge_v2.detail_badges[0] && data.author.badge_v2.detail_badges[0].description ||
        data.author.badge && data.author.badge[0] && data.author.badge[0].description || '';

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
                            <div class="ztext AuthorInfo-badgeText">${headline}</div>
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

            <span class="my-more-btn down-img"></span>
            <span class="my-less-btn up-img"></span>

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
    if (elAncestor && elAncestor.querySelectorAll) {
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

    if (answer_next_url === null) {
        let elInit = document.querySelector('#js-initialData');
        if (!elInit) {
            return console.error('js-initialData not found.')
        }

        try {
            let jsonInit = JSON.parse(elInit.innerText);
            let answer = jsonInit.initialState.question.answers[questionNumber];
            answer_next_url = answer['next'];
        } catch (e) {
            return console.error(e);
        }
    }

    loadContent(answer_next_url).then(function (data) {
        if (!answer_next_url) {
            console.error('next_url empty');
            return
        }
        if (elLoading) {
            elLoading.classList.add('hide');
        }
        log('get data:', answer_next_url);
        if (data.paging.is_end) {
            is_end = 1;
        }
        answer_next_url = data.paging.next;
        let elListWrap = getListWrap();
        if (elListWrap) {
            processLinkCard(elListWrap);
            data.data.forEach(function (item) {
                if (item.target_type !== 'answer') {
                    return log('not_answer:', item);
                }

                if (!load_answer_id_map[item.target.id]) {
                    load_answer_id_map[item.target.id] = 1;
                    let elListItemWrap = document.createElement('div');
                    elListItemWrap.innerHTML = genAnswerItemHtml(item.target);
                    elListWrap.insertAdjacentElement("beforeend", elListItemWrap);
                    processFold(elListItemWrap.querySelector('.RichContent'));
                    bindClickComment(elListItemWrap);
                    processAHref(elListItemWrap);
                    processVideo(elListItemWrap);
                } else {
                    log('duplicate answer', item.target.id)
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
    document.querySelectorAll('.Question-main .Card').forEach(function (elCard) {
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
                if (elSwitchBtn.innerText.replace(/[\s​]+/, '') === '切换为时间排序') {
                    elSwitchBtn.innerText = '切换为默认排序';
                    elComment.dataset.isReverse = "1";
                } else {
                    elSwitchBtn.innerText = '切换为时间排序';
                    elComment.dataset.isReverse = "0";
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
        <a class="comment-fold up-img"></a>
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
    let address_text = item['address_text'] ? item['address_text'].replace('IP 属地', '').replace('未知', '') + ' ' : '';
    let content = item.content.replace(/\[.{1,8}?\]/g, getEmojiImg);
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
                    <span class="CommentItemV2-time">${address_text}${getDate(item.created_time)}</span>
                </div>
                <div class="CommentItemV2-metaSibling">
                    <div class="CommentRichText CommentItemV2-content">
                        <div class="RichText ztext">${content}</div>
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
    if (elAncestor && elAncestor.querySelectorAll) {
        forEachArray(
            elAncestor.querySelectorAll('a[href^="https://link.zhihu.com/"]'),
            ele => {
                log('a_href', ele.getAttribute('href'));
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

function processLinkCard(elRichContent) {
    // .RichContent-inner will be replaced, .RichContent will keep.
    observerAddNodes(elRichContent, el => {
        log(el);
        if (el.tagName === 'A' && el.href && el.href.indexOf('http') === 0) {
            processAHref(el.parentElement)
        }
    });
}

function processAllLink() {
    // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    processAHref(document);
    observerAddNodes(document, el => {
        if (el.tagName === 'A' && el.href && el.href.indexOf('http') === 0) {
            processAHref(el.parentElement)
        }
    });
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
    
    .up-img {
        background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAXVBMVEUAAABDQz+GhIt6eX61tL25uMGko6u6ucKzsruzsbqtrLSnpq60sruzsbumpa2xsLmvrba0srusqrOko6qkoqqioKm7usO4tr+6ucK4tsC5t8Gkoqugn6a8u8K9vMT0mL20AAAAHXRSTlMABAQH0u0o7n95TyPIey6yoIxZNDEa8eHdx7JEF78gUdEAAAFLSURBVEjHrZOLcoIwEEVPgsUWsbZa+yb//5mNGYclG5YUxwwzh0SPd70KDpzHRVwu2UV4QX4Y7+Nlw6udGDVRIJHGW0tA5cNL3M3wSwZWBpiiYbSH7w7T8DNT9WEYhk+Qw5qxGdJ6oDAi0IYbjbi2YFRmGTFnjSGONrANydFRpVE4tuGVIR1UM8ocVbJhhJAw17U1VUfIcurGE7S5U5SsjEeaRjuqgCKjiS/ynDmLxj4ZDnah7NqY6mo0OsdJyXoqaaed6RpvZbiIsgPHUkYCb7kTl5lxRVN2YBkClePhMDuVQHXwAedgZAjyDo682hmC6e/TT5S9afhpB1/8BmOqHJzC+FTwkm6CytAYv88GkhPej2IY4LwNQ+gvRgM/J8Swwa4D0jahbjgPyD+5YqBQMwQ3G6w1ItZm/N9AG6uAj1wp3m641SWTny7iD6BPQB47/T0pAAAAAElFTkSuQmCC);
        background-repeat: no-repeat;
        background-size: 20px 20px;
        width: 20px;
        height: 20px;
        display: inline-block;
    }
    .down-img {
        background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAXVBMVEUAAABDQz+GhIt6eX61tL25uMGko6u6ucKzsruzsbqtrLSnpq60sruzsbumpa2xsLmvrba0srusqrOko6qkoqqioKm7usO4tr+6ucK4tsC5t8Gkoqugn6a8u8K9vMT0mL20AAAAHXRSTlMABAQH0u0o7n95TyPIey6yoIxZNDEa8eHdx7JEF78gUdEAAAFHSURBVEjHrZXtcoIwFERPgkiLVFut/Q7v/5ilcSKY1Rtwmj9LMjmzNwvc4MA5bPHZYlotikuzpGW5n/DIalnkrLOIpR5RFwksJdzdxChlIoYM+HkekKTdUCYqOHzDIND1oW+OFIn9Wx/CM8Aq/I1+TWUTTwMQItMOEpkDJvGQ9v3wGdLzhsrwCGm80IUzs+Um8RhGhH3U83nMquKmI7xPmaJH2IGnnjCv2B5hBThoQphmUCAcQOZjVLUav8v6MgPLw58IaC4Y08NzxWdLdcvDpV9ZMpB3roQj95GqlNAMrlSVt4ucEQ9tF5kPbYnQrHutKkrWk6c+SkgAkrVUJYRkbXto1kpoyJK1EkZPrhcT0FiER4joI1mNhAMlHHwMQN+ZRC60X7u1VmVffKDE3ItPQWvrvxHMJrwZsi2y1c8iRsvTTBYdTGa/Od1AHiFyP4wAAAAASUVORK5CYII=);
        background-repeat: no-repeat;
        background-size: 20px 20px;
        width: 20px;
        height: 20px;
        display: inline-block;
    }
    .my-more-btn {
        float: right;
        padding: 0 10px 10px 10px;
    }
    .my-less-btn {
        position: fixed;
        top: 10%;
        right: 10px;
        padding: 0 10px 10px 10px;
        z-index: 2;
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
        if (targetNode && targetNode.querySelectorAll) {
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
    }, 0);
    setTimeout(function () {
        removeAds();
        removeBlock();
        processAHref(document);
        let list_item = document.querySelectorAll('.List-item');
        forEachArray(list_item, function (ele) {
            let ele1 = ele.querySelector('.AnswerItem');
            let zop = ele1 && ele1.dataset && ele1.dataset.zop;
            if (zop) {
                try {
                    let t = JSON.parse(zop);
                    log('answer_id', t.itemId);
                    if (t.itemId) {
                        load_answer_id_map[t.itemId] = 1;
                    }
                } catch (e) {
                    console.error(e)
                }
            }
            processLinkCard(ele.querySelector('.RichContent'));
        });
        bindLoadData();
    }, 0);
}

function processZvideo() {
    setTimeout(function () {
        observerAddNodes(document.querySelector('.ZVideoRecommendationList'), el => processAHref(el));
    }, 0);
}

function processCommon() {
    let elA = document.querySelector('.QuestionHeader-title a');
    if (elA) {
        stopPropagation(elA)
    }
}


function init() {
    if (init_done) {
        return;
    }
    init_done = 1;
    log('run:init');
    // init
    if (fromMobile) {
        if (questionNumber || inDetailPage) {
            processDetail();
        } else if (inHomePage) {
            processHomePage();
        } else if (inZvideo) {
            processZvideo();
        } else if (inZhuanlan) {
            hideByAddCss('.OpenInAppButton,.KfeCollection-VipRecommendCard')
        }

        setTimeout(function () {
            addCommonStyle();
            processContinue();
            processCommon();
        }, 0);

        setTimeout(function () {
            removeCommonBlock();
        }, 0);
    } else {
        setTimeout(processAllLink, 0);
    }
}


document.onreadystatechange = function () {
    if (document.readyState === "complete") {
        log('document.readyState');
        init()
    }
};
document.addEventListener("DOMContentLoaded", function() {
    log('DOMContentLoaded');
    init()
});