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
            data.feed.forEach(function (item) {
                html += renderPost(item);
            });
            feedContainer.innerHTML = html || '<p>No communications available.</p>';
        })
        .catch(function () {
            feedContainer.innerHTML = '<p>Unable to retrieve communications at this time.</p>';
        });
})();
