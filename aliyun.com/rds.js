// ==UserScript==
// @name         阿里云RDS
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  列表样式
// @author       You
// @match        https://rdsnext.console.aliyun.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    let style = `
<style>
#rdsLogWidget > div > div > div > div > div > div > div.v1-9-3-tabs-content > div.v1-9-3-tabs-tabpane.active > div > div > div:nth-child(2) > div > table > thead > tr > th:nth-child(3) {
  width: 500px;
}
</style>
`;
    document.body.insertAdjacentHTML('beforeend', style);
})();