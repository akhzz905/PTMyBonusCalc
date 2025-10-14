// ==UserScript==
// @name         PT站点魔力计算器
// @namespace    https://github.com/neoblackxt/PTMyBonusCalc
// @version      2.1.0
// @description  在使用NexusPHP架构的PT站点显示每个种子的A值和每GB的A值。
// @author       neoblackxt, LaneLau
// @require      https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js
// @require      https://cdn.jsdelivr.net/npm/toastify-js
// @resource     TOASTIFY_CSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @match        *://*.beitai.pt/torrents*
// @match        *://*.pttime.org/torrents*
// @match        *://*.ptsbao.club/torrents*
// @match        *://*.pthome.net/torrents*
// @match        *://kp.m-team.cc/*
// @match        *://zp.m-team.io/*
// @match        *://*.hddolby.com/torrents*
// @match        *://*.leaguehd.com/torrents*
// @match        *://*.hdhome.org/torrents*
// @match        *://*.hdsky.me/torrents*
// @match        *://*.ourbits.club/torrents*
// @match        *://*.u2.dmhy.org/torrents*
// @match        *://*.hdzone.me/torrents*
// @match        *://*.hdatmos.club/torrents*
// @match        *://*.pt.soulvoice.club/torrents*
// @match        *://*.pt.soulvoice.club/live*
// @match        *://*.discfan.net/torrents*
// @match        *://*.hdtime.org/torrents*
// @match        *://*.nicept.net/torrents*
// @match        *://*.pterclub.com/torrents*
// @match        *://*.hdarea.co/torrents*
// @match        *://*.hdfans.org/torrents*
// @match        *://pt.btschool.club/torrents*
// @match        *://*.1ptba.com/torrents*
// @match        *://www.oshen.win/torrents*
// @match        *://*.rousi.zip/torrents*
// @match        *://*.kufei.org/torrents*
// @match        *://*.tjupt.org/torrents*
// @match        *://*.tjupt.org/bonus*
// @match        *://*/mybonus*
// @license      GPL License
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        window.onurlchange
// ==/UserScript==

// ave不同范围对应的颜色及字重
const colorsOfAVE = [
    // null表示使用默认颜色和字重
    {min: 0, max: 1, color: null, fontWeight: null}, // 黑色
    {min: 1, max: 1.5, color: '#00008B', fontWeight: 700}, // 蓝色
    {min: 1.5, max: 2, color: '#8B4513', fontWeight: 800}, // 棕色
    {min: 2, max: Infinity, color: '#ff0000', fontWeight: 900} // 红色
]

const siteInfo = [
    {
        name: "tjupt",
        host: ["tjupt.org", "tju.pt"],
        bonusPage: "/bonus.php?show=description",
        torrentListPage: "/torrents.php"
    }, {
        name: "m-team",
        host: ["kp.m-team.cc", "zp.m-team.io"],
        bonusPage: "/mybonus",
        torrentListPage: "/browse"
    }
];

function getParamsFromBonusPage(site) {
    let argsReady = true;
    let siteName = site.name;
    let T0 = GM_getValue(siteName + ".T0");
    let N0 = GM_getValue(siteName + ".N0");
    let B0 = GM_getValue(siteName + ".B0");
    let L = GM_getValue(siteName + ".L");
    if (!(T0 && N0 && B0 && L)) {
        argsReady = false
    }
    let newT0, newN0, newB0, newL;
    try {
        newT0 = parseInt($("li:has(b:contains('T0'))")[1].innerText.split(" = ")[1]);
        newN0 = parseInt($("li:has(b:contains('N0'))")[1].innerText.split(" = ")[1]);
        newB0 = parseInt($("li:has(b:contains('B0'))")[1].innerText.split(" = ")[1]);
        newL = parseInt($("li:has(b:contains('L'))")[1].innerText.split(" = ")[1]);
        console.log('数据提取成功:', newT0, newN0, newB0, newL);
    } catch (error) {
        console.error('数据提取过程中出现错误:', error);
        return null;
    }

    if (!argsReady || newT0 !== T0 || newN0 !== N0 || newB0 !== B0 || newL !== L) {
        Toastify({
            text: "魔力值参数已更新",
            duration: 3000,
            close: true
        }).showToast()
        GM_setValue(siteName + ".T0", newT0);
        GM_setValue(siteName + ".N0", newN0);
        GM_setValue(siteName + ".B0", newB0);
        GM_setValue(siteName + ".L", newL);
    }
    return {T0: newT0, N0: newN0, B0: newB0, L: newL};
}

