// ==UserScript==
// @name         添加有道发音
// @namespace    https://github.com/nameldk/user-script
// @version      0.1
// @description  百度翻译页面添加有道发音
// @author       nameldk
// @match        https://fanyi.baidu.com/
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function processYoudao() {
        let curAudio;
        function processIcon($icon) {
            let $this = $icon,
                $parent = $this.parent();
            if ($parent.next().hasClass('yd-voice')) {
                return;
            }
            let text = $parent.data('soundText');
            if (!text) {
                text = $parent.parent('p').text();
            }
            if (!text) {
                return;
            }
            let $a = $('<span class="icon-sound yd-voice"></span>');
            $a.on('mouseover click', () => {
                let url = 'https://dict.youdao.com/dictvoice?audio=' + text + '&le=eng';
                let audio = new Audio(url);

                if (curAudio) {
                    curAudio.pause();
                }
                audio.play();
                curAudio = audio;
            });
            $parent.after($a);
        }

        $('.icon-sound').each((i, v) => {
            let $this = $(v);
            processIcon($this);
        });

        function callback(mutationsList, observer) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((el) => {
                            $('.icon-sound', $(el)).each((i, v) => {
                                let $this = $(v);
                                processIcon($this);
                            });
                        });
                    }
                }
            }
        }

        const targetNode = document.querySelector('#left-result-container');

        // Options for the observer (which mutations to observe)
        const config = { attributes: false, childList: true, subtree: true };

        const observer = new MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);
    }

    processYoudao();

    let style = `<style>
    span.yd-voice{position: relative;display: inline-block;top: 2px;cursor:pointer;}
    </style>`;

    $('body').append(style);
})();