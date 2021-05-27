// ==UserScript==
// @name         添加有道发音
// @namespace    https://github.com/nameldk/user-script
// @version      0.2
// @description  百度翻译页面添加有道发音
// @author       nameldk
// @match        https://fanyi.baidu.com/
// @grant        none
// @note         2021.05.27  v0.2 手机访问时添加发音
// ==/UserScript==

(function () {
    'use strict';
    const fromMobile = navigator.userAgent.match(/Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i);
    let curAudio;
    let curIcon;

    function readText(text, elIcon) {
        if (!text || !elIcon)
            return;
        let url = 'https://dict.youdao.com/dictvoice?audio=' + text + '&le=eng';
        let audio = new Audio(url);
        let clsActive = 'sound-active';

        if (curAudio) {
            curAudio.pause();
            curIcon.classList.remove(clsActive);
        }
        elIcon.classList.add(clsActive);
        audio.onended = function () {
            elIcon.classList.remove(clsActive);
        };
        audio.play();
        curAudio = audio;
        curIcon = elIcon;
    }

    function queryAll(selector, parent, cb) {
        if (parent && parent.querySelectorAll) {
            parent.querySelectorAll(selector).forEach((el) => cb(el));
        }
    }

    function observer(targetNode, cb) {
        if (!targetNode)
            return;

        function callback(mutationsList, observer) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((el) => cb(el));
                    }
                }
            }
        }

        const config = {attributes: false, childList: true, subtree: true};
        const observer = new MutationObserver(callback);

        observer.observe(targetNode, config);
    }

    function processPc() {
        let style = `<style> 
span.yd-voice {
    position: relative;
    display: inline-block;
    top: 2px;
    cursor:pointer;
}
span.yd-voice.sound-active {
    background-image: url(https://fanyi-cdn.cdn.bcebos.com/static/translation/img/translate/output/sound2x_d6f553d.gif);
    background-image: url(https://fanyi-cdn.cdn.bcebos.com/static/translation/img/translate/output/sound1x_a31f763.gif) \\9;
    -moz-background-size: 22px 21px;
    -o-background-size: 22px 21px;
    background-size: 22px 21px;
    background-repeat: no-repeat;
    background-position: 0 -3px;
    padding: 0;
}
</style>`;
        document.body.insertAdjacentHTML('beforeend', style);

        function processIcon(elIcon, text) {
            if (!elIcon)
                return;
            let elParent = elIcon.parentNode;
            let elNext = elParent.nextElementSibling;
            if (elNext && elNext.classList.contains('yd-voice') || elParent.querySelector('.yd-voice')) {
                return;
            }
            text = text || elParent.dataset.soundText;
            if (!text) {
                text = elParent.parentElement.innerText;
            }
            if (!text) {
                return;
            }
            let elA = document.createElement('span');
            elA.className = 'icon-sound yd-voice';
            elA.addEventListener('mouseover', () => {
                readText(text, elA);
            });
            elA.addEventListener('click', () => {
                readText(text, elA);
            });
            if (elNext) {
                elParent.parentNode.insertBefore(elA, elNext);
            } else {
                elParent.parentNode.append(elA);
            }
        }

        queryAll('.icon-sound', document, el => {
            processIcon(el)
        });

        observer(document.querySelector('#left-result-container'), el => {
            queryAll('.icon-sound', el, el => {
                processIcon(el)
            });
        });

        setTimeout(function () {
            let elWrap = document.querySelector('.trans-input-wrap');
            let elInput = document.querySelector('#baidu_translate_input');
            if (elWrap.querySelector('.icon-sound') && elInput) {
                processIcon(elWrap.querySelector('.icon-sound'), elInput.value);
            }
        }, 1000)
    }

    function processMobile() {
        let style = `<style> 
a.yd-voice {
    height: 24px;
    display: flex;
    align-items: center;
    right: 0px;
    position: absolute;
    top: 0px;
}
a.yd-voice span {
    vertical-align: text-bottom;
    background: url(//fanyi.baidu.com/static/translate-mobile/widget/input/sound_59915b5.png) no-repeat;
    background-size: 18px;
    width: 18px;
    height: 18px;
}
a.yd-voice.sound-active span {
    background: url(//fanyi.baidu.com/static/translate-mobile/widget/input/sound_52b079a.gif) -14px -11px no-repeat;
    background-size: 48px;
}
.entry-idg .yd-voice, #j-transoper .yd-voice{
    position: relative;
}
</style>`;
        document.body.insertAdjacentHTML('beforeend', style);

        function processIcon(elIcon) {
            if (!elIcon)
                return;
            let elParent = elIcon.parentNode;
            if (!elParent)
                return;
            let text = elParent.innerText;
            if (!text) {
                return;
            }
            let elA = genElA(() => {
                return text;
            });

            if (elIcon.nextElementSibling) {
                let el = elIcon.nextElementSibling;
                elParent.insertBefore(elA, el);
                el.style.display = 'none';
            } else {
                elParent.parentNode.append(elA);
            }
        }

        function genElA(cbText) {
            let elA = document.createElement('a');
            elA.appendChild(document.createElement('span'));
            elA.className = 'yd-voice';
            elA.addEventListener('click', () => {
                readText(cbText(), elA);
            });
            return elA;
        }

        setTimeout(function () {
            let elIcon = document.querySelector('#single-sound');
            if (!elIcon || !elIcon.parentNode || !elIcon.nextElementSibling) {
                return;
            }
            let elA = genElA(() => {
                return document.querySelector('#j-textarea').value;
            });
            elIcon.parentNode.insertBefore(elA, elIcon.nextElementSibling);
        }, 1000);

        observer(document.querySelector('#j-extendOutput'), el => {
            queryAll('.sound-btn', el, el => {
                processIcon(el);
            });
        });
    }

    if (fromMobile) {
        processMobile();
    } else {
        processPc();
    }
})();