function drawChart(bonusParams) {

    let B0 = bonusParams.B0;
    let L = bonusParams.L;

    function calcB(A) {
        return B0 * (2 / Math.PI) * Math.atan(A / L)
    }

    //从B值反推A值
    function calcAbyB(B) {
        return Math.tan(B / B0 / (2 / Math.PI)) * L
    }

    let A = isMTeam ? 0 : parseFloat($("div:contains(' (A = ')")[0].innerText.split(" = ")[1]);
    let B = isMTeam ? parseFloat($("td:contains('基本獎勵')+td+td")[0].innerText) : calcB(A);
    // 剔除M-Team的基本奖励中做种数奖励
    if (isMTeam) {
        let matches = $("h5:contains('做種每小時將得到如下的魔力值')").next().children().first().text()
            .match(/(\d+(\.\d+)?)個魔力值.*最多計(\d+)個/);
        let seedingBonusPerSeed = parseFloat(matches[1]);
        let seedingBonusLimit = parseInt(matches[3]);
        let currentSeedingNode = $("span:contains('當前活動')").parent().clone();
        currentSeedingNode.find('img').replaceWith(function () {
            return "img";
        });
        let currentSeeding = parseInt(currentSeedingNode.text().match(/(\d+)/)[1]);
        B = B - (currentSeeding > seedingBonusLimit ?
            seedingBonusPerSeed * seedingBonusLimit : seedingBonusPerSeed * currentSeeding);
    }
    // 对于M-Team，B>B0是因为网页获取的基本奖励包括了做种数的奖励，上面代码已经进行排除。
    // 其他站暂不明确是否有该问题，下面一行的代码暂时保留
    B = B >= B0 ? B0 * 0.98 : B
    if (isMTeam) {
        A = calcAbyB(B);
    }

    let spot = [A, B]

    let data = []
    for (let i = 0; i < (1.1 * A > 25 * L ? 1.1 * A : 25 * L); i = i + L / 4) {
        data.push([i, calcB(i)])
    }

    let insertPos = isMTeam ? $("ul+table") : $("table+h1")
    insertPos.before('<div id="main" style="width: 600px;height:400px; margin:auto;"></div>')

    var myChart = echarts.init(document.getElementById('main'));
    // 指定图表的配置项和数据
    var option = {
        title: {
            text: 'B - A 图',
            top: 'bottom',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            },
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            position: function (pos, params, el, elRect, size) {
                var obj = {top: 10};
                obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                return obj;
            },
            extraCssText: 'width: 170px'
        },
        xAxis: {
            name: 'A',
        },
        yAxis: {
            name: 'B'
        },
        axisPointer: {
            label: {
                backgroundColor: '#777'
            }
        },
        series: [
            {
                type: 'line',
                data: data,
                symbol: 'none'
            },
            {
                type: 'line',
                data: [spot],
                symbolSize: 6
            }
        ]
    };

    // 使用刚指定的配置项和数据显示图表。
    myChart.setOption(option);
}

function run() {
    var $ = jQuery;
    let site = siteInfo.find(site => site.host.includes(window.location.host));
    // 未在预设站点中找到，使用默认配置
    if (!site) {
        site = {
            name: host,
            host: [window.location.host],
            bonusPage: "/mybonus",
            torrentListPage: "/torrents"
        }
    }
    if (window.location.href.includes(site.bonusPage)) {
        let bonusParams = getParamsFromBonusPage(site);
        if (!bonusParams) {
            return;
        }
        drawChart(bonusParams);
    } else if (window.location.href.includes(site.torrentListPage)) {
        addDataCol(site)
    }
}

