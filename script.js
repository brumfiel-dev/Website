/**
 * script.js — GB-2026-001
 * All JavaScript for Geoff Brumfiel's personal site.
 * Wrapped in an IIFE so nothing leaks into the global scope.
 */
(function () {
    'use strict';

    // =========================================================
    // SHARED HELPERS — used by both the NPR and Bluesky sections
    // =========================================================

    // Turn a Date into "4 Feb 2026" format
    function formatDate(dateStr) {
        var d = new Date(dateStr);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    }

    // Safely escape a string so it can be inserted as HTML
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // =========================================================
    // MOBILE NAV TOGGLE
    // Shows/hides the nav menu on small screens
    // =========================================================
    var toggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');

    toggle.addEventListener('click', function () {
        navLinks.classList.toggle('open');
    });

    // Close the mobile menu when any link inside it is clicked
    navLinks.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
            navLinks.classList.remove('open');
        }
    });

    // =========================================================
    // ACTIVE NAV HIGHLIGHT ON SCROLL
    // Highlights whichever section is currently in view
    // =========================================================
    var navAnchors = document.querySelectorAll('.nav-links a');

    // Build a list of section IDs from the nav links themselves
    var sectionIds = [];
    navAnchors.forEach(function (a) {
        sectionIds.push(a.getAttribute('href').substring(1));
    });

    function updateActiveNav() {
        var scrollY = window.scrollY + 80; // offset for fixed nav bar height
        var current = '';

        sectionIds.forEach(function (id) {
            var section = document.getElementById(id);
            if (section && section.offsetTop <= scrollY) {
                current = id;
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
    updateActiveNav(); // run once on load

    // =========================================================
    // FILM GRAIN OVERLAY
    // Draws random gray noise on a <canvas> over the photo
    // to mimic the look of old film grain
    // =========================================================
    var grainCanvases = document.querySelectorAll('.grain-overlay');
    grainCanvases.forEach(function (canvas) {
        var img = canvas.previousElementSibling;

        function applyGrain() {
            var w = img.naturalWidth || img.width || 280;
            var h = img.naturalHeight || img.height || 400;
            var scale = 0.5; // render at half-res for performance
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);

            var ctx = canvas.getContext('2d');
            var imageData = ctx.createImageData(canvas.width, canvas.height);
            var data = imageData.data;

            // Fill every pixel with a random gray at low opacity
            for (var i = 0; i < data.length; i += 4) {
                var v = Math.random() * 255;
                data[i] = v;        // R
                data[i + 1] = v;    // G
                data[i + 2] = v;    // B
                data[i + 3] = 60;   // A (faint)
            }
            ctx.putImageData(imageData, 0, 0);
        }

        if (img.complete) {
            applyGrain();
        } else {
            img.addEventListener('load', applyGrain);
        }
    });

    // =========================================================
    // NPR RSS FEED — Dynamic stories table + bar chart
    // Fetches Geoff's NPR author feed through a CORS proxy,
    // then builds the "Recent Stories" table and category chart.
    // =========================================================
    var storiesBody = document.getElementById('stories-body');
    var storiesChart = document.getElementById('stories-chart');
    var RSS_URL = 'https://feeds.npr.org/279612138/rss.xml';

    // Two CORS proxies — if the first fails, we try the second
    var PROXY_URLS = [
        'https://api.codetabs.com/v1/proxy/?quest=' + RSS_URL,
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(RSS_URL)
    ];

    // ---- Keyword-based category rules for the bar chart ----
    // Each headline is matched against these keywords (first match wins)
    var categoryRules = [
        { name: 'NUCLEAR',       keywords: ['nuclear', 'nuke', 'uranium', 'plutonium', 'warhead', 'atomic', 'reactor', 'fission', 'new start', 'nonproliferation'] },
        { name: 'AI/DISINFO',    keywords: ['ai ', 'ai-', 'artificial intelligence', 'disinformation', 'misinformation', 'deepfake', 'slop', 'grok', 'chatbot', 'fake'] },
        { name: 'SPACE',         keywords: ['space', 'spacex', 'nasa', 'rocket', 'satellite', 'orbit', 'launch', 'starship', 'moon', 'mars'] },
        { name: 'NAT. SECURITY', keywords: ['security', 'military', 'defense', 'pentagon', 'intelligence', 'antisemitism', 'weapon', 'war ', 'conflict', 'troops', 'classified', 'espionage', 'sanctions'] },
        { name: 'TECHNOLOGY',    keywords: ['tech', 'cyber', 'software', 'internet', 'app ', 'drone', 'robot'] },
        { name: 'SCIENCE',       keywords: ['science', 'scientist', 'research', 'study', 'biology', 'climate', 'health', 'disease', 'vaccine', 'physics', 'evolution', 'fossil', 'earthquake', 'volcano', 'ocean', 'brain'] }
    ];

    // Return a category name for a headline, or 'OTHER' if no keywords match
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

    // Build an SVG bar chart showing how many stories fall into each category
    function buildChartSvg(rows) {
        // Count stories per category
        var counts = {};
        rows.forEach(function (row) {
            var cat = categorize(row.title);
            counts[cat] = (counts[cat] || 0) + 1;
        });

        // Sort categories by count (most stories first)
        var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });

        // Find the highest count so we can scale the bars
        var maxCount = 0;
        cats.forEach(function (c) { if (counts[c] > maxCount) maxCount = counts[c]; });
        var axisMax = Math.max(maxCount + 1, 3);

        // Layout constants (pixels inside the SVG viewBox)
        var labelX = 135;       // right edge of category labels
        var barX = 140;         // left edge of bars
        var barAreaWidth = 380; // total width available for bars
        var barHeight = 22;
        var barGap = 29;
        var topY = 38;
        var unitWidth = barAreaWidth / axisMax;

        var numBars = cats.length;
        var chartBottom = topY + numBars * barGap + 5;
        var svgHeight = chartBottom + 45;

        // Start building the SVG string
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

        // Y-axis and X-axis lines
        svg += '<line x1="' + barX + '" y1="30" x2="' + barX + '" y2="' + chartBottom + '" class="ch-line ch-med"/>';
        svg += '<line x1="' + barX + '" y1="' + chartBottom + '" x2="' + (barX + barAreaWidth) + '" y2="' + chartBottom + '" class="ch-line ch-med"/>';

        // X-axis ticks, numbers, and vertical grid lines
        for (var t = 1; t <= axisMax; t++) {
            var tx = barX + t * unitWidth;
            svg += '<line x1="' + tx + '" y1="' + chartBottom + '" x2="' + tx + '" y2="' + (chartBottom + 5) + '" class="ch-line ch-thin"/>';
            svg += '<text x="' + tx + '" y="' + (chartBottom + 18) + '" class="ch-label" text-anchor="middle">' + t + '</text>';
            svg += '<line x1="' + tx + '" y1="30" x2="' + tx + '" y2="' + chartBottom + '" class="ch-grid"/>';
        }

        // X-axis title
        var axisCenter = barX + barAreaWidth / 2;
        svg += '<text x="' + axisCenter + '" y="' + (chartBottom + 35) + '" class="ch-title" text-anchor="middle">NO. OF STORIES (N = ' + rows.length + ')</text>';

        // Decorative dimension line across the top
        svg += '<line x1="' + barX + '" y1="33" x2="' + (barX + barAreaWidth) + '" y2="33" class="ch-line ch-thin"/>';
        svg += '<line x1="' + barX + '" y1="30" x2="' + barX + '" y2="36" class="ch-line ch-thin"/>';
        svg += '<line x1="' + (barX + barAreaWidth) + '" y1="30" x2="' + (barX + barAreaWidth) + '" y2="36" class="ch-line ch-thin"/>';
        svg += '<text x="' + axisCenter + '" y="28" class="ch-title" text-anchor="middle">N = ' + rows.length + '</text>';

        // One horizontal bar per category
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

    // Parse the RSS XML and update the stories table + chart on the page
    function handleRssData(xmlText) {
        var parser = new DOMParser();
        var xml = parser.parseFromString(xmlText, 'text/xml');
        var items = xml.querySelectorAll('item');
        var rows = [];

        items.forEach(function (item) {
            var title = item.querySelector('title') ? item.querySelector('title').textContent : '';
            var link = item.querySelector('link') ? item.querySelector('link').textContent : '';
            var pubDate = item.querySelector('pubDate') ? item.querySelector('pubDate').textContent : '';

            rows.push({ date: pubDate, title: title, link: link });
        });

        if (rows.length === 0) return;

        // Keep only the 10 most recent stories
        rows = rows.slice(0, 10);

        // Build table rows
        var html = '';
        rows.forEach(function (row) {
            html += '<tr>' +
                '<td>' + escapeHtml(formatDate(row.date)) + '</td>' +
                '<td><a href="' + escapeHtml(row.link) + '" target="_blank" rel="noopener">' + escapeHtml(row.title) + '</a></td>' +
                '</tr>';
        });
        storiesBody.innerHTML = html;

        // Build the bar chart below the heading
        storiesChart.innerHTML = buildChartSvg(rows) +
            '<p class="figure-caption">Fig. 1.1 &mdash; Distribution of recent stories by subject category.</p>';
    }

    // Try each CORS proxy in order; if one fails, move to the next
    function fetchRss(proxyIndex) {
        if (proxyIndex >= PROXY_URLS.length) return; // all proxies failed — keep static fallback
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

    fetchRss(0); // kick off the RSS fetch

    // =========================================================
    // BLUESKY FEED
    // Pulls the 3 most recent posts from the public Bluesky API
    // and displays them in the sidebar.
    // =========================================================
    var BSKY_HANDLE = 'gbrumfiel.bsky.social';
    var BSKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';
    var feedContainer = document.getElementById('bsky-feed');

    // Convert a Bluesky post URI to a clickable bsky.app URL
    function postUriToUrl(uri, handle) {
        var parts = uri.split('/');
        var rkey = parts[parts.length - 1];
        return 'https://bsky.app/profile/' + handle + '/post/' + rkey;
    }

    // Build HTML for a single Bluesky post
    function renderPost(item) {
        var post = item.post;
        var record = post.record;
        if (!record || !record.text) return '';

        // Skip reposts — we only want original posts
        if (item.reason && item.reason.$type === 'app.bsky.feed.defs#reasonRepost') return '';

        var date = formatDate(record.createdAt);
        var text = escapeHtml(record.text);
        var url = postUriToUrl(post.uri, post.author.handle);

        // If the post has a link card embed, render it
        var embedHtml = '';
        if (record.embed && record.embed.external) {
            var ext = record.embed.external;
            var domain = '';
            try { domain = new URL(ext.uri).hostname; } catch (e) {}
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

    // Fetch and display the 3 most recent original posts
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
