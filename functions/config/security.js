'use strict';
import helmet from "helmet";


// Security headers
const SecurityHelmet = helmet({
    contentSecurityPolicy:     
        {directives: 
            {
                "default-src": ["'self'"], 
                "style-src": ["'self'","https:"],
                "script-src": ["'self'","www.gstatic.com","ajax.googleapis.com","cdn.jsdelivr.net","'unsafe-inline'"],
                "script-src-attr": ["'unsafe-inline'"],  // 'none' prevent scripts in html attributes (onclick, img onerror, etc.)
                "img-src": ["*","data:"],        // without "data:", we get a Bootstrap svg error
                upgradeInsecureRequests: [],
            },
        },
    referrerPolicy: {policy: "same-origin"},    // strict-origin-when-cross-origin (default) |  same-origin
    xFrameOptions: {action: "deny"},               // X-Frame-Options, deny framing
    crossOriginEmbedderPolicy: true,        // if true, everything on my page is CORS (crossorigin="anonymous")
    // crossOriginResourcePolicy: { policy: "same-site" }, // same-site | cross-origin. Policy for no-cors requests
});

const SecurityHeaders = function(req, res, next) {
    res.header('Permissions-Policy', "camera=(),microphone=(),fullscreen=*");       // do not allow these
    res.header('Access-Control-Allow-Origin', "*");       // it is safe, unless you run it on an intranet 
    next();
};

const Security = [SecurityHelmet, SecurityHeaders];

export default Security;