function addDataCol(site) {
    let siteName = site.name;
    let T0 = GM_getValue(siteName + ".T0");
    let N0 = GM_getValue(siteName + ".N0");
    let B0 = GM_getValue(siteName + ".B0");
    let L = GM_getValue(siteName + ".L");
    if (!(T0 && N0 && B0 && L)) {
        let bonusPageUrl = window.location.origin + site.bonusPage;
        Toastify({
            text: "请先访问 " + bonusPageUrl + " 以获取魔力值参数",
            destination: bonusPageUrl,
            duration: 3000,
            close: true
        }).showToast();
        return;
    }

    function calcA(T, S, N) {
        let c1 = 1 - Math.pow(10, -(T / T0));
        // 当断种时，显示续种后的实际值，因为当前状态值无意义
        N = N ? N : 1;
        // 当前状态值，加入做种后实际值会小于当前值
        // TODO: 改为双行显示为当前值和实际值
        let c2 = 1 + Math.pow(2, .5) * Math.pow(10, -(N - 1) / (N0 - 1));
        return c1 * S * c2;
    }

    /**
     *
     * @param $this 种子的每一行
     * @param i_T 种子发布时间所在列
     * @param i_S 种子体积所在列
     * @param i_N 做种人数人数所在列
     */
    function makeA($this, i_T, i_S, i_N) {
        var time = $this.children('td:eq(' + i_T + ')').find("span").attr("title");
        // 适配m-team的发生时间
        if (time == undefined || time == "") {
            time = $this.children('td:eq(' + i_T + ')').find("span").text();
        }
        // 适配tjupt的发生时间
        if (time == undefined || time == "") {
            time = $this.children('td:eq(' + i_T + ')').html().replace("<br>", " ").trim();
        }
        var T = (new Date().getTime() - new Date(time).getTime()) / 1e3 / 86400 / 7;
        var size = $this.children('td:eq(' + i_S + ')').text().trim();
        var size_tp = 1;
        var S = size.replace(/[KMGT]i?B/, function (tp) {
            if (tp == "KB" || tp == "KiB") {
                size_tp = 1 / 1024 / 1024;
            } else if (tp == "MB" || tp == "MiB") {
                size_tp = 1 / 1024;
            } else if (tp == "GB" || tp == "GiB") {
                size_tp = 1;
            } else if (tp == "TB" || tp == "TiB") {
                size_tp = 1024;
            }
            return "";
        });
        S = parseFloat(S) * size_tp;
        //var number = $this.children('td:eq(' + i_N + ')').text().trim();
        var number = $this.children('td:eq(' + i_N + ')').text().trim().replace(/,/g, ''); // 获取人数，删除多余符号
        //console.log(number);
        var N = parseInt(number);
        var A = calcA(T, S, N).toFixed(2);
        var ave = (A / S).toFixed(2);

        var textA = '<span>' + A + '@' + ave + '</span>';
        colorsOfAVE.forEach(color => {
            if (ave >= color.min && ave < color.max && (color.color != null || color.fontWeight != null)) {
                textA = '<span style="'
                    + (color.color == null ? '' : 'color:' + color.color + ";")
                    + (color.fontWeight == null ? '' : 'font-weight:' + color.fontWeight + ";")
                    + '">' + A + '@' + ave + '</span>';
            }
        });
        return textA;
    }

    function addDataColGeneral() {
        var i_T, i_S, i_N
        $(seedTableSelector).each(function (row) {
            var $this = $(this);
            if (row == 0) {
                $this.children('td').each(function (col) {
                    if ($(this).find('img.time').length) {
                        i_T = col
                    } else if ($(this).find('img.size').length) {
                        i_S = col
                    } else if ($(this).find('img.seeders').length) {
                        i_N = col
                    }
                })
                if (!i_T || !i_S || !i_N) {
                    Toastify({
                        text: "未能找到数据列",
                        duration: 3000,
                        close: true
                    }).showToast();
                    return
                }
                $this.children("td:last").before("<td class=\"colhead\" title=\"A值@每GB的A值\">A@A/GB</td>");
            } else {
                var textA = makeA($this, i_T, i_S, i_N)
                $this.children("td:last").before("<td class=\"rowfollow\">" + textA + "</td>");
            }
        })
    }

    function addDataColMTeam() {
        let i_T, i_S, i_N, addFlag = false

        let colLen = $('div.mt-4>table>thead>tr>th').length
        if ($('div.mt-4>table>thead>tr>th:last').text().indexOf('A@A/GB') != -1) {
            addFlag = true
            colLen -= 1
        }
        i_T = colLen - 5
        i_S = colLen - 4
        i_N = colLen - 3
        if (!addFlag) {
            $('div.mt-4>table>thead>tr>th:last')
                .after("<th class=\"border-0 border-b border-solid border-[--mt-line-color] p-2 \" " +
                    "style=\"width: 100px;\" title=\"A值@每GB的A值\"> " +
                    "<div class=\"action\">A@A/GB</div>  </th>");
        }
        $(seedTableSelector).each(function (row) {
            var $this = $(this);
            var textA = makeA($this, i_T, i_S, i_N)
            // data-from-calc用于判断该元素是否由脚本生成
            let tdTextA = "<td class=\"border-0 border-b border-solid border-[--mt-line-color] p-0 \" " +
                "align=\"center\" data-from-calc=\"true\">" + textA + "</td>"
            if ($this.children("td:last").data("fromCalc")) {
                $this.children("td:last").html(textA)
            } else {
                $this.children("td:last").after(tdTextA)
                //<span class=\"block mx-[-5px]\">"+textA+"</span>
            }
        })
    }

    if (isMTeam) {
        addDataColMTeam()
    } else {
        addDataColGeneral()
    }
}

