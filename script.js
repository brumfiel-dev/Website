(function () {
    'use strict';

    // --- Mobile nav toggle ---
    var toggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');

    toggle.addEventListener('click', function () {
        navLinks.classList.toggle('open');
    });

    // Close menu when a link is clicked
    navLinks.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
            navLinks.classList.remove('open');
        }
    });

    // --- Active nav link on scroll ---
    var sections = document.querySelectorAll('[id]');
    var navAnchors = document.querySelectorAll('.nav-links a');

    function updateActiveNav() {
        var scrollY = window.scrollY + 80;
        var current = '';

        sections.forEach(function (section) {
            if (section.offsetTop <= scrollY) {
                current = section.getAttribute('id');
            }
        });

        navAnchors.forEach(function (a) {
            a.classList.remove('active');
            if (a.getAttribute('href') === '#' + current) {
                a.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveNav, { passive: true });
    updateActiveNav();

    // --- Film grain overlay on photo ---
    var grainCanvases = document.querySelectorAll('.grain-overlay');
    grainCanvases.forEach(function (canvas) {
        var img = canvas.previousElementSibling;
        function applyGrain() {
            var w = img.naturalWidth || img.width || 280;
            var h = img.naturalHeight || img.height || 400;
            var scale = 0.5;
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            var ctx = canvas.getContext('2d');
            var imageData = ctx.createImageData(canvas.width, canvas.height);
            var data = imageData.data;
            for (var i = 0; i < data.length; i += 4) {
                var v = Math.random() * 255;
                data[i] = v;
                data[i + 1] = v;
                data[i + 2] = v;
                data[i + 3] = 60;
            }
            ctx.putImageData(imageData, 0, 0);
        }
        if (img.complete) {
            applyGrain();
        } else {
            img.addEventListener('load', applyGrain);
        }
    });

    // --- Dynamic stories table + chart from NPR RSS ---
    var storiesBody = document.getElementById('stories-body');
    var storiesChart = document.getElementById('stories-chart');
    var RSS_URL = 'https://feeds.npr.org/279612138/rss.xml';
    var PROXY_URLS = [
        'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(RSS_URL),
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(RSS_URL)
    ];

    function formatStoryDate(dateStr) {
        var d = new Date(dateStr);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    // Keyword-based category assignment from headline text
    var categoryRules = [
        { name: 'NUCLEAR', keywords: ['nuclear', 'nuke', 'uranium', 'plutonium', 'warhead', 'atomic', 'reactor', 'fission', 'new start', 'nonproliferation'] },
        { name: 'AI/DISINFO', keywords: ['ai ', 'ai-', 'artificial intelligence', 'disinformation', 'misinformation', 'deepfake', 'slop', 'grok', 'chatbot', 'fake'] },
        { name: 'SPACE', keywords: ['space', 'spacex', 'nasa', 'rocket', 'satellite', 'orbit', 'launch', 'starship', 'moon', 'mars'] },
        { name: 'NAT. SECURITY', keywords: ['security', 'military', 'defense', 'pentagon', 'intelligence', 'antisemitism', 'weapon', 'war ', 'conflict', 'troops', 'classified', 'espionage', 'sanctions'] },
        { name: 'TECHNOLOGY', keywords: ['tech', 'cyber', 'software', 'internet', 'app ', 'drone', 'robot'] },
        { name: 'SCIENCE', keywords: ['science', 'scientist', 'research', 'study', 'biology', 'climate', 'health', 'disease', 'vaccine', 'physics', 'evolution', 'fossil', 'earthquake', 'volcano', 'ocean', 'brain'] }
    ];

    function categorize(title) {
        var lower = title.toLowerCase();
        for (var i = 0; i < categoryRules.length; i++) {
            var rule = categoryRules[i];
            for (var j = 0; j < rule.keywords.length; j++) {
                if (lower.indexOf(rule.keywords[j]) !== -1) {
                    return rule.name;
                }
            }
        }
        return 'OTHER';
    }

    function buildChartSvg(rows) {
        // Count categories
        var counts = {};
        rows.forEach(function (row) {
            var cat = categorize(row.title);
            counts[cat] = (counts[cat] || 0) + 1;
        });

        // Sort categories by count descending
        var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });

        // Find max count for scaling
        var maxCount = 0;
        cats.forEach(function (c) { if (counts[c] > maxCount) maxCount = counts[c]; });
        // Round up max to nearest nice number for axis
        var axisMax = Math.max(maxCount + 1, 3);

        // Chart dimensions
        var labelX = 135;
        var barX = 140;
        var barAreaWidth = 380;
        var barHeight = 22;
        var barGap = 29;
        var topY = 38;
        var unitWidth = barAreaWidth / axisMax;

        var numBars = cats.length;
        var chartBottom = topY + numBars * barGap + 5;
        var svgHeight = chartBottom + 45;

        var svg = '<svg class="schematic-svg" viewBox="0 0 560 ' + svgHeight + '" xmlns="http://www.w3.org/2000/svg">';
        svg += '<style>';
        svg += '.ch-line { stroke: #005D8C; fill: none; }';
        svg += '.ch-thin { stroke-width: 0.5; }';
        svg += '.ch-med { stroke-width: 1; }';
        svg += '.ch-grid { stroke: #005D8C; stroke-width: 0.3; stroke-dasharray: 2,3; }';
        svg += '.ch-text { font-family: "Courier Prime", "Courier New", monospace; font-size: 10px; fill: #005D8C; }';
        svg += '.ch-label { font-family: "Courier Prime", "Courier New", monospace; font-size: 9px; fill: #005D8C; }';
        svg += '.ch-title { font-family: "Courier Prime", "Courier New", monospace; font-size: 8px; fill: #005D8C; font-weight: 700; }';
        svg += '.ch-bar { fill: #005D8C; }';
        svg += '</style>';

        // Axes
        svg += '<line x1="' + barX + '" y1="30" x2="' + barX + '" y2="' + chartBottom + '" class="ch-line ch-med"/>';
        svg += '<line x1="' + barX + '" y1="' + chartBottom + '" x2="' + (barX + barAreaWidth) + '" y2="' + chartBottom + '" class="ch-line ch-med"/>';

        // X-axis ticks, labels, grid lines
        for (var t = 1; t <= axisMax; t++) {
            var tx = barX + t * unitWidth;
            svg += '<line x1="' + tx + '" y1="' + chartBottom + '" x2="' + tx + '" y2="' + (chartBottom + 5) + '" class="ch-line ch-thin"/>';
            svg += '<text x="' + tx + '" y="' + (chartBottom + 18) + '" class="ch-label" text-anchor="middle">' + t + '</text>';
            svg += '<line x1="' + tx + '" y1="30" x2="' + tx + '" y2="' + chartBottom + '" class="ch-grid"/>';
        }

        // X-axis title
        var axisCenter = barX + barAreaWidth / 2;
        svg += '<text x="' + axisCenter + '" y="' + (chartBottom + 35) + '" class="ch-title" text-anchor="middle">NO. OF STORIES (N = ' + rows.length + ')</text>';

        // Dimension line at top
        svg += '<line x1="' + barX + '" y1="33" x2="' + (barX + barAreaWidth) + '" y2="33" class="ch-line ch-thin"/>';
        svg += '<line x1="' + barX + '" y1="30" x2="' + barX + '" y2="36" class="ch-line ch-thin"/>';
        svg += '<line x1="' + (barX + barAreaWidth) + '" y1="30" x2="' + (barX + barAreaWidth) + '" y2="36" class="ch-line ch-thin"/>';
        svg += '<text x="' + axisCenter + '" y="28" class="ch-title" text-anchor="middle">N = ' + rows.length + '</text>';

        // Bars
        cats.forEach(function (cat, i) {
            var y = topY + i * barGap;
            var barW = counts[cat] * unitWidth;
            var textY = y + barHeight / 2 + 4;
            svg += '<text x="' + labelX + '" y="' + textY + '" class="ch-text" text-anchor="end">' + cat + '</text>';
            svg += '<rect x="' + barX + '" y="' + y + '" width="' + barW + '" height="' + barHeight + '" class="ch-bar"/>';
            svg += '<text x="' + (barX + barW + 6) + '" y="' + textY + '" class="ch-label">' + counts[cat] + '</text>';
        });

        svg += '</svg>';
        return svg;
    }

    function handleRssData(xmlText) {
        var parser = new DOMParser();
        var xml = parser.parseFromString(xmlText, 'text/xml');
        var items = xml.querySelectorAll('item');
        var rows = [];

        items.forEach(function (item) {
            var creator = item.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'creator');
            if (!creator.length) return;
            var name = creator[0].textContent.trim();
            if (name !== 'Geoff Brumfiel') return;

            var title = item.querySelector('title') ? item.querySelector('title').textContent : '';
            var link = item.querySelector('link') ? item.querySelector('link').textContent : '';
            var pubDate = item.querySelector('pubDate') ? item.querySelector('pubDate').textContent : '';

            rows.push({
                date: pubDate,
                title: title,
                link: link
            });
        });

        if (rows.length === 0) return;

        // Limit to 15 most recent
        rows = rows.slice(0, 15);

        // Update table
        var html = '';
        rows.forEach(function (row) {
            html += '<tr>' +
                '<td>' + escapeHtml(formatStoryDate(row.date)) + '</td>' +
                '<td><a href="' + escapeHtml(row.link) + '" target="_blank" rel="noopener">' + escapeHtml(row.title) + '</a></td>' +
                '</tr>';
        });
        storiesBody.innerHTML = html;

        // Update chart
        storiesChart.innerHTML = buildChartSvg(rows) +
            '<p class="figure-caption">Fig. 1.1 &mdash; Distribution of recent stories by subject category.</p>';
    }

    function fetchRss(proxyIndex) {
        if (proxyIndex >= PROXY_URLS.length) return; // all proxies failed, keep fallback
        fetch(PROXY_URLS[proxyIndex])
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function (xmlText) {
                if (xmlText.indexOf('<item>') === -1) throw new Error('Invalid RSS');
                handleRssData(xmlText);
            })
            .catch(function () {
                fetchRss(proxyIndex + 1); // try next proxy
            });
    }

    fetchRss(0);

    // --- Bluesky feed ---
    var BSKY_HANDLE = 'gbrumfiel.bsky.social';
    var BSKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';
    var feedContainer = document.getElementById('bsky-feed');

    function formatDate(iso) {
        var d = new Date(iso);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function postUriToUrl(uri, handle) {
        // at://did:plc:xxx/app.bsky.feed.post/rkey -> bsky.app URL
        var parts = uri.split('/');
        var rkey = parts[parts.length - 1];
        return 'https://bsky.app/profile/' + handle + '/post/' + rkey;
    }

    function renderPost(item) {
        var post = item.post;
        var record = post.record;
        if (!record || !record.text) return '';

        // Skip reposts
        if (item.reason && item.reason.$type === 'app.bsky.feed.defs#reasonRepost') return '';

        var date = formatDate(record.createdAt);
        var text = escapeHtml(record.text);
        var url = postUriToUrl(post.uri, post.author.handle);

        var embedHtml = '';
        if (record.embed && record.embed.external) {
            var ext = record.embed.external;
            var domain = '';
            try { domain = new URL(ext.uri).hostname; } catch(e) {}
            embedHtml = '<a class="bsky-embed-card" href="' + escapeHtml(ext.uri) + '" target="_blank" rel="noopener">' +
                '<div class="bsky-embed-title">' + escapeHtml(ext.title || '') + '</div>' +
                (ext.description ? '<div class="bsky-embed-desc">' + escapeHtml(ext.description) + '</div>' : '') +
                (domain ? '<div class="bsky-embed-domain">' + escapeHtml(domain) + '</div>' : '') +
                '</a>';
        }

        return '<div class="bsky-post">' +
            '<p class="bsky-post-date">' + date + '</p>' +
            '<p class="bsky-post-text">' + text + '</p>' +
            embedHtml +
            '<a class="bsky-post-link" href="' + url + '" target="_blank" rel="noopener">View on Bluesky</a>' +
            '</div>';
    }

    fetch(BSKY_API + '?actor=' + BSKY_HANDLE + '&limit=10&filter=posts_no_replies')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (!data.feed || data.feed.length === 0) {
                feedContainer.innerHTML = '<p>No communications available.</p>';
                return;
            }
            var html = '';
            var count = 0;
            data.feed.forEach(function (item) {
                if (count >= 3) return;
                var rendered = renderPost(item);
                if (rendered) {
                    html += rendered;
                    count++;
                }
            });
            feedContainer.innerHTML = html || '<p>No communications available.</p>';
        })
        .catch(function () {
            feedContainer.innerHTML = '<p>Unable to retrieve communications at this time.</p>';
        });
})();
