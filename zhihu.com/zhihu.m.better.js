
// ==UserScript==
// @name        知乎手机网页版改进
// @namespace   https://www.zhihu.com/
// @match       https://www.zhihu.com/question/*
// @grant       none
// @version     1.0
// @author      nameldk
// @description 使手机网页版可以加载更多答案
// ==/UserScript==


var questionNumber = (location.href.match(/\/question\/(\d+)/)||[])[1];
var inDetailPage = location.href.match(/\/question\/\d+\/answer\/\d+/);
var fromMobile = navigator.userAgent.match(/Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i);

var offset = 0;
var limit = 5;
var is_end = 0;
var elList = null;
var elLoading = null;
var loadInterval = null;
var viewportElCheckList = [];

function removeIt(s) {
    // 删除
    Array.prototype.forEach.call(document.querySelectorAll(s), function (ele) {
        ele.remove();
    });
}

function skipOpenApp() {
    // 跳过App内打开
    // .ContentItem.AnswerItem
    // .RichContent.is-collapsed.RichContent--unescapable
    Array.prototype.forEach.call(document.querySelectorAll('.ContentItem.AnswerItem'), function (ele) {
        ele.classList.add('my-fold');
        var elRichContentInner = ele.querySelector('.RichContent-inner');
        var button = ele.querySelector('button');
        if (button) {
            button.remove();
        }

        if (elRichContentInner) {
            elRichContentInner.insertAdjacentHTML('afterend', `<span class="my-more-btn">↓展开↓</span><span class="my-less-btn">↑收起↑</span>`);
            elRichContentInner.parentElement.classList.remove('is-collapsed');
            elRichContentInner.setAttribute("style", "");
            processFold(elRichContentInner.parentElement);
        }

        ele.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (elRichContentInner) {
                elRichContentInner.setAttribute("style", "");
            }
        });

    });

    document.body.style.overflow = "auto";
}

function removeAds() {
    // 移除广告
    Array.prototype.forEach.call(document.querySelectorAll('.MBannerAd'), function (ele) {
        ele.parentNode.removeChild(ele)
    });
}

function removeBlock() {
    removeIt('.MobileModal-backdrop');
    removeIt('.MobileModal--plain.ConfirmModal');
    removeIt('.AdBelowMoreAnswers');
    removeIt('div.Card.HotQuestions');
    removeIt('button.OpenInAppButton.OpenInApp');
}

function formatNumber(num) {
    if (num > 10000) {
        return (num / 10000).toFixed(2) + '万';
    } else {
        return num;
    }
}

function processContent(content) {
    if (!content)
        return '';
    var r = /<img src="data:image.+?"(.+?)data-actualsrc="(.+?)"\/>/g;
    return content.replace(r, '<img src="$2"$1/>');
}

function loadContent(offset, limit) {
    var url = `https://www.zhihu.com/api/v4/questions/${questionNumber}/answers?include=data%5B%2A%5D.is_normal%2Cadmin_closed_comment%2Creward_info%2Cis_collapsed%2Cannotation_action%2Cannotation_detail%2Ccollapse_reason%2Cis_sticky%2Ccollapsed_by%2Csuggest_edit%2Ccomment_count%2Ccan_comment%2Ccontent%2Ceditable_content%2Cvoteup_count%2Creshipment_settings%2Ccomment_permission%2Ccreated_time%2Cupdated_time%2Creview_info%2Crelevant_info%2Cquestion%2Cexcerpt%2Crelationship.is_authorized%2Cis_author%2Cvoting%2Cis_thanked%2Cis_nothelp%2Cis_labeled%2Cis_recognized%2Cpaid_info%2Cpaid_info_content%3Bdata%5B%2A%5D.mark_infos%5B%2A%5D.url%3Bdata%5B%2A%5D.author.follower_count%2Cbadge%5B%2A%5D.topics&limit=${limit}&offset=${offset}&platform=desktop&sort_by=default`;
    // return $.get(url);
    return fetch(url).then(response => response.json());
}