function mTeamWaitPageLoadAndRun() {
    let $ = jQuery
    let contentObserver = new MutationObserver((mutationsList, observer) => {
        let T0Found = false;
        let seedTableFound = false;
        let isMybonusPage = window.location.toString().indexOf("mybonus") != -1
        if (isMybonusPage) {
            T0Found = $("li:has(b:contains('T0'))")[1];
        }
        if (T0Found) {
            observer.disconnect();
            run();
        } else {
            seedTableFound = $(seedTableSelector)[1];
            if (seedTableFound) {
                observer.disconnect();
                run();
            }
        }
    });
    let bodyObserver = new MutationObserver((mutationsList, observer) => {
        if (document.body) {
            observer.disconnect();
            contentObserver.observe(document.body, {childList: true, subtree: true});
        }
    });
    bodyObserver.observe(document, {childList: true, subtree: true});
}

let host = window.location.host.match(/\b[^\.]+\.[^\.]+$/)[0]
let isMTeam = window.location.toString().indexOf("m-team") != -1
let seedTableSelector = isMTeam ? 'div.mt-4>table>tbody>tr' : '.torrents:last-of-type>tbody>tr'
let isMybonusPage = window.location.toString().indexOf("mybonus") != -1
if (window.location.toString().indexOf("tjupt.org") != -1) {
    isMybonusPage = window.location.toString().indexOf("bonus.php") != -1
}
if (isMTeam) {
    if (isMybonusPage || window.location.toString().indexOf("browse") != -1) {
        mTeamWaitPageLoadAndRun()
    }
} else {
    run()
}

if (window.onurlchange === null) {
    // M-Team 页面局部刷新时重新运行函数
    window.addEventListener('urlchange', (info) => mTeamWaitPageLoadAndRun());
}

GM_addStyle(GM_getResourceText("TOASTIFY_CSS"));