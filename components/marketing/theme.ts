/**
 * Theme plumbing for the onf.to marketing page.
 *
 * Dark mode here is deliberately SCOPED to this one route. `onf.to` is mostly a
 * redirector whose other routes — the `/[handle]` profile pages and their
 * product, service and checkout children — are built on shadcn tokens and have
 * only ever rendered light. Putting a global `dark` class on `<html>` would
 * silently repaint all of them, so instead the class goes on this page's own
 * root element. Tailwind's class strategy matches any ancestor, so every
 * `dark:` utility inside the landing page works exactly as usual.
 */

export const ROOT_ID = 'onfto-root'
export const STORAGE_KEY = 'onfto-theme'

/**
 * Runs during HTML parse, before first paint, so the correct theme is painted
 * once instead of flashing light then correcting. It is placed as the first
 * child of the root element, which therefore already exists when it executes.
 *
 * Everything is wrapped in try/catch: `localStorage` throws outright in some
 * privacy modes, and a themed page is not worth a blank one.
 */
export const THEME_SCRIPT = `
(function(){try{
var s=null;try{s=localStorage.getItem('${STORAGE_KEY}')}catch(e){}
var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
if(d){var r=document.getElementById('${ROOT_ID}');if(r)r.classList.add('dark');}
}catch(e){}})();
`