function buildHtml(data) {
    var content = processContent(data.content);
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
        <meta itemprop="dateCreated" content="2019-04-16T04:27:54.000Z">
        <meta itemprop="dateModified" content="2020-05-18T09:33:53.000Z">
        <meta itemprop="commentCount" content="${data.comment_count}">
        <div class="RichContent RichContent--unescapable">
            <div class="RichContent-inner RichContent-inner--collapsed">
                <span class="RichText ztext CopyrightRichText-richText" itemprop="text">
                ${content}
                </span>
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

function getListWrap() {
    if (!elList) {
        elList = document.querySelectorAll('.Question-main .List');
        if (elList)
            elList = elList[elList.length - 1];
    }
    return elList;
}

function loadAnswer() {
    if (is_end) {
        return;
    }
    if (elLoading) {
        elLoading.classList.remove('hide');
    }
    loadContent(offset, limit).then(function (data) {
        if (elLoading) {
            elLoading.classList.add('hide');
        }
        console.log('get data:', offset, limit);
        if (data.paging.is_end) {
            is_end = 1;
            alert('到底了~');
            return;
        }
        offset += data.data.length;
        data.data.forEach(function (item) {
            let elListItemWrap = document.createElement('div');
            elListItemWrap.innerHTML = buildHtml(item);
            getListWrap().insertAdjacentElement("beforeend", elListItemWrap);
            processFold(elListItemWrap);
        });
    })
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
        elMoreBtn.addEventListener('click', function (e) {
            elContentItem.classList.add('my-unfold');
            elContentItem.classList.remove('my-fold');
            addViewportCheckList(elContentItem);
        });
        elLessBtn.addEventListener('click', function (e) {
            elContentItem.classList.add('my-fold');
            elContentItem.classList.remove('my-unfold');
            removeViewportCheckList(elContentItem);
        });
    }
}

function bindLoadData() {
    var el = document.querySelector('div.Card.ViewAllInappCard');
    if (inDetailPage) {
        el.style.textAlign = "center";
        el.innerHTML = '<a style="padding: 10px;" href="'+location.href.replace(/\/answer.+/,'')+'">查看所有问题<a>';
        return;
    }
    el.insertAdjacentHTML('beforebegin', `<div id="my-loading" class="hide"><div class="loadingio-spinner-dual-ring-41hxycfuw5t"><div class="ldio-4crll70kj">
<div></div><div><div></div></div>
</div></div></div>`);

    elLoading = document.getElementById('my-loading');
    window.onscroll = function(ev) {
        if ((window.innerHeight + window.scrollY + 50) >= document.body.offsetHeight) {
            console.log('reach bottom');
            if (loadInterval) {
                clearTimeout(loadInterval);
            }

            loadInterval = setTimeout(function(){
                console.log('to load', offset, limit);
                loadAnswer();
            }, 100);
        }
    };
}

function bindProcessViewport() {
    var interval;
    document.addEventListener('scroll', function () {
        if (interval) {
            clearTimeout(interval);
        }
        interval = setTimeout(function () {
            // console.log('scroll-view:', viewportElCheckList.length);
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

function addCss() {
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
        top: 50px; 
        right: 10px; 
        padding: 0 10px 10px 10px;
    }
    #my-loading {
        text-align: center;
        padding-bottom: 10px;
    }
    
    .hide, .my-less-btn.hide {
        display: none;
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
    document.body.insertAdjacentHTML('beforeend', style);
}

// init
if (fromMobile) {
    setTimeout(function () {
        addCss();
        skipOpenApp();
        removeAds();
        removeBlock();
        bindLoadData();
        bindProcessViewport();
    }, 200);
    setTimeout(function () {
        offset += document.querySelectorAll('.List-item').length;
    }, 1000);
}
